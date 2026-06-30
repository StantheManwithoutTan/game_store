from functools import wraps
from flask import request, jsonify, current_app, session
import jwt

def require_permission(*scopes):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # para sobrepasar los permisos si estamos probando
            if current_app.config.get('TESTING') and not current_app.config.get('TEST_AUTH'):
                return f(*args, **kwargs)
            auth = request.headers.get('Authorization', '')
            token = auth.replace('Bearer ', '')
            if not token:
                token = session.get('session_token', '')
            if not token:
                return jsonify({'error': 'Missing token'}), 401
            try:
                # decodifica el token y las llaves secretas del usuario
                payload = jwt.decode(
                    token,
                    current_app.config['SECRET_KEY'],
                    algorithms=['HS256']
                )
            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Token expired'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid token'}), 401

            # Crea arreglo vacio
            user_roles = set(payload.get('roles', []))
            # Si no encuentra el rol de usuario con el scope (product,manage como ejemplo), ponga un error 403 
            if not any(s in user_roles for s in scopes):
                return jsonify({'error': 'Forbidden'}), 403

            return f(*args, **kwargs)
        return wrapper
    return decorator
