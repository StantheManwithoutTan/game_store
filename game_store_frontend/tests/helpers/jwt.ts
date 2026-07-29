import crypto from 'crypto'


// Genera un JWT exactamente igual al que generaría el backend con PyJWT — misma estructura (roles, email, sub, exp), mismo algoritmo (HS256), misma secret key

// El Buffer.toString('base64url') de Node.js produce exactamente el mismo formato que base64url en Python

// crypto.createHmac('sha256', secret).update(data).digest('base64url') es equivalente a jwt.encode(payload, secret, algorithm='HS256') de Python

export function makeToken(scopes: string[], secret: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  ).toString('base64url')

  const payload = Buffer.from(
    JSON.stringify({
      roles: scopes,
      email: 'admin@test.com',
      sub: 'e2e-test',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64url')

  const unsigned = `${header}.${payload}`
  const sig = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url')
  return `${unsigned}.${sig}`
}