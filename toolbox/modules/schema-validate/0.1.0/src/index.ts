// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/schema-validate 0.1.0: snapshot of lacuna-components schemaValidate at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
export type FieldType = 'text' | 'number' | 'date' | 'choice';

export interface FieldSchema {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  min?: number | string;
  max?: number | string;
  pattern?: RegExp;
  choices?: string[];
  messages?: Partial<Record<'required' | 'min' | 'max' | 'pattern' | 'choice' | 'type', string>>;
}

export interface ValidationError {
  field: string;
  rule: 'required' | 'min' | 'max' | 'pattern' | 'choice' | 'type';
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

function isEmpty(value: string | number | null | undefined): boolean {
  return value === null || value === undefined || value === '';
}

function message(
  schema: FieldSchema,
  rule: 'required' | 'min' | 'max' | 'pattern' | 'choice' | 'type',
  fallback: string,
): string {
  return schema.messages?.[rule] ?? fallback;
}

export function validateField(
  schema: FieldSchema,
  value: string | number | null | undefined,
): ValidationResult {
  const errors: ValidationError[] = [];

    if (isEmpty(value)) {
    if (schema.required || schema.messages?.required) {
      errors.push({
        field: schema.name,
        rule: 'required',
        message: message(schema, 'required', `${schema.label} is required`),
      });
    }
    return { valid: errors.length === 0, errors };
  }

  if (schema.type === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      errors.push({
        field: schema.name,
        rule: 'type',
        message: message(schema, 'type', `${schema.label} must be a number`),
      });
      return { valid: false, errors };
    }
    if (typeof schema.min === 'number' && value < schema.min) {
      errors.push({
        field: schema.name,
        rule: 'min',
        message: message(schema, 'min', `${schema.label} must be at least ${schema.min}`),
      });
    }
    if (typeof schema.max === 'number' && value > schema.max) {
      errors.push({
        field: schema.name,
        rule: 'max',
        message: message(schema, 'max', `${schema.label} must be at most ${schema.max}`),
      });
    }
  } else if (schema.type === 'text') {
    if (typeof value !== 'string') {
      errors.push({
        field: schema.name,
        rule: 'type',
        message: message(schema, 'type', `${schema.label} must be text`),
      });
      return { valid: false, errors };
    }
    if (typeof schema.min === 'number' && value.length < schema.min) {
      errors.push({
        field: schema.name,
        rule: 'min',
        message: message(schema, 'min', `${schema.label} must be at least ${schema.min} characters`),
      });
    }
    if (typeof schema.max === 'number' && value.length > schema.max) {
      errors.push({
        field: schema.name,
        rule: 'max',
        message: message(schema, 'max', `${schema.label} must be at most ${schema.max} characters`),
      });
    }
    if (schema.pattern && !schema.pattern.test(value)) {
      errors.push({
        field: schema.name,
        rule: 'pattern',
        message: message(schema, 'pattern', `${schema.label} does not match the required pattern`),
      });
    }
  } else if (schema.type === 'date') {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      errors.push({
        field: schema.name,
        rule: 'type',
        message: message(schema, 'type', `${schema.label} must be a date (YYYY-MM-DD)`),
      });
      return { valid: false, errors };
    }
    if (typeof schema.min === 'string' && value < schema.min) {
      errors.push({
        field: schema.name,
        rule: 'min',
        message: message(schema, 'min', `${schema.label} must be on or after ${schema.min}`),
      });
    }
    if (typeof schema.max === 'string' && value > schema.max) {
      errors.push({
        field: schema.name,
        rule: 'max',
        message: message(schema, 'max', `${schema.label} must be on or before ${schema.max}`),
      });
    }
  } else if (schema.type === 'choice') {
    if (typeof value !== 'string' || !schema.choices?.includes(value)) {
      errors.push({
        field: schema.name,
        rule: 'choice',
        message: message(schema, 'choice', `${schema.label} must be one of: ${schema.choices?.join(', ')}`),
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateForm(
  schemas: FieldSchema[],
  values: Record<string, string | number | null | undefined>,
): ValidationResult {
  const errors: ValidationError[] = [];
  for (const schema of schemas) {
    const fieldResult = validateField(schema, values[schema.name]);
    errors.push(...fieldResult.errors);
  }
  return { valid: errors.length === 0, errors };
}
