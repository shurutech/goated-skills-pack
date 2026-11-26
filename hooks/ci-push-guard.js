#!/usr/bin/env node
// PreToolUse(Bash): refuse `git push` / `gh pr create|ready` in guarded repos unless a
// local CI run passed on the exact HEAD. The pass is a stamp file in the git dir
// (`git rev-parse --git-path ci-local-pass`) holding the HEAD sha; write it with
// hooks/bin/ci-local-stamp.sh. Rule: run all of CI locally, push only when it is green.
//
// Config (env):
//   CI_PUSH_GUARD_REPOS  comma-separated substrings of the origin URL to guard,
//                        e.g. "my-org/web,my-org/api". Unset or empty = guard nothing.
//   CI_LOCAL_CMD         what to tell the agent to run (default below).
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPOS = (process.env.CI_PUSH_GUARD_REPOS || "").split(",").map((s) => s.trim()).filter(Boolean);
const CI_LOCAL_CMD = process.env.CI_LOCAL_CMD || "~/.claude/hooks/bin/ci-local-stamp.sh <your full local CI command>";

let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  if (!REPOS.length) process.exit(0);
  let cmd, cwd;
  try {
    const data = JSON.parse(input);
    cmd = data.tool_input?.command ?? "";
    cwd = data.cwd ?? process.cwd();
  } catch {
    process.exit(0);
  }

  const pushes = /\bgit\b(?:\s+-C\s+\S+)?\s+push\b/.test(cmd) || /\bgh\s+pr\s+(create|ready)\b/.test(cmd);
  if (!pushes) process.exit(0);
  // Deleting a remote branch pushes no code.
  if (/\bpush\b.*(--delete|\s:\S)/.test(cmd)) process.exit(0);

  const dirMatch = cmd.match(/\bgit\s+-C\s+(\S+)/) || cmd.match(/^\s*cd\s+(\S+)\s*&&/);
  const dir = dirMatch ? path.resolve(cwd, dirMatch[1].replace(/^["']|["']$/g, "")) : cwd;

  const git = (...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" }).trim();
  let remote, head, stampPath;
  try {
    remote = git("remote", "get-url", "origin");
    head = git("rev-parse", "HEAD");
    stampPath = path.resolve(dir, git("rev-parse", "--git-path", "ci-local-pass"));
  } catch {
    process.exit(0);
  }
  if (!REPOS.some((r) => remote.includes(r))) process.exit(0);

  // Checks HEAD only; `git push origin otherbranch` from a different checkout is not covered.
  const stamp = fs.existsSync(stampPath) ? fs.readFileSync(stampPath, "utf8").trim() : "";
  if (stamp === head) process.exit(0);

  process.stderr.write(
    `ci-push-guard: blocked. No local CI pass recorded for HEAD ${head.slice(0, 8)}` +
      (stamp ? ` (last pass was ${stamp.slice(0, 8)})` : "") +
      `.\nRun ${CI_LOCAL_CMD} from ${dir} and push only after it prints CI-LOCAL PASS.\n` +
      `Do not work around this guard; if the run cannot pass for a reason outside the change, tell the owner.\n`,
  );
  process.exit(2);
});
