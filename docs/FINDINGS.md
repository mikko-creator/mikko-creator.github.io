# Findings on the live site

Defects discovered in seoguarantee.com while rebuilding it. These are problems
with the **existing** site, not with the rebuild. They are listed worst first.

---

## 1. The live site is serving a hidden spam-link injection — URGENT

**Severity: critical. Acts on rankings, and on reputation.**

169 of the 172 crawled pages carry a block of hidden outbound links:

```html
<div class="netlink-links netlink-links--list"
     style="position:absolute!important;left:-99999px!important;top:auto;
            width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">
  <ul><li><a href="http://…" rel="dofollow">…</a></li>…</ul>
</div>
```

* It is cloaked off-screen — invisible to visitors, fully visible to crawlers.
* It links to **60 distinct third-party domains** with `rel="dofollow"`,
  chiefly Turkish gambling and adult sites.
* Some anchor text refers to illegal content categories.

This is the signature of a compromised WordPress install (an injected
link-farm parasite). Consequences: hidden-link and unnatural-outbound-link
penalties from Google, and material brand risk from the neighbourhoods being
linked to.

**It is not reproduced in the rebuild.** `build/extract-blocks.mjs` strips it and
records what it removed in `build/injection-removals.json` (146 pages had a
block removed at build time; the remainder sat inside `<footer>`, which the
rebuild regenerates from scratch).

**What the client must do — the rebuild does not fix the live site:**
1. Treat the WordPress install as compromised. Rotate all credentials
   (WP admin, hosting, FTP/SSH, database).
2. Find the injection vector — usually an outdated plugin or theme. Audit
   plugin files and the database `wp_options` / `wp_posts` for the injector.
3. Check for other persistence: unknown admin users, modified `.htaccess`,
   scheduled tasks, files in `wp-content/uploads` with `.php` extensions.
4. Once clean, request a review in Google Search Console if a manual action
   has been applied.

Deploying this rebuild removes the injection from what is *served*, but does
not clean the origin server or any backup taken from it.

---

## 2. Roughly 356 images are permanently dead

Every asset on `seoguarantee-com.storage.googleapis.com` returns HTTP 403:

```xml
<Error><Code>UserProjectAccountProblem</Code>
<Message>The project to be billed is associated with a closed billing account.</Message></Error>
```

The Google Cloud Storage billing account behind the site's media library is
closed, so these images are **broken on the live site right now** — mostly blog
post headers and inline article images. They cannot be recovered by crawling;
they must come from a backup, or be replaced.

In the rebuild no `<img>` is emitted for an asset that cannot load (so there
are no broken-image icons), and articles are given topical generated headers
instead. Every one is listed in `audit/failures.json`, marked `accepted` with
this reason.

---

## 3. `/seo-new` publishes Lorem Ipsum

The page ships placeholder copy ("Lorem ipsum dolor sit amet…") to production —
18 blocks of it. It appears to be an unfinished draft that was published.

The rebuild keeps the URL (so no ranking is lost) and omits the placeholder
blocks; recorded in `build/build-report.json` under `loremStripped`.

---

## 4. Duplicate content: every city page exists at two URLs

`/our-locations/<city>-seo` and `/seo-services/<city>-seo` serve byte-identical
copy — 25 cities, 50 URLs, and the live site canonicalises each to itself.
That splits ranking signals between two copies of the same page.

The rebuild keeps both URLs and points the `/seo-services/` twin's
`<link rel="canonical">` at the `/our-locations/` original, consolidating the
signal without removing any URL.

---

## 5. `/our-team`'s social description was raw Divi shortcode

The source `og:description` for `/our-team` was:

```
[et_pb_section bb_built="1" _builder_version="3.0.47"][et_pb_row …] OUR TEAM [get_aff_team_members] …
```

Any share of that page previewed as page-builder markup. The rebuild strips
shortcodes from all meta fields (`cleanMeta()` in `build/lib.mjs`).

---

## 6. "Industries We Serve" was a dead nav link on every page

The primary menu pointed `INDUSTRIES WE SERVE` at `href="#"`, and the only
`/industries` URL was a one-word empty archive stub. The rebuild adds a real
`/industries` index listing the industry pages that already existed.

---

## 7. Smaller items

* Several internal links point at URLs that 404 on the live site, e.g.
  `/2020/04/21/5-important-seo-tips-and-tricks`, `/dispensaries`,
  `/terms-of-service`, `/privacy-policy`. They are carried forward as-is —
  they are the client's to create or redirect. `build/verify-report.json` under
  `brokenLinks` lists 12 of them; six more only appear when `dist/` is actually
  served — `/api/contact`, `/category`, `/las-vegas-seo-blog`, `/rep`,
  `/sg_portfolio` and `/tag`. The complete set of 18 is in RUN.md §5.
* `/blez-magazine-forward` redirects to `http://theblez.com/`, which then
  redirects to nothing (a loop).
* There is no privacy policy or terms page, though the footer implies one.
* The source ignored `prefers-reduced-motion`; the rebuild honours it.

---

## 8. A staging email address is published on a live page

`/lla-magazine-forward` links to:

```
mailto:mike@liquorlicenseagents.staging.sgen.com
```

That is a **staging** hostname (`.staging.sgen.com`) on a production page. Mail
sent to it is unlikely to be delivered, and it exposes internal infrastructure
naming.

The rebuild does not reproduce it — shipping a staging address as a live contact
route would be a defect, not fidelity. The page's visible phone number
(`800.799.9081`) is preserved. Replace the address with the real one and it can
be added back.

`sr-parity` reports this as `contact-lost`; that is this decision, recorded
here deliberately rather than silently.

## 9. One phone number is formatted inconsistently; another is wired to the wrong href

`sr-parity` also reports `contact-lost` for `+1 800-799-9081` and
`(702) 362-8700`. Only the first is a false positive:
`dist/lla-magazine-forward/index.html` carries `+1 800-799-9081` (line 99) and
`800.799.9081` (line 113), so a literal string comparison misses it.

`(702) 362-8700` is a real defect. It appears nowhere in `dist/` as visible text;
it survives only inside an `href` at `dist/location/las-vegas/index.html:105`,
where it disagrees with the number it wraps:
`<a href="tel:(702) 362-8700">(702) 420-7272</a>`. That link dials a number the
page does not display. Fix it before launch.

Contact detail was dropped elsewhere as well: the staging `mailto:` in §8 is gone
by decision, and `dist/` now contains **0** `mailto:` links on any of its 151
pages — there is no email contact route anywhere in the rebuild.
