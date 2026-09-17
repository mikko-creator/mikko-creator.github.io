# Change log

Every decision taken between the live site and this rebuild.
Nothing was dropped without a reason written here.

## Summary

| | |
|---|---|
| source pages crawled | 178 (172 extracted) |
| pages rebuilt | 150 |
| pages deliberately removed | 23 |
| pages added | 1 |
| content recall (measured) | 96.46% |
| generated images | 58 |
| real photos / logos carried over | 70 |
| pages with spam injection removed | 146 |
| claims traced verbatim to the source | 1833 / 1857 (98.7%) |

## PRESERVE — the default

Every page not listed below was rebuilt with its copy, headings, title, meta
description, canonical and internal links carried across. Measured content
recall across all 149 pages is **96.46%** (`build/verify-report.json`).
The shortfall is concentrated in form-control text and repeated furniture,
not in prose.

## REMOVE — with reasons

### Pages

| URL | why |
|---|---|
| `/?page_id=279` | duplicate of the WooCommerce shop page, reached by raw WP query id |
| `/activity` | BuddyPress activity stream — logged-in plugin UI, 1 word, no public content |
| `/audit` | empty WP stub, 1 word, no content ever published |
| `/author/alvin` | WordPress author archive — byte-duplicate of the homepage (771 words, same title) |
| `/author/mattsb` | WordPress author archive — byte-duplicate of the homepage (771 words, same title) |
| `/booking` | empty WP stub, 1 word |
| `/cart` | WooCommerce cart — requires a live store backend a static build cannot serve |
| `/checkout` | WooCommerce checkout — requires payment backend; unsafe to ship as a shell |
| `/church-marketing` | empty WP stub, 2 words |
| `/client-portal` | client login portal — authenticated app, no static equivalent |
| `/client-portal?action=forgot_password` | client login portal — authenticated app, no static equivalent |
| `/client-portal?action=register` | client login portal — authenticated app, no static equivalent |
| `/cpm` | empty WP stub, 2 words |
| `/e-signature-document` | empty WP stub, 2 words |
| `/erp-subscription` | empty WP stub, 2 words |
| `/industries` | empty WP archive stub, 1 word — real content lives at /industries/* |
| `/invoice` | empty WP stub, 2 words |
| `/members` | BuddyPress member directory — logged-in plugin UI, 1 word |
| `/pm` | empty WP stub, 2 words |
| `/projects` | empty WP stub, 2 words |
| `/rep` | empty WP stub, 1 word |
| `/test-editor` | developer test artifact, 2 words |
| `/test-page` | developer test artifact, 2 words |

### Content inside pages that were kept

| what | where | why |
|---|---|---|
| Hidden spam-link injection | 146 pages, 995,866 bytes | Cloaked `rel="dofollow"` links to 60 gambling/adult domains. Not page copy; reproducing it would carry a live Google penalty into the new site. See FINDINGS.md §1. |
| Lorem Ipsum placeholder (18 blocks) | `/seo-new` | unfinished placeholder copy on the live site; shipping Lorem Ipsum to production is a defect, and the URL is kept so no ranking is lost |
| Page-builder shortcodes in meta fields | `/our-team` og:description | Raw `[et_pb_section …]` markup was being served as the social preview. |
| `href="#"` anchors | site-wide | A link to nowhere. The label text is kept as copy; only the dead anchor is dropped. |
| WordPress / Elementor / WooCommerce runtime | all pages | Platform removal is the point of the exercise. `sr-decontaminate` reports CLEAN. |

## ADD — with reasons

| what | why |
|---|---|
| `/industries` | source nav pointed "INDUSTRIES WE SERVE" at href="#" — a dead link on every page; this index gives it a real destination |
| Generated imagery (58 images) | The source media library is ~356 images short (dead GCS bucket, FINDINGS.md §2). Generated art is abstract or environmental ONLY — it never depicts a person, a client, a screenshot or a result. Prompts and seeds are recorded in `build/generated-manifest.json`. |
| `sitemap.xml`, `robots.txt`, `404.html` | The source served no sitemap usable by a static host. |
| JSON-LD (`ProfessionalService`, `BreadcrumbList`) | Built only from facts already on the page — phone, locality, and the rating the site itself publishes. |

## IMPROVE — same content, better behaviour

| change | why |
|---|---|
| `/seo-services/<city>-seo` now canonicals to `/our-locations/<city>-seo` | 25 pages of byte-identical duplicate content were competing with themselves. Both URLs still resolve. |
| `prefers-reduced-motion` honoured | The source ignored it. Revealed content is forced *visible* under the preference, not merely un-animated. |
| Result figures are not count-up animated | A count-up renders "Over 600%" as "60%" for most of its run — a false claim on a page selling a guarantee. |
| All 50 reviews kept in the DOM | Nine are shown; the rest collapse behind a toggle, so no testimonial is deleted from the page. |
| Semantic landmarks, one H1 per page, skip link, alt text | 0 accessibility issues across 149 pages (`build/verify-report.json`). |
| Nav collapses at 1180px | The desktop row measured 1353px and overflowed a 1280px viewport. |
| Explicit width/height on images; lazy below the fold | Layout stability and load performance. |
| Reveal has a failsafe | `IntersectionObserver` is suspended in a background tab; without the failsafe a page opened in one would stay blank. |

## Revisions (round 2)

| # | request | what changed |
|---|---|---|
| 1 | Hero pushed below the fold | `.hero` top padding was `clamp(4rem, 3rem + 9vw, 9rem)` = **144px** on top of a 97px sticky header, putting the H1 at y=309 and the CTAs at y=799 — off-screen on a 588px viewport. Padding is now ~31px, the internal rhythm is tightened, and the hero image went from a `4/5` portrait crop to `5/4` with a `max-height`. Measured after: H1 at y=99, CTAs at y=553, **in the first fold**. |
| 2 | Remove section-title em dashes | The three em dashes authored into visible copy (closing CTA, footer, contact lede) are gone. Measured: `0` em dashes in rendered body text. Dashes that belong to SOURCE content — e.g. the client name "Raich Law – Business Lawyer Las Vegas" — are preserved, since removing those would edit the client's copy. |
| 3 | More James Sutton imagery | The source published four usable photographs of the founder; the rebuild was surfacing two. The founder section now leads with the `james-approved` cut-out over a violet glow with the MyVegas cover as a proof inset, and the guarantee band gained the `james-fpsg-footer` cut-out. Homepage now carries 4 James images, all loading. |
| 4 | `+345%` pill broken / overlapping / no animation | It sat at `left:-8%`, hanging 40px off the hero image's left edge, and carried no reveal. It now tucks inside the image's bottom-left corner (`floatInsideImage: true`), is width-capped so it cannot spill, animates in with `data-reveal="scale"` and drifts on a `float-slow` loop. It goes `static` below 640px. |
| 5 | Text with no margin from its container | **Root cause: eight invalid `clamp()` values.** CSS requires whitespace around `+` inside `clamp()`/`calc()`; `clamp(1.75rem,1rem+3vw,3.5rem)` is invalid, so the browser dropped the entire `padding` declaration and those glass panels computed to `padding: 0`. All eight are repaired. Measured: **22 → 0** text-touching-edge violations, and 0 across 60 page×viewport combinations. |

Verified after the revisions: content recall unchanged at 96.39%, decontamination CLEAN,
and a 12-page × 5-viewport sweep (1440/1280/900/768/390) reporting 0 spacing violations,
0 horizontal overflow and 0 broken images.

## Revisions (round 3) — adversarial design review

A six-lens review (spacing, typography, imagery, design-system consistency,
responsive, accessibility) raised findings that were then adversarially verified
against the real files. **21 confirmed, 3 refuted and dropped.** All 21 are fixed.

### Accessibility

| fix | measured |
|---|---|
| `--fg-dim` (#877f9c) retired as text on glass — `.stat__pre`, `.review__src`, `.form-note`, `.contact-line__label`, and input placeholders now use `--fg-muted` | those selectors were 3.4–4.7:1 (below the 4.5:1 floor); they now measure **8.35–9.91:1** |
| The hero `+345%` panel sits over a photograph, where a white glass wash is not a scrim. It now has its own dark backing. | label was **1.08:1**; now **9.91:1** |
| Heading hierarchy: `renderProse` and `leftoverSection` now track the previous level, footer column titles promoted to `h2`, and listing-card titles promoted to `h2` | **33 → 0** heading-level skips across 151 pages |
| Form fields lost all focus indication (`outline: none`); restored via `:focus-visible` so it survives forced-colors mode | — |
| `--step-0` floor raised to `1rem` — inputs were 15.2px, and iOS Safari zooms the viewport on any field under 16px | — |
| The no-`backdrop-filter` fallback covered 3 of 12 glass surfaces; the other nine would have rendered as near-transparent text | — |

Gold buttons and gradient text were checked separately, since a computed-style
reader sees `color: transparent` / a gradient `background` and cannot evaluate them:
`--ink-900` on the gold gradient measures **5.31–12.95:1**, and the gold gradient on
the hero scrim **8.75–15.79:1**. Both pass.

### Layout and system

| fix | why it mattered |
|---|---|
| `.founder-figure__inset` mobile width override was dead | the base rule `.hero__visual .founder-figure__inset` (0,2,0) outranked the bare class in the media query (0,1,0) — a specificity bug introduced by the round-2 crop fix |
| `.page-hero__media::after` ends at an OPAQUE `--bg-deep`; reused inside the CTA band it painted a solid block over the lower half of the glass | scoped a translucent variant to the band |
| `.cta-band p` was unscoped and outranked every nested class, forcing lede-size type and a 2rem margin onto micro-labels | scoped to direct children |
| `.card p { margin-bottom: 0 }` collapsed every multi-paragraph card | added `.card p + p` |
| `.pulse` animated `box-shadow` on `.btn--gold`, cancelling the button's own shadow | ring moved to a pseudo-element |
| Header CTA is hidden below 1180px and was never re-offered | a duplicate CTA now lives in the nav panel; the CTA is reachable at 390/768/1180/1440 |
| Base `li` margin leaked into the nav; no `ul:last-child` margin reset; `.hero__visual::after` frame not reset at ≤640px | — |
| `--step-5` was a broken rung (1.115× over `--step-4` where every other pair is 1.20–1.30×) | re-derived |
| Founder and CTA figures shipped with no `width`/`height` | intrinsic dimensions added, so height is reserved before decode |
| Five dead rules removed (`.glass--flush`, `.btn--ghost`, `.card__icon`, `.divider`) | — |
| `html { overflow-x: clip }` added | the reveal translates 34px horizontally; `body` clipped it but `html` did not |

Re-verified after: **65 combinations** (13 pages × 1440/1280/900/768/390) reporting
0 spacing violations, 0 overflow, 0 broken images and 0 heading skips; content recall
unchanged at 96.39%; decontamination CLEAN; sticky header still functional under
`overflow-x: clip`.

## Revisions (round 4)

**1. "Section titles still have em dashes."** There were no dash *characters* in any
section title — the culprit was CSS. `.eyebrow::before` painted a 28px × 1px gold rule
immediately before every eyebrow label, which reads as an em dash: it rendered on 744
eyebrows across 151 pages. The rule is deleted. Measured after: **689 eyebrows, 0 with
a dash**; of 2,477 headings only 2 contain one, and both are the client's own data —
the business name "Raich Law – Business Lawyer Las Vegas" and a phone/hours line
("Mon–Fri 8:30am–5pm"). Those are left alone; editing them would rewrite client copy.

**2. Reviews carousel.** 50 stacked cards made the section 1,630px tall. It is now a
seamless infinite loop, and the "See all 50 reviews" button sits at the bottom of the
section as before.

| | |
|---|---|
| section height | **1,630px → 975px** |
| reviews in the served HTML | **50** — each exactly once |
| loop duplicate | created by `app.js` at runtime and marked `aria-hidden`, so screen readers and crawlers still see 50, not 100 |
| long reviews | one is 963 characters and was forcing every flex card to 1,038px. In loop mode the text is line-clamped; the full string stays in the DOM and is shown in full when the section is expanded, so nothing is dropped |
| pause | on `:hover` and on `:focus-within`, so it stops while being read or tabbed through |
| `prefers-reduced-motion` | no auto-scroll; the row becomes a normal scrollable strip |
| "See all reviews" | swaps the loop for a full 3-column grid with every review unclamped, and hides the duplicate set so nothing appears twice |

**3. Navigation was too crowded.** SEO, WEB and CRO were three separate top-level items.
They now live inside a **Full Suite mega-menu**, which drops the bar from **10 items to 7**.

The mega-menu has three columns: the suite itself (with its real one-line promise and a
link through), the three services that have their own pages, and the five that do not —
Content Writing, Reputation Management, Graphic Design, Branding, Consulting. Those five
are rendered as **text, not links**, because they have no page to point at and a link to
nowhere is the dead-link defect the gate exists to catch. Every label is lifted from the
source's own "FULL SUITE INCLUDES" section and hero pills; none is invented.

Because the bar now needs ~955px instead of ~1,353px, the hamburger breakpoint moved
from 1180px down to **980px** — tablets keep the real navigation. Verified: desktop nav
with a 3-column mega-menu at 1000px and up, hamburger with a stacked 1-column mega-menu
at 960px and below, the CTA reachable at every width, and 0 header overflow throughout.

Re-verified after: **78 combinations** (13 pages × 1440/1280/1024/900/768/390) with 0
spacing violations, 0 overflow, 0 broken images and 0 heading skips; content recall
**96.46%**; 0 SEO issues; 0 accessibility issues; decontamination CLEAN.

## Revisions (round 5)

**Logo enlarged in the navigation bar and the footer.**

| | before | after |
|---|---|---|
| header mark | 38px (32px in the mid-width band) | **52px at every width** |
| footer mark | 38px (shared the header rule) | **68px** (its own rule — the footer has more room) |
| declared `width`/`height` | `160×80` | **`250×122`** — the file's real size |

The declared attributes were the wrong aspect ratio (2:1 against the file's 2.05:1),
so the reserved box did not match what decoded and the mark shifted slightly on load.
Corrected on all 302 logo tags.

Two knock-on fixes the change forced, both measured rather than assumed:

1. **The header CTA overflowed in a mid-width band.** With the larger mark the desktop
   bar needs ~1140px of layout width; below that the "Start Here" button spilled past
   the header (66px at 1000px, 115px at 1121px). The hamburger breakpoint moved from
   980px to **1140px**, and the mega-menu's stacked form and the JS breakpoint moved
   with it — previously they sat 40px apart, which would have left a band where the nav
   collapsed but the mega-menu stayed absolutely positioned.
2. **A 1px broken band at the boundary.** The mid-width tightening rule was written as
   `(max-width: 1400px) and (min-width: 1141px)`; at exactly 1141px it failed to match,
   so the bar rendered untightened (nav 829px instead of 702px) and the CTA overflowed
   by 97px. The lower bound was redundant — below 1140px the hamburger takes over — so
   it is gone and the band is closed.

Verified after: the logo renders at 52/68px with the correct aspect ratio at every
width from 390px to 1600px, 0 CTA spill and 0 document overflow across 11 widths, the
hero CTAs still land in the first fold, and a 78-combination sweep (13 pages ×
1440/1200/1141/1024/768/390) reports 0 spacing violations, 0 overflow, 0 broken images
and 0 heading skips. Content recall 96.46%, decontamination CLEAN.

## Revisions (round 6) — alignment and image sizing

Auditing for the reported misalignment turned up two defects that were worse than
the alignment itself.

### The portfolio tiles were showing the wrong pictures

Tiles paired images to projects **by document order**, so they took whatever appeared
first in the page: a 60×60 phone glyph and a 64×64 Google avatar, stretched **6×** across
a 369px tile. Loosening the rule to "any large image" only swapped those for a contact
graphic and the site's own logo.

Every project's real screenshot is among the ~356 assets lost with the closed GCS bucket
(FINDINGS.md §2), so **no correct image exists** and any real-image pick is arbitrary.
Each tile now uses purpose-generated art for its own category.

Two attempts were rejected on the way, and the reason matters:

* **Environmental renders** (a law library, a spa treatment room) were rejected because a
  photorealistic interior on a tile captioned "All American Law Firm" reads as *that firm's
  premises* — the documentary role generated imagery must never fill (B3).
* **Reusing the service art** was rejected because it put two glasses toasting on the law
  tiles and a flame on a dental one: right register, wrong meaning.

The five tiles that shipped are deliberately non-representational — ordered glass columns,
concentric arcs, an open lattice, glass petals, floating panels — carrying a category by
shape and colour alone. `fabrication:generated-proof` findings: **0**.

### /our-team rendered nobody

The source page is an empty Divi shell whose body is the unexpanded shortcode
`[get_aff_team_members]`, so it extracted 0 people and the page shipped with no team on
it. The real roster — 9 people with their photographs — is published on the homepage, so
it is read from there. Same site, same people, nothing invented. **0 → 9 portraits.**

### Alignment and sizing

| fix | measured |
|---|---|
| Two-column media rows were centre-aligned, so columns of unequal height read as unaligned — on `/services/suite` a 205px text block sat **101px** down the side of a 408px image. Columns now share a top edge. | topDelta **101 → 0** (and 23/29 → 0 on the homepage hero and founder rows) |
| The case study put a 698px body column beside a 324px stats column, top-aligned, stranding **374px** of dead space under the stats. | stats centre against the body |
| Team portraits were 100px circles cropped from 350×400 originals | **148px** |
| The founder's magazine inset was 150px against a 420px portrait | **clamp(120px, 34%, 190px)** |
| Press logos were 46px in a 1160px strip | **62px** |
| Accordion `+`/`−` glyphs (`list-add.svg`) rendered as article content, expanding to **831px** in a 740px prose column because an SVG with no intrinsic box fills its container | icon-sized and icon-named assets are skipped in prose |

The layout sweep now also fails on **any image blown up past 1.25× its intrinsic width**
(ignoring low-opacity backdrops) and on **any two-column media row whose columns differ by
more than 12px at the top** — both defects it previously could not see.

Re-verified: **78 combinations** (13 pages × 1440/1200/1141/1024/768/390) with 0 spacing
violations, 0 overflow, 0 broken images, 0 heading skips, **0 upscaled images and 0
misaligned rows**. Content recall 96.46%, 0 SEO issues, 0 accessibility issues,
decontamination CLEAN, 0 generated-proof findings.

## Revisions (round 7)

**The raised-finger portrait moved to About Us.** `james-approved.png` left the founder
section and now stands beside the About Us copy, which became a two-column row for it
(text left, founder right, with a soft violet pool so the cut-out is not floating on
nothing). It renders 360×516 from a 504×722 original — **0.71×, no upscaling** — with its
base level with the panel's (bottom delta **0**). Below 900px the row stacks and the
figure leads.

The three founder photographs now sit in three different places: the magazine cover in
the founder section, the raised finger in About Us, the hands-up cut-out in the guarantee
band.

**The MYVEGAS cover is now the founder section's image**, sized to the copy beside it
rather than tucked in as a 150px inset — **150px → 475×537px**.

Two things had to be undone to get there:

* `.hero__visual img` caps height at `min(58vh, 460px)`, which was clamping the cover to
  **341px** and letterboxing it inside a 5:4 box — so it was rendering landscape when the
  file is portrait. That cap is overridden for this image.
* The old `founder-figure__cut` / `__inset` rules became dead once the markup changed,
  including a breakpoint override for an element that no longer exists. Removed.

**On "match the size of the text":** the cover reaches **89% of the text column height**
(537px against 602px), not 100%. The only copy of it in the harvest is 380×430 — the
larger `MyVegasMag-Mockups.png` is among the dead GCS assets — so filling the full height
would mean upscaling ~1.4× and visibly softening it. It is capped at 1.25×, the limit the
layout sweep's own no-upscale check allows. A sharper original would close the last 65px.

Re-verified: **65 combinations** (13 pages × 1440/1200/1024/768/390) with 0 spacing
violations, 0 overflow, 0 broken images, 0 heading skips, 0 upscaled images and 0
misaligned rows; content recall 96.46%, 0 SEO issues, 0 accessibility issues,
decontamination CLEAN, 0 generated-proof findings.

## Revisions (round 8)

**The founder in the guarantee band now meets the bottom of the card.** He was floating
with a gap beneath him; the cause was `align-self: end` stopping at the bottom of the
band's CONTENT box, which sits one padding-length above the border edge — and that
padding measured exactly **81px**, the size of the gap.

A negative bottom margin equal to that padding (tracked with the same `clamp()`, so it
follows the padding at every width) carries him down to the border edge, where
`.glass`'s `overflow: hidden` crops him — the torso meets the card instead of hovering
over it. He was also rendering at only 0.46× of a 571×462 original, so the width grew
with room to spare.

| | before | after |
|---|---|---|
| gap to the card's bottom edge | **81px** | **0–1px** |
| figure size (1440px) | 260×210 | **420×340** |
| upscale factor | 0.46× | **0.74×** (guard trips at 1.25×) |

Checked the cut-out's alpha channel directly rather than assuming: the PNG has **0
transparent rows at the bottom** — the torso runs to the final pixel row (461 of 462) —
so a flush image box really is a flush figure, not a flush box around a floating one.

Verified across 1440/1200/900/390: gap 0–1px at every width, no overlap with the
"Start Here" button, figure inside the card's right edge, 0 document overflow. The
stacked layout below 760px gets the same treatment.

Re-verified: **65 combinations** (13 pages × 1440/1200/1024/768/390) with 0 spacing
violations, 0 overflow, 0 broken images, 0 heading skips, 0 upscaled images and 0
misaligned rows; content recall 96.46%, 0 SEO issues, 0 accessibility issues,
decontamination CLEAN.

## Revisions (round 9) — mobile

The desktop layout had been driving the phone. Type, padding and tap targets all
came from fluid `clamp()` values whose lower bounds were tuned for a 1440px page, so
at 375px they bottomed out: body copy set at **12.9px**, the smallest labels at
**10.9px**, and section padding staying at **56px** top and bottom on all 15 sections
— more than a seventh of a phone screen spent on empty band, twice per section.

The fix is one scoped `@media (max-width: 640px)` block that re-floors the type scale
and the spacing tokens. It changes token values, not call sites, so every component
inherits the correction (BRAND-SYSTEM.md §tokens).

### Measured, 375px viewport

| | before | after |
|---|---|---|
| body copy | 12.9px | **16.1px** |
| nav and footer links | 12.9px | **14px** |
| smallest text anywhere on the page | 10.9px | **12.8px** |
| `.btn--sm` label | 11.5px | **13.1px** |
| H1 | 42.9px | **35.2px** (headline no longer outruns the 375px line) |
| section padding | 56px | **44px** |
| page gutter | 17px | **20px** |
| tap targets under 44px | **16–17 per page** | **0** |

Two details worth naming, because both are places a blanket rule would have done
damage. Footer and breadcrumb links got padding to reach 44px, but a link inside a
sentence must NOT become a 44px block — so the rule is scoped to `p > a:only-child`,
a link that IS the whole paragraph and is therefore a CTA. And the H1 went *down*,
not up: at 42.9px the headline was breaking mid-word on a 375px screen.

### The one glass surface that cannot be glass

Found by opening the nav drawer on screen rather than measuring it: the hero headline
read straight through the open menu, competing with the nav labels.

The cause is a CSS rule that looks correct in isolation. The drawer carried
`background: rgba(11,4,20,.94)` **and** `backdrop-filter: blur(34px)` — but its parent
`.site-header__inner` already has a `backdrop-filter`, and **an element with one becomes
the backdrop root for everything inside it.** The drawer's blur could only ever sample
within that root, never the page behind the header, so it silently did nothing. The 6%
of the hero transmitted through a 0.94 fill therefore stayed perfectly *sharp* — and
sharp 35px headline type at 6% is legible.

The drawer is now an opaque `var(--bg-deep)` fill; the glass read is carried by its
border and shadow instead. Confirmed by forcing the fill opaque in the live DOM before
editing any CSS, so the diagnosis was proven rather than inferred.

A sweep for the same trap found **19 more nested `backdrop-filter` elements** — all form
inputs inside `.glass` cards. Their blur is equally inert, but the surface behind them
is a flat panel with no detail to bleed through, so there is no legibility consequence;
they are left alone and recorded here rather than churned.

### Dangling in-page anchors — 63 of them

Separately found while sweeping: **63 `href="#id"` links pointing at ids no page
contains** — `#seog__inquiry` (58 refs), `#bookAppointment` (4) and `#main-content`
(1). They addressed WordPress widgets — an inquiry modal and a booking embed — that
this rebuild does not render, so every one clicked to nothing. `sr-decontaminate`
only flags a bare `href="#"`, which is why they survived every earlier pass.

The inquiry and booking anchors now resolve to `/contact-us`, which is what they were
for; `#main-content` resolves to this build's `#main` landmark. Detection was added
to `build/verify.mjs` so the class of defect cannot come back silently.

### Verification

**44 mobile combinations** (11 pages × 360/390/414/430) — 0 problems. **20 desktop
combinations** (5 pages × 1440/1200/900/768) — 0 problems, with homepage body copy
still 17px and section padding 31/27/22/20px, confirming the mobile block does not
leak upward. Interactive state checked at 390 and 360: hamburger 44×44, drawer within
the viewport, megamenu collapsing to one column, review carousel looping with a 260px
card, hero CTA full-width and inside the first fold, 0 horizontal document overflow.

Content recall 96.46%, 0 SEO issues, 0 accessibility issues, 0 broken assets,
0 bare-`#` anchors, **0 dangling `#anchors`**.

## Claims

`sr-fabrication` raised 1857 findings. **1833 (98.7%) match text that appears
verbatim in `audit/raw/` — the untouched crawl.** They are the site's own copy and its
real customer reviews, not invented material.

All 141 `fabrication:statistic` findings are one claim — **"3x more"** — and it is not a
statistic the rebuild authored. It sits inside a customer review ("I was paying 3x more
doing this with multiple companies") that appears word for word in **165 source pages**,
and the rebuild reproduces the whole sentence unchanged. A 7-character fragment would
match any large corpus by accident, so it was cleared the stricter way: lift the
surrounding sentence off the rebuilt page and require *that* span to be found intact in
the source. 141 findings cleared that way.

The remaining 24 findings are 4 distinct scanner artefacts of the same kind: a heading
concatenated across a newline with the body text that follows it — e.g. the page
`<title>` "the best Las Vegas…" joined to "Continue reading". Each half is in the
crawl (169 and 38 pages respectively); the joined span is not a sentence that appears
anywhere, so there is nothing to source.

**No testimonial, statistic, credential, client or guarantee in this rebuild was
authored.** Evidence: `build/fabrication-traceability.json`.

---

## 2026-09-17 — ship-blocking corrections

Scope: defects a visitor or a search engine would hit. The outstanding gate FAILs were
deliberately left alone; see `docs/GATE-WAIVERS.md` for what is waived and why.

All four fixes land in `build/`, never in `dist/`. The build was confirmed reproducible
first — two consecutive runs of `build/build-site.mjs` produced byte-identical output, and
the shipped `dist/` regenerated from source with all 288 files matching — so every byte
that moved is attributable to these changes. 37 patches applied by exact string match;
151 HTML files and `sitemap.xml` changed.

### A phone link that dialled the wrong number

`dist/location/las-vegas/index.html` shipped
`<a href="tel:(702) 362-8700">(702) 420-7272</a>`. The captured source markup
(`audit/preset-index.json:13424`) carries the identical mismatch, so this was a faithful
reproduction of a live-site defect, not one the rebuild introduced.

`build/render.mjs` `linkify()` carried the href and the label independently and never
reconciled them. It now rebuilds any `tel:` href from the digits in its own visible label,
in `+E.164`, and leaves the href untouched if the label holds no single unambiguous number
— it can never invent a number. Two anchors changed: the Las Vegas one above, and
`ddm-magazine-forward` `tel:800-383-9548` → `tel:+18003839548` (same digits, reformatted).
All 791 `tel:` hrefs in `dist/` are now well-formed `+E.164` and none disagrees with its label.

**Consequence, recorded deliberately:** `(702) 362-8700` is now absent from the rebuild, so
`sr-parity` still reports it as a lost contact detail and **C19 stays FAIL**. Accepted — see
`docs/GATE-WAIVERS.md`.

### Two pages claiming another company's identity

`nuleaf-magazine-forward` carried `rel=canonical` and `og:url` pointing at
**`https://nuleafnv.com/`**, with `og:site_name "NuLeaf"`; `lla-magazine-forward` carried a
relative canonical `/` and `og:site_name "Liquor License Agents"`. All three
`/*-magazine-forward` URLs are 301 vanity forwards to client sites, so the harvester left
this origin and stored the client's head metadata under a seoguarantee URL.

`seoFor()`/`canonicalFor()` in `build/build-site.mjs` now require a carried-forward canonical
to be an absolute URL **on this origin**, and treat an off-origin `finalUrl` as proof the
record is not ours — resetting `og:site_name` and setting `noindex, follow`.

`noindex` is part of the fix, not scope creep: these pages still carry the client's title,
description and body copy. A bare self-canonical would have seoguarantee.com positively
assert that a scraped copy of a client's homepage is its own — duplicate content competing
against the very client it is paid to rank. The URLs keep resolving, so
`docs/DEPLOY.md`'s "keep the existing URLs" policy is honoured. Nothing internally links to
them. `sitemap.xml` drops from 116 to 115 entries.

### Forms silently ate the visitor's message with JavaScript off

All 274 forms post to `/api/contact`, which returns a plain-text 404 on a static host.
`src/scripts/app.js` intercepts the submit and shows a note — but with scripting off nothing
binds, the browser posts, and the typed message is gone with no explanation.

Each form now carries a `<noscript>` block with the site's own
"Call Us Anytime +1 (702) 420-7272" call-to-action (wording lifted verbatim from the source
corpus, so it adds no new claim), and `shell()` emits a `<noscript><style>` rule that hides
the fields and the submit button when scripting is off — so nothing is typed and lost in the
first place. `action` is deliberately unchanged and `app.js` is untouched, so behaviour with
JavaScript on is byte-identical.

**Not fixed, and worth stating plainly:** the form has no backend either way. With JavaScript
on, `app.js` calls `preventDefault()` and never transmits — the message is discarded in the
browser. The visitor is told so by the existing form note. Wiring up a real endpoint remains
a launch prerequisite (`docs/DEPLOY.md`).

### Documentation that misdescribed the bundle

25 corrections across `RUN.md`, `docs/RUN.md`, `docs/DEPLOY.md`, `docs/README.md` and
`docs/FINDINGS.md`. The load-bearing ones:

- Both RUN.md copies and DEPLOY.md said every `<form>` posts to `action="#"`. **None does**;
  all 274 use `/api/contact`.
- RUN.md disclosed 6 broken internal links. The measured figure is **18**, out of 208 unique
  local references.
- `docs/README.md` pointed at `node build/serve.mjs`, **which does not exist** — the server is
  `serve.mjs` at the bundle root.
- `docs/README.md` listed a rebuild sequence starting with `build/extract-blocks.mjs`. That
  script reads `audit/raw/`, which is **not in this bundle**; run as documented it would
  silently overwrite `build/content-blocks.json` with empty output and destroy the build's
  own input. The sequence now names the one step that is runnable here.
- `audit/` was described as "the crawl". It holds the crawl's *derived inventories*; the raw
  HTML was never shipped.
- `docs/FINDINGS.md` §9 claimed no contact detail was dropped. True for `800-799-9081`,
  false for `(702) 362-8700` — corrected.
