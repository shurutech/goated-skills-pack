# Responsive pattern catalog

Where per-scenario research starts, not where it ends. Studies and standards are in `evidence.md`. Each module round adds what
it learned to its own `RESEARCH.md`. Promote a finding here once two modules use it.
Sources were searched 2026-11-03. They are mostly design blogs, so treat
thresholds as heuristics and the W3C pages as normative.

## Widths

Tailwind v4 defaults: `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Keep them. Choose
per surface which one it breaks at; don't add custom breakpoints without the shell
round deciding it. The floor is 320 CSS px (WCAG 1.4.10 reflow, equal to 1280 at 400% zoom).

## By surface

| Surface | Patterns | Fits when | Fails when |
|---|---|---|---|
| App nav (shell) | Off-canvas drawer behind a hamburger. Bottom bar for 3 to 5 top destinations plus a More drawer. Icon rail on tablet. | Drawer: many destinations. Bottom bar: few, frequent ones. | Material advises against a drawer and bottom bar together. A bottom bar caps at 5. |
| Data table | Horizontal scroll with a sticky first column. Priority columns (hide by rank). Stacked cards per row. Expandable row. | Scroll: comparing across columns. Cards: records read one at a time ("items", not "rows"). | Priority hides business-critical fields. Cards lose table semantics for screen readers, so keep a list role and labels. Over about 6 columns, scroll gets painful. |
| Page header actions | Wrap to rows. Horizontal scroll strip. Main action plus a labelled More actions sheet (per module, the owner's call). | Wrap: 2 to 4 actions. Sheet: 5 or more. | An icon-only ⋯ hides actions. |
| Side rail / action rail | Drop under the content. Collapse into a sheet. Sticky bottom bar for the main action. | Use container queries on the rail's parent. | Using a viewport query for a rail that also lives in a drawer. |
| Master-detail | One pane at a time with a back control. Detail as a full-screen sheet. | Phones. Tablets in portrait. | The back control loses scroll position in the list. |
| Tabs | Scrollable tab strip with an edge fade. Select on very narrow widths. | Scroll strip keeps tabs discoverable. | A select hides the count badges. |
| Dialog | Centred on desktop, bottom sheet under 768 with the same primitive and the same a11y (focus trap, Esc, scrim). Full screen for long forms. | Sheet: filters, quick actions. Full screen: multi-step forms. | Opening a modal on top of a sheet. Finish or dismiss the sheet first. |
| Forms | One column under `md`. Labels on top. Inputs at least 16px on phones (Chrome on iPhone zooms otherwise). Sticky submit above the safe area. | Always. | Right-aligned inputs. |
| Card grid / stat tiles | `grid-cols-[repeat(auto-fill,minmax(…))]` or container queries. | Always. | Tiles in a row with different anatomy. |
| Charts | Fewer ticks, a legend below, a horizontal scroll for long time axes, a summary number first. | Always. | Tooltips that need hover. Tap must show them. |
| Boards, canvas, drag and drop | Pointer events with touch delay, a long press to drag, a view-only mode on phones if editing needs precision (the owner's call). | Use a pointer-events drag library, not HTML5 DnD. | HTML5 DnD on touch, which does not fire. |

## Cross-cutting rules

- **Container queries for components, viewport for page layout.** Name nested
  containers. Don't wrap everything in one.
- **Target size:** 24x24 CSS px minimum (WCAG 2.2 SC 2.5.8 AA), or 24px spacing
  to neighbours. 44x44 is the AAA level. Use it for phone primary actions.
- **Reflow:** no two-dimensional scroll at 320 except for content that needs it
  (data tables, maps, canvases), and that scroll stays inside its own box,
  never on the page.
- **Hover is not available on touch.** Every `group-hover:` reveal needs a visible
  or focus path.
- **Viewport units:** `dvh` for full height. Safe-area insets for bottom bars and sheets.

## Sources

- [Simon Willison, mobile table patterns](https://tools.simonwillison.net/mobile-tables)
- [uxdesign.cc, data tables for phones](https://uxdesign.cc/how-to-design-data-tables-for-phones-7ed6b04da10)
- [Setproduct, data table UI guide 2026](https://www.setproduct.com/blog/data-table-ui-design)
- [Sizzy, responsive tables](https://sizzy.co/blog/responsive-tables)
- [Material 2, navigation drawer](https://m2.material.io/components/navigation-drawer)
- [UXPin, mobile navigation](https://www.uxpin.com/studio/blog/what-is-mobile-navigation/)
- [ClickHouse nerve PR 294, sidebar to bottom bar with a More drawer](https://github.com/ClickHouse/nerve/pull/294)
- [Canopy PR 43, ResponsiveDialog to bottom sheet under 768](https://github.com/rogueoak/canopy/pull/43)
- [Dolfy, bottom sheet or modal](https://www.dolfy.ai/blog/bottom-sheet-or-modal-mobile-interruption-pattern)
- [Steve Kinney, Tailwind container queries](https://stevekinney.com/courses/tailwind/container-queries)
- [W3C, Understanding Reflow (WCAG 2.2)](https://www.w3.org/WAI/WCAG22/Understanding/reflow)
- [DAISY, target size minimum](https://kb.daisy.org/publishing/docs/wcag/target-size-minimum.html)
- [BOIA, target size under WCAG 2.2](https://www.boia.org/blog/understanding-target-size-under-wcag-2.2-and-how-it-affects-people-with-disabilities)
