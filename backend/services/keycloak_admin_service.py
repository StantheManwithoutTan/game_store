import os

from keycloak import KeycloakAdmin, KeycloakOpenIDConnection


MANAGED_PERMISSIONS = {
    "game:view",
    "game:manage",
    "product:view",
    "product:manage",
    "stock:view",
    "stock:manage",
    "report:view",
    "audit:view",
    "user:manage",
}


class KeycloakAdminService:

    @staticmethod
    def _get_admin():
        admin_client_id = os.environ.get(
            "KEYCLOAK_ADMIN_CLIENT_ID"
        )
        admin_client_secret = os.environ.get(
            "KEYCLOAK_ADMIN_CLIENT_SECRET"
        )

        if not admin_client_id or not admin_client_secret:
            raise RuntimeError(
                "Keycloak admin credentials are not configured"
            )

        connection = KeycloakOpenIDConnection(
            server_url=os.environ.get(
                "KEYCLOAK_SERVER_URL",
                "http://keycloak:8080",
            ),
            realm_name=os.environ.get(
                "KEYCLOAK_REALM",
                "game-store",
            ),
            client_id=admin_client_id,
            client_secret_key=admin_client_secret,
            grant_type="client_credentials",
            verify=True,
        )

        return KeycloakAdmin(connection=connection)

    @classmethod
    def get_users(cls):
        admin = cls._get_admin()

        managed_client_id = os.environ.get(
            "KEYCLOAK_CLIENT_ID",
            "game-store-client",
        )

        client_uuid = admin.get_client_id(managed_client_id)

        if not client_uuid:
            raise RuntimeError(
                f"Keycloak client '{managed_client_id}' was not found"
            )

        keycloak_users = admin.get_users({})
        users = []

        for user in keycloak_users:
            username = user.get("username", "")

            if username.startswith("service-account-"):
                continue

            roles = admin.get_composite_client_roles_of_user(
                user["id"],
                client_uuid,
            )

            permissions = sorted(
                role["name"]
                for role in roles
                if role["name"] in MANAGED_PERMISSIONS
            )

            full_name = " ".join(
                value
                for value in [
                    user.get("firstName"),
                    user.get("lastName"),
                ]
                if value
            )

            users.append(
                {
                    "id": user["id"],
                    "username": username,
                    "email": user.get("email"),
                    "name": full_name or username,
                    "enabled": user.get("enabled", False),
                    "permissions": permissions,
                }
            )

        return users