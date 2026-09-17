// motion.css = the rebuild's own motion system + the source's keyframes,
// kept verbatim (B7). sr-motion.mjs writes only the harvest and would clobber
// the authored half, so this composes both and is re-run after it.
import fs from 'node:fs';

const harvest = fs.readFileSync('build/source-keyframes.sanitised.css', 'utf8').trim();

const authored = `/* ============================================================
   Motion — hierarchy, not decoration.

   Part 1 is this rebuild's motion system.
   Part 2 is the source site's keyframes, preserved VERBATIM from the live
   capture (audit/motion-inventory.json). A retyped keyframe is a different
   animation, so they are not re-authored — only the provenance comments were
   sanitised, because they carried wp-content/elementor URLs. 18 unused
   \`elementor-animation-*\` keyframes were dropped; see build/motion-removals.json.

   Every effect degrades to "instantly in its final state" under
   prefers-reduced-motion. The source ignored that preference; this does not.
   ============================================================ */

/* ---------- Part 1: the rebuild's motion system ---------- */

@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes float-slow {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -22px, 0); }
}

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(255, 201, 6, 0.42); }
  70% { box-shadow: 0 0 0 18px rgba(255, 201, 6, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 201, 6, 0); }
}

@keyframes sheen-drift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* ---- scroll reveal ----
   Hidden ONLY when JS is running (html.js), so a no-JS visitor gets the whole
   page rather than a blank one. app.js additionally reveals above-the-fold
   content immediately and runs a failsafe, because IntersectionObserver is
   suspended in a background tab. */
.js [data-reveal] {
  opacity: 0;
  transform: translate3d(0, 28px, 0);
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
  transition-delay: var(--reveal-delay, 0ms);
  will-change: opacity, transform;
}
.js [data-reveal="left"] { transform: translate3d(-34px, 0, 0); }
.js [data-reveal="right"] { transform: translate3d(34px, 0, 0); }
.js [data-reveal="scale"] { transform: scale(0.94); }
.js [data-reveal="blur"] {
  filter: blur(10px);
  transition: opacity var(--dur-slow) var(--ease-out), transform var(--dur-slow) var(--ease-out), filter var(--dur-slow) var(--ease-out);
}
.js [data-reveal].is-in { opacity: 1; transform: none; filter: none; will-change: auto; }

.js [data-stagger] > * {
  opacity: 0;
  transform: translate3d(0, 24px, 0);
  transition: opacity var(--dur-slow) var(--ease-out), transform var(--dur-slow) var(--ease-out);
}
.js [data-stagger].is-in > * { opacity: 1; transform: none; }
.js [data-stagger].is-in > *:nth-child(1) { transition-delay: 0ms; }
.js [data-stagger].is-in > *:nth-child(2) { transition-delay: 70ms; }
.js [data-stagger].is-in > *:nth-child(3) { transition-delay: 140ms; }
.js [data-stagger].is-in > *:nth-child(4) { transition-delay: 210ms; }
.js [data-stagger].is-in > *:nth-child(5) { transition-delay: 280ms; }
.js [data-stagger].is-in > *:nth-child(6) { transition-delay: 350ms; }
.js [data-stagger].is-in > *:nth-child(7) { transition-delay: 420ms; }
.js [data-stagger].is-in > *:nth-child(8) { transition-delay: 490ms; }
.js [data-stagger].is-in > *:nth-child(n + 9) { transition-delay: 560ms; }

/* ---- ambient ---- */
.orb--a { animation: float-slow 19s var(--ease-in-out) infinite; }
.orb--b { animation: float-slow 24s var(--ease-in-out) infinite reverse; }
.orb--c { animation: float-slow 28s var(--ease-in-out) infinite; }
.pulse { animation: pulse-ring 2.6s var(--ease-out) infinite; }

.text-gold--live {
  background: linear-gradient(100deg, var(--gold-100), var(--gold-200) 30%, var(--gold-500) 55%, var(--gold-100) 80%);
  background-size: 260% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: sheen-drift 9s var(--ease-in-out) infinite;
}

/* ---- the reduced-motion contract ---- */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
  html { scroll-behavior: auto; }

  /* revealed content must be VISIBLE, not merely un-animated */
  .js [data-reveal],
  .js [data-stagger] > * {
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  }
  .marquee__track { animation: none; transform: none; }
  .orb { animation: none; }
  .btn--gold::before { display: none; }
  .tile:hover img { transform: none; }
  .glass--hover:hover { transform: none; }
}

/* ---------- Part 2: source keyframes, verbatim ---------- */

`;

fs.writeFileSync('src/styles/motion.css', authored + harvest + '\n');

const out = fs.readFileSync('src/styles/motion.css', 'utf8');
console.log('motion.css composed —',
  (out.match(/@keyframes/g) || []).length, 'keyframes,',
  (out.match(/wp-content|elementor/gi) || []).length, 'platform refs,',
  (out.match(/prefers-reduced-motion/g) || []).length, 'reduced-motion block(s),',
  (out.match(/data-reveal/g) || []).length, 'reveal rules');
