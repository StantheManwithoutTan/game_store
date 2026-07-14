import axios from 'axios'

interface ApiErrorResponse {
    message?: string
}

export interface ApiErrorInformation {
    status?: number
    message: string
}

export function getApiErrorInformation(
    error: unknown,
    fallbackMessage = 'Ha ocurrido un error inesperado.',
): ApiErrorInformation {
    if (!axios.isAxiosError<ApiErrorResponse>(error)) {
        return {
            message: fallbackMessage,
        }
    }

    return {
        status: error.response?.status,
        message:
            error.response?.data?.message ??
            fallbackMessage,
    }
}