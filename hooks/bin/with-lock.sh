#!/usr/bin/env bash
# Runs a command while holding a named machine-wide lock, so agent sessions sharing
# one resource (CPU-heavy test runs, a test database, docker) take turns, first come
# first served. Re-entrant: nested calls for a lock already held run straight through.
#   ~/.claude/hooks/bin/with-lock.sh heavy-jobs npm test
set -euo pipefail
name="$1"; shift
case " ${WITH_LOCK_HELD:-} " in *" $name "*) exec "$@";; esac
. "$(dirname "${BASH_SOURCE[0]}")/lock-lib.sh"
lock_take "$name" "$(basename "$PWD") since $(date +%H:%M)"
trap 'lock_drop "$name"' EXIT
export WITH_LOCK_HELD="${WITH_LOCK_HELD:-} $name"
"$@"
