#!/usr/bin/env bash
# Prints the commit that the path guard in scripts/check.sh compares this branch against.
#
# Two bases are trusted: origin/main, and the integration branch agent/shelf (the local
# branch when it exists, else origin/agent/shelf). BASE_REF may name one of them. Any
# other value is refused, so a task cannot point the guard at its own commits.
# Unset, or "auto": whichever trusted base is closer to HEAD. A branch cut from
# agent/shelf is compared with agent/shelf; a branch cut from main is compared with main.
# Prints nothing when neither base exists (a clone with no remote), as before.
set -uo pipefail

shelf=agent/shelf
git rev-parse --verify --quiet refs/heads/agent/shelf >/dev/null || shelf=origin/agent/shelf
mb() { git rev-parse --verify --quiet "$1^{commit}" >/dev/null && git merge-base HEAD "$1" 2>/dev/null; }

case "${BASE_REF:-auto}" in
  origin/main) mb origin/main ;;
  agent/shelf | origin/agent/shelf) mb "$shelf" || mb origin/main ;; # no shelf yet: main, never "no base"
  auto)
    m=$(mb origin/main)
    s=$(mb "$shelf")
    if [ -n "$s" ] && { [ -z "$m" ] || git merge-base --is-ancestor "$m" "$s"; }; then echo "$s"; else echo "$m"; fi
    ;;
  *)
    echo "BASE_REF must be origin/main or agent/shelf, not '${BASE_REF}'" >&2
    exit 2
    ;;
esac
exit 0
