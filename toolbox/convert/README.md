# `@lacuna/convert`

Conversion registry: look up `from` → `to`, run one converter, or get a structured `unsupported` result. Format modules register here; this package does not parse DOCX/PDF/TeX.

## Public API

```ts
import { convert, registerConverter, type Converter } from '@lacuna/convert'

await convert('text', 'document', 'Title\n\nBody')
// { ok: true, output: PlainDocument, warnings }

await convert('docx', 'pdf', bytes)
// { ok: false, reason: 'unsupported', from, to, message }
```

Built-ins: `text` ↔ `document` (title = first non-empty line), `text` ↔ `utf8` (UTF-8 bytes), `csv` ↔ `json` (header-row objects). Invalid CSV/JSON returns `{ ok: false, reason: 'invalid' }`. `@lacuna/image` registers PNG/JPEG/WebP transcode and SVG→PNG (never SVG out). `@lacuna/docx` registers `docx → document`. Prefer `DocModel` from `@lacuna/doc` in the registering package; do not cycle convert's source into doc.

## Do not reimplement

Magic-byte detection (`@lacuna/formats`), React drop zones, batch UI, or parsers living in format packages.

## License notes

No third-party runtime libraries.

## Wire-up

See [`REGISTER.md`](./REGISTER.md).

## Status

Consumed by the Convert working app (`LiveConvert` → `convert()`). Built-in text ↔ document, text ↔ utf8, csv ↔ json; `@lacuna/docx` registers `docx → document` (no copied parser); `@lacuna/image` registers raster transcode.

