import { getAppUrl, getKeycloakUrl } from '../config'

export function buildKeycloakLogoutUrl(): string {
    const keycloakUrl = getKeycloakUrl()
    const appUrl = getAppUrl()

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