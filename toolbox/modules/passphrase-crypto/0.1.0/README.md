<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components passphraseCrypto at d422a73. -->

> `@lacuna/passphrase-crypto` `0.1.0`. To use it in an app: add `"@lacuna/passphrase-crypto": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/passphrase-crypto": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/passphrase-crypto'`.

# passphraseCrypto

Pure functions to encrypt and decrypt data with AES-GCM using a key derived from a passphrase via PBKDF2, for apps that store sensitive data locally without a server. It encrypts UTF-8 strings into a self-describing Base64 payload (salt, IV, ciphertext, iteration count) and can verify a candidate passphrase without returning the plaintext.

## Signature

```ts
export interface EncryptedPayload {
  /** Base64-encoded salt (16 bytes). */
  salt: string;
  /** Base64-encoded initialization vector (12 bytes). */
  iv: string;
  /** Base64-encoded ciphertext (includes GCM auth tag). */
  ciphertext: string;
  /** Number of PBKDF2 iterations. */
  iterations: number;
  /** PBKDF2 hash algorithm used to derive the key. Omitted when 'SHA-256'. */
  hash?: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
}

export interface CryptoOptions {
  /** PBKDF2 iteration count. Defaults to 100000. */
  iterations?: number;
  /** PBKDF2 hash algorithm. Defaults to 'SHA-256'. */
  hash?: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
}

export function encrypt(plaintext: string, passphrase: string, options?: CryptoOptions): Promise<EncryptedPayload>;
export function decrypt(payload: EncryptedPayload, passphrase: string): Promise<string>;
export function verifyPassphrase(payload: EncryptedPayload, passphrase: string): Promise<boolean>;
export function generateSalt(length?: number): string;
export function generateIv(length?: number): string;
```

## Usage

```tsx
import { encrypt, decrypt, verifyPassphrase } from '@lacuna/passphrase-crypto';

async function run() {
  const payload = await encrypt('a secret note', 'correct horse battery staple');
  const text = await decrypt(payload, 'correct horse battery staple');
  const ok = await verifyPassphrase(payload, 'correct horse battery staple');
  return { text, ok, iterations: payload.iterations };
}
```
