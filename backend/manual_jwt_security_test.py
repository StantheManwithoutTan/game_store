import base64
import json
import time

import jwt

from app import app

app.config["SECRET_KEY"] = (
        app.config.get("SECRET_KEY")
        or "day-12-security-test-secret-key-2026"
)

def encode_payload(payload: dict) -> str:
    """
    Convierte el payload modificado nuevamente a Base64 URL,
    pero sin crear una firma nueva.
    """
    payload_json = json.dumps(
        payload,
        separators=(",", ":")
    ).encode("utf-8")

    return base64.urlsafe_b64encode(
        payload_json
    ).decode("utf-8").rstrip("=")


# 1. Creamos un token legítimo firmado por el backend.
valid_token = jwt.encode(
    {
        "sub": "security-test-user",
        "email": "security@test.com",
        "name": "Security Test",
        "roles": ["user"],
        "exp": int(time.time()) + 300
    },
    app.config["SECRET_KEY"],
    algorithm="HS256"
)

# El JWT tiene tres partes:
# HEADER.PAYLOAD.SIGNATURE
header, payload, signature = valid_token.split(".")

# 2. Decodificamos el payload.
padding = "=" * (-len(payload) % 4)

decoded_payload = json.loads(
    base64.urlsafe_b64decode(payload + padding)
)

# 3. Un atacante intenta cambiar su rol.
decoded_payload["roles"] = ["admin"]

# 4. Reconstruimos el token conservando la firma anterior.
# La firma ya no corresponde al nuevo contenido.
tampered_payload = encode_payload(decoded_payload)

tampered_token = (
    f"{header}.{tampered_payload}.{signature}"
)

# 5. Probamos ambos tokens contra /auth/verify.
with app.test_client() as client:
    valid_response = client.post(
        "/auth/verify",
        headers={
            "Authorization": f"Bearer {valid_token}"
        }
    )

    tampered_response = client.post(
        "/auth/verify",
        headers={
            "Authorization": f"Bearer {tampered_token}"
        }
    )

print("TOKEN VÁLIDO")
print("Código:", valid_response.status_code)
print("Respuesta:", valid_response.get_json())

print("\nTOKEN MANIPULADO")
print("Código:", tampered_response.status_code)
print("Respuesta:", tampered_response.get_json())