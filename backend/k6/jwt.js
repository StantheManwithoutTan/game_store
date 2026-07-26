import crypto from 'k6/crypto';
import encoding from 'k6/encoding';

function b64url(s) {
  return encoding.b64encode(s, 'rawurl');
}

export function makeToken(scopes, secret) {
  const header = b64url(JSON.stringify({alg: 'HS256', typ: 'JWT'}));

  const payload = b64url(JSON.stringify({
    roles: Array.isArray(scopes) ? scopes : [scopes],
    email: 'admin@test.com',
    sub: 'k6-test',
    exp: Math.floor(Date.now()/1000) + 3600
  }));

  const unsigned = `${header}.${payload}`;
  const sig = crypto.hmac('sha256', secret, unsigned, 'base64url');
  return `${unsigned}.${sig}`;
}