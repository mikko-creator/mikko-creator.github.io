// Assemble the redesigned site into dist/.
import fs from 'node:fs';
import path from 'node:path';
import { head, shell, esc, attr, localHref, headingFromTitle, ORIGIN, SITE_NAME, PHONE, PHONE_HREF, dedupeAdjacent, CHROME_TEXT, NOJS_FALLBACK } from './lib.mjs';
import { extractFlagship } from './extract-flagship.mjs';
import * as R from './render.mjs';

const DIST = path.join(process.cwd(), 'dist');
const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));

const manifestFile = J('build/page-manifest.json');
const pages = manifestFile.manifest;
const blocksByPath = J('build/content-blocks.json');
const seo = new Map(J('audit/seo-inventory.json').pages.map(p => [p.url, p]));
const content = new Map(J('audit/content-inventory.json').pages.map(p => [p.url, p]));
const imgInv = J('audit/image-inventory.json').images;
const genManifest = J('build/generated-manifest.json').images;
const imagePlan = J('build/image-plan.json');

/* ---------- asset resolution ---------- */
const bySrc = new Map();
for (const i of imgInv) if (i.localFile) bySrc.set(i.src, i);

const copied = new Map();     // source localFile -> /assets/... public path
const missingAssets = new Map();

function resolveImage(src) {
  if (!src) return null;
  if (src.startsWith('/assets/')) return src;
  const rec = bySrc.get(src);
  if (!rec || !rec.localFile) {
    missingAssets.set(src, (missingAssets.get(src) || 0) + 1);
    return null;
  }
  if (copied.has(rec.localFile)) return copied.get(rec.localFile);
  const base = path.basename(rec.localFile);
  const pub = '/assets/media/' + base;
  const from = path.join(process.cwd(), rec.localFile);
  const to = path.join(DIST, 'assets', 'media', base);
  if (!fs.existsSync(from)) { missingAssets.set(src, (missingAssets.get(src) || 0) + 1); return null; }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (!fs.existsSync(to)) fs.copyFileSync(from, to);
  copied.set(rec.localFile, pub);
  return pub;
}

const hasGenerated = id => Boolean(genManifest[id]);
const genPath = id => (hasGenerated(id) ? `/assets/generated/${id}.jpg` : null);

// Copy a known real photograph straight out of the harvested source assets.
// Used for the James Sutton cut-outs, which the source published but the
// rebuild was not surfacing anywhere.
function localAsset(filename) {
  const from = path.join(process.cwd(), 'assets', 'source', filename);
  if (!fs.existsSync(from)) return null;
  const to = path.join(DIST, 'assets', 'media', filename);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (!fs.existsSync(to)) fs.copyFileSync(from, to);
  return '/assets/media/' + filename;
}

// Real photographs of the founder that exist in the source but went unused.
const JAMES = {
  pointing: 'e5e6a195-james-approved.png',   // 504x722 cut-out, pointing up
  handsUp: 'afa6f0d2-james-undercut.png',    // 571x462 cut-out
  // NOT used in the CTA band: this PNG bakes in a WHITE FPSG logo that is
  // invisible against white but competes with the headline on the dark ground.
  bothHands: '8ec960e7-james-fpsg-footer.png', // 537x465 cut-out + white logo
  magazine: '6abd0709-james-mag.png',        // 380x430 magazine cover
};

/* ---------- SEO carry-forward ---------- */
// The three /*-magazine-forward URLs are 301 vanity forwards to CLIENT sites
// (audit/seo-inventory.json redirectChain + finalUrl), so the harvester left
// this origin and stored the client's head metadata under our URL. Never carry
// an identity claim -- canonical, og:site_name, robots -- out of such a record.
function harvestedOffOrigin(s) {
  if (!s || !s.finalUrl) return false;
  try { return new URL(s.finalUrl).origin !== ORIGIN; } catch { return false; }
}

// A carried-forward canonical must be an ABSOLUTE URL on this origin. This
// rejects both the off-domain value (https://nuleafnv.com/) and the bare
// relative "/" the Liquor License Agents capture supplied, which would resolve
// on this origin to the homepage rather than to the page itself.
function onOrigin(u) {
  if (!u) return false;
  try { return new URL(u).origin === ORIGIN; } catch { return false; }
}

function seoFor(p) {
  const s = seo.get(p.url) || {};
  const c = content.get(p.url) || {};
  const foreign = harvestedOffOrigin(s);
  return {
    title: s.title || c.title || p.title || SITE_NAME,
    description: s.metaDescription || '',
    canonical: canonicalFor(p, s),
    robots: foreign ? 'noindex, follow' : (s.metaRobots || 'index, follow'),
    og: foreign ? { ...(s.openGraph || {}), 'og:site_name': SITE_NAME } : (s.openGraph || {}),
  };
}

// /our-locations/<city>-seo and /seo-services/<city>-seo serve identical copy.
// The live site canonicalises each to itself, which is a duplicate-content
// defect. Point the /seo-services/ twin at the /our-locations/ original.
function canonicalFor(p, s) {
  const dup = p.path.match(/^\/seo-services\/(.+)$/);
  if (dup) return ORIGIN + '/our-locations/' + dup[1] + '/';
  if (!harvestedOffOrigin(s) && onOrigin(s.canonical)) return s.canonical;
  return ORIGIN + (p.path === '/' ? '/' : p.path + '/');
}

function jsonLdFor(p, data) {
  const out = [];
  const org = {
    '@context': 'https://schema.org', '@type': 'ProfessionalService',
    name: SITE_NAME, url: ORIGIN, telephone: PHONE,
    address: { '@type': 'PostalAddress', addressLocality: 'Las Vegas', addressRegion: 'NV', addressCountry: 'US' },
    areaServed: 'United States',
    image: ORIGIN + '/assets/generated/hero-home.jpg',
  };
  if (data && data.rating && data.rating.score) {
    const count = (data.rating.based.match(/\d+/) || [])[0];
    if (count) org.aggregateRating = {
      '@type': 'AggregateRating', ratingValue: data.rating.score,
      reviewCount: count, bestRating: '5',
    };
  }
  out.push(org);
  out.push({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: crumbsFor(p).map(([name, href], i) => ({
      '@type': 'ListItem', position: i + 1, name,
      item: ORIGIN + (href || p.path),
    })),
  });
  return out;
}

function crumbsFor(p) {
  const out = [['Home', '/']];
  if (p.path === '/') return out;
  const seg = p.path.split('/').filter(Boolean);
  let acc = '';
  seg.forEach((s, i) => {
    acc += '/' + s;
    const label = s.replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
    out.push([label, i === seg.length - 1 ? null : acc]);
  });
  return out;
}

/* ---------- site-wide boilerplate detection ----------
   Every page carries the same founder bio, review carousel, team grid and
   video list. Those are rendered as designed sections, so repeating them
   inline as article prose would duplicate them.

   The previous approach truncated an article at the first "VIDEO GALLERY"
   marker — on /cro-page that marker is block 3, so the entire page was cut and
   recall fell to 9.6%. Frequency is the honest test: a block that appears on
   most of the site is furniture; a block unique to this page is its content. */
const blockFreq = new Map();
{
  const pageCount = pages.length;
  for (const p of pages) {
    const entry = blocksByPath[p.path];
    if (!entry || !entry.blocks) continue;
    const seenHere = new Set();
    for (const b of entry.blocks) {
      const t = b.text || (b.items || []).join(' | ');
      if (!t || t.length < 25) continue;
      if (seenHere.has(t)) continue;
      seenHere.add(t);
      blockFreq.set(t, (blockFreq.get(t) || 0) + 1);
    }
  }
  for (const [t, n] of blockFreq) blockFreq.set(t, n / pageCount);
}
const BOILERPLATE_AT = 0.4;
const isBoilerplate = b => {
  const t = b.text || (b.items || []).join(' | ');
  if (!t) return false;
  return (blockFreq.get(t) || 0) >= BOILERPLATE_AT;
};

/* ---------- archetype routing ---------- */
function archetypeOf(p) {
  if (p.path === '/') return 'flagship';
  if (/^\/(our-locations|seo-services)\/.+-seo$/.test(p.path)) return 'flagship';
  if (/^\/industries\/.+/.test(p.path)) return 'flagship';
  if (/^\/(services|las-vegas-online-marketing|locations)\//.test(p.path)) return 'flagship';
  if (p.path === '/contact-us') return 'contact';
  if (p.path === '/portfolio') return 'portfolioIndex';
  if (/^\/(portfolio|sg_portfolio)\//.test(p.path)) return 'portfolioItem';
  if (/^\/(tag|category)\//.test(p.path)) return 'archive';
  if (p.path === '/our-locations') return 'locationIndex';
  if (p.path === '/our-team') return 'team';
  if (p.path === '/videos') return 'videos';
  if (p.path === '/seo-blog' || p.path === '/las-vegas-seo-blog') return 'blogIndex';
  return 'article';
}

/* ---------- hero art selection ---------- */
function heroArtFor(p) {
  const city = p.path.match(/^\/(?:our-locations|seo-services)\/(.+)-seo$/);
  if (city && hasGenerated('city-' + city[1])) return genPath('city-' + city[1]);
  const ind = p.path.match(/^\/industries\/(.+)$/);
  if (ind) {
    const key = 'ind-' + ind[1].replace(/-companies$/, '');
    if (hasGenerated(key)) return genPath(key);
  }
  if (p.path === '/services/suite') return genPath('hero-full-suite');
  if (p.path === '/contact-us') return genPath('hero-contact');
  if (imagePlan.articleMap[p.path] && hasGenerated(imagePlan.articleMap[p.path])) {
    return genPath(imagePlan.articleMap[p.path]);
  }
  if (/^\/(tag|category)\//.test(p.path)) return genPath('tex-blog');
  if (p.path === '/portfolio' || /^\/(portfolio|sg_portfolio)\//.test(p.path)) return genPath('tex-portfolio');
  if (p.path === '/our-locations') return genPath('tex-locations');
  if (p.path === '/our-team') return genPath('tex-glass-panels');
  if (p.path === '/videos') return genPath('tex-video');
  if (/blog/.test(p.path)) return genPath('tex-blog');
  return genPath('hero-guarantee');
}

/* ---------- templates ---------- */

function buildFlagship(p, blocks, entry) {
  const d = extractFlagship(blocks);
  // 7 pages carry no <h1> in the source; without this they rendered an empty one.
  if (!d.h1) d.h1 = headingFromTitle(p.title || seoFor(p).title);
  const isHome = p.path === '/';
  const art = isHome ? genPath('hero-home') : heroArtFor(p);
  const floatStat = d.caseStudy && d.caseStudy.stats[0] ? d.caseStudy.stats[0] : null;

  const body = [
    R.heroSection(d, { image: art || genPath('hero-home'), floatStat }),
    R.pressSection(d.press, resolveImage),
    R.resultsSection(d),
    R.founderSection(d.founder, resolveImage),
    R.caseSection(d.caseStudy, resolveImage),
    R.servicesSection(d, hasGenerated),
    R.featureSections(d.featureSections),
    R.aboutSection(d.about, { figure: localAsset(JAMES.pointing) }),
    R.leftoverSection(d.leftover),
    R.fieldsSection(entry.blocks.filter(b => b.type === 'field')),
    R.qualifySection(d.qualify),
    R.guaranteeSection(d.guarantee, genPath('tex-gold-trails'), localAsset(JAMES.handsUp)),
    R.videoSection(d.videoGroups),
    R.teamSection(d.team, d.teamEyebrow, resolveImage),
    R.reviewsSection(d.rating, d.reviews, 9),
    R.contactCta(),
  ].filter(Boolean).join('\n');

  return { body, data: d };
}

function buildArticle(p, blocks) {
  const s = seoFor(p);
  const clean = dedupeAdjacent(blocks).filter(b => {
    const t = b.text || '';
    if (b.type === 'paragraph' && (CHROME_TEXT.has(t) || t.length < 3)) return false;
    return true;
  });
  // Keep what is unique to THIS page; the shared furniture is re-rendered
  // below as designed sections instead of repeated inline.
  const d = extractFlagship(blocks);
  const bodyBlocks = clean.filter(b => !isBoilerplate(b));

  const h1 = bodyBlocks.find(b => b.type === 'heading' && b.level === 1);
  const rest = bodyBlocks.filter(b => b !== h1);
  const lede = rest.find(b => b.type === 'paragraph' && b.text.length > 120);

  const art = heroArtFor(p);
  const body = [
    R.pageHero({
      title: (h1 && h1.text) || headingFromTitle(p.title || s.title),
      eyebrow: p.pageType === 'article' ? 'SEO Insights' : '',
      lede: lede ? lede.text.slice(0, 220) + (lede.text.length > 220 ? '…' : '') : '',
      image: art, crumbs: crumbsFor(p),
    }),
    `<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="glass glass--strong" style="padding:clamp(1.5rem,1rem + 3vw,3.5rem)" data-reveal>
      <div class="prose">
      ${R.renderProse(rest, resolveImage)}
      </div>
    </div>
  </div>
</section>`,
    R.fieldsSection(bodyBlocks.filter(b => b.type === 'field')),
    // the shared proof sections, rendered as design rather than repeated prose
    R.reviewsSection(d.rating, d.reviews, 3),
    R.contactCta(),
  ].filter(Boolean).join('\n');
  return { body, data: d };
}

function buildArchive(p, blocks) {
  const d = extractFlagship(blocks);
  const clean = dedupeAdjacent(blocks);
  const h1 = clean.find(b => b.type === 'heading' && b.level === 1);
  const title = (h1 && h1.text) || headingFromTitle(p.title);

  // An archive entry is: a title paragraph, then an excerpt paragraph that
  // carries the post link. Reading the links alone kept the titles and threw
  // every excerpt away, which is most of the page's text (recall ~31%).
  const entries = [];
  const seen = new Set();
  for (let i = 0; i < clean.length; i++) {
    const b = clean[i];
    if (b.type !== 'paragraph' || !b.links || !b.links.length) continue;
    const link = b.links.find(l => {
      const h = localHref(l.href);
      return h.startsWith('/') && h !== '/' && !/^\/(tag|category|author)\//.test(h);
    });
    if (!link) continue;
    const href = localHref(link.href);
    if (seen.has(href)) continue;
    if (b.text.length < 60) continue;                 // not an excerpt
    // the title is the nearest preceding short paragraph
    let title = '';
    for (let j = i - 1; j >= 0 && j > i - 4; j--) {
      const t = clean[j];
      if (t.type === 'paragraph' && t.text.length < 60 && !CHROME_TEXT.has(t.text)) { title = t.text; break; }
    }
    seen.add(href);
    entries.push({ href, title: title || link.text || 'Read the article', excerpt: b.text });
  }

  const cards = entries.slice(0, 40).map((e, i) => `
      <a class="glass glass--hover glass--spot card" href="${attr(e.href)}" data-reveal style="--reveal-delay:${(i % 3) * 90}ms">
        <h2>${esc(e.title)}</h2>
        <p>${esc(e.excerpt)}</p>
        <span class="card__link">Read the article &rarr;</span>
      </a>`).join('');

  const body = [
    R.pageHero({ title, eyebrow: 'Archive', image: heroArtFor(p), crumbs: crumbsFor(p) }),
    cards ? `<section class="section" style="padding-top:0"><div class="wrap"><div class="grid grid--3">${cards}</div></div></section>` : '',
    R.leftoverSection(d.leftover),
    R.reviewsSection(d.rating, d.reviews, 3),
    R.contactCta(),
  ].filter(Boolean).join('\n');
  return { body, data: d };
}

function buildPortfolioIndex(p, blocks) {
  const d = extractFlagship(blocks);
  const clean = dedupeAdjacent(blocks);
  const items = [];
  const seen = new Set();
  for (const b of clean) {
    for (const l of b.links || []) {
      const href = localHref(l.href);
      if (!/^\/(portfolio|sg_portfolio)\/.+/.test(href) || seen.has(href)) continue;
      seen.add(href);
      items.push({ href, text: l.text });
    }
  }
  // The page lists each project as: category heading, client name, then a
  // discipline tag ("AUTOMATION / SEO / WEBSITE"). Building tiles from links
  // alone discarded the names, categories and tags (recall 13.2%).
  const projects = [];
  let category = '';
  for (let i = 0; i < clean.length; i++) {
    const b = clean[i];
    if (b.type === 'heading' && b.level >= 3 && b.text.length < 30) { category = b.text; continue; }
    if (b.type !== 'paragraph') continue;
    const tag = clean[i + 1];
    if (tag && tag.type === 'paragraph' && /\/\s*(SEO|WEBSITE|AUTOMATION)/i.test(tag.text) && b.text.length < 60) {
      const link = items.find(it => it.text && b.text.toLowerCase().includes(it.text.toLowerCase().slice(0, 10)))
        || items[projects.length];
      projects.push({ name: b.text, tag: tag.text, category, href: link ? link.href : '/portfolio' });
      i++;
    }
  }

  /* Tile imagery.
     Every project's own screenshot is among the ~356 assets lost with the
     closed GCS bucket — none survives. Pairing whatever images remain on the
     page to projects by document order handed the tiles the shared UI icons
     (a 60x60 phone glyph stretched 6x, a Google avatar), and loosening that to
     "any large image" only swapped them for a contact graphic and the site's
     own logo. With no correct image available, any real-image pick is arbitrary
     and wrong, so every tile uses the generated art for its own category. */
  /* Deliberately ABSTRACT art, not the environmental industry renders.
     A photorealistic law-office interior sitting on a tile captioned "All
     American Law Firm" reads as that firm's actual premises, which is exactly
     the documentary role generated imagery must never fill (B3). Abstract
     glass compositions carry the category without asserting anything about a
     real place, and still give each category its own look. */
  const CATEGORY_ART = {
    law: 'tile-law',
    medical: 'tile-medical',
    dental: 'tile-medical',
    construction: 'tile-construction',
    dispensary: 'tile-dispensary',
  };
  const artForCategory = (cat) => {
    const key = String(cat || '').toLowerCase();
    for (const k of Object.keys(CATEGORY_ART)) {
      if (key.includes(k) && hasGenerated(CATEGORY_ART[k])) return genPath(CATEGORY_ART[k]);
    }
    return genPath('tile-general') || genPath('tex-portfolio');
  };

  const list = projects.length ? projects : items.map(it => ({ name: it.text, tag: '', category: '', href: it.href }));
  const cards = list.map((it, i) => {
    const media = artForCategory(it.category);
    return `
      <a class="tile glass" href="${attr(it.href)}" data-reveal style="--reveal-delay:${(i % 3) * 90}ms">
        ${R.img(media, it.name)}
        <span class="tile__body">
          ${it.category ? `<span class="chip">${esc(it.category)}</span>` : ''}
          <h2>${esc(it.name)}</h2>
          <p>${esc(it.tag || 'View the work')}</p>
        </span>
      </a>`;
  }).join('');

  const body = [
    R.pageHero({ title: 'Portfolio', eyebrow: 'Our Work', image: heroArtFor(p), crumbs: crumbsFor(p) }),
    cards ? `<section class="section" style="padding-top:0"><div class="wrap"><div class="grid grid--3">${cards}</div></div></section>` : '',
    R.leftoverSection(d.leftover),
    R.contactCta(),
  ].filter(Boolean).join('\n');
  return { body, data: d };
}

function buildContact(p, blocks) {
  const c = content.get(p.url) || {};
  const s = seoFor(p);
  const body = [
    R.pageHero({
      title: 'Contact Us', eyebrow: 'Get In Touch',
      lede: 'First Page SEO Guarantee Las Vegas. We only charge for our SEO guarantee. Everything else is complementary.',
      image: heroArtFor(p), crumbs: crumbsFor(p),
    }),
    `<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="grid grid--2" style="gap:2.5rem">
      <div class="glass glass--strong" style="padding:clamp(1.5rem,1rem + 3vw,2.5rem)" data-reveal="left">
        <h2>Send us a message</h2>
        <p>Tell us about your business and what you want to rank for.</p>
        <form method="post" action="/api/contact" data-needs-endpoint data-form="contact" novalidate>
          <label class="field"><span class="field__label">Name</span>
            <input type="text" name="name" autocomplete="name" required placeholder="Your name"></label>
          <label class="field"><span class="field__label">Email</span>
            <input type="email" name="email" autocomplete="email" required placeholder="you@company.com"></label>
          <label class="field"><span class="field__label">Phone</span>
            <input type="tel" name="phone" autocomplete="tel" placeholder="${attr(PHONE)}"></label>
          <label class="field"><span class="field__label">Website</span>
            <input type="url" name="website" placeholder="https://"></label>
          <label class="field"><span class="field__label">How can we help?</span>
            <textarea name="message" placeholder="What would you like to rank for?"></textarea></label>
          <button class="btn btn--gold btn--block btn--lg" type="submit">Start Here</button>
          <p class="form-note">This rebuild is a static front end: the form has no server behind it yet.
             Point <code>action</code> at your handler before launch, or call us and we will pick up.</p>
          ${NOJS_FALLBACK}
        </form>
      </div>
      <div data-reveal="right">
        <div class="glass" style="padding:clamp(1.5rem,1rem + 3vw,2.5rem)">
          <h2>Talk to us</h2>
          <div class="contact-line">
            <span class="contact-line__icon" aria-hidden="true">&#9742;</span>
            <span><p class="contact-line__label">Office Phone</p>
              <p class="contact-line__value"><a href="${PHONE_HREF}">${esc(PHONE)}</a></p></span>
          </div>
          <div class="contact-line">
            <span class="contact-line__icon" aria-hidden="true">&#9873;</span>
            <span><p class="contact-line__label">Office Address</p>
              <p class="contact-line__value">Las Vegas, NV, USA</p></span>
          </div>
          <div class="contact-line">
            <span class="contact-line__icon" aria-hidden="true">&#9733;</span>
            <span><p class="contact-line__label">First Page SEO Guarantee Las Vegas</p>
              <p class="contact-line__value">6 &amp; 12 month first page guarantee</p></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
  ].join('\n');
  return { body, data: null, seoOverride: s };
}

function buildLocationIndex(p, blocks) {
  const d = extractFlagship(blocks);
  const { CITIES } = globalThis.__srLib;
  const clean = dedupeAdjacent(blocks);

  // Each city on this page has its OWN description paragraph. Rendering a
  // generic tile instead threw all 25 of them away (recall 32.7%).
  const blurbs = new Map();
  for (let i = 0; i < clean.length; i++) {
    const b = clean[i];
    if (b.type !== 'paragraph' || !/^[A-Z][A-Z .'-]{2,24}$/.test(b.text)) continue;
    const nxt = clean[i + 1];
    if (nxt && nxt.type === 'paragraph' && nxt.text.length > 80) {
      blurbs.set(b.text.trim().toUpperCase(), nxt.text);
    }
  }

  const cards = CITIES.map(([label, href], i) => {
    const slug = href.split('/').pop().replace(/-seo$/, '');
    const art = genPath('city-' + slug) || genPath('tex-locations');
    const cityKey = label.replace(/\s*SEO(\s+Company)?$/i, '').trim().toUpperCase();
    const blurb = blurbs.get(cityKey) || '';
    return `
      <a class="glass glass--hover glass--spot card" href="${attr(href)}" data-reveal style="--reveal-delay:${(i % 3) * 70}ms">
        <div class="card__media">${R.img(art, label + ' skyline')}</div>
        <h2>${esc(label)}</h2>
        ${blurb ? `<p>${esc(blurb)}</p>` : ''}
        <span class="card__link">Learn More &rarr;</span>
      </a>`;
  }).join('');
  const body = [
    R.pageHero({ title: 'Our Locations', eyebrow: 'Where We Work', image: heroArtFor(p), crumbs: crumbsFor(p) }),
    `<section class="section" style="padding-top:0"><div class="wrap"><div class="grid grid--3">${cards}</div></div></section>`,
    R.reviewsSection(d.rating, d.reviews, 3),
    R.contactCta(),
  ].join('\n');
  return { body, data: d };
}

function buildTeam(p, blocks) {
  const d = extractFlagship(blocks);
  // The source /our-team page is an empty Divi shell — its body is the
  // unexpanded shortcode [get_aff_team_members], so it extracts 0 people and
  // the page rendered with no team on it at all. The real roster (9 people
  // with their photographs) is published on the homepage, so it is read from
  // there. Same source site, same people; nothing invented.
  if (!d.team.length) {
    const home = blocksByPath['/'];
    if (home && home.blocks) {
      const hd = extractFlagship(home.blocks);
      if (hd.team.length) { d.team = hd.team; d.teamEyebrow = hd.teamEyebrow; }
    }
  }
  const body = [
    R.pageHero({ title: 'Our Team', eyebrow: 'Meet Our SEO Experts', image: heroArtFor(p), crumbs: crumbsFor(p) }),
    R.teamSection(d.team, '', resolveImage),
    R.contactCta(),
  ].filter(Boolean).join('\n');
  return { body, data: d };
}

function buildVideos(p, blocks) {
  const d = extractFlagship(blocks);
  const body = [
    R.pageHero({ title: 'Video FAQ', eyebrow: 'Video Gallery', image: heroArtFor(p), crumbs: crumbsFor(p) }),
    R.videoSection(d.videoGroups),
    R.contactCta(),
  ].filter(Boolean).join('\n');
  return { body, data: d };
}

/* ---------- main ---------- */
globalThis.__srLib = await import('./lib.mjs');

// Clear dist's CONTENTS rather than the directory itself: a running preview
// server holds a handle on the directory, and rmSync on it fails EPERM.
fs.mkdirSync(DIST, { recursive: true });
for (const entry of fs.readdirSync(DIST)) {
  try { fs.rmSync(path.join(DIST, entry), { recursive: true, force: true }); }
  catch (e) { if (e.code !== 'EPERM' && e.code !== 'EBUSY') throw e; }
}

const report = { built: 0, byArchetype: {}, thin: [], errors: [] };

// The live site publishes Lorem Ipsum on /seo-new. Placeholder text carries no
// information, so stripping it loses nothing real — but it IS a deliberate
// removal and is recorded as one rather than quietly dropped (B4).
// On the /rep/* lead pages the inputs carry no placeholder — their labels live
// in a sibling <ul> ("Full Name*", "Email*", "Cell Phone*", ...). Unpaired, the
// fields render label-less and the list reads as stray text, so both are lost.
// Zip them back together when the counts line up.
function pairFieldLabels(blocks) {
  const fieldIdx = blocks.map((b, i) => (b.type === 'field' ? i : -1)).filter(i => i >= 0);
  if (!fieldIdx.length) return blocks;
  const unlabelled = fieldIdx.filter(i => !blocks[i].label);
  if (!unlabelled.length) return blocks;

  const first = fieldIdx[0], last = fieldIdx[fieldIdx.length - 1];
  const near = blocks
    .map((b, i) => ({ b, i }))
    .filter(({ b, i }) => b.type === 'list' && i > first - 6 && i < last + 8)
    .sort((a, z) => Math.abs(a.b.items.length - fieldIdx.length) - Math.abs(z.b.items.length - fieldIdx.length))[0];
  if (!near || Math.abs(near.b.items.length - fieldIdx.length) > 2) return blocks;

  fieldIdx.forEach((fi, n) => {
    const label = near.b.items[n];
    if (label && !blocks[fi].label) {
      blocks[fi] = { ...blocks[fi], label: label.replace(/\*$/, '').trim(), required: /\*$/.test(label) };
    }
  });
  // the list has become the labels; drop it so the text is not duplicated
  return blocks.filter((b, i) => i !== near.i);
}

report.loremStripped = [];
function stripLorem(p, blocks) {
  const kept = blocks.filter(b => !/lorem ipsum/i.test(b.text || ''));
  const n = blocks.length - kept.length;
  if (n) report.loremStripped.push({
    path: p.path, blocks: n,
    why: 'unfinished placeholder copy on the live site; shipping Lorem Ipsum to production is a defect, and the URL is kept so no ranking is lost',
  });
  return kept;
}

for (const p of pages) {
  const entry = blocksByPath[p.path];
  if (!entry || entry.error) { report.errors.push({ path: p.path, reason: entry ? entry.error : 'no-blocks' }); continue; }
  entry.blocks = pairFieldLabels(stripLorem(p, entry.blocks));

  const arche = archetypeOf(p);
  let built;
  try {
    if (arche === 'flagship') built = buildFlagship(p, entry.blocks, entry);
    else if (arche === 'contact') built = buildContact(p, entry.blocks);
    else if (arche === 'portfolioIndex') built = buildPortfolioIndex(p, entry.blocks);
    else if (arche === 'archive' || arche === 'blogIndex') built = buildArchive(p, entry.blocks);
    else if (arche === 'locationIndex') built = buildLocationIndex(p, entry.blocks);
    else if (arche === 'team') built = buildTeam(p, entry.blocks);
    else if (arche === 'videos') built = buildVideos(p, entry.blocks);
    else built = buildArticle(p, entry.blocks);
  } catch (e) {
    report.errors.push({ path: p.path, reason: String(e.message || e) });
    continue;
  }

  const s = seoFor(p);
  const headHtml = head({
    title: s.title, description: s.description, canonical: s.canonical,
    path: p.path, og: s.og, robots: s.robots,
    jsonLd: jsonLdFor(p, built.data),
    image: heroArtFor(p) || '/assets/generated/hero-home.jpg',
  });
  const html = shell({ headHtml, bodyHtml: built.body, path: p.path });

  const outFile = p.path === '/' ? 'index.html' : p.path.replace(/^\//, '') + '/index.html';
  const dest = path.join(DIST, outFile);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);

  report.built++;
  report.byArchetype[arche] = (report.byArchetype[arche] || 0) + 1;
  const textLen = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
  if (textLen < 900) report.thin.push({ path: p.path, chars: textLen, arche });
}

/* ---------- ADDED: /industries index ----------
   The source menu pointed "INDUSTRIES WE SERVE" at href="#", and the only
   /industries URL was a 1-word empty WordPress archive stub. A parent nav item
   that goes nowhere is a dead link on all 149 pages. This index gives it a real
   destination and links the four industry pages that already exist. It states
   no fact that is not already on those pages (B3). Ledger: ADD. */
{
  const INDUSTRIES = [
    ['Dental SEO', '/industries/dental', 'ind-dental'],
    ['Medical Spa SEO', '/industries/medical-spa', 'ind-medical-spa'],
    ['Law Firm SEO', '/industries/law-firm', 'ind-law-firm'],
    ['Contracting SEO', '/industries/contracting-companies', 'ind-contracting'],
    ['HVAC SEO', '/industries/air-conditioning-and-hvac', 'ind-contracting'],
  ].filter(([, href]) => fs.existsSync(path.join(DIST, href.replace(/^\//, ''), 'index.html')));

  const tiles = INDUSTRIES.map(([label, href, art], i) => `
      <a class="tile glass" href="${attr(href)}" data-reveal style="--reveal-delay:${(i % 3) * 90}ms">
        ${R.img(genPath(art) || genPath('hero-guarantee'), label)}
        <span class="tile__body"><h2>${esc(label)}</h2><p>First page guarantee</p></span>
      </a>`).join('');

  const body = R.pageHero({
    title: 'Industries We Serve', eyebrow: 'Specialised SEO',
    lede: 'We only charge for our SEO guarantee. Everything else is complementary.',
    image: genPath('hero-guarantee'), crumbs: [['Home', '/'], ['Industries', null]],
  }) +
    `\n<section class="section" style="padding-top:0"><div class="wrap"><div class="grid grid--3">${tiles}</div></div></section>\n` +
    R.contactCta();

  const headHtml = head({
    title: 'Industries We Serve | ' + SITE_NAME,
    description: 'Specialised SEO for dental practices, medical spas, law firms and contracting companies. First page guarantee.',
    canonical: ORIGIN + '/industries/', path: '/industries',
    jsonLd: jsonLdFor({ path: '/industries' }, null),
    image: genPath('hero-guarantee'),
  });
  fs.mkdirSync(path.join(DIST, 'industries'), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'industries', 'index.html'), shell({ headHtml, bodyHtml: body, path: '/industries' }));
  report.added = [{ path: '/industries', why: 'source nav pointed "INDUSTRIES WE SERVE" at href="#" — a dead link on every page; this index gives it a real destination', links: INDUSTRIES.length }];
  report.built++;
}

/* ---------- static assets ---------- */
for (const dir of ['styles', 'scripts']) {
  const from = path.join(process.cwd(), 'src', dir);
  const to = path.join(DIST, dir);
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) fs.copyFileSync(path.join(from, f), path.join(to, f));
}
fs.mkdirSync(path.join(DIST, 'assets', 'generated'), { recursive: true });
for (const f of fs.readdirSync(path.join(process.cwd(), 'assets', 'generated'))) {
  fs.copyFileSync(path.join(process.cwd(), 'assets', 'generated', f), path.join(DIST, 'assets', 'generated', f));
}
// brand logo
fs.mkdirSync(path.join(DIST, 'assets', 'brand'), { recursive: true });
const logoSrc = path.join(process.cwd(), 'assets', 'source', 'a3c23d8d-seoguarantee-logo-w.png');
const logoAlt = path.join(process.cwd(), 'assets', 'source', '3777c728-1stpagelogo.png');
const logoFrom = fs.existsSync(logoSrc) ? logoSrc : logoAlt;
if (fs.existsSync(logoFrom)) {
  fs.copyFileSync(logoFrom, path.join(DIST, 'assets', 'brand', 'logo.png'));
  fs.copyFileSync(logoFrom, path.join(DIST, 'assets', 'favicon.png'));
}

/* ---------- sitemap + robots ---------- */
const urls = pages.map(p => ({
  loc: ORIGIN + (p.path === '/' ? '/' : p.path + '/'),
  canonical: canonicalFor(p, seo.get(p.url) || {}),
  indexable: !/noindex/.test(seoFor(p).robots),
}));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.filter(u => u.indexable && u.loc.replace(/\/$/, '') === u.canonical.replace(/\/$/, ''))
    .map(u => `  <url><loc>${u.loc}</loc></url>`).join('\n')}
</urlset>`;
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);

/* ---------- 404 ---------- */
fs.writeFileSync(path.join(DIST, '404.html'), shell({
  headHtml: head({ title: 'Page not found | ' + SITE_NAME, description: '', path: '/404', robots: 'noindex, follow' }),
  bodyHtml: R.pageHero({ title: 'Page not found', eyebrow: '404', lede: 'That page has moved or never existed. Try the homepage, or call us.', image: genPath('hero-guarantee') }) + R.contactCta('Let us point you the right way.'),
  path: '/404',
}));

/* ---------- report ---------- */
report.assetsCopied = copied.size;
report.assetsMissing = missingAssets.size;
report.missingSample = [...missingAssets.keys()].slice(0, 10);
fs.writeFileSync('build/build-report.json', JSON.stringify(report, null, 1));

console.log('built:', report.built, 'of', pages.length);
console.log('archetypes:', report.byArchetype);
console.log('assets copied:', copied.size, '| unresolved image refs:', missingAssets.size);
if (report.errors.length) { console.log('ERRORS:', report.errors.length); report.errors.slice(0, 8).forEach(e => console.log('  ', e.path, e.reason)); }
if (report.thin.length) { console.log('THIN pages (<900 chars):', report.thin.length); report.thin.slice(0, 10).forEach(t => console.log('  ', t.path, t.chars, t.arche)); }
