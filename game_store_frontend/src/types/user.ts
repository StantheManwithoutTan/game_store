export interface KeycloakUser {
    id: string
    username: string
    email: string | null
    name: string
    enabled: boolean
    permissions: string[]
}