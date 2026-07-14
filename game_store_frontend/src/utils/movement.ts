export type MovementVisualType =
    | 'movement-entry'
    | 'movement-exit'
    | 'movement-adjustment'
    | 'movement-unknown'

export function normalizeMovementType(
    type: string,
): string {
    return type.trim().toLowerCase()
}

export function getMovementLabel(
    type: string,
): string {
    const normalizedType = normalizeMovementType(type)

    const labels: Record<string, string> = {
        entrada: 'Entrada',
        salida: 'Salida',
        ajuste: 'Ajuste',
    }

    return labels[normalizedType] ?? 'Desconocido'
}

export function getMovementClass(
    type: string,
): MovementVisualType {
    const normalizedType = normalizeMovementType(type)

    const classes: Record<string, MovementVisualType> = {
        entrada: 'movement-entry',
        salida: 'movement-exit',
        ajuste: 'movement-adjustment',
    }

    return classes[normalizedType] ?? 'movement-unknown'
}