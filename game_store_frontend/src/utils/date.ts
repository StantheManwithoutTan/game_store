export function formatDateTime(
    date: string,
    locale = 'es-DO',
): string {
    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
        return 'Fecha inválida'
    }

    return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(parsedDate)
}