// Logic adapted from auth0/jwt-decode (MIT). See NOTICE.md.

export interface DecodedJwt {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
}

export class InvalidJwtError extends Error {}

function b64DecodeUnicode(str: string): string {
  return decodeURIComponent(
    atob(str).replace(/(.)/g, (m, p) => {
      let code = p.charCodeAt(0).toString(16).toUpperCase()
      if (code.length < 2) code = '0' + code
      return '%' + code
    }),
  )
}

function base64UrlDecode(str: string): string {
  let output = str.replace(/-/g, '+').replace(/_/g, '/')
  switch (output.length % 4) {
    case 0:
      break
    case 2:
      output += '=='
      break
    case 3:
      output += '='
      break
    default:
      throw new InvalidJwtError('Invalid base64 encoding')
  }
  try {
    return b64DecodeUnicode(output)
  } catch {
    return atob(output)
  }
}

function decodePart(part: string, which: 'header' | 'payload'): Record<string, unknown> {
  let decoded: string
  try {
    decoded = base64UrlDecode(part)
  } catch {
    throw new InvalidJwtError('Invalid base64 encoding in the ' + which)
  }
  try {
    const value: unknown = JSON.parse(decoded)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new InvalidJwtError('Not a JSON object')
    }
    return value as Record<string, unknown>
  } catch {
    throw new InvalidJwtError('Invalid JSON in the ' + which)
  }
}

export function decodeJwt(token: string): DecodedJwt {
  if (typeof token !== 'string') {
    throw new InvalidJwtError('Invalid JWT format: expected three parts separated by dots')
  }
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] === '' || parts[1] === '' || parts[2] === '') {
    throw new InvalidJwtError('Invalid JWT format: expected three parts separated by dots')
  }
  try {
    return {
      header: decodePart(parts[0], 'header'),
      payload: decodePart(parts[1], 'payload'),
      signature: parts[2],
    }
  } catch {
    throw new InvalidJwtError('Invalid JWT format: expected three parts separated by dots')
  }
}
