# seoguarantee.com — platform-free rebuild

A static reconstruction of seoguarantee.com with no CMS, no build dependencies and no
platform runtime. 151 HTML pages, generated from source in this repo.

**Live preview:** https://mikko-creator.github.io/seoguarantee/

---

## Run it

```bash
node serve.mjs --root dist --port 8100     # Node 18+; built and verified on Node 24
```

Then open <http://127.0.0.1:8100/>. On exit it prints every file a page asked for and
did not find. See [`RUN.md`](RUN.md) for the full handoff instructions.

## Rebuild it

```bash
node build/build-site.mjs                  # run from this directory; rewrites dist/
```

`dist/` is **generated** — never hand-edit it. The build is deterministic and verified
reproducible: two consecutive runs produce byte-identical output, and the shipped
`dist/` regenerates from source with all 288 files matching.

Only this one build step is runnable from this bundle. The earlier pipeline stages
(`extract-blocks`, `plan-images`, `gen-images`) read `audit/raw/`, which is **not
included** — `sr-package` strips it. Running `build/extract-blocks.mjs` here would
silently overwrite `build/content-blocks.json` with empty output.

## Layout

| path | what |
|---|---|
| `dist/` | the deployable site — 151 HTML files (150 pages + `404.html`) |
| `src/` | hand-authored CSS and JS, copied into `dist/` by the build |
| `build/` | the generator and its data (`content-blocks.json`, `page-manifest.json`) |
| `audit/` | the crawl's derived inventories and every measurement taken against them |
| `assets/` | harvested source media and generated imagery |
| `docs/` | handoff documentation — start with `docs/README.md` |
| `facts/` | declared client facts; the allowlist `sr-fabrication` scores against |
| `seoguarantee/` | **derived** — the path-rewritten copy served as the live preview |

## Where things stand

The verification gate reads **NOT-READY — 15 PASS / 9 FAIL / 4 UNPROVEN** of 28 checks.
That is a *recorded position, not an unread alarm*: 28/28 is unreachable for this target,
because several checks grade the original site rather than the rebuild, and one depends
on evidence that was stripped from this bundle at package time.

**Read [`docs/GATE-WAIVERS.md`](docs/GATE-WAIVERS.md) before acting on any red check.**
It separates four different things that all look like "failing":

- **structurally unreachable** — C03, C04, C05, C07
- **evidence stripped from the bundle** — C22
- **deliberate deviation** — C19, where the *correct* fix permanently reddens the check
- **not waived, simply unrun** — C09, C23, C28

### Open work, in leverage order

1. **C20 — fabrication.** 1,857 findings collapse to **17 distinct strings**; 1,833 of
   them are 13 sentences from the source site's own Google-reviews widget, repeated
   across 141 pages. They are not invented copy — the extractor dropped the widget
   region from the corpus. Declaring them in `facts/client-facts.json` (currently an
   empty template) clears all of it without touching `dist/`.
2. **C11 — motion.** 18 `elementor-animation-*` keyframes, 3,024 bytes, bodies present
   verbatim in `audit/motion-inventory.json`. Minutes of work.
3. **C16 / C17 — parity.** 21 missing pages (16 are WordPress app stubs) and 193
   content-loss findings, of which 145 are two missing `<h2>` wrappers in shared
   templates.

### Known limitations

- **The contact form has no backend on any path.** `dist/scripts/app.js` intercepts
  submit and never transmits; with JavaScript off a `<noscript>` block points the
  visitor at the phone number. Wiring a real endpoint is a launch prerequisite —
  see [`docs/DEPLOY.md`](docs/DEPLOY.md).
- **18 internal links 404.** Enumerated in `RUN.md`.
- **Fonts load from Google Fonts.** 753 harvested font files sit in `assets/fonts/`
  and none ship in `dist/`.
- **`seoguarantee/` goes stale silently.** It is a rewritten copy of `dist/` and
  nothing in the build regenerates it. Regenerate after any rebuild.

## History

[`docs/CHANGE-LOG.md`](docs/CHANGE-LOG.md) records every decision taken between the live
site and this rebuild, including the 2026-09-17 ship-blocking corrections.
[`docs/FINDINGS.md`](docs/FINDINGS.md) records defects found in the **live** site — these
are problems with the existing site, not with this rebuild, and section 1 is urgent.
