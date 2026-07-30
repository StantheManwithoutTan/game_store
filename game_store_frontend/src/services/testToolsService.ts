import api from './api'

import type {
    TestTokenRequest,
    TestTokenResponse,
} from '../types/testTools'

export async function generateTestToken(
    data: TestTokenRequest,
): Promise<TestTokenResponse> {
    const response = await api.post<TestTokenResponse>(
        '/api/test-tools/token',
        data,
    )

    return response.data
}