# Deploying

`dist/` is a plain static site. It needs no build step, no Node runtime and no
database on the server.

## What to upload

Everything inside `dist/`. Nothing outside it is needed at runtime — `audit/`,
`build/`, `src/` and `docs/` are the workshop, not the product.

## Host configuration

The site uses **directory-style URLs**: `/contact-us/` is served from
`dist/contact-us/index.html`. Almost every host does this by default.

| host | notes |
|---|---|
| Netlify / Vercel / Cloudflare Pages | drag `dist/` in, or point the project at it. No build command. |
| S3 + CloudFront | set the index document to `index.html`; add a CloudFront function to append `index.html` to directory requests. |
| nginx | `try_files $uri $uri/ $uri/index.html =404;` |
| Apache | works as-is; `DirectoryIndex index.html`. |

Set `404.html` as the not-found document.

## Before going live — required

1. **The contact forms have no backend.** All 274 `<form>` elements post to
   `action="/api/contact"`, a path that does not exist in `dist/`. The POST never
   reaches the network at all: `src/scripts/app.js` binds a `submit` handler to
   every `form[data-needs-endpoint]` and calls `preventDefault()`. Three changes
   are needed, not one:

   a. Point each `action` at a real handler (Netlify Forms, Formspree, or your
      own endpoint). There are three render sites, not two: `fieldsSection()`
      (`build/render.mjs:284`), `contactCta()` (`build/render.mjs:509`), and the
      inline contact form in `build/build-site.mjs:428`.
   b. Delete the `form[data-needs-endpoint]` submit interceptor in
      `src/scripts/app.js`. Until it is gone the form cannot submit no matter
      what `action` says.
   c. Remove the "static front end" note at the same three render sites.

   Then rebuild.

2. **Clean the origin server first.** See `FINDINGS.md` §1 — the current
   WordPress install is compromised. Deploying this rebuild removes the
   injected spam from what visitors and crawlers are served, but does not
   remediate the server it came from.

3. **Decide on the dead media.** ~356 images are gone (`FINDINGS.md` §2).
   Restore them from a backup if one exists, or accept the generated headers.

## Recommended

* Serve over HTTPS with HSTS.
* Long `Cache-Control` on `/assets/`, `/styles/`, `/scripts/`
  (their contents are stable); short or `no-cache` on HTML.
* Enable Brotli/gzip — the HTML compresses very well.
* Submit `sitemap.xml` in Google Search Console. It deliberately lists only
  self-canonical URLs, so the `/seo-services/<city>-seo` duplicates are
  excluded (see `FINDINGS.md` §4).
* Keep the existing URLs, but handle the exceptions. 23 source URLs were
  deliberately dropped; each is listed with a reason in the `removed` array of
  `build/page-manifest.json`. Most are 1-2 word WordPress stubs, but three are
  not: `/client-portal` (208 words) and the author archives `/author/alvin` and
  `/author/mattsb` (771 words each). Redirect any dropped URL that still has
  inbound links.
