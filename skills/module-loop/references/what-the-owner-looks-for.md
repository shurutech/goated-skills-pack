# What the owner looks for

Run every round against this list BEFORE the owner sees it.

The list below was mined from several weeks of real design-review feedback.
The numbers in brackets show roughly how often each point came up. Treat it as a strong default: most owners
care about the same things. Then make it yours: mine your own owner's messages
(or ask them) and replace or extend each line with what they actually said,
with a quote.

## Check before showing anything

Consistency
- Looks like a page the owner already approved. Same palette, same card look,
  same sidebar pattern. (~23)
- Colours are the app's own and carry meaning. Status is colour coded; no black
  buttons, no off-palette greys. (~12)
- Built with the shared pieces (existing tooltip, key hint, dialog, rail group).
  Never a component rendered twice. (~8)

Actions
- Every action today stays a visible labelled button; ⋯ holds only rename and
  delete. Templates and options sit upfront, not in a dropdown. (~13)
- The primary CTA is obvious and in front of the user, never buried at the
  bottom or styled so it reads as disabled. (~10)
- Sidebar actions sit where the app's other sidebars put them. (~5)
- Fewer clicks: clicking the thing acts on it (a calendar row opens join, a chip
  assigns). (~9)
- Destructive or cascading actions get a confirm popup; delete is a trash icon. (~4)
- Secondary flows (add member, task list, settings) are popups. Toasts render
  outside the popup. (~12)

Layout and copy
- Rows and cards align, sizes are equal, no dead space at the bottom, nothing
  cramped or oversized. The owner checks this on their own screenshot. (~22)
- Less text. Plain words, short labels; put the rest behind an info icon or
  tooltip. (~13)
- Important things first: numbers and money at the top, detail below. (~4)
- Cards hold content only; no card around headers, no grey boxes. (~5)
- Missing data shows a dash, not a gap. Empty areas get something useful, and
  the page reads well when nothing is connected. (~5)

Nothing lost, nothing invented
- Parity with main: every field, stage, button and history item stays. Owners
  attach the old screenshot and list what went missing. (~10)
- Nothing that does not exist yet (a role, an option, a field). (~7)

Behaviour
- Motion on open, close, add and drop; smooth, never snapping, never "alive" or
  self-running unless asked. (~16)
- Edge states are built and clickable: missing image, add image, cancelled
  state, empty list, nothing to review, drag selecting text. (~12)
- Whole flow, not one screen: what happens after the click, where it redirects,
  whether the popup closes. (~6)

## Rejected on sight
- Generic "AI slop" look or decoration. Competitors and conventions should be
  web-searched first. (~12)
- Clutter, too much information, overwhelming popovers. (~10)
- Badges everywhere; dot timelines; checkboxes that look raw. (~5)
- Panels detached from the sidebar; heavy borders. (~5)
- Variants that are shades of one idea, or too many toggles to find the newest. (~4)
- Changes nobody asked for, or edits to the wrong target (V1 instead of V2). (~5)

## How owners review
- **Interactive, never screenshots.** Owners want to toggle
  designs and click through them themselves. Every preview is the
  live preview from `live-artifact.md`, with switches for variant,
  before/after, role and edge state. Screenshots are only your own
  pre-publish check.
- Before and after in the same preview, switchable.
- 5 genuinely different variants per round, then they pick or mix ("tab header
  from A, list from B"). Keep the newest on top and drop rejected ones.
- They click everything. A button that does nothing in the preview is a broken
  preview. Mock every mutation they could try.
- They open the built app and compare it to the approved preview. Before
  saying done, put the built screen and the approved variant side by side in
  the same preview and tick every approved element.
- A flat "don't like it" means research conventions and ask one targeted
  question, not guess again.
- Approval comes as "looks good, implement it", often with one more nitpick.
  Picking a variant is not a go; "implement" is.
