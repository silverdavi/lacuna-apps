<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components jsonBackup at 9c7f3ab. -->

> `@lacuna/json-backup` `0.1.0`. To use it in an app: add `"@lacuna/json-backup": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/json-backup": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/json-backup'`.

# jsonBackup

Serialises an app's records into a versioned JSON backup file and deserialises a backup back into records, with schema validation and a migration hook for version upgrades. `exportBackup` produces the JSON string; `importBackup` validates the top-level shape, steps records forward through `migrate` one version at a time when the backup is older than the app's current schema version, optionally drops records that fail `validate`, and reports how many were migrated, dropped, and why. Pair it with `fileSaveOpen` for the actual file download and read.

## Signature

```ts
export interface BackupRecord<T> {
  id: string;
  data: T;
  createdAt: number;
  updatedAt: number;
}

export interface BackupFile<T> {
  /** Schema version of this backup. */
  version: number;
  /** App identifier string. */
  appId: string;
  /** Timestamp of export. */
  exportedAt: number;
  /** The records. */
  records: Array<BackupRecord<T>>;
}

export interface ExportOptions<T> {
  appId: string;
  version: number;
  records: Array<BackupRecord<T>>;
  /** Optional custom filename (without extension). Defaults to `${appId}-backup`. */
  filename?: string;
}

export interface ImportOptions<T> {
  /** Current schema version the app expects. */
  currentVersion: number;
  /** Migrate a record from version v to v+1. Return null to drop the record. */
  migrate?: (record: BackupRecord<unknown>, fromVersion: number) => BackupRecord<T> | null;
  /** Validate a single record against the current schema. Return an error string or null. */
  validate?: (record: BackupRecord<T>) => string | null;
}

export interface ImportResult<T> {
  records: Array<BackupRecord<T>>;
  /** Number of records that were migrated. */
  migratedCount: number;
  /** Number of records that failed validation and were dropped. */
  droppedCount: number;
  /** Errors for dropped records, keyed by record id. */
  errors: Record<string, string>;
}

/**
 * Export records to a versioned JSON string.
 * Returns the JSON string ready for fileSaveOpen.
 */
export function exportBackup<T>(options: ExportOptions<T>): string;

/**
 * Import a versioned JSON backup string.
 * - Validates top-level shape (version, appId, exportedAt, records array)
 * - Migrates records if version < currentVersion
 * - Validates each record if validate is provided
 * - Returns ImportResult with surviving records
 * - Throws Error for malformed JSON or missing top-level fields
 */
export function importBackup<T>(json: string, options: ImportOptions<T>): ImportResult<T>;
```

## Usage

```tsx
import { exportBackup, importBackup } from '@lacuna/json-backup'

type Note = { t: string }
const records = [{ id: 'a', data: { t: 'hi' } as Note, createdAt: 100, updatedAt: 200 }]

const json = exportBackup<Note>({ appId: 'notes', version: 1, records })

const result = importBackup<Note>(json, {
  currentVersion: 1,
  validate: (r) => (typeof r.data.t === 'string' ? null : 'missing text'),
})

console.log(result.records.length, result.droppedCount)
```
