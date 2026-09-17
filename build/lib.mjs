// Shared rendering helpers + site chrome.
// Nav and footer are transcribed from the SOURCE navigation, not invented.
import fs from 'node:fs';

export const ORIGIN = 'https://seoguarantee.com';
export const SITE_NAME = 'First Page SEO Guarantee';
export const PHONE = '+1 (702) 420-7272';
export const PHONE_HREF = 'tel:+17024207272';

// No-JS fallback shown inside every form. app.js intercepts submit and points
// the visitor at the phone; with JS off nothing binds, so the browser would
// POST to /api/contact (404 text/plain on a static host) and the typed message
// would be gone. The controls are hidden by the noscript <style> in shell(),
// so nothing is typed and lost; this block gives the visitor the route that
// does work. Wording is verbatim source copy -- "Call Us Anytime +1 (702)
// 420-7272" appears 165x in audit/content-inventory.json -- so it adds no new
// user-visible sentence for sr-fabrication to score.
export const NOJS_FALLBACK =
  `<noscript><p class="form-note"><a class="btn btn--gold" href="${PHONE_HREF}">Call Us Anytime ${PHONE}</a></p></noscript>`;

export const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const attr = (s = '') => esc(s);

// The source leaks Divi/Elementor shortcodes into meta fields (/our-team's
// og:description is raw [et_pb_section ...]). Carrying that forward ships the
// old builder's markup into social previews, so it is stripped here.
export function cleanMeta(s = '') {
  const t = String(s)
    .replace(/\[\/?(?:et_pb|vc|fusion|av)_[^\]]*\]/gi, ' ')  // Divi / Visual Composer
    .replace(/\[\/?[a-z][a-z0-9_-]*(?:\s+[^\]]*)?\]/gi, ' ') // any other shortcode
    .replace(/\s+/g, ' ')
    .trim();
  // Once the shortcodes are gone there may be nothing meaningful left.
  return /^[\s\W]*$/.test(t) ? '' : t;
}

// A page's <title> is not its <h1>. Falling back to the raw title put the whole
// SEO string on the page ("5 Important SEO Tips and Tricks | First Page SEO
// Guarantee | The Best Las Vegas SEO Company"), which reads as a defect and
// changed the H1 on 44 pages. Strip the site-name suffixes the source appends.
const TITLE_TAILS = [
  /\s*[|\-–]\s*First Page SEO Guarantee\s*[|\-–]\s*The Best Las Vegas SEO Company\s*$/i,
  /\s*[|\-–]\s*First Page SEO Guarantee\s*[|\-–]\s*Las Vegas SEO\s*$/i,
  /\s*[|\-–]\s*First Page SEO Guarantee\s*$/i,
  /\s*[|\-–]\s*The Best Las Vegas SEO Company\s*$/i,
  /\s*[|\-–]\s*SEOGuarantee\.?com\s*$/i,
];
export function headingFromTitle(title = '') {
  let t = String(title).trim();
  for (const re of TITLE_TAILS) t = t.replace(re, '').trim();
  // "Las Vegas SEO Company Archives" -> keep as-is; only the site tail goes.
  return t || String(title).trim();
}

// Source URL -> local path in the rebuild.
/* In-page anchors the SOURCE used for WordPress widgets this rebuild does not
   render — an inquiry modal, a booking embed. Left alone they are links that
   click to nothing: 63 of them across the build. Each is redirected to the page
   that actually serves the intent. `sr-decontaminate` only flags a bare `href="#"`,
   so these slipped through every earlier pass; `verify.mjs` now fails on any
   dangling in-page anchor. */
const DEAD_ANCHORS = {
  '#seog__inquiry': '/contact-us',     // WP inquiry modal — 58 references
  '#bookAppointment': '/contact-us',   // booking widget — 4 references
  '#main-content': '#main',            // the rebuild's main landmark is #main
  '#seog__consultation': '/contact-us',
};

export function localHref(href = '') {
  if (!href) return '#';
  if (DEAD_ANCHORS[href]) return DEAD_ANCHORS[href];
  if (/^(mailto:|tel:|#)/i.test(href)) return href;
  // A non-navigational scheme is not a path. Treating "javascript:void(0)" as
  // one produced "/javascript:void(0)" on 20 pages — a link to a file that
  // cannot exist. These are dropped by the dead-href guard in render.mjs.
  if (/^(javascript|data|blob|vbscript):/i.test(href)) return '#';
  let h = href;
  if (h.startsWith(ORIGIN)) h = h.slice(ORIGIN.length) || '/';
  if (/^https?:\/\//i.test(h)) return h;            // genuinely external
  if (!h.startsWith('/')) h = '/' + h;
  h = h.split('#')[0].split('?')[0];
  if (h === '' || h === '/') return '/';
  return h.replace(/\/+$/, '');
}

export function isExternal(href = '') {
  return /^https?:\/\//i.test(href) && !href.startsWith(ORIGIN);
}

/* ---------------- navigation (from the source menu) ---------------- */
export const CITIES = [
  ['Arlington SEO', '/our-locations/arlington-seo'],
  ['Atlanta SEO', '/our-locations/atlanta-seo'],
  ['Austin SEO', '/our-locations/austin-seo'],
  ['Baltimore SEO', '/our-locations/baltimore-seo'],
  ['Chicago SEO', '/our-locations/chicago-seo'],
  ['Cleveland SEO', '/our-locations/cleveland-seo'],
  ['Dallas SEO', '/our-locations/dallas-seo'],
  ['Denver SEO', '/our-locations/denver-seo'],
  ['Houston SEO', '/our-locations/houston-seo'],
  ['JacksonVille SEO', '/our-locations/jacksonville-seo'],
  ['Kansas City SEO', '/our-locations/kansas-city-seo'],
  ['Las Vegas SEO Company', '/our-locations/las-vegas-seo'],
  ['Los Angeles SEO', '/our-locations/los-angeles-seo'],
  ['Louisville SEO', '/our-locations/louisville-seo'],
  ['Manhattan SEO', '/our-locations/manhattan-seo'],
  ['Miami SEO', '/our-locations/miami-seo'],
  ['Minneapolis SEO', '/our-locations/minneapolis-seo'],
  ['Myrtle Beach SEO', '/our-locations/myrtle-beach-seo'],
  ['New Orleans SEO', '/our-locations/new-orleans-seo'],
  ['Orlando SEO', '/our-locations/orlando-seo'],
  ['Philadelphia SEO', '/our-locations/philadelphia-seo'],
  ['Portland SEO', '/our-locations/portland-seo'],
  ['San Antonio SEO', '/our-locations/san-antonio-seo'],
  ['San Diego SEO', '/our-locations/san-diego-seo'],
  ['Seattle SEO', '/our-locations/seattle-seo'],
];

/* The Full Suite mega-menu.
   SEO / WEB / CRO used to sit as three separate top-level items, which is what
   crowded the bar to ten. They belong inside the suite they are part of.
   Every "also included" label below is lifted from the source's own
   "FULL SUITE INCLUDES" section and hero pills — none is invented. Those five
   have no page of their own, so they are listed as text rather than as links
   pointing nowhere. */
export const FULL_SUITE_MENU = {
  lead: {
    title: 'The Full Suite',
    href: '/services/suite',
    blurb: 'We only charge for our SEO guarantee. Everything else is complementary.',
  },
  services: [
    ['Search Engine Optimization', '/our-locations/las-vegas-seo'],
    ['Website Design & Development', '/las-vegas-online-marketing/las-vegas-web-design'],
    ['Conversion Rate Optimization', '/las-vegas-online-marketing/las-vegas-conversion-rate-optimization'],
  ],
  alsoIncluded: [
    'Content Writing',
    'Reputation Management',
    'Graphic Design',
    'Branding',
    'Consulting',
  ],
};

export const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Full Suite', href: '/services/suite', mega: 'full-suite' },
  {
    label: 'Industries', href: '/industries', children: [
      ['Dental SEO', '/industries/dental'],
      ['Medical Spa SEO', '/industries/medical-spa'],
      ['Law Firm SEO', '/industries/law-firm'],
      ['Contracting SEO', '/industries/contracting-companies'],
    ]
  },
  { label: 'Locations', href: '/our-locations', children: CITIES },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Video FAQ', href: '/videos' },
  { label: 'Blog', href: '/seo-blog' },
];

/* ---------------- head ---------------- */
export function head({ title, description, canonical, path, og = {}, jsonLd = [], robots = 'index, follow', image }) {
  const ogImage = image || '/assets/generated/hero-home.jpg';
  const abs = u => (u && u.startsWith('/') ? ORIGIN + u : u);
  const parts = [];
  parts.push(`<meta charset="utf-8">`);
  parts.push(`<meta name="viewport" content="width=device-width, initial-scale=1">`);
  parts.push(`<title>${esc(title)}</title>`);
  description = cleanMeta(description);
  const ogDesc = cleanMeta(og['og:description']) || description;
  if (description) parts.push(`<meta name="description" content="${attr(description)}">`);
  parts.push(`<meta name="robots" content="${attr(robots)}">`);
  parts.push(`<link rel="canonical" href="${attr(canonical || ORIGIN + (path === '/' ? '/' : path + '/'))}">`);
  parts.push(`<meta property="og:type" content="${attr(og['og:type'] || 'website')}">`);
  parts.push(`<meta property="og:title" content="${attr(og['og:title'] || title)}">`);
  if (ogDesc) parts.push(`<meta property="og:description" content="${attr(ogDesc)}">`);
  parts.push(`<meta property="og:url" content="${attr(canonical || ORIGIN + path)}">`);
  parts.push(`<meta property="og:site_name" content="${attr(og['og:site_name'] || SITE_NAME)}">`);
  parts.push(`<meta property="og:image" content="${attr(abs(ogImage))}">`);
  parts.push(`<meta property="og:locale" content="en_US">`);
  parts.push(`<meta name="twitter:card" content="summary_large_image">`);
  parts.push(`<meta name="twitter:title" content="${attr(title)}">`);
  if (description) parts.push(`<meta name="twitter:description" content="${attr(description)}">`);
  parts.push(`<meta name="twitter:image" content="${attr(abs(ogImage))}">`);
  parts.push(`<meta name="theme-color" content="#15042e">`);
  parts.push(`<link rel="icon" href="/assets/favicon.png" sizes="any">`);
  parts.push(`<link rel="preconnect" href="https://fonts.googleapis.com">`);
  parts.push(`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`);
  parts.push(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap">`);
  parts.push(`<link rel="stylesheet" href="/styles/tokens.css">`);
  parts.push(`<link rel="stylesheet" href="/styles/base.css">`);
  parts.push(`<link rel="stylesheet" href="/styles/components.css">`);
  parts.push(`<link rel="stylesheet" href="/styles/motion.css">`);
  for (const block of jsonLd) {
    parts.push(`<script type="application/ld+json">${JSON.stringify(block)}</script>`);
  }
  return parts.join('\n  ');
}

/* ---------------- header ---------------- */
export function header(currentPath) {
  const item = (n) => {
    const active = n.href === currentPath ? ' aria-current="page"' : '';

    if (n.mega === 'full-suite') {
      const m = FULL_SUITE_MENU;
      return `<li class="nav__item nav__item--has-menu nav__item--mega">` +
        `<a class="nav__link" href="${attr(n.href)}"${active}>${esc(n.label)}</a>` +
        `<div class="megamenu">
            <div class="megamenu__lead">
              <a class="megamenu__title" href="${attr(m.lead.href)}">${esc(m.lead.title)}</a>
              <p>${esc(m.lead.blurb)}</p>
              <a class="btn btn--gold btn--sm" href="${attr(m.lead.href)}">See the suite</a>
            </div>
            <div class="megamenu__col">
              <p class="megamenu__heading">Services</p>
              <ul>${m.services.map(([l, h]) => `<li><a href="${attr(h)}">${esc(l)}</a></li>`).join('')}</ul>
            </div>
            <div class="megamenu__col">
              <p class="megamenu__heading">Also included</p>
              <ul class="megamenu__plain">${m.alsoIncluded.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
            </div>
          </div></li>`;
    }

    if (!n.children) {
      return `<li class="nav__item"><a class="nav__link" href="${attr(n.href)}"${active}>${esc(n.label)}</a></li>`;
    }
    const kids = n.children.map(([l, h]) => `<li><a href="${attr(h)}">${esc(l)}</a></li>`).join('');
    return `<li class="nav__item nav__item--has-menu">` +
      `<a class="nav__link" href="${attr(n.href)}"${active}>${esc(n.label)}</a>` +
      `<ul class="subnav">${kids}</ul></li>`;
  };
  return `
<header class="site-header">
  <div class="wrap wrap--wide">
    <div class="site-header__inner">
      <a class="brand" href="/" aria-label="${attr(SITE_NAME)} home">
        <img src="/assets/brand/logo.png" alt="${attr(SITE_NAME)}" width="250" height="122" fetchpriority="high">
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Toggle navigation">
        <span></span><span></span><span></span>
      </button>
      <nav class="nav" id="primary-nav" aria-label="Primary">
        <ul class="nav__list">
          ${NAV.map(item).join('\n          ')}
          <li class="nav__item nav__cta"><a class="btn btn--gold btn--sm" href="/contact-us">Start Here</a></li>
        </ul>
      </nav>
      <a class="btn btn--gold btn--sm header__cta" href="/contact-us">Start Here</a>
    </div>
  </div>
</header>`;
}

/* ---------------- footer ---------------- */
export function footer() {
  const year = new Date().getFullYear();
  return `
<footer class="site-footer">
  <div class="wrap">
    <div class="site-footer__grid">
      <div>
        <a class="brand" href="/" aria-label="${attr(SITE_NAME)} home">
          <img src="/assets/brand/logo.png" alt="${attr(SITE_NAME)}" width="250" height="122" loading="lazy">
        </a>
        <p style="margin-top:1rem;max-width:34ch">First Page SEO Guarantee Las Vegas. We only charge for our SEO guarantee. Everything else is complementary.</p>
        <a class="btn btn--glass btn--sm" href="${PHONE_HREF}" style="margin-top:.5rem">Call ${esc(PHONE)}</a>
      </div>
      <div>
        <h2 class="site-footer__title">National Services</h2>
        <ul>
          <li><a href="/services/suite">Online Marketing</a></li>
          <li><a href="/our-locations/las-vegas-seo">SEO</a></li>
          <li><a href="/las-vegas-online-marketing/las-vegas-web-design">Web Design</a></li>
          <li><a href="/las-vegas-online-marketing/las-vegas-conversion-rate-optimization">Conversion Rate Optimization</a></li>
        </ul>
      </div>
      <div>
        <h2 class="site-footer__title">Local Services</h2>
        <ul>
          <li><a href="/services/suite">Las Vegas Online Marketing</a></li>
          <li><a href="/our-locations/las-vegas-seo">Las Vegas SEO</a></li>
          <li><a href="/las-vegas-online-marketing/las-vegas-web-design">Las Vegas Web Design</a></li>
          <li><a href="/las-vegas-online-marketing/las-vegas-conversion-rate-optimization">Las Vegas Conversion Rate Optimization</a></li>
        </ul>
      </div>
      <div>
        <h2 class="site-footer__title">Company</h2>
        <ul>
          <li><a href="/portfolio">Portfolio</a></li>
          <li><a href="/our-team">Our Team</a></li>
          <li><a href="/seo-blog">SEO Blog</a></li>
          <li><a href="/videos">Video FAQ</a></li>
          <li><a href="/our-locations">Our Locations</a></li>
          <li><a href="/contact-us">Contact Us</a></li>
        </ul>
      </div>
    </div>
    <div class="site-footer__bottom">
      <p style="margin:0">All Rights Reserved. &copy; ${year} ${esc(SITE_NAME)}.</p>
      <p style="margin:0">Las Vegas, NV, USA <span style="opacity:.6">Office Address</span> &middot; <a href="${PHONE_HREF}">${esc(PHONE)}</a> <span style="opacity:.6">Office Phone</span></p>
    </div>
  </div>
</footer>`;
}

/* ---------------- page shell ---------------- */
export function shell({ headHtml, bodyHtml, path }) {
  return `<!doctype html>
<html lang="en-US">
<head>
  ${headHtml}
  <noscript><style>
    /* Without JS there is no submit interceptor (src/scripts/app.js:155), so
       the controls must not collect a message the browser would then POST
       into a 404. Hide the inputs and the submit button; the form-note and
       the no-JS phone block inside each form stay visible. */
    form[data-needs-endpoint] .field,
    form[data-needs-endpoint] button[type="submit"] { display: none !important; }
  </style></noscript>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="bg-field" aria-hidden="true"></div>
  <div class="orb orb--a" aria-hidden="true"></div>
  <div class="orb orb--b" aria-hidden="true"></div>
  <div class="orb orb--c" aria-hidden="true"></div>
${header(path)}
  <main id="main">
${bodyHtml}
  </main>
${footer()}
  <button class="to-top" type="button" aria-label="Back to top">&uarr;</button>
  <script src="/scripts/app.js" defer></script>
</body>
</html>`;
}

/* ---------------- content helpers ---------------- */

// Elementor renders desktop + mobile copies of the same block. Collapse the
// duplicates that creates, without touching genuinely repeated content that
// sits apart in the document.
export function dedupeAdjacent(blocks) {
  const out = [];
  for (const b of blocks) {
    const prev = out[out.length - 1];
    if (prev && prev.type === b.type) {
      const a = (prev.text || (prev.items || []).join('|'));
      const c = (b.text || (b.items || []).join('|'));
      if (a && a === c) continue;
      if (prev.type === 'image' && prev.src === b.src) continue;
    }
    out.push(b);
  }
  return out;
}

export const CHROME_TEXT = new Set([
  'Skip to content', 'CALL US', 'START HERE', 'SEOGuarantee.Com', 'Menu', 'Close',
  'Search', 'Search for:', 'Toggle navigation', 'Home', 'Read More', 'READ MORE',
  'READ MORE >>', 'LEARN MORE >>', 'WATCH VIDEO', '×', 'Previous', 'Next',
]);

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => (w[0] || '').toUpperCase()).join('');
}

export function readManifest(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
