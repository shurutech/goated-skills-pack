# Machine-wide named locks for agent sessions sharing one machine, granted first
# come first served. Each waiter drops a ticket (start time + pid); only the
# oldest live ticket may take the lock, and dead waiters' tickets are skipped.
#   . ~/.claude/hooks/bin/lock-lib.sh
#   lock_take heavy-jobs "my-branch since 16:32"; trap 'lock_drop heavy-jobs' EXIT
lock_dir="${LOCK_DIR:-$HOME/.claude/locks}"

lock_take() {
  local name="$1" who="$2"
  local lock="$lock_dir/$name" q="$lock_dir/$name.q"
  # one-second tickets; two waiters in the same second are ordered by pid
  local ticket="$q/$(date +%s).$$"
  local t pid first n pos owner tick=0
  mkdir -p "$q"
  : >"$ticket"
  while :; do
    first="" n=0 pos=0
    for t in $(ls "$q" | sort -t. -k1,1n -k2,2n); do
      pid="${t#*.}"
      if ! kill -0 "$pid" 2>/dev/null; then rm -f "$q/$t"; continue; fi
      n=$((n + 1))
      [ -n "$first" ] || first="$t"
      if [ "$q/$t" = "$ticket" ]; then pos=$n; fi
    done
    if [ "$q/$first" = "$ticket" ] && mkdir "$lock" 2>/dev/null; then break; fi
    owner="$(cat "$lock/pid" 2>/dev/null || true)"
    if [ -n "$owner" ] && ! kill -0 "$owner" 2>/dev/null; then rm -rf "$lock"; continue; fi
    if [ $((tick % 6)) -eq 0 ]; then
      echo "   $name: queue position $pos of $n, held by $(cat "$lock/who" 2>/dev/null || echo "pid ${owner:-?}")"
    fi
    tick=$((tick + 1))
    sleep "${LOCK_POLL:-5}"
  done
  rm -f "$ticket"
  echo $$ >"$lock/pid"
  echo "$who" >"$lock/who"
}

lock_drop() { rm -rf "$lock_dir/$1"; }
