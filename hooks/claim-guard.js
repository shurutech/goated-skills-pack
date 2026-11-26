#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Stop hook: if the final message claims tests pass / build succeeds / lint is clean /
// "verified it works" with no matching command run since the last edit, block once and
// ask for the command's output or an explicit [I] (inferred) tag. Exit 2 shows stderr to the model.
const STATE_DIR = path.join(os.homedir(), '.claude', 'tmp', 'claim-guard');
const MAX_BLOCKS_PER_TURN = 1;
const ESCAPE_TOKEN = '[claim-guard: quoting]';

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function stripNonAssertions(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/^\s*>.*$/gm, ' ')
    .replace(/^\s*\|.*$/gm, ' ')
    .replace(/^\s*#{1,6}\s.*$/gm, ' ')
    // quoted text is a quotation, not an assertion
    .replace(/"[^"\n]*"/g, ' ')
    .replace(/“[^”\n]*”/g, ' ')
    // sentences/lines tagged [I] are explicitly inferred, not claimed
    .split(/(?<=[.!?])\s+|\n/)
    .filter((s) => !/\[I\]/.test(s))
    .join('\n');
}

const CLAIM_RULES = [
  {
    id: 'tests',
    claim: /\b(?:all\s+)?tests?\s+(?:now\s+)?(?:pass(?:es|ing|ed)?|are\s+passing|are\s+green)\b|\b\d+\s*\/\s*\d+\s+(?:tests?\s+)?pass|\bsuite\s+is\s+green\b|\btest\s+suite\s+passes\b/i,
    evidence: /\b(?:pytest|vitest|jest|playwright|npm\s+(?:run\s+)?test|pnpm\s+(?:run\s+)?test|yarn\s+test|go\s+test|cargo\s+test|bun\s+test|rspec|phpunit|test:e2e|test:unit)\b/i,
    hint: 'run the test command and quote its summary line',
  },
  {
    id: 'build',
    claim: /\bbuild\s+(?:succeeds|succeeded|passes|passed|is\s+(?:green|clean)|works)\b|\bcompiles\s+(?:clean|cleanly|fine)\b/i,
    evidence: /\b(?:npm\s+(?:run\s+)?build|pnpm\s+(?:run\s+)?build|yarn\s+build|next\s+build|vite\s+build|tsc\b|cargo\s+build|go\s+build|make\b|docker\s+build|bun\s+build)/i,
    hint: 'run the build and quote its exit status',
  },
  {
    id: 'static',
    claim: /\b(?:lint(?:er|ing)?|typecheck|type\s+check(?:ing)?|mypy|ruff|eslint|type\s+errors?)\s+(?:is\s+|are\s+|comes?\s+back\s+)?(?:clean|clear|passes|passed|passing|green|ok)\b|\bno\s+type\s+errors\b/i,
    evidence: /\b(?:ruff|mypy|eslint|biome|npm\s+(?:run\s+)?(?:lint|typecheck)|pnpm\s+(?:run\s+)?(?:lint|typecheck)|yarn\s+(?:lint|typecheck)|tsc\b|golangci-lint|clippy)\b/i,
    hint: 'run the linter/typechecker and quote its output',
  },
  {
    id: 'asserted',
    claim: /\b(?:i\s+)?(?:verified|confirmed)\s+(?:that\s+)?(?:it|this|the)\b|\bconfirmed\s+working\b|\bverified\s+working\b|\bworks\s+end[\s-]to[\s-]end\b|\bfully\s+working\b|\bit\s+works\s+now\b/i,
    evidence: null,
    hint: 'name the command, file:line, or screenshot that proves it, or downgrade the wording to [I]',
  },
];

const NEGATION = /\b(?:not|never|without|no|cannot|can't|cant|didn't|didnt|haven't|havent|hasn't|hasnt|unverified|before|unless|until|would|should|if|whether|claim(?:ing|ed)?|say(?:ing)?|assert(?:ing)?)\b/i;

function isNegated(haystack, index) {
  return NEGATION.test(haystack.slice(Math.max(0, index - 45), index));
}

function readTurnToolUse(transcriptPath) {
  const out = { commands: [], tools: [], ok: false };
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return out;

  let lines;
  try {
    lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
  } catch {
    return out;
  }

  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      /* skip malformed line */
    }
  }

  let start = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e && e.type === 'user' && e.message) {
      const c = e.message.content;
      const isRealUser =
        typeof c === 'string' ||
        (Array.isArray(c) && c.some((b) => b && b.type === 'text'));
      if (isRealUser) {
        start = i;
        break;
      }
    }
  }

  // Evidence = commands run after the last code edit (any turn), so a run from
  // an earlier turn counts, but a run from before the latest edit does not.
  const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
  const all = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const c = e && e.message && e.message.content;
    if (!Array.isArray(c)) continue;
    for (const block of c) {
      if (block && block.type === 'tool_use') all.push({ i, block });
    }
  }
  let lastEdit = -1;
  all.forEach((t, k) => {
    if (EDIT_TOOLS.has(String(t.block.name || ''))) lastEdit = k;
  });
  all.forEach((t, k) => {
    if (t.i >= start) out.tools.push(String(t.block.name || ''));
    const cmd = t.block.input && t.block.input.command;
    if (k > lastEdit && typeof cmd === 'string') out.commands.push(cmd);
  });

  out.ok = true;
  return out;
}

function loadState(sessionId) {
  const f = path.join(STATE_DIR, `${sessionId}.json`);
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return { hash: null, blocks: 0 };
  }
}

function saveState(sessionId, state) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(path.join(STATE_DIR, `${sessionId}.json`), JSON.stringify(state));
  } catch {
    /* state is best-effort */
  }
}

function main() {
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    process.exit(0);
  }

  const message = String(input.last_assistant_message || '');
  const sessionId = String(input.session_id || 'unknown');

  if (!message || message.includes(ESCAPE_TOKEN)) process.exit(0);
  if (input.agent_id) process.exit(0);

  const prose = stripNonAssertions(message);
  const turn = readTurnToolUse(input.transcript_path);
  if (!turn.ok) process.exit(0);

  const allCommands = turn.commands.join('\n');
  const ranAnyTool = turn.tools.length > 0;

  const violations = [];
  for (const rule of CLAIM_RULES) {
    const m = rule.claim.exec(prose);
    if (!m) continue;
    if (isNegated(prose, m.index)) continue;

    const satisfied = rule.evidence
      ? rule.evidence.test(allCommands)
      : ranAnyTool;
    if (satisfied) continue;

    violations.push({ quote: m[0].trim(), hint: rule.hint });
  }

  if (violations.length === 0) {
    saveState(sessionId, { hash: null, blocks: 0 });
    process.exit(0);
  }

  const hash = crypto.createHash('sha1').update(message).digest('hex');
  const state = loadState(sessionId);
  const blocks = state.hash === hash ? state.blocks : 0;

  if (blocks >= MAX_BLOCKS_PER_TURN) {
    saveState(sessionId, { hash: null, blocks: 0 });
    process.exit(0);
  }

  saveState(sessionId, { hash, blocks: blocks + 1 });

  const lines = [
    'claim-guard: you made a verification claim this turn with no matching command in the transcript.',
    '',
  ];
  for (const v of violations) {
    lines.push(`  claimed: "${v.quote}"  -->  ${v.hint}`);
  }
  lines.push(
    '',
    'Do one of these, then finish:',
    '  1. Run the command now and quote the decisive line of its output.',
    '  2. Retract the claim and restate it as inferred, tagged [I].',
    'Do not restate the claim unchanged. If you were quoting an example rather than',
    `asserting it, include the literal token ${ESCAPE_TOKEN} in your message.`
  );

  process.stderr.write(lines.join('\n') + '\n');
  process.exit(2);
}

main();
