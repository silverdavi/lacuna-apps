# `@lacuna/forms`

Format-agnostic field model and fill pass for Form Filler, Docs content controls, PDF AcroForm mapping, E-Sign required fields, and Convert metadata hops.

## Public API

```ts
import { fill, type DocumentField, type FieldValues } from '@lacuna/forms'

const { fields, missing } = fill(documentFields, values)
```

`DocumentField` covers type (`text`, `checkbox`, `choice`, `date`, `signature`), optional placement (`page`, `rect`), and required. `fill` returns updated fields plus missing required ids.

## Do not reimplement

DOCX/PDF parsers and writers (`@lacuna/docx`, `@lacuna/pdf`), React form UI, validation beyond required blanks, or identity-wallet prefill provenance.

## License notes

No third-party runtime libraries.

## Wire-up

See [`REGISTER.md`](./REGISTER.md).

## Status

Consumed by the Form Filler working app (`LiveFormFiller` → `fill()`). No PDF/DOCX I/O in that surface.

