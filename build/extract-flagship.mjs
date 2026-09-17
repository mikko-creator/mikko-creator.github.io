// Turn the flat block stream of a "flagship" page (home / city / industry)
// into the structured data the redesign renders. Every field here is LIFTED
// from the source page — nothing is authored (B3).
import { dedupeAdjacent, CHROME_TEXT } from './lib.mjs';

const txt = b => (b && b.text) || '';
const has = (b, re) => re.test(txt(b));

export function extractFlagship(rawBlocks) {
  const blocks = dedupeAdjacent(rawBlocks);
  const idx = re => blocks.findIndex(b => re.test(txt(b)));

  const out = {
    h1: '', tagline: '', pills: [],
    founder: null, press: [], results: [], qualify: null,
    caseStudy: null, about: null, services: [], guarantee: null,
    videoGroups: [], team: [], rating: null, reviews: [],
    featureSections: [], pageEyebrow: '',
    leftover: [],
  };

  /* ---- hero ---- */
  const h1b = blocks.find(b => b.type === 'heading' && b.level === 1);
  out.h1 = h1b ? h1b.text : '';
  const iTag = idx(/^Everything Else Is Complementary$/i);
  if (iTag >= 0) out.tagline = blocks[iTag].text;
  const firstList = blocks.find(b => b.type === 'list');
  if (firstList) out.pills = firstList.items;

  /* ---- founder ---- */
  const iFounder = idx(/ABOUT OUR FOUNDER/i);
  if (iFounder >= 0) {
    const seg = blocks.slice(iFounder, iFounder + 12);
    const name = seg.find(b => has(b, /Managing Partner/i));
    const bio = seg.filter(b => b.type === 'paragraph' && b.text.length > 160)
      .sort((a, b) => b.text.length - a.text.length)[0];
    const photo = blocks.slice(Math.max(0, iFounder - 6), iFounder + 6)
      .find(b => b.type === 'image' && /james/i.test(b.src));
    out.founder = {
      eyebrow: blocks[iFounder].text,
      name: name ? name.text : '',
      bio: bio ? bio.text : '',
      image: photo ? photo.src : null,
      link: (bio && bio.links[0]) || null,
    };
  }

  /* ---- press logos ("... FEATURED ON") ---- */
  const iPress = idx(/FEATURED ON/i);
  if (iPress >= 0) {
    for (let i = iPress + 1; i < Math.min(blocks.length, iPress + 20); i++) {
      const b = blocks[i];
      if (b.type === 'image') out.press.push({ src: b.src, alt: b.alt });
      else if (b.type === 'paragraph' && b.text.length > 3 && !CHROME_TEXT.has(b.text)) break;
    }
    out.press.eyebrow = blocks[iPress].text;
  }

  /* ---- headline results ---- */
  out.results = blocks
    .filter(b => b.type === 'paragraph' && /^Over [\d,]+%?.*(Increase|Conversions)/i.test(b.text))
    .map(b => b.text);
  const iThem = idx(/DONE IT\s*FOR THEM|DO .* SEO FOR THEM/i);
  if (iThem >= 0) out.resultsHeading = blocks[iThem].text;
  const iClients = idx(/^CURRENT CLIENTS$/i);
  if (iClients >= 0) out.resultsEyebrow = blocks[iClients].text;

  /* ---- qualify CTA ---- */
  const iQ = idx(/DO YOU HAVE A WEBSITE\?/i);
  if (iQ >= 0) {
    const yesNo = blocks.slice(iQ + 1, iQ + 4).find(b => /YES I DO/i.test(txt(b)));
    const heading = blocks.slice(Math.max(0, iQ - 6), iQ).reverse()
      .find(b => /DO IT\s*FOR YOU|DO .* SEO FOR YOU/i.test(txt(b)));
    const cta = blocks.slice(Math.max(0, iQ - 4), iQ).reverse()
      .find(b => /^(START HERE|START A FREE QUOTE)$/i.test(txt(b)));
    out.qualify = {
      question: blocks[iQ].text,
      heading: heading ? heading.text : '',
      cta: cta ? cta.text : 'START HERE',
      options: yesNo ? yesNo.text.split(/\s{2,}|(?<=DO)\s(?=NO)/).map(s => s.trim()).filter(Boolean) : ["YES I DO", "NO I DON'T"],
    };
    if (out.qualify.options.length < 2) out.qualify.options = ["YES I DO", "NO I DON'T"];
  }

  /* ---- case study ---- */
  const iCase = idx(/^THE BLEZ$/i);
  if (iCase >= 0) {
    const body = blocks.slice(iCase + 1, iCase + 4).find(b => b.type === 'paragraph' && b.text.length > 120);
    const stats = [];
    for (let i = iCase; i < Math.min(blocks.length, iCase + 12); i++) {
      const b = blocks[i];
      if (b.type === 'paragraph' && /^\+[\d,]+%$/.test(b.text)) {
        const label = blocks[i + 1];
        stats.push({ num: b.text, label: label && label.type === 'paragraph' ? label.text : '' });
      }
    }
    const eyebrow = blocks.slice(Math.max(0, iCase - 4), iCase).reverse()
      .find(b => /SUCCESSFUL CLIENTS|GUARANTEED RESULTS/i.test(txt(b)));
    const logo = blocks.slice(Math.max(0, iCase - 4), iCase + 3).find(b => b.type === 'image');
    out.caseStudy = {
      eyebrow: eyebrow ? eyebrow.text : 'SUCCESSFUL CLIENTS',
      name: blocks[iCase].text,
      body: body ? body.text : '',
      stats,
      logo: logo ? logo.src : null,
      link: (body && body.links[0]) || null,
    };
  }

  /* ---- about ---- */
  const iAbout = blocks.findIndex(b => /^ABOUT US$/i.test(txt(b)));
  if (iAbout >= 0) {
    const body = blocks.slice(iAbout + 1, iAbout + 4).find(b => b.type === 'paragraph' && b.text.length > 200);
    if (body) out.about = { eyebrow: blocks[iAbout].text, body: body.text };
  }

  /* ---- full suite services ---- */
  const iSuite = idx(/FULL SUITE INCLUDES/i);
  if (iSuite >= 0) {
    for (let i = iSuite + 1; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.type === 'heading' && (b.level === 3 || b.level === 4)) {
        const p = blocks[i + 1];
        if (p && p.type === 'paragraph' && p.text.length > 60) {
          out.services.push({ title: b.text, body: p.text });
          i++;
        }
      }
      if (out.services.length >= 6 && b.type === 'paragraph' && /WANT OUR|VIDEO GALLERY/i.test(b.text)) break;
    }
    out.servicesEyebrow = blocks[iSuite].text;
  }

  /* ---- guarantee band ---- */
  const iWant = idx(/^WANT OUR$/i);
  if (iWant >= 0) {
    const line = blocks.slice(iWant, iWant + 5).map(b => txt(b)).filter(Boolean);
    const sub = blocks.slice(iWant, iWant + 7).find(b => /Click .*START HERE.* to see if you qualify/i.test(txt(b)));
    out.guarantee = { words: line.slice(0, 3), sub: sub ? sub.text : '' };
  }

  /* ---- video gallery ---- */
  const iVid = idx(/^VIDEO GALLERY$/i);
  if (iVid >= 0) {
    let group = null;
    for (let i = iVid + 1; i < blocks.length; i++) {
      const b = blocks[i];
      const t = txt(b);
      if (!t) continue;
      if (/^MEET OUR|^Google Rating$/i.test(t)) break;
      if (/^(SEO|WEB|CRO) VIDEOS$/i.test(t)) { group = { title: t, items: [] }; out.videoGroups.push(group); continue; }
      if (group && b.type === 'paragraph' && t.length > 3 && !CHROME_TEXT.has(t)) {
        if (!group.items.includes(t)) group.items.push(t);
      }
    }
  }

  /* ---- team ---- */
  const iTeam = idx(/MEET OUR SEO EXPERTS/i);
  if (iTeam >= 0) {
    for (let i = iTeam + 1; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.type === 'image') {
        const name = blocks[i + 1], role = blocks[i + 2];
        if (name && name.type === 'paragraph' && role && role.type === 'paragraph' &&
            name.text.length < 40 && role.text.length < 60) {
          out.team.push({ photo: b.src, name: name.text, role: role.text });
          i += 2;
          continue;
        }
      }
      if (b.type === 'paragraph' && /^Google Rating$/i.test(b.text)) break;
      if (out.team.length && b.type === 'paragraph' && b.text.length > 90) break;
    }
    out.teamEyebrow = blocks[iTeam].text;
  }

  /* ---- reviews ---- */
  const iRate = idx(/^Google Rating$/i);
  if (iRate >= 0) {
    const score = blocks.slice(iRate + 1, iRate + 4).find(b => /^\d\.\d$/.test(txt(b)));
    const based = blocks.slice(iRate + 1, iRate + 8).find(b => /^Based on \d+ reviews$/i.test(txt(b)));
    const place = blocks.slice(iRate + 1, iRate + 8).find(b => /First Page SEO Guarantee/i.test(txt(b)));
    out.rating = {
      label: blocks[iRate].text,
      score: score ? score.text : '',
      based: based ? based.text : '',
      place: place ? place.text : '',
    };
    for (let i = iRate; i < blocks.length; i++) {
      const b = blocks[i], nxt = blocks[i + 1];
      if (b.type !== 'paragraph' || !nxt || nxt.type !== 'paragraph') continue;
      // Reviewer names are Google display names: some are lowercase ("akhi N.",
      // "thomas jy J."), so anchoring to a capital first letter loses real reviews.
      const isName = /^[A-Za-z][A-Za-z'.\- ]{1,28}(?: [A-Z]\.)?$/.test(b.text) &&
        b.text.length < 32 && !/^(Google Rating|Based on|First Page)/i.test(b.text);
      if (isName && nxt.text.length > 60) {
        out.reviews.push({ name: b.text, text: nxt.text });
        i++;
      }
    }
  }

  /* ---- generic headed sections ----
     City and industry pages carry their unique copy as h2/h4 + paragraph pairs
     rather than a "FULL SUITE INCLUDES" block. Without this they would render
     with their distinguishing content silently missing (B4). */
  const CONSUMED = /^(Everything Else Is Complementary|DO YOU HAVE A WEBSITE\?|GET IN TOUCH|FULL SUITE INCLUDES:?)$/i;
  const usedTitles = new Set(out.services.map(s => s.title));
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type !== 'heading' || b.level < 2 || b.level > 4) continue;
    if (CONSUMED.test(b.text) || usedTitles.has(b.text)) continue;
    const body = [];
    for (let j = i + 1; j < blocks.length && body.length < 4; j++) {
      const n = blocks[j];
      if (n.type === 'heading') break;
      if (n.type === 'paragraph' && n.text.length > 60 && !CHROME_TEXT.has(n.text)) body.push(n.text);
      else if (n.type === 'list') body.push(n.items.join(' • '));
      else if (n.type === 'paragraph' && n.text.length > 3) continue;
    }
    if (body.length) out.featureSections.push({ title: b.text, level: b.level, body });
  }

  /* ---- leftover ----
     The template renders the sections it recognises. Anything it does NOT
     recognise used to fall on the floor: /industries/dental alone lost eight
     substantial paragraphs (branding, CRO, link building) that sit under no
     heading the mapper knows. Whatever is still unrepresented after every
     section has taken its share is collected here and rendered, so the page
     cannot quietly lose copy (B4). */
  {
    const rendered = new Set();
    const addWords = t => {
      if (!t) return;
      for (const w of String(t).toLowerCase().split(/\s+/)) {
        const c = w.replace(/[^a-z0-9]/g, '');
        if (c.length > 4) rendered.add(c);
      }
    };
    addWords(out.h1); addWords(out.tagline); out.pills.forEach(addWords);
    if (out.founder) { addWords(out.founder.bio); addWords(out.founder.name); }
    out.results.forEach(addWords);
    if (out.about) addWords(out.about.body);
    if (out.caseStudy) { addWords(out.caseStudy.body); addWords(out.caseStudy.name); }
    out.services.forEach(s => { addWords(s.title); addWords(s.body); });
    out.featureSections.forEach(f => { addWords(f.title); f.body.forEach(addWords); });
    out.videoGroups.forEach(g => { addWords(g.title); g.items.forEach(addWords); });
    out.team.forEach(t => { addWords(t.name); addWords(t.role); });
    out.reviews.forEach(r => { addWords(r.name); addWords(r.text); });
    if (out.qualify) { addWords(out.qualify.question); out.qualify.options.forEach(addWords); }
    if (out.guarantee) { out.guarantee.words.forEach(addWords); addWords(out.guarantee.sub); }

    const seenText = new Set();
    for (const b of blocks) {
      if (b.type !== 'paragraph' && b.type !== 'heading' && b.type !== 'list') continue;
      const t = b.text || (b.items || []).join(' • ');
      // A heading is short by nature — the /services/las-vegas-web-design
      // client showcase is a run of 8 headings ("DDM Garage Doors, Inc",
      // "Southwest Injury Law") that a flat 40-char floor discarded entirely.
      // A phone number or email address is contact information — losing one is
      // a functional defect, not a formatting nicety — so it never falls under
      // the length floor. (Two pages carry a client's own number and address.)
      const isContact = /(?:\+?\d[\d\s().-]{7,}\d)|[\w.+-]+@[\w-]+\.[\w.]+/.test(t);
      const floor = isContact ? 6 : (b.type === 'heading' ? 8 : 40);
      if (!t || t.length < floor) continue;               // ignore bare labels and chrome
      if (CHROME_TEXT.has(t)) continue;
      if (seenText.has(t)) continue;
      const ws = t.toLowerCase().split(/\s+/)
        .map(w => w.replace(/[^a-z0-9]/g, '')).filter(w => w.length > 4);
      if (!ws.length) continue;
      const covered = ws.filter(w => rendered.has(w)).length / ws.length;
      // A list is dense keyword content ("Website to CRM Automation", "Billing
      // Automation"): its individual words almost always appear elsewhere on
      // the page, so a 0.6 word-coverage test discards lists that are wholly
      // new. Lists must therefore be near-fully covered before being skipped.
      const ceiling = b.type === 'list' ? 0.95 : 0.6;
      if (covered >= ceiling) continue;                   // already on the page
      seenText.add(t);
      out.leftover.push({ type: b.type, level: b.level || 0, text: t });
      addWords(t);
    }
  }

  /* ---- eyebrow above the H1 (e.g. "DENTAL SEO") ---- */
  const h1i = blocks.findIndex(b => b.type === 'heading' && b.level === 1);
  if (h1i > 0) {
    const eb = blocks.slice(Math.max(0, h1i - 9), h1i).reverse()
      .find(b => b.type === 'heading' && b.level >= 3 && b.text.length < 40);
    if (eb) out.pageEyebrow = eb.text;
  }

  return out;
}
