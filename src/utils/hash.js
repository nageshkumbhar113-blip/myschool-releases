export async function sha256Hex(input) {
  const data = new TextEncoder().encode(String(input ?? ''))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function createRandomToken(bytes = 32) {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(buffer)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function createRandomSalt(bytes = 16) {
  return createRandomToken(bytes)
}

export async function hashPassword(password, salt) {
  return sha256Hex(`${salt}:${password}`)
}
