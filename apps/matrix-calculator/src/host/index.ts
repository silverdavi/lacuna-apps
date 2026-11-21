// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Every host call goes through this adapter. Moving to the published host API changes one import.
export type { MatrixRecord, Operation, SessionRecord } from './mock'
export { DEFAULT_RECORD, isMatrixRecord, isSessionRecord, sessionStore } from './mock'
