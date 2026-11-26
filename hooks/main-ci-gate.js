#!/usr/bin/env node
// PreToolUse(Bash): refuse `gh pr merge` in gated repos while the default branch's latest
// CI run is still going or not green. Why: if CI cancels a running main run on every push,
// back-to-back merges leave most merges with no CI result of their own, and a red main
// nobody can trace to one PR. Rule: one merge per main CI result.
// `MAIN_FIX=1 gh pr merge ...` lets the PR that fixes a red main through.
//
// Config (env):
//   MAIN_CI_GATE_REPOS   comma-separated substrings of the repo (owner/name or origin URL)
//                        to gate. Unset or empty = gate nothing.
//   MAIN_CI_WORKFLOW     workflow file of main's CI (default ci.yml)
//   MAIN_BRANCH          default branch (default main)
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const REPOS = (process.env.MAIN_CI_GATE_REPOS || "").split(",").map((s) => s.trim()).filter(Boolean);
const WORKFLOW = process.env.MAIN_CI_WORKFLOW || "ci.yml";
const BRANCH = process.env.MAIN_BRANCH || "main";

// "https://github.com/o/r.git" or "git@github.com:o/r.git" -> "o/r"
function slug(s) {
  const m = String(s).trim().match(/github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/);
  return m ? m[1] : String(s).trim();
}

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
  if (!/\bgh\s+pr\s+merge\b/.test(cmd)) process.exit(0);

  const repoFlag = cmd.match(/(?:-R|--repo)[\s=]+(\S+)/);
  let repo = repoFlag ? repoFlag[1].replace(/^["']|["']$/g, "") : "";
  if (!repo) {
    const dirMatch = cmd.match(/^\s*cd\s+(\S+)\s*&&/);
    const dir = dirMatch ? path.resolve(cwd, dirMatch[1].replace(/^["']|["']$/g, "")) : cwd;
    try {
      repo = execFileSync("git", ["-C", dir, "remote", "get-url", "origin"], { encoding: "utf8" });
    } catch {
      process.exit(0);
    }
  }
  if (!REPOS.some((r) => repo.includes(r))) process.exit(0);
  const REPO = slug(repo);

  // Fails open when gh is unreachable; a second merge in the ~10s before GitHub registers
  // the first one's run also gets through.
  let run;
  try {
    const out = execFileSync(
      "gh",
      ["run", "list", "--repo", REPO, "--branch", BRANCH, "--workflow", WORKFLOW, "--limit", "1",
        "--json", "databaseId,status,conclusion,headSha"],
      { encoding: "utf8", timeout: 8000 },
    );
    run = JSON.parse(out)[0];
  } catch {
    process.exit(0);
  }
  if (!run) process.exit(0);

  const sha = run.headSha.slice(0, 8);
  if (run.status !== "completed") {
    process.stderr.write(
      `main-ci-gate: blocked. ${BRANCH}'s CI on ${sha} is still ${run.status} (run ${run.databaseId}).\n` +
        `Wait for it: gh run watch ${run.databaseId} --repo ${REPO} --exit-status, then merge.\n` +
        `One merge per ${BRANCH} CI result, so a red ${BRANCH} points at exactly one PR.\n`,
    );
    process.exit(2);
  }
  if (run.conclusion === "success" || /\bMAIN_FIX=1\b/.test(cmd)) process.exit(0);

  // A cancelled latest run means a newer push superseded it and no run exists for the
  // branch's current head (the list is newest first): re-run it, keep blocking until green.
  if (run.conclusion === "cancelled") {
    try {
      const head = execFileSync("gh", ["api", `repos/${REPO}/commits/${BRANCH}`, "--jq", ".sha"],
        { encoding: "utf8", timeout: 8000 }).trim();
      if (head.startsWith(run.headSha) || run.headSha.startsWith(head)) {
        execFileSync("gh", ["run", "rerun", String(run.databaseId), "--repo", REPO], { stdio: "ignore", timeout: 8000 });
      } else {
        execFileSync("gh", ["workflow", "run", WORKFLOW, "--repo", REPO, "--ref", BRANCH], { stdio: "ignore", timeout: 8000 });
      }
    } catch {
      process.exit(0); // gh error: fail open, as above
    }
    process.stderr.write(
      `main-ci-gate: blocked. ${BRANCH}'s latest CI on ${sha} was cancelled; I re-triggered it.\n` +
        `Wait until it is green (gh run list --repo ${REPO} --branch ${BRANCH} --workflow ${WORKFLOW} --limit 1), then merge.\n`,
    );
    process.exit(2);
  }

  process.stderr.write(
    `main-ci-gate: blocked. ${BRANCH}'s CI on ${sha} ended ${run.conclusion} (run ${run.databaseId}).\n` +
      `Fix ${BRANCH} first. Only the PR that fixes this failure may merge, as: MAIN_FIX=1 gh pr merge ...\n` +
      `If ${BRANCH} is red for a reason outside your PR, tell the owner instead of merging.\n`,
  );
  process.exit(2);
});
