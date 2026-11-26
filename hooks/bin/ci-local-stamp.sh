#!/usr/bin/env bash
# Runs your full local CI command on a clean commit and, only if it passes, stamps HEAD
# into the git dir so ci-push-guard.js lets the push through.
#   ~/.claude/hooks/bin/ci-local-stamp.sh bash -c 'npm run lint && npm test && npm run build'
#   ~/.claude/hooks/bin/ci-local-stamp.sh ./scripts/ci-local.sh
# Runs under the machine-wide lock CI_LOCK (default heavy-jobs) so parallel sessions queue.
set -euo pipefail
[ $# -gt 0 ] || { echo "usage: ci-local-stamp.sh <command...>" >&2; exit 2; }
cd "$(git rev-parse --show-toplevel)"
stamp="$(git rev-parse --git-path ci-local-pass)"
rm -f "$stamp"
# The stamp must describe exactly what gets pushed.
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "CI-LOCAL FAIL: uncommitted changes to tracked files; commit first" >&2; exit 1; }
head="$(git rev-parse HEAD)"
"$(dirname "${BASH_SOURCE[0]}")/with-lock.sh" "${CI_LOCK:-heavy-jobs}" "$@" || { echo "CI-LOCAL FAIL" >&2; exit 1; }
[ "$(git rev-parse HEAD)" = "$head" ] || { echo "CI-LOCAL FAIL: HEAD moved during the run" >&2; exit 1; }
echo "$head" >"$stamp"
echo "CI-LOCAL PASS $head"
