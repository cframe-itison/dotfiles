#!/usr/bin/env bash

# Install RemCTL: https://github.com/viticci/remctl
# Sources cloned to ~/.local/share/remctl, binaries installed to ~/.local/bin.

set -euo pipefail

SRC_DIR="$HOME/.local/share/remctl"
REPO_URL="https://github.com/viticci/remctl.git"
SKILL_LINK="$HOME/.claude/skills/remctl/SKILL.md"

if [ -d "$SRC_DIR/.git" ]; then
	git -C "$SRC_DIR" pull --ff-only
else
	mkdir -p "$(dirname "$SRC_DIR")"
	git clone "$REPO_URL" "$SRC_DIR"
fi

cd "$SRC_DIR"
PREFIX="$HOME/.local" ./install.sh --bootstrap

mkdir -p "$(dirname "$SKILL_LINK")"
ln -sfn "$SRC_DIR/SKILL.md" "$SKILL_LINK"
