# Independent verification reference

The goal (pipeline step 4, one verifier per branch, given the cards and the
diff): an agent that did **not** write the code checks whether your claims
hold, using a concrete checklist. This catches plausible-but-wrong conclusions
before they reach the user. Keep the verifier read-only: it inspects and runs
checks, it does not edit.

## When to spawn one vs. run a command

- A **command** (`tsc --noEmit`, `npm run build`, `npm run lint`, `npm test`)
  is the cheapest hard evidence; always run the relevant ones.
- A **subagent** is for the judgment calls a command can't make: does the
  frontend type actually match the backend response? Is the feature wired
  through the right layers? Does a reused component behave as assumed here?
  Spawn it with a specific checklist tied to *this* change, not "review my work."

## Verifier prompt template

Fill the brackets with specifics from the change under review:

```
Read-only verification. Do NOT edit files. Report findings as a checklist with
PASS / FAIL / UNSURE and file:line evidence for each.

Context: I changed [files] to [do X]. It calls backend [endpoint(s)].

Verify:
1. Contract: does the frontend type [type] match the backend response for
   [endpoint]? Compare field by field; list any mismatch (missing field, wrong
   optionality, wrong type).
2. Layers: is the feature wired through [the API client / session store /
   role-aware routing] and not raw fetch / raw localStorage?
3. Blast radius: what imports [changed symbols]? Does any consumer now break?
4. Reuse assumptions: does [reused component] behave as assumed in this new
   context (props, variants, side effects)?
5. Build health: run the project's typecheck and report the result verbatim.

For anything you can't confirm, say UNSURE; do not guess PASS.
```

## Interpreting results

- **All PASS + green build**: you may state "verified" for those specific
  points. Name what was verified; don't generalize to "everything works."
- **Any FAIL**: fix, then re-verify. Loop until the checklist holds.
- **UNSURE**: treat as not-yet-verified. Either dig in yourself or flag it to
  the user as an open question. Never upgrade UNSURE to "done."

## Pre-existing breakage

If the verifier finds something broken that your change did **not** cause (a
failing pre-existing test, an unrelated type error, a contract mismatch
elsewhere), keep it separate in your report. It's real signal the user should
know about, but it's not part of your diff and you shouldn't fix it silently.
