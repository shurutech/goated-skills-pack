# Design language: what it constrains

The project's design language is a settled value table (tokens, type scale,
spacing, colour families, what is and is not adopted). Read the real table;
this file lists the parts that get violated most and the traps around them.
If the project has none, write one with the owner before the first variant.

## Colour families are not interchangeable

Most design systems carry at least two families:

- **Semantic** (`--success`/`--success-ink`/`--success-bg`, `--accent`/
  `--accent-ink`/`--accent-bg`, `--danger`/...). This colours **text and
  tinted surfaces**.
- **Tint pairs** for badges or tags (`--tint-*`/`--tint-*-ink`). **Badges
  only.** The ink sits on its own matching tint, never on a white or page
  ground.

Putting a badge ink on a card is inventing a pattern. Use the semantic family.

## Spent once

An accent colour usually belongs to a few places only: the primary button, the
current/selected item, the active nav item. Not body text, not decoration. If
the system defines an accent "ink" for words, that is the only accent for
words. Shipped components that break this are worth fixing when you are
touching them anyway, and worth calling out in the PR body.

## Not adopted

Write down what the project explicitly rejected (for example: display serif,
dark chrome, pill badges, density toggle, card shadows). Variants never bring
these back.

## No hex literals

If a lint rule forbids hex literals, the token you need already exists, the
value you are about to hardcode is almost always a token verbatim.

## Generic-output tells to avoid

These read as generated: count pills on every group, a donut/dial gauge,
numbered step markers where the content is not really a sequence, a `→`
appended to link text, identical rounded cards with one shadow stamped on
everything, an ALL-CAPS eyebrow above every heading that carries no information.

If the design language *specifies* one of these (uppercase labels, say), it is
not a tell in that codebase, check the table rather than assuming.

## When feedback contradicts the spec

If the owner complains about something the design language mandates, the fix
is an amendment to the design language, not a local override. That changes
every page using it and every visual baseline. It is the owner's decision, not
yours, present the scope both ways.

## Surface to reference-component table

Grown as the owner names references ("make it like the settings tabs"). Add a
row the moment they name one; read it before proposing a variant, and reuse the
component instead of redrawing it.

| Surface | Reference component / page | Named by owner in |
|---|---|---|
| Tabs | | |
| Data table | | |
| Action rail | | |
