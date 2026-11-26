#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// PostToolUse(Bash): after `gh pr create` / `gh pr edit --body` / `gh stack submit`, block once
// and tell the agent to have a fresh-context subagent audit the PR body against its diff
// (verify-claim skill, PR mode). Exit 2 shows stderr to the model.
const STATE_DIR = path.join(os.homedir(), '.claude', 'tmp', 'pr-claim-review');
// Where the verify-claim skill lives; override if you installed it per project.
const VERIFY_CLAIM_SKILL = process.env.VERIFY_CLAIM_SKILL || '~/.claude/skills/verify-claim/SKILL.md';
const PR_URL = /https:\/\/github\.com\/[^/\s"']+\/[^/\s"']+\/pull\/\d+/g;
const PR_CMD = /^(?:sudo\s+|env\s+\S+=\S+\s+)*gh\s+(?:pr\s+(?:create|edit)|stack\s+submit)\b/;

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function stripHeredocs(cmd) {
  const lines = cmd.split('\n');
  const out = [];
  let terminator = null;
  for (const line of lines) {
    if (terminator !== null) {
      if (line.trim() === terminator) terminator = null;
      continue;
    }
    const m = /<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/.exec(line);
    out.push(line);
    if (m) terminator = m[1];
  }
  return out.join('\n');
}

function isPrCommand(rawCommand) {
  const cmd = stripHeredocs(String(rawCommand || ''));
  const segments = cmd.split(/\n|;|&&|\|\||\||\(|\)|\{|\}/);
  return segments.some((s) => PR_CMD.test(s.trim()));
}

// 'edit' when the only PR command is `gh pr edit`, else 'create'.
function prKind(rawCommand) {
  const cmd = stripHeredocs(String(rawCommand || ''));
  const hits = cmd.split(/\n|;|&&|\|\||\||\(|\)|\{|\}/).map((s) => s.trim()).filter((s) => PR_CMD.test(s));
  return hits.length && hits.every((s) => /\bgh\s+pr\s+edit\b/.test(s)) ? 'edit' : 'create';
}

// Hash of the PR body text as passed on the command line (or --body-file); null if none.
function bodyHash(rawCommand) {
  const cmd = String(rawCommand || '');
  let body = null;
  const file = /(?:--body-file|-F)[\s=]+(\S+)/.exec(cmd);
  if (file && file[1] !== '-') {
    try {
      body = fs.readFileSync(file[1].replace(/^["']|["']$/g, ''), 'utf8');
    } catch {
      /* fall through to inline */
    }
  }
  if (body === null) {
    const m = /(?:--body|-b)(?:\s+|=)([\s\S]*?)(?=\s--(?:title|base|add-|remove-|milestone|project|reviewer|assignee|label)|$)/.exec(cmd);
    if (m) body = m[1];
  }
  if (body === null) return null;
  return crypto.createHash('sha1').update(body.replace(/\s+/g, ' ').trim()).digest('hex');
}

function collectPrUrls(input) {
  const haystacks = [];
  const r = input.tool_response;
  if (typeof r === 'string') haystacks.push(r);
  else if (r && typeof r === 'object') {
    for (const k of ['stdout', 'stderr', 'output', 'result']) {
      if (typeof r[k] === 'string') haystacks.push(r[k]);
    }
    if (haystacks.length === 0) {
      try {
        haystacks.push(JSON.stringify(r));
      } catch {
        /* ignore */
      }
    }
  }
  haystacks.push(String((input.tool_input && input.tool_input.command) || ''));
  const urls = new Set();
  for (const h of haystacks) {
    for (const m of h.matchAll(PR_URL)) urls.add(m[0]);
  }
  return [...urls];
}

// A PR is reviewed once, when it is created. A later `gh pr edit` re-fires only
// when its body text (the claims) changed; edits without a body change stay quiet.
function alreadyReviewed(sessionId, urls, kind, hash) {
  const f = path.join(STATE_DIR, `${sessionId}.json`);
  let state = { seen: [], bodies: {} };
  try {
    state = Object.assign(state, JSON.parse(fs.readFileSync(f, 'utf8')));
  } catch {
    /* first run */
  }
  const fresh = urls.filter((u) => {
    if (kind === 'edit') return hash !== null && state.bodies[u] !== hash;
    return !state.seen.includes(u);
  });
  if (fresh.length === 0) return null;
  for (const u of fresh) {
    if (!state.seen.includes(u)) state.seen.push(u);
    if (hash !== null) state.bodies[u] = hash;
  }
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(f, JSON.stringify(state));
  } catch {
    /* state is best-effort */
  }
  return fresh;
}

function main() {
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    process.exit(0);
  }
  if (input.agent_id) process.exit(0);
  if (!isPrCommand(input.tool_input && input.tool_input.command)) process.exit(0);

  const urls = collectPrUrls(input);
  if (urls.length === 0) process.exit(0);

  const command = input.tool_input && input.tool_input.command;
  const fresh = alreadyReviewed(String(input.session_id || 'unknown'), urls, prKind(command), bodyHash(command));
  if (!fresh) process.exit(0);

  const lines = [
    'pr-claim-review: a pull request now exists. Its body has not been checked against its diff.',
    '',
    'For each PR below, spawn ONE general-purpose subagent — it must not',
    'receive your reasoning, your summary, or any session history:',
    '',
  ];
  for (const u of fresh) lines.push(`  ${u}`);
  lines.push(
    '',
    'Subagent prompt (per PR, verbatim apart from the URL):',
    '',
    '  You are reviewing a pull request as an outside reader. You did not write it and you do',
    '  not know why it was written. Do not reconstruct the author\'s intent.',
    '  PR: <url>',
    `  Read ${VERIFY_CLAIM_SKILL} and follow its "PR mode" section exactly:`,
    '  fetch `gh pr view <url> --json title,body,headRefName,baseRefName` and `gh pr diff <url>`,',
    '  enumerate the claims, run the contradiction pass in both directions, and use the',
    '  HOLDS / WRONG / UNKNOWN vocabulary with its receipt rule. HOLDS with no receipt is',
    '  forbidden; no receipt means UNKNOWN.',
    '  Read-only: gh pr view, gh pr diff, git and file reads only. Never edit or push, never',
    '  comment on GitHub, never run tests or builds.',
    '  Judge the PR\'s claims, not the code\'s quality.',
    '  Output only the PR-mode report.',
    '',
    'Then act on it: fix the body or the PR for every WRONG, settle or delete every UNKNOWN',
    'process claim, and account for every unclaimed hunk. Report the outcome in plain words.',
    'Do not argue with the report from memory — it read the diff.'
  );

  process.stderr.write(lines.join('\n') + '\n');
  process.exit(2);
}

main();
