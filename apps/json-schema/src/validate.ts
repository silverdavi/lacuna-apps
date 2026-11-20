export interface Schema {
  type?: string
  properties?: Record<string, Schema>
  required?: string[]
  pattern?: string
  minimum?: number
  maximum?: number
}

function typeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function typeName(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function matchesType(value: unknown, type: string): boolean {
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value)
  if (type === 'number') return typeof value === 'number'
  return typeOf(value) === type
}

function fmt(n: number): string {
  return String(n)
}

function validate(value: unknown, schema: Schema, path: string[], errors: string[]): void {
  const at = path.length ? path.join('.') : '(root)'
  if (schema.type && !matchesType(value, schema.type)) {
    errors.push(`${at}: expected ${schema.type}, got ${typeName(value)}`)
    return
  }
  if (typeof value === 'string' && typeof schema.pattern === 'string') {
    try {
      if (!new RegExp(schema.pattern).test(value)) {
        errors.push(`${at}: does not match pattern ${schema.pattern}`)
      }
    } catch {
      // an invalid pattern is not reportable against this value
    }
  }
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      errors.push(`${at}: ${fmt(value)} is less than minimum ${fmt(schema.minimum)}`)
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      errors.push(`${at}: ${fmt(value)} is greater than maximum ${fmt(schema.maximum)}`)
    }
  }
  if (typeOf(value) === 'object') {
    const record = value as Record<string, unknown>
    for (const field of schema.required ?? []) {
      if (!(field in record)) {
        errors.push(`${field}: required field missing`)
      }
    }
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (key in record) validate(record[key], sub, [...path, key], errors)
    }
  }
}

export function validateAgainst(data: unknown, schema: Schema): string[] {
  const errors: string[] = []
  validate(data, schema, [], errors)
  return errors
}
