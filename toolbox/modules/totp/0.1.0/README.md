<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components totp at 6188248. -->

> `@lacuna/totp` `0.1.0`. To use it in an app: add `"@lacuna/totp": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/totp": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/totp'`.

# totp

Pure logic module that generates RFC 6238 time-based one-time password codes from a base32 secret and parses `otpauth://totp/` URIs into structured parameters, for authenticator-style apps that display or verify TOTP codes.

## Signature

```ts
export interface TotpOptions {
  digits?: number;
  period?: number;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
}

export interface OtpauthParams {
  issuer: string;
  accountName: string;
  secret: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: number;
  period: number;
}

export function base32Decode(input: string): Uint8Array;
export function totp(secret: string, timestampMs: number, options?: TotpOptions): string;
export function parseOtpauth(uri: string): OtpauthParams;
```

## Usage

```tsx
import { totp, parseOtpauth, base32Decode } from '@lacuna/totp';

const params = parseOtpauth(
  'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example',
);
const now = new Date().getTime();
const code = totp(params.secret, now, {
  algorithm: params.algorithm,
  digits: params.digits,
  period: params.period,
});
const keyLength = base32Decode(params.secret).length;
console.log(params.issuer, params.accountName, code, keyLength);
```
