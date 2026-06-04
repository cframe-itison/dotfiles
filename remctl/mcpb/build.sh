#!/usr/bin/env bash
# Build the RemCTL .mcpb bundle for Claude Desktop / Cowork.
# Output: remctl/dist/remctl-reminders.mcpb
#
# Optional signing (needs an Apple Developer ID Application cert in the keychain):
#   ./remctl/mcpb/build.sh --sign "Developer ID Application: Your Name (TEAMID)"

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
BUILD="$HERE/build"
DIST="$ROOT/dist"
OUT="$DIST/remctl-reminders.mcpb"
MCPB="npx --yes @anthropic-ai/mcpb@latest"

rm -rf "$BUILD"
mkdir -p "$BUILD/server" "$DIST"

# The standalone server is the single source of truth; copy it in as the entry.
cp "$HERE/manifest.json" "$BUILD/manifest.json"
cp "$ROOT/remctl-mcp.mjs" "$BUILD/server/index.mjs"

$MCPB validate "$BUILD/manifest.json"
$MCPB pack "$BUILD" "$OUT"

if [ "${1:-}" = "--sign" ] && [ -n "${2:-}" ]; then
	$MCPB sign "$OUT" --identity "$2"
	$MCPB verify "$OUT"
fi

rm -rf "$BUILD"
echo "Built: $OUT"
