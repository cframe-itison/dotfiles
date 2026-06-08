# RemCTL + Claude

[RemCTL](https://github.com/viticci/remctl) is a power-user Apple Reminders CLI.
This directory is the self-contained wiring that exposes it to Claude across
three surfaces. Run the commands below from inside `remctl/`.

| Surface | Executes `remctl` via | Skills load? | Works? |
| --- | --- | --- | --- |
| **Claude Code** (CLI / IDE) | built-in Bash tool (`Bash(remctl:*)` allowed in `../.claude/settings.json`) | yes | ✅ out of the box |
| **Claude Cowork** | the `remctl` MCP server below | yes (plugins) | ✅ once configured + macOS permission granted |
| **Claude Desktop** | the `remctl` MCP server below | yes (Capabilities → Skills) | ✅ once configured + macOS permission granted |

## Layout

```
remctl/
  install.sh           # clone + build viticci/remctl, symlink the remctl skill
  remctl-mcp.mjs       # zero-dep Node stdio MCP server (canonical source)
  config.example.json  # manual MCP config for Cowork/Desktop
  mcpb/manifest.json   # .mcpb bundle manifest
  mcpb/build.sh        # builds dist/remctl-reminders.mcpb from the server above
```

The two skills live where Claude expects skills, outside this directory:

- **`remctl`** — full CLI reference, symlinked into `~/.claude/skills/` from the
  cloned repo by `install.sh`.
- **`reminders-workflow`** — personal tag/Eisenhower conventions, kept in dotfiles
  at `../.claude/skills/reminders-workflow/` (it's personal, not part of the
  shareable tooling).

## Install

```bash
./install.sh           # clone + build remctl, symlink the remctl skill
remctl onboard         # grant macOS Reminders / Automation / Full Disk Access
remctl doctor          # verify
```

## The MCP server (Cowork & Desktop)

`remctl-mcp.mjs` is a zero-dependency Node stdio MCP server. Cowork/Desktop can
call MCP tools but don't guarantee a general shell, so this gives them a
sanctioned execution path. The skills remain the source of truth for *which*
commands to run; the server only runs them.

It exposes **two annotated tools** so clients can auto-run reads but gate writes:

| Tool | Annotation | Use |
| --- | --- | --- |
| `remctl_read` | `readOnlyHint: true` | `today`, `show`, `search`, `info`, `lists`, … — refuses any non-read subcommand |
| `remctl_write` | `destructiveHint: true` | `add`, `edit`, `done`, `delete`, list/smart-list/template writes |

(Annotations drive Cowork/Desktop auto-run-vs-prompt. Claude Code ignores them —
it's purely name-based, so gate writes there with `mcp__remctl__remctl_write` in
`ask`/`deny` if you wire the server into the CLI.)

- Runs the `remctl` binary directly with an args array (`execFile`, **no shell**),
  so reminder titles containing quotes/`;`/`$` can't inject.
- Resolves the binary from `REMCTL_BIN`, then `~/.local/bin/remctl`, then `PATH`.
- `REMCTL_TIMEOUT` (ms) overrides the per-call timeout (default 60000).

### Option A — install the `.mcpb` bundle (recommended for Cowork/Desktop)

`.mcpb` is Claude's Desktop Extension format: a one-double-click install, no
hand-editing JSON, and Desktop runs it with its own bundled Node (so a system
Node isn't required).

```bash
./mcpb/build.sh                 # → dist/remctl-reminders.mcpb
```

Then open `dist/remctl-reminders.mcpb` with the Claude app (or **Settings →
Extensions → Install Extension…**) and enable it. The bundle's source is
`mcpb/manifest.json` + the canonical server in `remctl-mcp.mjs`.

**Signing (optional).** The bundle is unsigned, so the app may warn on install.
If you have an Apple Developer ID Application cert:

```bash
./mcpb/build.sh --sign "Developer ID Application: Your Name (TEAMID)"
```

### Option B — manual config

Merge `config.example.json` into Claude's config (same file for Cowork and
Desktop on macOS):

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

```json
{
  "mcpServers": {
    "remctl": {
      "command": "node",
      "args": ["/Users/cframe/Work/dotfiles/remctl/remctl-mcp.mjs"]
    }
  }
}
```

Restart the Claude app. Then add the two skill folders under **Settings →
Capabilities → Skills** so the conventions load alongside the tool.

### macOS permission caveat

The **Claude app process** (not your terminal) must hold Reminders access the
first time it writes via EventKit — macOS shows a one-time TCC prompt. If reads
work but writes fail, run the doctor check from within that context: ask Claude
to call `remctl_read` with `["doctor", "--for-agent", "--json"]` and check
`private_helper` before using `--private`.

### Smoke test the server from a terminal

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"remctl_read","arguments":{"args":["lists","--json"]}}}' \
  | node remctl-mcp.mjs
```

### Optional: also expose it to Claude Code over MCP

Claude Code already runs `remctl` via Bash, so this is redundant — but if you
want the same MCP tool there:

```bash
claude mcp add remctl -- node /Users/cframe/Work/dotfiles/remctl/remctl-mcp.mjs
```
