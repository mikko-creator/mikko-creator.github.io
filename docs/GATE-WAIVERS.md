# Gate waivers — decision record

Written 2026-09-17, against `audit/gate.json` at **NOT-READY, 15 PASS / 9 FAIL / 4 UNPROVEN**.

`sr-gate.mjs` is the only thing allowed to say READY, and for this target it never will.
Four of its 28 checks score the **source site** rather than the rebuild, and one more
depends on evidence that `sr-package` strips out of the handoff bundle. No amount of work
on `dist/` moves any of them. This file records which checks are waived, on what evidence,
and which remain genuinely open — so that "NOT-READY" is a known position rather than an
unread alarm.

Every claim below was verified on 2026-09-17 by reading the check's own `run()` in
`~/.claude/skills/site-reforge/scripts/sr-gate.mjs` and the artifact it reads.

---

## Waived — structurally unreachable

These four measure the crawl and extraction of `seoguarantee.com` as it was harvested.
They are not statements about the rebuild, and nothing in this bundle can change them.
Re-running them requires a fresh crawl of the live site.

| Check | Label | Why it cannot pass |
|---|---|---|
| **C03** | Every crawled page fetched successfully | Reads `site-inventory.counts.failed`, which is **5**. Those are five source URLs that did not serve during the crawl. A rebuild cannot retroactively make a third party's server respond. |
| **C04** | Content captured for every page | Reads `content-inventory`, counting pages with under 50 chars of `bodyText` — **20**. These are the WordPress app stubs (`/activity`, `/audit`, `/booking`, `/church-marketing`…) which genuinely have almost no body text at source. |
| **C05** | No page is an unresolved JS-rendered shell | Reads `content.renderRisk.high` — **54** pages the harvester flagged as likely JS-rendered but captured statically. A property of how the source was captured, not of `dist/`. |
| **C07** | Image inventory completed with real dimensions | Fails on **22** same-origin images never downloaded. All 22 are on `seoguarantee-com.storage.googleapis.com`, a bucket that now returns **HTTP 403** — the same dead host behind 356 of the 367 entries in `audit/failures.json`. Unobtainable without the client restoring the bucket or supplying originals. |

## Waived — evidence stripped from the bundle

| Check | Label | Why it cannot pass |
|---|---|---|
| **C22** | Design matches the source pixel-for-pixel | Needs `audit/pixeldiff-report.json`, which `sr-pixeldiff.mjs` builds from `audit/screens/baseline`. `sr-package` does not ship `audit/raw`, `audit/css`, `audit/capture` or `audit/screens` — **0 of the 1,764 entries** in `seoguarantee-FINAL.zip` match those paths. Producing it means re-capturing the source at all four breakpoints. |

## Deliberate deviation — C19

**C19 "Forms and contact details are intact" will not go green, and should not.**
Its three `contact-lost` findings were reviewed individually on 2026-09-17:

1. **`location/las-vegas` — `(702) 362-8700`.** The source page shipped
   `<a href="tel:(702) 362-8700">(702) 420-7272</a>` — it dialled one number and displayed
   another. The identical mismatch is preserved in the captured source markup at
   `audit/preset-index.json:13424`, so the rebuild reproduced a live-site defect rather than
   introducing one. The fix rebuilds the `tel:` href from the **visible label**, which is the
   number the site states everywhere else. `(702) 362-8700` is therefore now absent from
   `dist/` entirely and parity still reports it as lost. **Accepted:** a number displayed
   nowhere on the source or the rebuild is not a contact detail worth restoring, and
   restoring it would restore the mismatch.

2. **`lla-magazine-forward` — `+1 800-799-9081`** and
3. **`lla-magazine-forward` — `mike@liquorlicenseagents.staging.sgen.com`.**
   Both belong to **Liquor License Agents**, not to this business, and the email is on a
   *staging* hostname. This page is one of three `/*-magazine-forward` URLs which are 301
   vanity forwards to client sites; the harvester followed the redirect and stored the
   client's page under a seoguarantee URL. **Accepted:** publishing another company's
   staging email address is worse than the finding it clears.

## Not waived — open, and deliberately out of this pass's scope

The operator scoped 2026-09-17 to ship-blocking defects only. These remain FAIL/UNPROVEN
and are fixable:

- **C11** motion — 18 `elementor-animation-*` keyframes, 3,024 bytes, bodies present verbatim
  in `audit/motion-inventory.json`. Cheapest green available.
- **C20** fabrication — 1,857 findings that collapse to **17 distinct strings**, 1,833 of them
  13 sentences from the source site's own Google-reviews widget, repeated across 141 pages.
  Declaring them in `facts/client-facts.json` clears the lot without touching `dist/`.
- **C16 / C17** parity — 21 missing pages (16 are WordPress app stubs) and 193 content-loss
  findings, of which 145 are two missing `<h2>` wrappers in shared templates.
- **C09** design baseline, **C23** responsive sweep, **C28** preset match — all three are
  UNPROVEN because their artifact is absent, and each has a script that would produce it
  (`sr-tokens`, `sr-sweep --collect`, `sr-match`). Whether they then pass is unknown.
  *These are not waived — they are simply unrun.*

## Rollback

`C:\Users\Dell\seoguarantee-FINAL.zip` is the pre-2026-09-17 tree, verified byte-for-byte
against the extracted workspace by size and CRC32 across all 1,764 entries before any edit
was made. It does not contain the fixes recorded in `docs/CHANGE-LOG.md` for this date.
