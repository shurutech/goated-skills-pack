// In-page backend for a static export. Inject as the first <script> in the entry HTML.
// Replace SESSION_KEY, SESSION, the fixtures and route() with your app's real shapes.
var ROOT = location.pathname.replace(/[^/]*$/, "");
var base = document.createElement("base");
base.href = ROOT;
document.head.prepend(base);
var API = "https://demo.invalid/api/v1";

// Sandboxed nested frames may have no localStorage; fall back to memory.
var ok = false;
try { localStorage.setItem("__p", "1"); localStorage.removeItem("__p"); ok = true; } catch (e) {}
if (!ok) {
  var mem = {};
  var store = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); },
    removeItem: function (k) { delete mem[k]; },
    clear: function () { mem = {}; },
    key: function (i) { return Object.keys(mem)[i] || null; },
    get length() { return Object.keys(mem).length; },
  };
  try { Object.defineProperty(window, "localStorage", { value: store, configurable: true }); } catch (e) {}
  try { Object.defineProperty(window, "sessionStorage", { value: store, configurable: true }); } catch (e) {}
}

var SESSION_KEY = "app-session";
var SESSION = {
  token: "demo-token",
  user: { id: "u1", email: "owner@example.com", name: "Demo Owner" },
  organization: { id: "o1", name: "Example Org" },
  role: { id: "r1", name: "Owner" },
};
try { localStorage.setItem(SESSION_KEY, JSON.stringify(SESSION)); } catch (e) {}

// Fixtures: copy the real response shapes from the backend, never invent fields.
var ITEMS = [
  { id: "i1", name: "First item", status: "open", updatedAt: new Date().toISOString() },
  { id: "i2", name: "Second item", status: "done", updatedAt: new Date().toISOString() },
];

// Return a body, or [status, body]. Mutations change the fixtures so the UI reacts.
function route(method, path, body) {
  if (path === "/auth/me") return SESSION;
  if (path === "/items" && method === "GET") return { items: ITEMS };
  if (path === "/items" && method === "POST") {
    var n = Object.assign({ id: "i" + Date.now(), updatedAt: new Date().toISOString() }, body);
    ITEMS.unshift(n);
    return { item: n };
  }
  var m = path.match(/^\/items\/([^/]+)$/);
  if (m && method === "PATCH") {
    var it = ITEMS.find(function (x) { return x.id === m[1]; });
    if (!it) return [404, { detail: "Not found" }];
    Object.assign(it, body, { updatedAt: new Date().toISOString() });
    return { item: it };
  }
  if (m && method === "DELETE") { ITEMS = ITEMS.filter(function (x) { return x.id !== m[1]; }); return [204, null]; }
  return {};
}

var realFetch = window.fetch.bind(window);
window.fetch = function (input, init) {
  var url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
  var method = ((init && init.method) || (typeof input !== "string" && input.method) || "GET").toUpperCase();
  if (url.indexOf(API) === 0) {
    var path = new URL(url).pathname.replace(/^\/api\/v1/, "");
    var b = {};
    try { b = init && typeof init.body === "string" ? JSON.parse(init.body) : {}; } catch (e) {}
    var res = route(method, path, b);
    var status = 200;
    if (Array.isArray(res) && typeof res[0] === "number") { status = res[0]; res = res[1]; }
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(status === 204 ? new Response(null, { status: 204 })
          : new Response(JSON.stringify(res), { status: status, headers: { "content-type": "application/json" } }));
      }, 150);
    });
  }
  return realFetch(input, init);
};

// Keep the reviewer inside the demo: block same-origin links outside the allowed paths.
var ALLOWED = [/^\/items/];
document.addEventListener("click", function (event) {
  var a = event.target.closest && event.target.closest("a[href]");
  if (!a) return;
  var to = new URL(a.getAttribute("href"), location.href);
  if (to.origin === location.origin && !ALLOWED.some(function (re) { return re.test(to.pathname); })) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);
