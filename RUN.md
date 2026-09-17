# Run this handoff

Everything here is plain files. There is no package to install and no database.
The only build and run requirement is **Node.js 18 or newer** (built and verified
on Node 24). One runtime dependency remains: every page loads Montserrat from
`fonts.googleapis.com` (emitted by `build/lib.mjs:181-183`), so `dist/` is not
offline-clean. 753 harvested font files sit in `assets/fonts/`, but 0 are copied
into `dist/` and nothing in `dist/` references them.

## 1. Run it — one command

From the folder you unzipped into:

```
node serve.mjs --root dist --port 8100
```

`serve.mjs` opens your browser for you; pass `--no-open` to stop it. If port 8100
is already taken it walks up one port at a time, up to 20 tries, and prints the
address it actually bound — read that line rather than assuming 8100.

That serves `dist/` exactly as the preview was served. `serve.mjs` is a
zero-dependency static server included in this bundle; it resolves
directory-style URLs (`/contact-us/` → `dist/contact-us/index.html`) the same
way a production host will.

To stop it, press Ctrl-C. On exit it prints how many distinct paths were requested
and not found, then lists the 40 most-requested of them — a fast way to spot a
broken path after you edit something. Only paths a browser actually requested
during that session are counted, so it is not a site-wide link check.

## 2. Rebuild it

`dist/` is generated. To regenerate it from source:

```
node build/build-site.mjs
```

Run it from the folder you unzipped into (it resolves paths from the current
working directory, not from `build/`). It rewrites `dist/` in place, then
re-run the server above.

Its inputs, all included here:

| input | what it carries |
|---|---|
| `build/content-blocks.json` | the crawled text of every source page |
| `build/page-manifest.json` | which page is built from which source URL, and as which archetype |
| `build/image-plan.json`, `build/generated-manifest.json` | the image assignments |
| `audit/content-inventory.json`, `audit/seo-inventory.json`, `audit/image-inventory.json` | source content, meta and image facts |
| `assets/generated/`, `assets/source/` | the generated imagery and the harvested photographs |
| `src/styles/`, `src/scripts/` | the authored CSS and JS, copied into `dist/` verbatim |

Edit `src/styles/*.css` for design changes and re-run the build — do **not**
edit `dist/styles/`, it is overwritten on every build.

The page templates are `build/render.mjs`; the page assembly is
`build/build-site.mjs`.

## 3. What is in the box

| path | |
|---|---|
| `dist/` | **the product.** 151 pages, self-contained, deploy this |
| `src/` | authored CSS + JS (the design system) |
| `build/` | the generator: templates, page assembly, extracted source content |
| `assets/` | generated imagery (58 JPGs), harvested source photographs, and 753 harvested font files in `assets/fonts/` that the build never uses |
| `docs/` | this file, plus README / DEPLOY / FINDINGS / CHANGE-LOG / BRAND-SYSTEM |
| `audit/` | the evidence trail: inventories, parity, fabrication and gate reports |
| `facts/` | client-declared facts the build is allowed to assert |
| `HANDOFF-MANIFEST.json` | what shipped, and the gate verdict at packaging time |

## 4. Read before deploying

`docs/DEPLOY.md` — host configuration, and three required pre-launch actions.
`docs/FINDINGS.md` — defects found on the **live** site, worst first. §1 is a
live spam-link injection and is urgent.

## 5. Known and deliberate

* **Contact forms are inert.** All 274 `<form>` elements post to
  `action="/api/contact"`, a path that does not exist in `dist/`. On top of that,
  `src/scripts/app.js` binds a `submit` handler to every
  `form[data-needs-endpoint]` and calls `preventDefault()`, so nothing is ever
  sent over the network. Point the forms at a real handler **and** delete that
  interceptor before launch — see DEPLOY.md §1.
* **18 internal links 404.** Of the 208 unique local references in `dist/`, 190
  resolve and 18 do not: `/2020/04/21/5-important-seo-tips-and-tricks`,
  `/about-california-liquor-license-agents`, `/api/contact`, `/buy`, `/category`,
  `/contact-info-and-hours.php`, `/dispensaries`, `/hello-club`,
  `/las-vegas-seo-blog`, `/portfolio/nuleaf-nv`, `/portfolio/theblez`,
  `/privacy-policy`, `/rep`, `/sell`, `/sg_portfolio`,
  `/springs/garage-door-springs.php`, `/tag`, `/terms-of-service`.
  Two of these are **not** carried forward from the live site: `/api/contact` is
  invented by this rebuild as the form target, and `/rep` was a real source URL
  that this rebuild dropped — see the `removed` array in
  `build/page-manifest.json`, which drops 23 source URLs in all.
  `/category`, `/las-vegas-seo-blog`, `/rep`, `/sg_portfolio` and `/tag` exist in
  `dist/` as directories holding child pages but with no `index.html` of their
  own, so the parent path 404s while its children resolve.
* **The gate reads NOT-READY.** That is recorded, not hidden:
  `audit/gate.json` and `HANDOFF-MANIFEST.json` carry every check and its
  evidence, and `docs/FINDINGS.md` explains each deliberate trade. The
  remaining failures are source-side defects and measurement gaps, not
  unfinished pages — see the handoff notes you were sent with this bundle.
