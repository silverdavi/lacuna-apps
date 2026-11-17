#!/usr/bin/env bash
# The single definition of "passes" for this repository.
# Agents run this before every commit and must not edit it.
#
# Which apps: $APPS (space separated slugs), else apps changed against
# origin/main (committed, staged, unstaged, untracked), else every app.
# For each: manifest and lint, type check, listed test files exist, build,
# smoke + app browser tests. Screenshots go to artifacts/<slug>/.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
step() { echo "== $*"; }
bad() { echo "FAIL: $*"; fail=1; }

base=$(git merge-base HEAD origin/main 2>/dev/null || echo "")
changed_files() {
  { [ -n "$base" ] && git diff --name-only "$base"; git ls-files --others --exclude-standard; } | sort -u
}

if [ -n "$base" ] && [ "${ALLOW_GATE_EDIT:-0}" != "1" ]; then
  gate=$(changed_files | grep -E '^(scripts/|schema/|playwright\.config\.ts$|package\.json$|toolbox/)' || true)
  if [ -n "$gate" ]; then
    bad "branch edits gate files; only apps/<slug>/ may change:"
    echo "$gate" | sed 's/^/  /'
  fi
fi

step "install"
pnpm install --frozen-lockfile --prefer-offline --reporter=silent || bad "pnpm install"

step "manifests, network lint, hex/px lint"
pnpm -s check || bad "pnpm check"

new_apps=$(changed_files | sed -n 's|^apps/\([^/]*\)/.*|\1|p' | sort -u)
apps="${APPS:-$new_apps}"
[ -z "$apps" ] && apps=$(ls apps)

for app in $apps; do
  dir="apps/$app"
  if [ ! -f "$dir/lacuna.app.json" ]; then bad "$dir has no lacuna.app.json"; continue; fi

  if echo "$new_apps" | grep -qx "$app"; then
    step "$app: listed tests exist"
    for t in $(node -e 'const m=require(process.argv[1]);console.log((m.quality?.tests??[]).join(" "))' "$PWD/$dir/lacuna.app.json"); do
      [ -f "$dir/$t" ] || bad "$app: manifest lists $t but $dir/$t is missing"
    done
    ls "$dir"/tests/*.spec.ts >/dev/null 2>&1 || bad "$app: no tests/*.spec.ts"
  fi

  step "$app: type check"
  pnpm --filter "./$dir" exec tsc --noEmit || bad "$app: tsc"

  step "$app: build"
  pnpm --filter "./$dir" -s build >/dev/null || { bad "$app: build"; continue; }

  step "$app: browser tests"
  rm -rf "artifacts/$app"
  APP="$app" pnpm exec playwright test || bad "$app: browser tests"
  echo "screenshots: $(ls artifacts/$app/*.png 2>/dev/null | tr '\n' ' ')"
done

if [ "$fail" -ne 0 ]; then echo "CHECK: FAIL"; exit 1; fi
echo "CHECK: PASS"
