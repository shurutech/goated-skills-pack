#!/usr/bin/env bash
# Install skills (and optionally hooks + rules) into Claude Code.
#
#   ./install.sh                      # all skills -> ~/.claude/skills
#   ./install.sh verify-claim anti-sycophancy   # only these
#   ./install.sh --project            # into ./.claude/skills of the current repo
#   ./install.sh --hooks              # also copy hooks to ~/.claude/hooks (wire them yourself, see hooks/README.md)
#   ./install.sh --rules              # also append rules/CLAUDE.md to ~/.claude/CLAUDE.md
#   ./install.sh --link               # symlink instead of copy (git pull = update)
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.claude"
MODE=copy HOOKS=0 RULES=0 PICK=()

for a in "$@"; do
  case "$a" in
    --project) DEST="$PWD/.claude" ;;
    --hooks) HOOKS=1 ;;
    --rules) RULES=1 ;;
    --link) MODE=link ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *) PICK+=("$a") ;;
  esac
done

mkdir -p "$DEST/skills"
MARK=.goated-skills-pack
ours() { # dst: a symlink, or a copy we installed earlier
  [ -L "$1" ] || [ -f "$1/$MARK" ] || [ -f "$(dirname "$1")/$MARK.$(basename "$1")" ]
}
place() { # src dst
  if [ -e "$2" ] && ! ours "$2"; then echo "skip $2 (exists, not installed by this pack)"; return; fi
  rm -rf "$2"
  if [ "$MODE" = link ]; then ln -s "$1" "$2"
  else
    cp -R "$1" "$2"
    if [ -d "$2" ]; then touch "$2/$MARK"; else touch "$(dirname "$2")/$MARK.$(basename "$2")"; fi
  fi
  echo "ok   $2"
}

if [ ${#PICK[@]} -eq 0 ]; then
  for d in "$SRC"/skills/*/; do PICK+=("$(basename "$d")"); done
else
  PICK+=("_shared") # builders reference shared briefs
fi
for s in "${PICK[@]}"; do
  [ -d "$SRC/skills/$s" ] || { echo "no such skill: $s" >&2; exit 1; }
  place "$SRC/skills/$s" "$DEST/skills/$s"
done

if [ "$HOOKS" = 1 ]; then
  mkdir -p "$DEST/hooks"
  for f in "$SRC"/hooks/*.js "$SRC"/hooks/bin; do place "$f" "$DEST/hooks/$(basename "$f")"; done
  echo "hooks copied; add them to settings.json — see hooks/README.md"
fi

if [ "$RULES" = 1 ]; then
  if grep -q "goated-skills-pack rules" "$DEST/CLAUDE.md" 2>/dev/null; then
    echo "rules already in $DEST/CLAUDE.md"
  else
    { printf '\n<!-- goated-skills-pack rules -->\n'; cat "$SRC/rules/CLAUDE.md"; } >> "$DEST/CLAUDE.md"
    echo "ok   rules appended to $DEST/CLAUDE.md"
  fi
fi
