<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components textTransforms at 6e67435. -->

> `@lacuna/text-transforms` `0.1.0`. To use it in an app: add `"@lacuna/text-transforms": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/text-transforms": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/text-transforms'`.

# textTransforms

Pure utility functions for text manipulation: case conversions (upper, lower, title, snake, kebab, camel, Pascal), slugification, line trimming, deduplication and sorting, plus standard Latin Lorem Ipsum generation. Every function returns a new string and never mutates its input; non-ASCII characters pass through case conversions unchanged.

## Signature

```ts
export function toUpper(text: string): string;
export function toLower(text: string): string;
export function toTitleCase(text: string): string;
export function toSnakeCase(text: string): string;
export function toKebabCase(text: string): string;
export function toCamelCase(text: string): string;
export function toPascalCase(text: string): string;
export function slugify(text: string): string;
export function trimLines(text: string): string;
export function dedupeLines(text: string): string;
export function sortLines(text: string, reverse?: boolean): string;
export function loremIpsum(paragraphs: number, wordsPerParagraph?: number): string;
```

## Usage

```tsx
import { toKebabCase, slugify, loremIpsum } from '@lacuna/text-transforms'

const kebab = toKebabCase('Hello World Foo')
const slug = slugify('Hello, World! Foo Bar')
const filler = loremIpsum(2, 12)
```
