function stripTrailingSlash(value: string): string {
  while (value.endsWith('/')) 
    value = value.slice(0, -1)
  return value
}

function browserOrigin(): string {
  return typeof window === 'undefined' ? '' : window.location.origin
}

function defaultKeycloakUrl(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.protocol}//${window.location.hostname}:8443`
}

export function getAppUrl(): string {
  return stripTrailingSlash(
    import.meta.env.VITE_APP_URL || browserOrigin(),
  )
}

export function getKeycloakUrl(): string {
  return stripTrailingSlash(
    import.meta.env.VITE_KEYCLOAK_URL || defaultKeycloakUrl(),
  )
}

export function getApiBaseUrl(): string {
  return stripTrailingSlash(
    import.meta.env.VITE_API_URL || browserOrigin(),
  )
}