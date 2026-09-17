# seoguarantee.com — redesigned static rebuild

A complete, platform-free reconstruction of seoguarantee.com: the site's own
content, rebuilt on a new design system (deep-violet + gold glass morphism),
with generated imagery and motion. No WordPress, no Elementor, no WooCommerce.

**Read `FINDINGS.md` first.** The live site is compromised — a hidden spam-link
injection sits on 169 of 172 crawled pages. That is the most urgent thing in
this delivery and it is not a rebuild issue.

---

## What is here

```
dist/                 the deployable site — 151 HTML files (150 pages + 404.html)
  index.html          homepage
  <path>/index.html   one directory per URL, so paths stay clean
  assets/generated/   58 generated images (fal.ai / FLUX)
  assets/media/       real photographs and logos lifted from the source
  assets/brand/       logo + favicon
  styles/             tokens · base · components · motion
  scripts/app.js      the only script; no dependencies
  sitemap.xml robots.txt 404.html

src/                  the authored source for styles/ and scripts/
build/                the build pipeline + its evidence
audit/                the crawl's derived inventories and every measurement
                      taken against it. The raw crawled HTML (audit/raw/) is
                      NOT in this bundle — see Rebuilding.
docs/                 this documentation
```

## Running it locally

```bash
node serve.mjs --root dist --port 8100    # or any static server
```

`build/serve.mjs` does not exist — the server is `serve.mjs` at the bundle root.
It opens your browser automatically (`--no-open` suppresses that), and if port
8100 is taken it walks up to the next free port and prints the address it bound.

**You cannot open `dist/index.html` by double-clicking it.** Every link and
asset is a root-absolute path (`/styles/tokens.css`), which is correct for a
web server and resolves against the drive root when opened as a file. Serve the
folder.

## Rebuilding

`build/build-site.mjs` is deterministic and never touches the network. It reads
seven JSON files — `audit/content-inventory.json`, `audit/seo-inventory.json`,
`audit/image-inventory.json`, `build/content-blocks.json`,
`build/page-manifest.json`, `build/image-plan.json` and
`build/generated-manifest.json` — plus `src/styles/`, `src/scripts/`,
`assets/generated/` and `assets/source/` (the harvested media it copies into
`dist/assets/media/`).

```bash
node build/build-site.mjs       # assemble dist/ — the only step runnable here
```

**Do not run `node build/extract-blocks.mjs` in this bundle.** It reads the raw
crawl from `audit/raw/`, which is not shipped (0 of the 1,764 entries). With that
directory absent it does not fail — `build/extract-blocks.mjs:232-238` writes
`{"error":"raw-missing","blocks":[]}` for all 149 pages and overwrites
`build/content-blocks.json`, destroying the 6.4 MB of extracted copy the build
depends on. Back that file up before touching this step.

`node build/verify.mjs` also reads `audit/raw/` (`build/verify.mjs:28-29`,
unguarded `readdirSync`) and throws ENOENT here. `node build/plan-images.mjs`
runs. `node build/gen-images.mjs` needs `FAL_KEY` and network access; it is
resumable and skips images already on disk.

`gen-images.mjs` is resumable: an image already on disk is never regenerated,
so re-running costs nothing. The FAL key is read from the environment and is
not stored in this repository.

## Deployment

See `DEPLOY.md`.

## Design

See `BRAND-SYSTEM.md`. Change colour, type and spacing in
`src/styles/tokens.css` — never at a call site.

## What changed from the live site

See `CHANGE-LOG.md` for every decision, and `FINDINGS.md` for defects found in
the original that the client should act on.
