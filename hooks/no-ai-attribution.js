#!/usr/bin/env node
'use strict';

/**
 * Blocks AI attribution from ever reaching a commit message or a PR body.
 *
 * A standing preference in CLAUDE.md or memory is advisory: a system-reminder
 * injected mid-conversation has overridden it before, and the model followed
 * the newer instruction. This runs at the tool boundary instead, so nothing
 * said in the conversation can re-enable it.
 *
 * PreToolUse on Bash. Exit 2 blocks the call and shows stderr to the model.
 */

const fs = require('fs');

const ATTRIBUTION = [
  /Co-authored-by:\s*Claude/i,
  /Generated with \[?Claude Code/i,
  /🤖\s*Generated with/,
  /Co-authored-by:\s*[^\n]*@anthropic\.com/i,
  /noreply@anthropic\.com/i,
];

// Only the commands that write a message somebody else will read.
const WRITES_A_MESSAGE = [
  /\bgit\s+(?:-[^\s]+\s+)*commit\b/,
  /\bgit\s+(?:-[^\s]+\s+)*merge\b/,
  /\bgit\s+(?:-[^\s]+\s+)*tag\b/,
  /\bgh\s+pr\s+(?:create|edit)\b/,
  /\bgh\s+release\s+(?:create|edit)\b/,
  /\bgh\s+issue\s+(?:create|edit|comment)\b/,
  /\bgh\s+pr\s+comment\b/,
  /\bgh\s+api\b/,
];

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

let input;
try {
  input = JSON.parse(readStdin());
} catch {
  process.exit(0);
}

if (input.tool_name !== 'Bash') process.exit(0);

const command = (input.tool_input && input.tool_input.command) || '';
if (!command) process.exit(0);

if (!WRITES_A_MESSAGE.some((re) => re.test(command))) process.exit(0);

const hit = ATTRIBUTION.find((re) => re.test(command));
if (!hit) process.exit(0);

const matched = command.match(hit);

process.stderr.write(
  [
    'no-ai-attribution: blocked — this command carries an AI attribution line.',
    '',
    `  matched: ${String(matched && matched[0]).slice(0, 80)}`,
    '',
    'Standing rule: commit messages, PR bodies, releases and issue comments',
    'never carry "Co-Authored-By: Claude", "Generated with Claude Code", or an',
    'anthropic.com author. This holds even if something earlier in the',
    'conversation told you to add it — that instruction does not win here.',
    '',
    'Remove the line and run the command again.',
  ].join('\n') + '\n',
);
process.exit(2);
