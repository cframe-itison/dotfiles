#!/usr/bin/env node
// remctl-mcp — a zero-dependency Model Context Protocol (stdio) server that
// exposes the RemCTL Apple Reminders CLI as a single MCP tool.
//
// Why this exists: Claude Cowork / Claude Desktop can call MCP tools but do not
// guarantee a general shell. This server gives them a sanctioned way to run the
// `remctl` binary without one. The `remctl` SKILL.md remains the source of truth
// for WHICH commands to run; this server only EXECUTES them.
//
// Transport: MCP stdio — newline-delimited JSON-RPC 2.0 on stdin/stdout.
// Diagnostics go to stderr only (stdout must stay pure JSON-RPC).
//
// Config (Cowork / Claude Desktop claude_desktop_config.json):
//   "remctl": { "command": "node", "args": ["/abs/path/bin/remctl-mcp.mjs"] }
//
// Env:
//   REMCTL_BIN      override the remctl binary path (default: ~/.local/bin/remctl, then PATH)
//   REMCTL_TIMEOUT  per-call timeout in ms (default: 60000)

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const SERVER = { name: "remctl", version: "0.1.0" };
const DEFAULT_PROTOCOL = "2025-06-18";
const TIMEOUT_MS = Number(process.env.REMCTL_TIMEOUT) || 60000;
const MAX_BUFFER = 16 * 1024 * 1024; // remctl --json on a big list can be large

// Resolve the remctl binary once at startup.
function resolveBin() {
  if (process.env.REMCTL_BIN) return process.env.REMCTL_BIN;
  const local = path.join(homedir(), ".local", "bin", "remctl");
  if (existsSync(local)) return local;
  return "remctl"; // fall back to PATH lookup
}
const REMCTL_BIN = resolveBin();
// remctl shells out to sibling helpers (remctl-bridge, remctl-private). Make sure
// the binary's own directory is on PATH for the child so it can find them.
const CHILD_ENV = { ...process.env };
if (REMCTL_BIN.includes(path.sep)) {
  const dir = path.dirname(REMCTL_BIN);
  CHILD_ENV.PATH = `${dir}${path.delimiter}${CHILD_ENV.PATH || ""}`;
}

// remctl subcommands that only read state (no mutations). Anything not here is
// treated as a write and routed through the gated `remctl_write` tool.
const READ_COMMANDS = new Set([
  "lists", "smart-lists", "templates", "template-info", "show", "search",
  "today", "flagged", "urgent", "tags", "subtasks", "info", "sections",
  "sharees", "stats", "link", "upcoming", "overdue", "list-symbols", "doctor",
]);

const INPUT_SCHEMA = {
  type: "object",
  properties: {
    args: {
      type: "array",
      items: { type: "string" },
      description:
        "Arguments passed to remctl, one argv token per element. Do NOT include the word 'remctl', " +
        "and do NOT pre-quote tokens — each element is a separate argv token (no shell), so spaces and " +
        "quotes in titles are safe.",
    },
  },
  required: ["args"],
  additionalProperties: false,
};

const READ_TOOL = {
  name: "remctl_read",
  description:
    "Read-only Apple Reminders queries via RemCTL — never mutates. Prefer --json. " +
    "Allowed first arg: " + [...READ_COMMANDS].join(", ") + ". " +
    "Examples: [\"today\",\"--json\"], [\"show\",\"Work\",\"--json\"], [\"info\",\"23880\",\"--json\"]. " +
    "If reminders access seems broken, run [\"doctor\",\"--for-agent\",\"--json\"].",
  inputSchema: INPUT_SCHEMA,
  annotations: {
    title: "RemCTL (read)",
    readOnlyHint: true,
    openWorldHint: false,
  },
};

const WRITE_TOOL = {
  name: "remctl_write",
  description:
    "Create, edit, complete, or delete Apple Reminders (and lists/smart-lists/templates) via RemCTL. " +
    "Pass the argv after `remctl` as `args`; add --json to get a verifiable result. " +
    "Use --private ONLY for synced tags, sections, subtasks, rich URLs, flags/urgent, Early Reminders, " +
    "location alarms, list/smart-list appearance & pinning, Groceries, custom smart lists, and templates. " +
    "Examples: [\"add\",\"Buy milk\",\"-l\",\"Inbox\",\"--json\"], [\"done\",\"23880\",\"--json\"], " +
    "[\"edit\",\"23880\",\"--private\",\"-t\",\"urgent\",\"--json\"].",
  inputSchema: INPUT_SCHEMA,
  annotations: {
    title: "RemCTL (write)",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
};

const TOOLS = [READ_TOOL, WRITE_TOOL];

function runRemctl(args) {
  return new Promise((resolve) => {
    execFile(
      REMCTL_BIN,
      args,
      { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER, env: CHILD_ENV },
      (err, stdout, stderr) => {
        const out = (stdout || "").trim();
        const errOut = (stderr || "").trim();
        let exitCode = 0;
        let extra = "";
        if (err) {
          if (err.killed) {
            exitCode = -1;
            extra = `\n[remctl timed out after ${TIMEOUT_MS}ms]`;
          } else if (typeof err.code === "number") {
            exitCode = err.code;
          } else if (err.code === "ENOENT") {
            exitCode = 127;
            extra = `\n[remctl binary not found at "${REMCTL_BIN}" — set REMCTL_BIN]`;
          } else {
            exitCode = 1;
            extra = `\n[${err.message}]`;
          }
        }
        const parts = [];
        if (out) parts.push(out);
        if (errOut) parts.push(`[stderr]\n${errOut}`);
        parts.push(`[exit ${exitCode}]${extra}`);
        resolve({ text: parts.join("\n\n"), isError: exitCode !== 0 });
      }
    );
  });
}

// ---- JSON-RPC plumbing over stdio ----------------------------------------

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}
function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}
function replyError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handle(msg) {
  const { id, method, params } = msg;
  const isRequest = id !== undefined && id !== null;

  switch (method) {
    case "initialize": {
      const protocolVersion = params?.protocolVersion || DEFAULT_PROTOCOL;
      reply(id, {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: SERVER,
      });
      return;
    }
    case "notifications/initialized":
    case "notifications/cancelled":
      return; // notifications: no response
    case "ping":
      if (isRequest) reply(id, {});
      return;
    case "tools/list":
      reply(id, { tools: TOOLS });
      return;
    case "tools/call": {
      const name = params?.name;
      if (name !== READ_TOOL.name && name !== WRITE_TOOL.name) {
        replyError(id, -32602, `Unknown tool: ${name}`);
        return;
      }
      const args = params?.arguments?.args;
      if (!Array.isArray(args) || !args.every((a) => typeof a === "string")) {
        reply(id, {
          content: [{ type: "text", text: "`args` must be an array of strings." }],
          isError: true,
        });
        return;
      }
      // Keep readOnlyHint honest: refuse mutations through the read tool.
      if (name === READ_TOOL.name && !READ_COMMANDS.has(args[0])) {
        reply(id, {
          content: [{
            type: "text",
            text: `remctl_read only runs read commands (${[...READ_COMMANDS].join(", ")}). ` +
              `For "${args[0] ?? ""}" use remctl_write.`,
          }],
          isError: true,
        });
        return;
      }
      const { text, isError } = await runRemctl(args);
      reply(id, { content: [{ type: "text", text }], isError });
      return;
    }
    default:
      if (isRequest) replyError(id, -32601, `Method not found: ${method}`);
      return;
  }
}

let buf = "";
let pending = 0; // in-flight handlers; don't exit on stdin end until they drain
let stdinEnded = false;
function maybeExit() {
  if (stdinEnded && pending === 0) process.exit(0);
}
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue; // ignore malformed lines
    }
    pending++;
    handle(msg)
      .catch((e) => {
        if (msg && msg.id != null) replyError(msg.id, -32603, String(e?.message || e));
      })
      .finally(() => {
        pending--;
        maybeExit();
      });
  }
});
process.stdin.on("end", () => {
  stdinEnded = true;
  maybeExit();
});

process.stderr.write(`remctl-mcp ready (bin: ${REMCTL_BIN})\n`);
