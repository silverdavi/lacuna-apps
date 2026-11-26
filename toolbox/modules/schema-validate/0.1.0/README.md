<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components schemaValidate at 9c7f3ab. -->

> `@lacuna/schema-validate` `0.1.0`. To use it in an app: add `"@lacuna/schema-validate": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/schema-validate": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/schema-validate'`.

# schemaValidate

Pure field-schema definition and validation for form fields (text, number, date, choice) with required, min/max, and pattern constraints, returning human-readable error messages. Designed for catalog apps that need lightweight form validation without a full form library.

## Signature

```ts
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

export function validateField(
  schema: FieldSchema,
  value: string | number | null | undefined,
): ValidationResult;

export function validateForm(
  schemas: FieldSchema[],
  values: Record<string, string | number | null | undefined>,
): ValidationResult;
```

## Usage

```tsx
import { validateForm } from '@lacuna/schema-validate';

export function ProfileForm({ values }: { values: Record<string, string | number | null | undefined> }) {
  const schemas = [
    { name: 'name', label: 'Name', type: 'text' as const, required: true, min: 2 },
    { name: 'age', label: 'Age', type: 'number' as const, min: 0, max: 150 },
    { name: 'role', label: 'Role', type: 'choice' as const, choices: ['admin', 'editor', 'viewer'] },
  ];
  const result = validateForm(schemas, values);
  return (
    <div>
      {result.valid ? <p role="status">All fields valid</p> : result.errors.map((e) => <p key={e.field + e.rule}>{e.message}</p>)}
    </div>
  );
}
```
