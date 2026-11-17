#!/usr/bin/env bash
# Mirror chosen packages from the private Lacuna monorepo into toolbox/<name>/.
# The monorepo stays the source of truth; every file here is overwritten on
# the next sync. Each package is scanned first (secrets, private references,
# banned APIs, outside network origins) and is only written when it is clean.
#
# Usage:
#   scripts/sync-toolbox.sh [--dry-run] [--report FILE] [--source DIR] [--force] <package...>
#   scripts/sync-toolbox.sh --dry-run --all --report artifacts/sync-report.md
#
#   --dry-run   scan and print the report; write nothing
#   --report    also write the report to FILE
#   --source    monorepo packages dir (default: $LACUNA_PACKAGES or ../lacuna/app/packages)
#   --force     replace a toolbox/<name>/ that was not written by this script
#   --all       every package in the source dir
#
# Reviewed false positives go in scripts/sync-toolbox.allow.
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/sync-toolbox.mjs "$@"
