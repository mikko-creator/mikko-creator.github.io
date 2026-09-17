// Section renderers. Content in -> designed HTML out.
import { esc, attr, localHref, isExternal, initials, PHONE, PHONE_HREF, NOJS_FALLBACK } from './lib.mjs';

const rev = (kind = 'up', delay = 0) =>
  ` data-reveal="${kind}"${delay ? ` style="--reveal-delay:${delay}ms"` : ''}`;

export const img = (src, alt, { w, h, cls = '', lazy = true, sizes } = {}) =>
  `<img src="${attr(src)}" alt="${attr(alt || '')}"${w ? ` width="${w}"` : ''}${h ? ` height="${h}"` : ''}` +
  `${cls ? ` class="${attr(cls)}"` : ''}${sizes ? ` sizes="${attr(sizes)}"` : ''}` +
  `${lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high" decoding="async"'}>`;

/* ---------------- hero ---------------- */
export function heroSection(d, { image, floatStat } = {}) {
  const pills = d.pills.length
    ? `<ul class="hero__pills">${d.pills.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '';

  // Emphasise the brand promise inside the H1 without changing a word of it.
  const h1 = esc(d.h1).replace(/(GUARANTEE)/i, '<span class="text-gold--live">$1</span>');

  const float = floatStat
    ? `<div class="hero__float glass glass--strong" data-reveal="scale" style="--reveal-delay:320ms">
         <span class="stat__num">${esc(floatStat.num)}</span>
         <p class="stat__label">${esc(floatStat.label)}</p>
       </div>` : '';

  return `
<section class="hero">
  <div class="wrap">
    <div class="hero__grid">
      <div${rev()}>
        ${d.pageEyebrow ? `<span class="hero__badge"><b>Guaranteed</b> ${esc(d.pageEyebrow)}</span>` : ''}
        <h1>${h1}</h1>
        ${d.tagline ? `<p class="hero__sub">${esc(d.tagline)}</p>` : ''}
        ${pills}
        <div class="hero__actions">
          <a class="btn btn--gold btn--lg" href="/contact-us">Start Here</a>
          <a class="btn btn--glass btn--lg" href="${PHONE_HREF}">Call ${esc(PHONE)}</a>
        </div>
      </div>
      <div class="hero__visual"${rev('scale', 120)}>
        ${img(image, 'Abstract layered glass forms lit in gold, representing the guarantee', { lazy: false })}
        ${float}
      </div>
    </div>
  </div>
</section>`;
}

/* ---------------- press marquee ---------------- */
export function pressSection(press, resolve) {
  if (!press || !press.length) return '';
  const logos = press.map(p => {
    const local = resolve(p.src);
    return local ? img(local, p.alt || '', { h: 46 }) : '';
  }).filter(Boolean).join('\n        ');
  if (!logos) return '';
  return `
<section class="section section--tight">
  <div class="wrap">
    <p class="eyebrow mx-auto" style="display:flex;justify-content:center">${esc(press.eyebrow || 'Featured On')}</p>
    <div class="marquee"${rev()}>
      <div class="marquee__track">
        ${logos}
      </div>
    </div>
  </div>
</section>`;
}

/* ---------------- results stats ---------------- */
export function resultsSection(d) {
  if (!d.results.length) return '';
  const cards = d.results.map((r, i) => {
    // "Over 600% Increase In Gross Sales!" -> a designed split of the SAME
    // sentence. Every token survives: the "Over" qualifier and the trailing
    // "!" are part of the claim, and dropping either restates it (B3/B4).
    //
    // These numbers are NOT count-up animated. A count-up renders a claim
    // like "Over 600%" as "60%" for most of its run; on a page whose product
    // is a guarantee, animating through false figures is not a flourish.
    const m = r.match(/^(Over)\s+([\d,]+%?)\s+(.*?)(!?)$/i);
    const pre = m ? m[1] : '';
    const num = m ? m[2] : r;
    const label = m ? m[3] : '';
    const bang = m ? m[4] : '';
    return `<div class="glass glass--hover glass--spot stat"${rev('up', i * 90)}>
        ${pre ? `<span class="stat__pre">${esc(pre)}</span>` : ''}
        <span class="stat__num">${esc(num)}</span>
        <p class="stat__label">${esc(label + bang)}</p>
      </div>`;
  }).join('\n      ');

  return `
<section class="section">
  <div class="wrap">
    <div class="section-head section-head--center">
      ${d.resultsEyebrow ? `<span class="eyebrow">${esc(d.resultsEyebrow)}</span>` : ''}
      ${d.resultsHeading ? `<h2>${esc(d.resultsHeading)}</h2>` : ''}
    </div>
    <div class="grid grid--3">
      ${cards}
    </div>
  </div>
</section>`;
}

/* ---------------- founder ---------------- */
export function founderSection(f, resolve, extra = {}) {
  if (!f || !f.bio) return '';
  const photo = f.image ? resolve(f.image) : null;
  const portrait = extra.portrait || null;

  // The magazine cover is the founder section's image now — the cut-out that
  // used to lead here stands in the About Us section instead. The cover is
  // sized to the text beside it rather than tucked in as a small inset.
  const figure = photo
    ? `<div class="founder-figure">
          <img src="${attr(photo)}" alt="${attr((f.name || 'Founder') + ' featured on a magazine cover')}" class="founder-figure__cover" width="380" height="430" loading="lazy" decoding="async">
        </div>`
    : (portrait ? img(portrait, f.name || 'Founder portrait', { cls: '' }) : '');

  return `
<section class="section">
  <div class="wrap">
    <div class="hero__grid">
      <div class="hero__visual hero__visual--founder"${rev('left')}>
        ${figure}
      </div>
      <div${rev('right')}>
        <span class="eyebrow">${esc(f.eyebrow)}</span>
        ${f.name ? `<h2>${esc(f.name)}</h2>` : ''}
        <p class="lede">${esc(f.bio)}</p>
        ${f.link && !isDeadHref(f.link.href) ? `<p style="margin-top:1.5rem"><a class="btn btn--glass" href="${attr(localHref(f.link.href))}">${esc(f.link.text)}</a></p>` : ''}
      </div>
    </div>
  </div>
</section>`;
}

/* ---------------- case study ---------------- */
export function caseSection(c, resolve) {
  if (!c || !c.body) return '';
  const stats = c.stats.map((s, i) => `
        <div class="stat"${rev('up', i * 90)}>
          <span class="stat__num">${esc(s.num)}</span>
          <p class="stat__label">${esc(s.label)}</p>
        </div>`).join('');
  const logo = c.logo ? resolve(c.logo) : null;
  return `
<section class="section">
  <div class="wrap">
    <div class="glass glass--strong" style="padding:clamp(1.75rem,1rem + 3vw,3.5rem)"${rev()}>
      <span class="eyebrow">${esc(c.eyebrow)}</span>
      <div class="hero__grid" style="align-items:start">
        <div>
          ${logo ? img(logo, c.name, { h: 54, cls: '' }) : ''}
          <h2 style="margin-top:1rem">${esc(c.name)}</h2>
          <p>${esc(c.body)}</p>
          ${c.link && !isDeadHref(c.link.href) ? `<p style="margin-top:1.5rem"><a class="btn btn--gold" href="${attr(localHref(c.link.href))}">${esc(c.link.text)}</a></p>` : ''}
        </div>
        <div class="grid grid--2 case-stats" style="gap:1rem">${stats}</div>
      </div>
    </div>
  </div>
</section>`;
}

/* ---------------- services / feature cards ---------------- */
const SERVICE_ART = {
  'search engine optimization': 'svc-seo', 'website design': 'svc-web',
  'content writing': 'svc-content', 'reputation management': 'svc-reputation',
  'conversion optimization': 'svc-cro', 'graphic design': 'svc-design',
  branding: 'svc-branding', consulting: 'svc-consulting',
};
function artFor(title) {
  const t = title.toLowerCase();
  for (const k of Object.keys(SERVICE_ART)) if (t.includes(k)) return SERVICE_ART[k];
  return null;
}

export function servicesSection(d, hasImage) {
  const items = d.services.length ? d.services : [];
  if (!items.length) return '';
  const cards = items.map((s, i) => {
    const art = artFor(s.title);
    const media = art && hasImage(art)
      ? `<div class="card__media">${img(`/assets/generated/${art}.jpg`, '', { w: 640, h: 400 })}</div>` : '';
    return `<article class="glass glass--hover glass--spot card"${rev('up', (i % 3) * 90)}>
        ${media}
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.body)}</p>
      </article>`;
  }).join('\n      ');
  return `
<section class="section">
  <div class="wrap">
    <div class="section-head section-head--center">
      <span class="eyebrow">${esc(d.servicesEyebrow || 'Full Suite Includes:')}</span>
      <h2>Everything, included.</h2>
    </div>
    <div class="grid grid--3">
      ${cards}
    </div>
  </div>
</section>`;
}

export function featureSections(list) {
  if (!list || !list.length) return '';
  // These cards are section-level content lifted from the source's own h2/h4
  // headings, and nothing wraps them in an h2 — so emitting h3 here produced an
  // h1 -> h3 skip on every page that has this section and no results block.
  // They are h2; `.card h2` styles them at card-title size.
  const cards = list.map((f, i) => `
      <article class="glass glass--hover glass--spot card"${rev('up', (i % 3) * 90)}>
        <h2>${esc(f.title)}</h2>
        ${f.body.map(p => `<p>${esc(p)}</p>`).join('\n        ')}
      </article>`).join('');
  return `
<section class="section">
  <div class="wrap">
    <div class="grid ${list.length > 2 ? 'grid--3' : 'grid--2'}">${cards}
    </div>
  </div>
</section>`;
}

/* ---------------- leftover copy ----------------
   Content the section mapper did not claim. It is real page copy, so it is
   rendered in reading order rather than dropped. */
export function leftoverSection(list) {
  if (!list || !list.length) return '';
  // Same contiguity rule as renderProse: never descend more than one level.
  let prev = 1;
  const html = list.map(b => {
    if (b.type === 'heading') {
      const want = Math.min(Math.max(b.level || 2, 2), 4);
      const lvl = Math.min(want, prev + 1);
      prev = lvl;
      return `<h${lvl}>${esc(b.text)}</h${lvl}>`;
    }
    return `<p>${esc(b.text)}</p>`;
  }).join('\n        ');
  return `
<section class="section">
  <div class="wrap wrap--narrow">
    <div class="glass" style="padding:clamp(1.5rem,1rem + 3vw,3rem)"${rev()}>
      <div class="prose">
        ${html}
      </div>
    </div>
  </div>
</section>`;
}

/* ---------------- form fields lifted from the source ---------------- */
export function fieldsSection(fields, heading = 'Get started') {
  if (!fields || !fields.length) return '';
  const seen = new Set();
  const rows = fields.filter(f => {
    const k = (f.label || f.name || (f.options||[]).join('|')).toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  }).map(f => {
    const label = f.label || f.name.replace(/[_\-\[\]]+/g, ' ').trim();
    const id = 'f_' + (f.name || label).replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40);
    const control = f.inputType === 'textarea'
      ? `<textarea id="${attr(id)}" name="${attr(f.name || id)}" placeholder="${attr(label)}"></textarea>`
      : f.inputType === 'select'
        ? `<select id="${attr(id)}" name="${attr(f.name || id)}">${
            (f.options || []).map(o => `<option value="${attr(o)}">${esc(o)}</option>`).join('')
          }</select>`
        : `<input id="${attr(id)}" type="${attr(['text','email','tel','url','number','date'].includes(f.inputType) ? f.inputType : 'text')}" name="${attr(f.name || id)}" placeholder="${attr(label)}"${f.required ? ' required' : ''}>`;
    return `<label class="field" for="${attr(id)}"><span class="field__label">${esc(label)}</span>${control}</label>`;
  }).join('\n          ');

  if (!rows) return '';
  return `
<section class="section">
  <div class="wrap wrap--narrow">
    <div class="glass glass--strong" style="padding:clamp(1.5rem,1rem + 3vw,3rem)"${rev()}>
      <h2>${esc(heading)}</h2>
      <form method="post" action="/api/contact" data-needs-endpoint novalidate>
        <div class="grid grid--2" style="gap:0 1.25rem">
          ${rows}
        </div>
        <button class="btn btn--gold btn--lg" type="submit">Submit</button>
        <p class="form-note">This rebuild is a static front end: the form has no server behind it yet.
           Point <code>action</code> at your handler before launch.</p>
        ${NOJS_FALLBACK}
      </form>
    </div>
  </div>
</section>`;
}

/* ---------------- qualify CTA ---------------- */
export function qualifySection(q) {
  if (!q) return '';
  return `
<section class="section">
  <div class="wrap wrap--narrow">
    <div class="glass glass--strong cta-band"${rev('scale')}>
      ${q.heading ? `<span class="eyebrow" style="justify-content:center">${esc(q.heading)}</span>` : ''}
      <h2>${esc(q.question)}</h2>
      <div class="cluster" style="justify-content:center">
        ${q.options.map(o => `<a class="btn btn--glass btn--lg" href="/contact-us">${esc(o)}</a>`).join('\n        ')}
      </div>
      <p style="margin-top:1.75rem"><a class="btn btn--gold btn--lg pulse" href="/contact-us">${esc(q.cta)}</a></p>
    </div>
  </div>
</section>`;
}

/* ---------------- guarantee band ---------------- */
export function guaranteeSection(g, image, figure) {
  if (!g || !g.words.length) return '';
  const [a, b, c] = g.words;
  const withFigure = Boolean(figure);
  return `
<section class="section">
  <div class="wrap">
    <div class="glass glass--strong cta-band${withFigure ? ' cta-band--figure' : ''}" style="position:relative"${rev()}>
      <div class="page-hero__media" aria-hidden="true" style="position:absolute;inset:0;z-index:0;border-radius:inherit;overflow:hidden">
        ${image ? img(image, '', { cls: '' }) : ''}
      </div>
      <div class="cta-band__body">
        <h2>${esc(a || '')} <span class="text-gold">${esc(b || '')}</span> ${esc(c || '')}</h2>
        ${g.sub ? `<p>${esc(g.sub)}</p>` : ''}
        <a class="btn btn--gold btn--lg" href="/contact-us">Start Here</a>
      </div>
      ${withFigure ? `<img src="${attr(figure)}" alt="James Sutton IV, Managing Partner" class="cta-band__figure" width="571" height="462" loading="lazy" decoding="async">` : ''}
    </div>
  </div>
</section>`;
}

/* ---------------- videos ---------------- */
export function videoSection(groups) {
  if (!groups || !groups.length) return '';
  const cols = groups.map((g, i) => `
      <div class="glass card"${rev('up', i * 90)}>
        <h3>${esc(g.title)}</h3>
        <ul style="padding-left:1.1rem">
          ${g.items.map(t => `<li>${esc(t)}</li>`).join('\n          ')}
        </ul>
      </div>`).join('');
  return `
<section class="section">
  <div class="wrap">
    <div class="section-head section-head--center">
      <span class="eyebrow">Video Gallery</span>
      <h2>Answers, on video.</h2>
    </div>
    <div class="grid grid--3">${cols}
    </div>
    <p class="center" style="margin-top:2rem"><a class="btn btn--glass" href="/videos">Watch the full FAQ</a></p>
  </div>
</section>`;
}

/* ---------------- team ---------------- */
export function teamSection(team, eyebrow, resolve) {
  if (!team || !team.length) return '';
  const people = team.map((p, i) => {
    const photo = resolve(p.photo);
    const face = photo
      ? img(photo, p.name, { cls: 'person__photo', w: 100, h: 100 })
      : `<div class="person__photo review__avatar" style="width:100px;height:100px;font-size:1.4rem">${esc(initials(p.name))}</div>`;
    return `<article class="glass glass--hover person"${rev('up', (i % 5) * 70)}>
        ${face}
        <p class="person__name">${esc(p.name)}</p>
        <p class="person__role">${esc(p.role)}</p>
      </article>`;
  }).join('\n      ');
  return `
<section class="section">
  <div class="wrap">
    <div class="section-head section-head--center">
      <span class="eyebrow">${esc(eyebrow || 'Meet Our SEO Experts')}</span>
      <h2>The people behind the guarantee.</h2>
    </div>
    <div class="grid grid--4">
      ${people}
    </div>
  </div>
</section>`;
}

/* ---------------- reviews ---------------- */
export function reviewsSection(rating, reviews, limit = 9) {
  if (!reviews || !reviews.length) return '';
  // EVERY review is rendered into the DOM. Showing 50 at once is poor reading,
  // but slicing them away deletes real testimonials from the page (B4), so the
  // overflow is present and crawlable and merely collapsed behind a toggle.
  const cards = reviews.map((r, i) => `
      <article class="glass glass--hover glass--spot review">
        <p class="review__stars" aria-label="5 out of 5 stars">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
        <p class="review__text">${esc(r.text)}</p>
        <div class="review__who">
          <span class="review__avatar" aria-hidden="true">${esc(initials(r.name))}</span>
          <span>
            <p class="review__name">${esc(r.name)}</p>
            <p class="review__src">Google Review</p>
          </span>
        </div>
      </article>`).join('');

  const badge = rating && rating.score ? `
    <div class="glass rating-badge mx-auto" style="margin-bottom:2.5rem"${rev('scale')}>
      <span class="rating-badge__score">${esc(rating.score)}</span>
      <span>
        <p style="margin:0;font-weight:700;color:var(--fg)">${esc(rating.label)}</p>
        <p style="margin:0;font-size:var(--step--1)">${esc(rating.based)}</p>
      </span>
    </div>` : '';

  return `
<section class="section">
  <div class="wrap">
    <div class="section-head section-head--center">
      <span class="eyebrow">Client Reviews</span>
      <h2>What clients actually say.</h2>
    </div>
    <div class="center">${badge}</div>

    <!-- Every review is server-rendered here exactly once, so all 50 are
         crawlable and none is lost. app.js clones the track for the seamless
         loop and marks the clone aria-hidden, so assistive tech and search
         engines still see each review a single time. -->
    <div class="reviews" data-reviews>
      <div class="reviews__viewport">
        <div class="reviews__track">${cards}
        </div>
      </div>
    </div>

    <p class="center" style="margin-top:2rem">
      <button class="btn btn--glass" type="button" data-reviews-all
        aria-expanded="false"
        data-label-more="See all ${reviews.length} reviews"
        data-label-less="Show fewer reviews">See all ${reviews.length} reviews</button>
    </p>
  </div>
</section>`;
}

/* ---------------- about ---------------- */
export function aboutSection(a, extra = {}) {
  if (!a) return '';
  const figure = extra.figure || null;

  // Without a figure this stays the narrow single-column panel it was.
  if (!figure) {
    return `
<section class="section">
  <div class="wrap wrap--narrow">
    <div class="glass glass--strong" style="padding:clamp(1.75rem,1rem + 3vw,3.5rem)"${rev()}>
      <span class="eyebrow">${esc(a.eyebrow)}</span>
      <p class="lede">${esc(a.body)}</p>
    </div>
  </div>
</section>`;
  }

  // With one, the copy sits left and the founder stands beside it on the right.
  return `
<section class="section">
  <div class="wrap">
    <div class="about-grid">
      <div class="glass glass--strong about-grid__panel" style="padding:clamp(1.75rem,1rem + 3vw,3.5rem)"${rev()}>
        <span class="eyebrow">${esc(a.eyebrow)}</span>
        <p class="lede">${esc(a.body)}</p>
      </div>
      <div class="about-figure"${rev('right', 120)}>
        <img src="${attr(figure)}" alt="James Sutton IV, Managing Partner" class="about-figure__cut" width="504" height="722" loading="lazy" decoding="async">
      </div>
    </div>
  </div>
</section>`;
}

/* ---------------- closing CTA ---------------- */
// The source carries a "GET IN TOUCH" form on every page (Name / First / Last /
// Email / What Are You Interested In? / Message) plus its confirmation line.
// The rebuild previously replaced it with two buttons, which dropped that copy
// from all 149 pages. The real fields and wording are reproduced here.
export function contactCta(heading = 'Ready to rank on page one?') {
  return `
<section class="section">
  <div class="wrap">
    <div class="glass glass--strong cta-band" style="text-align:left"${rev('scale')}>
      <div class="grid grid--2" style="gap:clamp(1.5rem,1rem + 3vw,3rem);align-items:start">
        <div>
          <span class="eyebrow">Get In Touch</span>
          <h2>${esc(heading)}</h2>
          <p style="margin-inline:0">First Page SEO Guarantee Las Vegas. We only charge for our SEO guarantee. Everything else is complementary.</p>
          <div class="contact-line">
            <span class="contact-line__icon" aria-hidden="true">&#9873;</span>
            <span><p class="contact-line__label">Office Address</p>
              <p class="contact-line__value">Las Vegas, NV, USA</p></span>
          </div>
          <div class="contact-line">
            <span class="contact-line__icon" aria-hidden="true">&#9742;</span>
            <span><p class="contact-line__label">Office Phone</p>
              <p class="contact-line__value"><a href="${PHONE_HREF}">${esc(PHONE)}</a></p></span>
          </div>
        </div>
        <form method="post" action="/api/contact" data-needs-endpoint novalidate>
          <div class="grid grid--2" style="gap:0 1rem">
            <label class="field"><span class="field__label">Name<span aria-hidden="true">*</span> First</span>
              <input type="text" name="first_name" autocomplete="given-name" required placeholder="First"></label>
            <label class="field"><span class="field__label">Last</span>
              <input type="text" name="last_name" autocomplete="family-name" placeholder="Last"></label>
          </div>
          <label class="field"><span class="field__label">Email<span aria-hidden="true">*</span></span>
            <input type="email" name="email" autocomplete="email" required placeholder="you@company.com"></label>
          <label class="field"><span class="field__label">What Are You Interested In?<span aria-hidden="true">*</span></span>
            <input type="text" name="interest" required placeholder="SEO, Web Design, CRO&hellip;"></label>
          <label class="field"><span class="field__label">Message</span>
            <textarea name="message" placeholder="Tell us about your business"></textarea></label>
          <button class="btn btn--gold btn--lg btn--block" type="submit">Start Here</button>
          <p class="form-note">Thank you for your time. A consultant will be in contact with you in 1 business day.</p>
          <p class="form-note">This rebuild is a static front end: the form has no server behind it yet.
             Point <code>action</code> at your handler before launch.</p>
          ${NOJS_FALLBACK}
        </form>
      </div>
    </div>
  </div>
</section>`;
}

/* ---------------- prose renderer (articles, generic pages) ---------------- */
export function renderProse(blocks, resolve) {
  const out = [];
  // Clamping each heading independently produced h1 -> h3 and h1 -> h4 jumps,
  // because the page H1 lives in the hero and the article starts at whatever
  // level the source used. Track the previous level and never descend by more
  // than one, so the outline is contiguous for screen readers.
  let prev = 1;
  for (const b of blocks) {
    if (b.type === 'heading') {
      const want = Math.min(Math.max(b.level, 2), 4);
      const lvl = Math.min(want, prev + 1);
      prev = lvl;
      out.push(`<h${lvl}>${esc(b.text)}</h${lvl}>`);
    } else if (b.type === 'paragraph') {
      out.push(`<p>${linkify(b)}</p>`);
    } else if (b.type === 'list') {
      const tag = b.ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${b.items.map(i => `<li>${esc(i)}</li>`).join('')}</${tag}>`);
    } else if (b.type === 'quote') {
      out.push(`<blockquote>${esc(b.text)}</blockquote>`);
    } else if (b.type === 'image') {
      // UI chrome is not article content. The /rep/* pages carry the accordion
      // "+"/"-" glyphs (list-add.svg, list-remove.svg) in the body flow; as SVGs
      // with no intrinsic box they expanded to 831px in a 740px prose column.
      // Icon-sized and icon-named assets are skipped rather than blown up.
      if (isIconAsset(b)) continue;
      const local = resolve(b.src);
      if (local) out.push(img(local, b.alt, { w: b.w || undefined, h: b.h || undefined }));
    }
  }
  return out.join('\n      ');
}

// An icon is UI chrome, not article content: either it declares an icon-sized
// box, or its filename says what it is (list-add, arrow, chevron, ii-*).
const ICON_NAME = /(?:^|\/|-)(?:icon|ico|list-(?:add|remove)|arrow|chevron|caret|plus|minus|close|menu|burger|star|tick|check|bullet|ii-[a-z-]+)[-.]/i;
export function isIconAsset(b) {
  if (!b || !b.src) return false;
  if (ICON_NAME.test(b.src)) return true;
  if (b.w && b.h && b.w <= 160 && b.h <= 160) return true;
  return false;
}

// A source anchor whose href is a bare "#" points nowhere. Wrapping the label
// in an <a> reproduces a dead link on the rebuild; the label itself is real
// copy, so it is kept as text and only the useless anchor is dropped.
export const isDeadHref = h => !h || h === '#' || /^#$/.test(String(h).trim());

// A tel: href is dialled; the label beside it is read. The source writes the two
// by hand and they can disagree: /location/las-vegas ships href="tel:(702) 362-8700"
// under the label "(702) 420-7272" — the page shows the business line and dials a
// number displayed nowhere on the live site (audit/preset-index.json:13424 carries
// the same mismatch in the captured source markup). The visible label is the number
// the visitor agreed to call, so it decides; the href is rebuilt from it in +E.164,
// which also drops the spaces and brackets RFC 3966 does not want in a tel: value.
// A label with no single unambiguous number leaves the href untouched.
const NANP = /(?:\+?1[\s.\-]?)?\(?([2-9][0-9]{2})\)?[\s.\-]?([0-9]{3})[\s.\-]?([0-9]{4})(?![0-9])/g;
function telDigits(s) {
  const m = String(s || '').match(NANP);
  if (!m || m.length !== 1) return '';
  const d = m[0].replace(/[^0-9]/g, '');
  return d.length === 11 && d[0] === '1' ? d.slice(1) : (d.length === 10 ? d : '');
}
function telHref(href, label) {
  if (!/^tel:/i.test(href)) return href;
  const want = telDigits(label) || telDigits(href);
  return want ? 'tel:+1' + want : href;
}

// Re-apply the source's own inline links to the escaped text.
function linkify(b) {
  let html = esc(b.text);
  for (const l of b.links || []) {
    const label = esc(l.text);
    if (!label || !html.includes(label)) continue;
    if (isDeadHref(l.href)) continue;
    const href = telHref(localHref(l.href), l.text);
    if (isDeadHref(href)) continue;
    const ext = isExternal(l.href) ? ' target="_blank" rel="noopener noreferrer"' : '';
    html = html.replace(label, `<a href="${attr(href)}"${ext}>${label}</a>`);
  }
  return html;
}

/* ---------------- page hero for inner pages ---------------- */
export function pageHero({ title, eyebrow, lede, image, crumbs = [] }) {
  const crumbHtml = crumbs.length ? `<ul class="crumbs">${crumbs.map(([l, h]) =>
    h ? `<li><a href="${attr(h)}">${esc(l)}</a></li>` : `<li>${esc(l)}</li>`).join('')}</ul>` : '';
  return `
<section class="page-hero">
  ${image ? `<div class="page-hero__media" aria-hidden="true">${img(image, '', { lazy: false })}</div>` : ''}
  <div class="wrap">
    ${crumbHtml}
    <div${rev()}>
      ${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}
      <h1>${esc(title)}</h1>
      ${lede ? `<p class="lede" style="max-width:62ch">${esc(lede)}</p>` : ''}
    </div>
  </div>
</section>`;
}
