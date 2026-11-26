#!/usr/bin/env node
// PreToolUse(Bash): refuse full lint, test runs, builds and husky commits in the listed
// projects unless they are queued behind hooks/bin/with-lock.sh. Why: several agent sessions
// running heavy gates in parallel on one machine push load and swap until everything times out.
// Only the command word of each segment is matched, so grep/rg/cat/echo/gh text that merely
// mentions vitest or `npm test` is never blocked.
//
// Config (env):
//   HEAVY_JOB_LOCK_PATHS  comma-separated path substrings (cwd or command) to police,
//                         e.g. "/projects/my-app,/work/api". Unset or empty = police nothing.
//   HEAVY_JOB_LOCK_NAME   lock name to queue on (default heavy-jobs)
//   WITH_LOCK             path of with-lock.sh (default ~/.claude/hooks/bin/with-lock.sh)
const fs = require("node:fs");
const path = require("node:path");

const PATHS = (process.env.HEAVY_JOB_LOCK_PATHS || "").split(",").map((s) => s.trim()).filter(Boolean);
const LOCK = process.env.HEAVY_JOB_LOCK_NAME || "heavy-jobs";
const WITH_LOCK = process.env.WITH_LOCK || "~/.claude/hooks/bin/with-lock.sh";

function stripHeredocs(cmd) {
  const out = [];
  let term = null;
  for (const line of cmd.split("\n")) {
    if (term !== null) {
      if (line.trim() === term) term = null;
      continue;
    }
    out.push(line);
    const m = /<<-?\s*['"]?([A-Za-z_]\w*)['"]?/.exec(line);
    if (m) term = m[1];
  }
  return out.join("\n");
}

// Quote-aware split into segments (; && || | newline, parens) of words.
function segments(cmd) {
  const segs = [];
  let words = [], cur = "", has = false, q = null;
  const endWord = () => { if (has) words.push(cur); cur = ""; has = false; };
  const endSeg = () => { endWord(); if (words.length) segs.push(words); words = []; };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) { if (c === q) q = null; else cur += c; continue; }
    if (c === "'" || c === '"') { q = c; has = true; continue; }
    if (c === "\\" && i + 1 < cmd.length) { cur += cmd[++i]; has = true; continue; }
    if (";|&\n()".includes(c)) { endSeg(); continue; }
    if (/\s/.test(c)) { endWord(); continue; }
    cur += c; has = true;
  }
  endSeg();
  return segs;
}

const SHELLS = new Set(["bash", "sh", "zsh"]);
const WRAPPERS = new Set(["npx", "time", "nice", "env", "exec", "command", "xargs", "sudo", "nohup"]);
const SCRIPTS = /^(lint|test|build|typecheck)\b/;
const HEAVY_BINS = new Set(["vitest", "jest", "eslint", "pytest", "mypy", "tsc"]);

function heavyWords(w, ctx) {
  for (let guard = 0; w.length && guard < 20; guard++) {
    while (w.length && /^\w+=/.test(w[0])) w = w.slice(1); // env assignments
    if (!w.length) return false;
    const base = path.basename(w[0]);
    if (WRAPPERS.has(base)) {
      w = w.slice(1);
      while (w.length && (w[0].startsWith("-") || /^\w+=/.test(w[0]))) w = w.slice(1);
      continue;
    }
    if (base === "timeout") {
      w = w.slice(1);
      while (w.length && w[0].startsWith("-")) w = w.slice(1);
      w = w.slice(1); // duration
      continue;
    }
    if (SHELLS.has(base)) {
      const i = w.findIndex((x) => /^-\w*c$/.test(x));
      return i >= 0 && w[i + 1] !== undefined && isHeavy(w[i + 1], ctx);
    }
    if (HEAVY_BINS.has(base)) return true;
    if (["npm", "pnpm", "yarn", "bun"].includes(base)) {
      const rest = w.slice(1).filter((x) => !x.startsWith("-"));
      const script = rest[0] === "run" || rest[0] === "run-script" ? rest[1] : rest[0];
      return !!script && SCRIPTS.test(script);
    }
    if (base === "next" || base === "vite") return w[1] === "build";
    if (base === "git") {
      let i = 1;
      while (i < w.length && w[i].startsWith("-")) i += w[i] === "-C" || w[i] === "-c" ? 2 : 1;
      return w[i] === "commit" && ctx.husky();
    }
    return false;
  }
  return false;
}

function isHeavy(cmd, ctx) {
  return segments(stripHeredocs(cmd)).some((w) => heavyWords(w, ctx));
}

let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  if (!PATHS.length) process.exit(0);
  let cmd, cwd;
  try {
    const data = JSON.parse(input);
    cmd = data.tool_input?.command ?? "";
    cwd = data.cwd ?? process.cwd();
  } catch {
    process.exit(0);
  }
  if (!PATHS.some((p) => cwd.includes(p) || cmd.includes(p))) process.exit(0);
  if (/with-lock\.sh|ci-local-stamp\.sh/.test(cmd)) process.exit(0);

  const dirMatch = cmd.match(/\bgit\s+-C\s+(\S+)/) || cmd.match(/^\s*cd\s+(\S+)\s*[;&]/);
  const dir = dirMatch ? path.resolve(cwd, dirMatch[1].replace(/^["']|["']$/g, "")) : cwd;
  const husky = () => !/--no-verify|HUSKY=0/.test(cmd) && fs.existsSync(path.join(dir, ".husky"));
  if (!isHeavy(cmd, { husky })) process.exit(0);

  process.stderr.write(
    "heavy-job-lock: blocked. Test runs, lint, typecheck, builds and commits that run pre-commit hooks " +
      "must queue machine-wide; parallel runs from several sessions hang the machine.\n" +
      `Re-run as: ${WITH_LOCK} ${LOCK} <same command>\n` +
      `(chains: ${WITH_LOCK} ${LOCK} bash -c '<a> && <b>'). Use a long Bash timeout or run in the background ` +
      "with ONE wait; a lock wait is queueing, never kill or retry it. The lock is re-entrant, so nesting is safe.\n",
  );
  process.exit(2);
});
