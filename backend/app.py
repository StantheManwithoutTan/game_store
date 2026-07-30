from flask import Flask, request, jsonify, session, redirect, url_for, render_template
import os

# Importar las bibliotecas de Keycloak, OAUTH2, JWT, etc. para autenticación y autorización
import jwt
from keycloak import KeycloakOpenID
from dotenv import load_dotenv

# Importar las configuraciones, extensiones y rutas
from flask_cors import CORS
from config import Config

from extensions import db, migrate, api, limiter
from routes import register_blueprints
from prometheus_flask_exporter import PrometheusMetrics

from urllib.parse import quote

from telemetry import setup_telemetry, setup_logging

from metrics import login_failures, token_invalid

from extensions import db, migrate, api, limiter, marshmallow_plugin

load_dotenv()

metrics = None
_request_counter_registered = False

def create_app(config_class=Config):
    global metrics
    app = Flask(__name__)

    app.config.from_object(config_class)
    app.config.setdefault('SESSION_COOKIE_SAMESITE', 'Lax')
    app.config.setdefault('SESSION_COOKIE_HTTPONLY', True)
    if os.environ.get('FLASK_ENV') == 'production':
        app.config.setdefault('SESSION_COOKIE_SECURE', True)

    CORS(
        app,
        origins=[os.environ.get('FRONTEND_URL', 'http://localhost:5173')],
        supports_credentials=True,
        automatic_options=True
    )

    # Crea instancias de la base de datos y de los endpoints de api
    db.init_app(app)
    migrate.init_app(app, db)

    # esto para quitar el warning Eso generará nombres claros como
    #Game
    #GameList
    #GameUpdate
    #Product
    #ProductList
    #ProductUpdate
    api.init_app(
        app,
        spec_kwargs={
            "marshmallow_plugin": marshmallow_plugin
        }
    )
    limiter.init_app(app)

    #desativa el warning el las pruebas pytest no intentará conectarse a alloy
    if app.config.get("ENABLE_TELEMETRY", True):
        setup_telemetry(app)

    setup_logging(app)

    metrics = PrometheusMetrics(app)
    register_blueprints(api)

    # Incluido para produccion y para que pruebas pueden acceder a configuracion de cabeceras de HTTP
    @app.after_request
    def add_security_headers(response):
        response.headers['Strict-Transport-Security'] = (
            'max-age=31536000; includeSubDomains'
        )
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-Content-Type-Options'] = 'nosniff'

        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' https://cdn.jsdelivr.net 'sha256-p+ObFLxIXgmaTA9HdZ4tXsRUW76uEH+R2ZpUk8hESPE='; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: https://cdn.jsdelivr.net; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )

        response.headers['Permissions-Policy'] = (
            'camera=(), microphone=(), geolocation=()'
        )

        response.headers['Cross-Origin-Embedder-Policy'] = (
            'credentialless'
        )

        response.headers['Cross-Origin-Opener-Policy'] = (
            'same-origin'
        )

        return response

    return app

app = create_app()

keycloak_openid = KeycloakOpenID(
    server_url=os.environ.get('KEYCLOAK_SERVER_URL', 'http://keycloak:8080'),
    client_id=os.environ.get('KEYCLOAK_CLIENT_ID', 'game-store-client'),
    realm_name=os.environ.get('KEYCLOAK_REALM', 'game-store'),
    client_secret_key=os.environ.get('KEYCLOAK_CLIENT_SECRET', '')
)

KEYCLOAK_EXTERNAL = os.environ.get('KEYCLOAK_SERVER_URL_EXTERNAL', 'http://localhost:8080')


def extract_roles(access_payload):
    realm_roles = access_payload.get(
        'realm_access',
        {},
    ).get('roles', [])

    client_roles = access_payload.get(
        'resource_access',
        {},
    ).get(
        keycloak_openid.client_id,
        {},
    ).get('roles', [])

    return list(set(realm_roles + client_roles))


@app.route('/')
def home():
    user = session.get('user')
    if user:
        return render_template('home.html', user=user)
    return redirect(url_for('login_page'))


@app.route('/login')
def login_page():
    return render_template('login.html')


@app.route('/auth/openid_connect')
def openid_connect():
    code = request.args.get('code')
    if not code:
        redirect_uri = url_for('openid_connect', _external=True)
        keycloak_auth_url = (
            f"{KEYCLOAK_EXTERNAL}/realms/{keycloak_openid.realm_name}"
            f"/protocol/openid-connect/auth?"
            f"client_id={keycloak_openid.client_id}"
            f"&response_type=code"
            f"&redirect_uri={redirect_uri}"
            f"&scope=openid profile email"
        )
        return redirect(keycloak_auth_url)

    try:
        token = keycloak_openid.token(
            grant_type='authorization_code',
            code=code,
            redirect_uri=url_for('openid_connect', _external=True)
        )

        id_token = keycloak_openid.decode_token(
            token['id_token']
        )
        access_token = token['access_token']
        # Aqui habria que dcodificar el token inicial para extraer los roles del usuario especifico
        access_payload = keycloak_openid.decode_token(access_token)
        roles = extract_roles(access_payload)
        session['id_token'] = token['id_token']

        session_token = jwt.encode(
            {
                'sub': id_token['sub'],
                'email': id_token.get('email'),
                'name': id_token.get('name'),
                'roles': roles,
                'exp': id_token['exp']
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        session['user'] = {
            'sub': id_token['sub'],
            'email': id_token.get('email'),
            'name': id_token.get('name')
        }

        session['session_token'] = session_token
        session['access_token'] = token['access_token']
        session['refresh_token'] = token.get('refresh_token')

        return redirect(url_for('home'))

    except Exception:
        app.logger.exception("Error en OpenID Connect")
        return jsonify({'error': 'Authentication failed'}), 401

@app.route('/auth/login', methods=['POST'])
def login():
    data = request.json
    code = data.get('code')

    try:
        # si todo esta verificado del login del frontend hasta aqui, nos va a devolver los tres tokens: id_token, access_token y el refresh_token
        token = keycloak_openid.token(
            grant_type='authorization_code',
            code=code,
            redirect_uri = f"{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/login/callback"
        )

        id_token = keycloak_openid.decode_token(
            token['id_token']
        )

        access_token = token['access_token']
        access_payload = keycloak_openid.decode_token(access_token)
        roles = extract_roles(access_payload)


        session_token = jwt.encode(
            {
                'sub': id_token['sub'],
                'email': id_token.get('email'),
                'name': id_token.get('name'),
                'roles': roles,
                'exp': id_token['exp']
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        return jsonify({
            'access_token': access_token,
            'id_token': token['id_token'],
            'session_token': session_token,
            'user': {
                'name': id_token.get('name'),
                'email': id_token.get('email'),
            },
            'refresh_token': token.get('refresh_token')
        }), 200

    except Exception:
        login_failures.inc()
        app.logger.exception("Error durante el login")
        return jsonify({'error': 'Authentication failed'}), 401


@app.route('/auth/logout', methods=['POST'])
def logout():
    id_token_hint = session.get('id_token')
    refresh_token = request.json.get('refresh_token') if request.is_json else session.get('refresh_token')


    try:
        if refresh_token:
            keycloak_openid.logout(refresh_token)
    except Exception:
        pass

    session.clear()

    # Si es JSON (SPA), devolver JSON
    if request.is_json:
        return jsonify({'message': 'Logged out'}), 200

    # Si es form POST (HTML), cerrar también SSO de Keycloak
    if id_token_hint:
        logout_url = (
            f"{KEYCLOAK_EXTERNAL}/realms/{keycloak_openid.realm_name}"
            f"/protocol/openid-connect/logout?"
            f"id_token_hint={id_token_hint}"
            f"&post_logout_redirect_uri={quote(url_for('login_page', _external=True))}"
        )
        return redirect(logout_url)

    return redirect(url_for('login_page'))




@app.route('/auth/verify', methods=['POST'])
def verify_token():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        payload = jwt.decode(
            token,
            app.config['SECRET_KEY'],
            algorithms=['HS256']
        )
        return jsonify({'valid': True, 'user': payload}), 200
    except jwt.InvalidTokenError:
        token_invalid.inc()
        return jsonify({'valid': False}), 401

@app.route('/auth/refresh', methods=['POST'])
def refresh():
    refresh_token = request.json.get('refresh_token') if request.is_json else None
    if not refresh_token:
        refresh_token = session.get('refresh_token')
    if not refresh_token:
        return jsonify({'error': 'No refresh token'}), 401
    try:
        new_token = keycloak_openid.refresh_token(refresh_token)
        access_payload = keycloak_openid.decode_token(new_token['access_token'])
        id_payload = keycloak_openid.decode_token(new_token['id_token'])
        roles = extract_roles(access_payload)
        session_token = jwt.encode(
            {
                'sub': id_payload['sub'],
                'email': id_payload.get('email'),
                'name': id_payload.get('name'),
                'roles': roles,
                'exp': id_payload['exp']
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        session['access_token'] = new_token['access_token']
        session['refresh_token'] = new_token.get('refresh_token', refresh_token)
        session['session_token'] = session_token
        return jsonify({
            'access_token': new_token['access_token'],
            'session_token': session_token
        }), 200
    except Exception:
        token_invalid.inc()
        app.logger.exception("Error al refrescar el token")
        return jsonify({'error': 'Token refresh failed'}), 401
