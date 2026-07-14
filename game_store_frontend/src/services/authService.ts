export function buildKeycloakLogoutUrl(): string {
    const keycloakUrl =
        import.meta.env.VITE_KEYCLOAK_URL ||
        'http://localhost:8080'

    const appUrl =
        import.meta.env.VITE_APP_URL ||
        'http://localhost:5173'

    const redirectUrl = encodeURIComponent(
        `${appUrl}/login`,
    )

    return (
        `${keycloakUrl}` +
        '/realms/game-store/protocol/openid-connect/logout' +
        '?client_id=game-store-client' +
        `&post_logout_redirect_uri=${redirectUrl}`
    )
}

export function redirectToKeycloakLogout(): void {
    window.location.href = buildKeycloakLogoutUrl()
}