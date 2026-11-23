// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/json-backup 0.1.0: snapshot of lacuna-components jsonBackup at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
// Includes logic adapted from the open-source project credited in NOTICE.md, under its licence.
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

function isRecord(value: unknown): value is BackupRecord<unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number' &&
    'data' in candidate
  );
}

/**
 * Export records to a versioned JSON string.
 * Returns the JSON string ready for fileSaveOpen.
 */
export function exportBackup<T>(options: ExportOptions<T>): string {
  const file: BackupFile<T> = {
    version: options.version,
    appId: options.appId,
    exportedAt: Date.now(),
    records: options.records,
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Import a versioned JSON backup string.
 * - Validates top-level shape (version, appId, exportedAt, records array)
 * - Migrates records if version < currentVersion
 * - Validates each record if validate is provided
 * - Returns ImportResult with surviving records
 * - Throws Error for malformed JSON or missing top-level fields
 */
export function importBackup<T>(json: string, options: ImportOptions<T>): ImportResult<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Backup is not valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Backup is not an object');
  }
  const candidate = parsed as Record<string, unknown>;
  if (
    typeof candidate.version !== 'number' ||
    typeof candidate.appId !== 'string' ||
    typeof candidate.exportedAt !== 'number' ||
    !Array.isArray(candidate.records)
  ) {
    throw new Error('Backup is missing required top-level fields');
  }
  const file = candidate as unknown as BackupFile<unknown>;
  if (file.records.some((record) => !isRecord(record))) {
    throw new Error('Backup contains malformed records');
  }

  const { migrate, validate, currentVersion } = options;
  const records: Array<BackupRecord<T>> = [];
  let migratedCount = 0;
  let droppedCount = 0;
  const errors: Record<string, string> = {};

  for (const raw of file.records) {
    let record: BackupRecord<T>;
    if (file.version < currentVersion) {
      if (!migrate) {
        throw new Error(
          `Backup version ${file.version} is older than current version ${currentVersion}; a migrate function is required`,
        );
      }
      let current: BackupRecord<unknown> = raw;
      let version = file.version;
      let kept: BackupRecord<unknown> | null = current;
      while (version < currentVersion && kept !== null) {
        kept = migrate(kept, version);
        version += 1;
      }
      if (kept === null) {
        droppedCount += 1;
        errors[raw.id] = `Dropped by migration from version ${file.version}`;
        continue;
      }
      record = kept as BackupRecord<T>;
      migratedCount += 1;
    } else {
      record = raw as BackupRecord<T>;
    }
    if (validate) {
      const problem = validate(record);
      if (problem !== null && problem !== undefined) {
        droppedCount += 1;
        errors[record.id] = problem;
        continue;
      }
    }
    records.push(record);
  }

  return { records, migratedCount, droppedCount, errors };
}
