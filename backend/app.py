from flask import Flask, request, jsonify, session, redirect, url_for, render_template
import os

# Importar las bibliotecas de Keycloak, OAUTH2, JWT, etc. para autenticación y autorización
import requests
import jwt
from keycloak import KeycloakOpenID
from dotenv import load_dotenv

# Importar las configuraciones, extensiones y rutas
from flask_cors import CORS
from config import Config
from extensions import db, migrate, api
from routes import register_blueprints

from models import User, Product, Console, Game, Controller  # noqa: F401

load_dotenv()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    CORS(app)

    db.init_app(app)
    migrate.init_app(app, db)
    api.init_app(app)
    register_blueprints(api)

    return app

app = create_app()

keycloak_openid = KeycloakOpenID(
    server_url=os.environ.get('KEYCLOAK_SERVER_URL', 'http://keycloak:8080'),
    client_id=os.environ.get('KEYCLOAK_CLIENT_ID', 'game-store-client'),
    realm_name=os.environ.get('KEYCLOAK_REALM', 'game-store'),
    client_secret_key=os.environ.get('KEYCLOAK_CLIENT_SECRET', '')
)

KEYCLOAK_EXTERNAL = os.environ.get('KEYCLOAK_SERVER_URL_EXTERNAL', 'http://localhost:8080')


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

        id_token = jwt.decode(
            token['id_token'],
            options={"verify_signature": False}
        )

        session_token = jwt.encode(
            {
                'sub': id_token['sub'],
                'email': id_token.get('email'),
                'name': id_token.get('name'),
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

    except Exception as e:
        return jsonify({'error': str(e)}), 401


@app.route('/auth/login', methods=['POST'])
def login():
    data = request.json
    code = data.get('code')

    try:
        token = keycloak_openid.token(
            grant_type='authorization_code',
            code=code,
            redirect_uri=url_for('openid_connect', _external=True)
        )

        id_token = jwt.decode(
            token['id_token'],
            options={"verify_signature": False}
        )

        session_token = jwt.encode(
            {
                'sub': id_token['sub'],
                'email': id_token.get('email'),
                'name': id_token.get('name'),
                'exp': id_token['exp']
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        return jsonify({
            'access_token': token['access_token'],
            'id_token': token['id_token'],
            'session_token': session_token,
            'user': id_token
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 401


@app.route('/auth/logout', methods=['POST'])
def logout():
    refresh_token = request.json.get('refresh_token') if request.is_json else session.get('refresh_token')
    session.clear()
    try:
        if refresh_token:
            keycloak_openid.logout(refresh_token)
    except Exception:
        pass
    return jsonify({'message': 'Logged out'}), 200


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
        return jsonify({'valid': False}), 401