export interface TestTokenRequest {
    roles: string[]
    expires_minutes: number
}

export interface TestTokenResponse {
    token: string
    token_type: string
    roles: string[]
    expires_at: string
    expires_in: number
}