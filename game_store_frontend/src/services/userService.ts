import api from './api'

import type { KeycloakUser } from '../types/user'

export async function getUsers(): Promise<KeycloakUser[]> {
    const response = await api.get<KeycloakUser[]>(
        '/api/users/',
    )

    return response.data
}