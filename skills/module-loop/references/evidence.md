# Evidence: what research says

Studies and papers behind the skill's rules, searched November 2026. Each line
gives the finding, what it changes in the work, and how strong it is. Prefer
these over blog heuristics. Add new studies as module rounds find them.

| Finding | What it changes here | Strength |
|---|---|---|
| Hidden navigation (hamburger) lowered discoverability by about 20% against visible or combo nav. Tasks were 39% slower on desktop and 15% on mobile, and users opened hidden menus later in the task (NN/g quantitative study, 179 participants, 6 sites, 2016). | Never hide nav at tablet or desktop. On phones, keep the primary destinations visible (bottom bar, or the "Menu" label with the icon), and the drawer holds the rest. The shell round's options carry this. | Strong. Controlled, quantitative, replicated by practice. |
| A bottom tab bar beat a side drawer on engagement (Facebook 2013, Zeebox: weekly use +55%). | Supports the bottom-bar option in the shell round. | Weak. Secondhand app A/B tests, old. |
| Recommended thumb targets are 9.2mm for single taps and 9.6mm for sequences. Speed rose with size; errors did not differ much (Parhi, Karlson, Bederson, MobileHCI 2006). | About 44 CSS px for phone primary actions. The 24px WCAG floor is a minimum, not the goal. | Strong. Peer-reviewed, widely cited. |
| Tap accuracy is predictable from element size and how close neighbours are (Tappy, 2024). | The probe checks spacing, not size alone, matching WCAG 2.5.8's spacing exception. | Medium. Preprint with a model. |
| People favour the centre of the screen for reading and tapping. Accuracy drops toward edges and corners. The old thumb-zone heat map is wrong by its own author's later work (Hoober, Touch Design for Mobile Interfaces, 2021). | Don't put critical small targets in corners. Don't justify a placement with the thumb-zone chart. Give edge targets more room. | Medium. Large observational studies, practitioner-published. |
| Comprehension on phones matched desktop for easy text and fell for hard text (NN/g 2016, 4 studies). The 2010 "twice as hard" result used very difficult privacy policies. | Dense, hard content (contracts, legal terms, long specs) needs the most care on phones: keep line length, headings and progressive disclosure. Simple lists need less. | Medium. |
| Layout failures sit between breakpoints. Found in 16 of 26 real production pages, with 33 distinct failures. There are five types: element collision, element protrusion, viewport protrusion, small-range layout and wrapping (Walsh, Kapfhammer, McMinn: ReDeCheck, ASE 2015, ISSTA 2017; Althomali et al. 2021). | The probe sweeps every 16px, not presets only. Review its "clipped" and "scroller" lines for protrusion. Check collision (overlap) by eye in the artifact. | Strong. Peer-reviewed, tool-backed. |
| The commonest root causes of responsive failures in generated pages are a missing viewport meta (46%), missing flexible wrapping (29.5%) and hard-coded dimensions (19.4%) (arXiv 2608.12518, 2026). LLM CSS repair with retrieval fixes these (ReDeFix, ICSME 2025). | The Phase 1 grep list: fixed `min-w-[…]`, missing `flex-wrap`, viewport export. Fix the property that causes it, not the whole layout. | Medium. Recent, but on AI-generated pages. |
| Tables: horizontal scroll keeps comparison, cards help single-record reading, priority columns risk hiding critical fields. No strong controlled study exists; the evidence is a thesis and practitioner work. | Choose per table and test the narrowest width. Flag that this is judgement, not evidence, in the option notes. | Weak. |

## Standards status (November 2026)

- WCAG 2.2 AA is the bar: 1.4.10 reflow at 320, 2.5.8 target size, 1.4.4 and
  1.4.12 text resize and spacing. WCAG 3.0 is still a Working Draft (latest
  10 September 2026) and not normative.
- The European Accessibility Act has applied since 28 June 2025, through EN
  301 549 (WCAG 2.1 AA). Customers in the EU make this a requirement, not a nicety.

## Platform status (November 2026)

- If the settled target is Chrome only: container queries are in
  Tailwind v4 core. Chrome also supports container style queries, CSS anchor
  positioning and anchored container queries, so no fallbacks are needed on
  desktop or Android. Chrome on iPhone is still WebKit in 2026 (no iOS browser
  ships Blink, even in the EU), so check Safari support for anything new a
  phone layout depends on. Don't migrate working popover code in a responsive
  round either way.

## Sources

- [NN/g, Hamburger menus and hidden navigation hurt UX metrics (via Smart Insights)](https://www.smartinsights.com/digital-marketing-strategy/are-hamburger-menus-hidden-navigation-good-for-ux/)
- [Adrian Roselli, quoting the NN/g study](https://adrianroselli.com/2016/01/avoid-the-hamburger-menu-for-desktop-layouts.html)
- [TNW, Zeebox side drawer test](https://thenextweb.com/news/ux-designers-side-drawer-navigation-costing-half-user-engagement)
- [Parhi, Karlson, Bederson 2006 (ACM)](https://dx.doi.org/10.1145/1152215.1152260)
- [NN/g, touch target size](https://www.nngroup.com/articles/touch-target-size/)
- [Tappy, arXiv 2403.03097](https://arxiv.org/pdf/2403.03097)
- [Hoober, Touch Design for Mobile Interfaces](https://smashingmagazine.com/printed-books/touch-design-for-mobile-interfaces)
- [Hoober, How do users really hold mobile devices (2013)](https://uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)
- [NN/g, reading content on mobile (2016)](https://www.nngroup.com/articles/mobile-content/)
- [NN/g, mobile content is twice as difficult (2011)](https://nngroup.com/articles/mobile-content-is-twice-as-difficult-2011)
- [Walsh et al., ReDeCheck tool](https://www.cs.allegheny.edu/sites/gkapfham/research/papers/Walsh2017a)
- [Walsh et al., layout failure detection without an oracle](https://www.cs.allegheny.edu/sites/gkapfham/research/papers/Walsh2017)
- [Walsh et al., potential layout faults (ASE 2015)](https://www.cs.allegheny.edu/sites/gkapfham/research/papers/Walsh2015)
- [Althomali et al., responsive layout failure classification](https://eprints.whiterose.ac.uk/165542)
- [Does It Render Everywhere?, arXiv 2608.12518](https://arxiv.org/pdf/2608.12518)
- [ReDeFix, arXiv 2511.00678](https://arxiv.org/abs/2511.00678)
- [Caspár, tabular data on mobile (thesis)](https://www.diva-portal.org/smash/get/diva2:1192596/FULLTEXT01.pdf)
- [W3C, Understanding Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow)
- [WCAG 3.0 September 2026 working draft](https://www.accessibleresources.com/post/wcag-3-september-2026-working-draft-explained)
- [EAA, June 2025 deadline](https://www.insideglobaltech.com/2025/06/10/european-accessibility-act-june-2025-deadline-has-arrived/)
- [Anchor positioning Baseline 2026](https://www.refontelearning.com/blog/css-anchor-positioning-reaches-baseline)
- [Wikipedia, Google Chrome (iOS uses WebKit)](https://en.wikipedia.org/wiki/Google_Chrome)
- [Brave Blink on iOS, still a demo (2026-10)](https://piunikaweb.com/2026/10/29/brave-chromium-blink-ios-engine/)
- [web-features, anchored container queries](https://web-platform-dx.github.io/web-features-explorer/features/container-anchor-position-queries)
