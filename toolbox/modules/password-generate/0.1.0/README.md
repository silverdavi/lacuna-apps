<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components passwordGenerate at d422a73. -->

> `@lacuna/password-generate` `0.1.0`. To use it in an app: add `"@lacuna/password-generate": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/password-generate": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/password-generate'`.

# passwordGenerate

Pure functions that generate random passwords and passphrases with configurable character rules, and return an entropy estimate in bits. Use them in Password Generator and Password Manager apps that need to produce strong credentials and display their strength.

## Signature

```ts
export interface PasswordRules {
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export interface PassphraseOptions {
  wordCount: number;
  separator: string;
  capitalize: boolean;
  appendNumber: boolean;
}

export interface GenerateResult {
  value: string;
  entropy: number;
}

export function generatePassword(length: number, rules: PasswordRules, seed?: number): GenerateResult;
export function generatePassphrase(options: PassphraseOptions, seed?: number): GenerateResult;
export function estimateEntropy(value: string): number;
```

## Usage

```tsx
import { generatePassword, estimateEntropy } from '@lacuna/password-generate';

const result = generatePassword(
  16,
  { upper: true, lower: true, digits: true, symbols: true, excludeAmbiguous: true },
  42,
);
const bits = estimateEntropy(result.value);
console.log(result.value, bits);
```
