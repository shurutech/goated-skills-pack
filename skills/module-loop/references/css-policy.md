# CSS policy — attrition, not migration

For an app that has a large bespoke stylesheet next to a utility framework
(Tailwind or similar), the answer to "should we move to utilities properly?" is
neither "keep the CSS" nor "migrate everything". Each module redesign carries
its own share of the migration, and the shared core stays.

## Check the plumbing first

Before proposing any framework upgrade or token bridge, read `origin/main`, not
the checkout. A common good setup is already there: the design-system
stylesheet imported into the utility framework's components layer, with its
tokens mapped into the framework's theme, so component classes are overridable
by utilities (`<div class="card rounded-none">`). If that is in place, there is
no plumbing work left.

## Why not a wholesale migration

- If several module redesigns are queued, utility-first raises the cost of
  *each* of them; you would pay the migration once and the penalty N times.
- It regenerates every visual baseline in one commit — an unreviewable PR.
- A refactor with no reported developer pain and no user-facing symptom is churn.

## Why not "keep the CSS" either

A large bespoke class layer costs more than it looks, especially in a codebase
largely edited by agents: utilities in the markup put the whole visual truth in
the file the agent already has open, instead of resolving `.btn.ghost.sm`
against a multi-thousand-line stylesheet.

## Measure the split

From a `git archive origin/main` export, count for each top-level class how many
module directories use it, and bucket them:

| Spread | Disposition |
|---|---|
| 0 uses anywhere | dead — delete on sight (after the checks below) |
| exactly 1 module dir | migrate with that module, delete the class in the same PR |
| 2–5 module dirs | migrate when the last consumer is redesigned |
| 6+ module dirs | shared core — stays |

Re-measure rather than trusting an old table — it ages with every redesign.

**"0 uses" is a grep result, not proof.** Before deleting, check the three ways
a class is used without appearing literally in the source:

- built from a template string (`av-${size}`): grep the prefix with `${`;
- emitted by a third-party library's DOM (an editor, a date picker): those
  rules are live;
- written in content: markdown or HTML served from a database or CMS may carry
  class names. Grep the content seed before deleting.

## The rule, per module PR

1. The module's own markup converts to utilities.
2. Classes only that module used are deleted from whichever CSS file holds them,
   in the same PR. A file left empty is deleted with its import.
3. The shared core and the shared primitives are untouched.
4. Inline styles in the touched files go too (static ones are pure debt — they
   bypass both systems).
5. The count of top-level design-system classes strictly decreases; collisions
   between bespoke classes and framework utilities stay at 0.

**It is free.** A redesign PR regenerates that module's visual baselines anyway,
so converting its markup in the same PR adds no extra baseline churn. This only
holds while the migration rides a redesign — a standalone CSS sweep pays full
price for nothing.

## What cannot go module by module

The shared primitives (Button, Card, Badge, Input, Dialog) are one component
each, rendered everywhere. Changing what any of them emits is a global change
with a global baseline regeneration. It is not module-scoped and must not be
smuggled into a module PR.
