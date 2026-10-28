#!/bin/bash
# One worktree per session — so sessions never share a working tree.
#
# Mikkel's checkout (~/projekter/studentathlete-dk) is used by several Claude sessions at
# once. Sharing it has cost a red main (a concurrent commit swept up another session's
# staged lines, 2026-09-10), a discarded edit (`git checkout --` on a shared file), and a
# checkout switched to another branch under a running session (2026-10-28).
#
#   bash scripts/worktree.sh <name>            new branch <name> from origin/main in ../studentathlete-<name>
#   bash scripts/worktree.sh <name> <branch>   check out an existing branch instead
#   bash scripts/worktree.sh --list            all worktrees
#   bash scripts/worktree.sh --remove <name>   remove it (refuses if it has uncommitted changes)
#
# node_modules is a symlink to the main checkout's, so no `npm ci` per worktree. Live scripts
# (deploy-live.sh, migrate-live.sh) still run from the main checkout on main.
set -e
MAIN="$(git -C "$(dirname "$0")/.." rev-parse --path-format=absolute --git-common-dir)/.."
MAIN="$(cd "$MAIN" && pwd)"
PARENT="$(dirname "$MAIN")"

case "$1" in
  ""|-h|--help) sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  --list) git -C "$MAIN" worktree list; exit 0 ;;
  --remove)
    [ -n "$2" ] || { echo "Usage: $0 --remove <name>"; exit 1; }
    git -C "$MAIN" worktree remove "$PARENT/studentathlete-$2"
    echo "Removed $PARENT/studentathlete-$2 (the branch is kept)."
    exit 0 ;;
esac

NAME="$1"
DIR="$PARENT/studentathlete-$NAME"
[ -e "$DIR" ] && { echo "$DIR already exists."; exit 1; }
git -C "$MAIN" fetch -q origin
if [ -n "$2" ]; then
  git -C "$MAIN" worktree add -q "$DIR" "$2"
else
  git -C "$MAIN" worktree add -q -b "$NAME" "$DIR" origin/main
fi
ln -s "$MAIN/node_modules" "$DIR/node_modules"
echo "Worktree: $DIR (branch $(git -C "$DIR" branch --show-current))"
