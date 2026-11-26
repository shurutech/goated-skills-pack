# Live preview: the real app, clickable, on one shareable page

Owners review UI work far better in an interactive preview than in
screenshots ("instead of screenshots, make it interactive" is the single most
repeated piece of feedback this skill was built from). Screenshots are only for
checking your own work before you publish.

The recipe: build a static export of the real app, inject an in-page fetch mock
so it runs with no backend, wrap it in a page with switches, and publish that
folder to one stable URL (a Claude Artifact, GitHub Pages, any static host).

Files beside this doc in `live-artifact/`:

- `mock-shim.example.js`: the in-page backend skeleton. Sets `<base>`, seeds the
  session with an in-memory `localStorage` fallback (nested sandboxed frames
  may have none), routes `fetch` for a fake API origin to an in-memory router
  (mutations persist until reload), and blocks links that leave the demo.
- `index.example.html`: the wrapper. Variant and start-page switches, the app in
  an iframe rendered at 1440px and `scale()`d to fit (for a desktop-only app;
  for responsive work use `viewport-artifact.md`).

## Steps

1. Put variants behind a switch the frame can carry across in-app navigation:
   the wrapper sets `iframe.name = "v-b"` and the component reads `window.name`.
   A query param is lost the moment the app's own nav links are clicked.
2. Build the static export in an isolated copy of the worktree (the running dev
   server stays untouched), with the API base URL pointed at a fake origin
   (`https://demo.invalid`). Rewrite absolute asset paths to relative ones; some
   hosts reject paths starting with `_`, so rename `_next/` (or similar) and
   rewrite references. Inject `mock.js` as the first script in the entry HTML.
3. Write the mock's routes for every endpoint the screens call, with realistic
   data taken from the real response shapes, and make the mutations you want
   the owner to try actually work.
4. Serve the folder locally (`python3 -m http.server <port>`). **Check the port
   is free first** (`lsof -iTCP:<port> -sTCP:LISTEN`): another session's server
   on the same port will serve a different build and cost a debug round.
5. Run a Playwright click test: first load, every switch, each in-app tab you
   allow, each mutation. Read `pageerror` output: a top-level name in the mock
   that collides with one in a fixtures file is a SyntaxError that leaves the
   app on its sign-in page.
6. Look at the test screenshots, then publish every file to the SAME URL,
   removing paths the new version drops. Publishing only the page keeps stale
   files.
7. Wrapper copy: what changed, what is real, and the one call the owner has to
   make, with your pick. Plain sentences.
