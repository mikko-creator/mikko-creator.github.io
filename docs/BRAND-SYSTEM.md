# Brand system

Everything is driven by `src/styles/tokens.css`. Change a value there; never at
a call site.

## Where the palette came from

It was not invented. It is the live site's own colour, measured from computed
style across the source pages (`audit/design-baseline.json`):

| token | value | evidence in the source |
|---|---|---|
| `--violet-500` | `#4b0670` | 1,348 computed uses — the brand purple |
| `--violet-400` | `#621281` | 24 uses |
| `--violet-700/800/900` | `#2e0447` `#27043d` `#15042e` | the darker family the site already used |
| `--gold-200` | `#ffc906` | 124 background uses — the accent |
| `--gold-500` | `#e59c02` | 460 uses |
| `--ink-700` | `#222222` | 2,028 background uses |

The source also already used a translucent purple, `#7f21999c`, in 92 places.
That is why this redesign is built on glass rather than having glass imposed on
it — the direction was latent in the original.

## Typography

The source set `"Futura LT"` (12,878 computed uses) with Montserrat as its
secondary. Futura LT is a licensed font and cannot be redistributed with a
handoff, so the stack leads with **Montserrat** (already in use, and open
licensed) and keeps Futura LT next in the stack — a client with the licence
installed gets it automatically:

```css
--font-display: "Montserrat", "Futura LT", "Century Gothic", "Avenir Next", system-ui, …;
```

Sizes are a fluid scale, `--step--1` through `--step-6`, each a `clamp()`, so
there are no typographic breakpoints to maintain.

## The glass system

One primitive, composed:

| class | role |
|---|---|
| `.glass` | the pane: translucent fill, `backdrop-filter: blur(18px) saturate(150%)`, hairline border, inset top highlight |
| `.glass--strong` | heavier blur (34px) and shadow, for surfaces that carry a lot of text |
| `.glass--hover` | lifts 6px and lights its border on hover |
| `.glass--spot` | tracks the pointer and paints a soft gold spotlight through the pane |
| `.glass--tint` | violet-tinted fill |

Glass needs something behind it or it reads as flat grey. `.bg-field` (fixed,
three radial gradients plus a fine noise layer) and three blurred `.orb`
elements provide that, and the orbs parallax on scroll so the material has
something moving behind it.

**Legibility is not optional.** Browsers without `backdrop-filter` get an
opaque violet fill via `@supports not (...)`, rather than pale text on a busy
background.

## Motion

`src/styles/motion.css`. Reveal on scroll, staggered grids, a marquee, a gold
sheen on primary buttons, floating orbs.

Two rules it keeps:

1. **`prefers-reduced-motion` is honoured** — under it, revealed content is
   forced *visible* (`opacity:1 !important`), not merely un-animated. The
   source site ignored this preference entirely.
2. **No number that is a claim is ever animated.** A count-up renders
   "Over 600%" as "60%" for most of its run. On a site whose product is a
   guarantee, animating through false figures is not a flourish, so result
   figures are rendered at their true value and the motion is carried by the
   reveal instead.

`app.js` also guarantees content is never permanently invisible: above-the-fold
elements are revealed immediately, a 2.5s failsafe reveals everything, and
`visibilitychange` re-runs the sweep — because `IntersectionObserver` is
suspended in a background tab, and a page opened in one would otherwise stay
blank.

## A CSS trap worth remembering

`clamp()` and `calc()` require **whitespace around `+` and `-`**:

```css
padding: clamp(1.75rem,1rem+3vw,3.5rem);    /* INVALID — silently dropped */
padding: clamp(1.75rem,1rem + 3vw,3.5rem);  /* valid */
```

The invalid form does not fall back to a smaller value — the browser discards the
whole declaration, so the element computes to `padding: 0` and its text sits flush
against the edge. Eight inline styles in the templates carried the invalid form,
which is what produced the "text has no margin from its container" defect across
every glass panel. The authored stylesheets were unaffected because they were
written with spaces throughout.

If you add an inline `clamp()` in `build/render.mjs` or `build/build-site.mjs`,
put spaces around the operator. To check:

```bash
grep -o "clamp([^)]*[a-z0-9]+[0-9][^)]*)" dist/styles/*.css dist/index.html   # must return nothing
```

## Layout

* `--wrap: 1240px` standard, `--wrap-narrow: 760px` for prose, `--wrap-wide: 1480px` for the header.
* `--gutter` is fluid, so there is always a side margin at every width.
* Grids use `repeat(auto-fit, minmax(min(100%, Npx), 1fr))` — they reflow
  without breakpoints and never overflow at narrow widths.
* The primary nav collapses to a hamburger at **1180px**, not 900px: with ten
  top-level items plus a logo and a CTA, the desktop row measured 1,353px wide
  and overflowed a 1,280px viewport.
