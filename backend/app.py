from flask import Flask, request, jsonify, session, redirect, url_for
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

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    CORS(app)

    """
    app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY')

    # Keycloak configuration
    keycloak_openid = KeycloakOpenID(
        server_url=os.environ.get('KEYCLOAK_SERVER_URL'),
        client_id=os.environ.get('KEYCLOAK_CLIENT_ID'),
        realm_name=os.environ.get('KEYCLOAK_REALM'),
        client_secret_key=os.environ.get('KEYCLOAK_CLIENT_SECRET')
    )
    """
    db.init_app(app)
    migrate.init_app(app,db)
    api.init_app(app)
    register_blueprints(api)
    

    return app

app = create_app()

@app.route('/')
def home():
    # Renders the index.html file from the templates folder
    return "Hello, World!"

""""
@app.route('/auth/login', methods=['POST'])
def login():
    # Exchange authorization code for tokens
    data = request.json
    code = data.get('code')
    
    try:
        # Exchange code for tokens
        token = keycloak_openid.token(
            grant_type='authorization_code',
            code=code,
            redirect_uri='http://localhost:5173/callback'
        )
        
        # Decode ID token to get user info
        id_token = jwt.decode(
            token['id_token'],
            options={"verify_signature": False}  # Or verify with public key
        )
        
        # Create session token (JWT)
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
    # Logout and invalidate tokens
    refresh_token = request.json.get('refresh_token')
    try:
        keycloak_openid.logout(refresh_token)
        return jsonify({'message': 'Logged out'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/auth/verify', methods=['POST'])
def verify_token():
    # Verify JWT token
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')

"""