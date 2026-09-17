// Independent verification of the build. Reads dist/ and the source harvest
// and reports measured facts — it does not trust the builder's own report.
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const manifest = J('build/page-manifest.json');
const content = new Map(J('audit/content-inventory.json').pages.map(p => [p.url, p]));
const seo = new Map(J('audit/seo-inventory.json').pages.map(p => [p.url, p]));

const textOf = html => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ').trim();

const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = s => norm(s).split(' ').filter(w => w.length > 3);


// Vocabulary of the injected spam block (harvested from the raw source) and of
// the Lorem Ipsum placeholder — both deliberately not reproduced.
const SPAM_VOCAB = new Set();
{
  const RAW='audit/raw';
  for (const f of fs.readdirSync(RAW)) {
    const h = fs.readFileSync(path.join(RAW,f),'utf8');
    for (const m of h.matchAll(/<div[^>]*class="[^"]*netlink-links[^"]*"([\s\S]*?)<\/div>/gi)) {
      for (const w of words(m[1].replace(/<[^>]+>/g,' '))) SPAM_VOCAB.add(w);
    }
  }
}
const LOREM = new Set(words('lorem ipsum dolor sit amet consectetur adipiscing elit tellus luctus nec ullamcorper mattis pulvinar dapibus leo'));

const results = { pages: 0, recall: [], seo: [], a11y: [], links: [], missing: [] };

/* ---- 1. content recall: source words that survived ---- */
for (const p of manifest.manifest) {
  const file = path.join(DIST, p.path === '/' ? 'index.html' : p.path.replace(/^\//, '') + '/index.html');
  if (!fs.existsSync(file)) { results.missing.push(p.path); continue; }
  results.pages++;
  const html = fs.readFileSync(file, 'utf8');
  const built = new Set(words(textOf(html)));
  const src = content.get(p.url);
  // The source's own body text includes the hidden spam-link injection and the
  // Lorem Ipsum placeholder, both removed on purpose. Counting them as "lost
  // content" would understate real fidelity, so they leave the baseline.
  const srcWords = [...new Set(words(src ? src.bodyText || '' : ''))]
    .filter(w => !SPAM_VOCAB.has(w) && !LOREM.has(w));
  if (srcWords.length < 20) continue;
  const kept = srcWords.filter(w => built.has(w));
  const recall = kept.length / srcWords.length;
  results.recall.push({ path: p.path, recall: +(recall * 100).toFixed(1), srcWords: srcWords.length,
    lost: srcWords.filter(w => !built.has(w)).slice(0, 12) });
}

/* ---- 2. SEO surface ---- */
for (const p of manifest.manifest) {
  const file = path.join(DIST, p.path === '/' ? 'index.html' : p.path.replace(/^\//, '') + '/index.html');
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const s = seo.get(p.url) || {};
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [, ''])[1].trim();
  const desc = (html.match(/<meta name="description" content="([^"]*)"/i) || [, ''])[1];
  const canon = (html.match(/<link rel="canonical" href="([^"]*)"/i) || [, ''])[1];
  const h1s = (html.match(/<h1[\s>]/gi) || []).length;
  const issues = [];
  if (!title) issues.push('no-title');
  if (s.title && title !== s.title) issues.push('title-changed');
  if (s.metaDescription && !desc) issues.push('description-lost');
  if (!canon) issues.push('no-canonical');
  // GUARD: no page may hand its ranking to another origin. Rejects an absolute
  // canonical on a foreign host AND a relative one (which silently resolves to
  // whatever origin serves the page). Origin is hardcoded on purpose -- this
  // file verifies the build without trusting the builder's own constants.
  if (canon && !/^https:\/\/seoguarantee\.com(\/|$)/.test(canon)) issues.push('canonical-off-origin:' + canon);
  const ogSite = (html.match(/<meta property="og:site_name" content="([^"]*)"/i) || [, ''])[1];
  if (ogSite && !/First Page SEO Guarantee/.test(ogSite)) issues.push('og-site-name-foreign:' + ogSite);
  if (h1s !== 1) issues.push('h1-count-' + h1s);
  if (issues.length) results.seo.push({ path: p.path, issues, title, srcTitle: s.title });
}

/* ---- 3. accessibility basics ---- */
for (const p of manifest.manifest) {
  const file = path.join(DIST, p.path === '/' ? 'index.html' : p.path.replace(/^\//, '') + '/index.html');
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter(t => !/\balt\s*=/.test(t));
  const issues = [];
  if (noAlt.length) issues.push('img-without-alt:' + noAlt.length);
  if (!/<main\b/i.test(html)) issues.push('no-main');
  if (!/<html lang=/i.test(html)) issues.push('no-lang');
  if (!/skip-link/.test(html)) issues.push('no-skip-link');
  if (issues.length) results.a11y.push({ path: p.path, issues });
}

/* ---- 4. internal link integrity ---- */
const existsPath = href => {
  const clean = href.split('#')[0].split('?')[0].replace(/\/$/, '');
  if (clean === '' || clean === '/') return fs.existsSync(path.join(DIST, 'index.html'));
  const asDir = path.join(DIST, clean.replace(/^\//, ''), 'index.html');
  const asFile = path.join(DIST, clean.replace(/^\//, ''));
  return fs.existsSync(asDir) || fs.existsSync(asFile);
};
const brokenLinks = new Map();
const brokenAssets = new Map();
const danglingAnchors = new Map();
for (const f of walk(DIST)) {
  if (!f.endsWith('.html')) continue;
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(DIST, f).replace(/\\/g, '/');
  for (const m of html.matchAll(/href="(\/[^"#][^"]*)"/g)) {
    if (/^\/(styles|scripts|assets)\//.test(m[1])) continue;
    if (!existsPath(m[1])) brokenLinks.set(m[1], (brokenLinks.get(m[1]) || 0) + 1);
  }
  for (const m of html.matchAll(/(?:src|href)="(\/(?:assets|styles|scripts)\/[^"]+)"/g)) {
    if (!fs.existsSync(path.join(DIST, m[1].replace(/^\//, '')))) {
      brokenAssets.set(m[1], (brokenAssets.get(m[1]) || 0) + 1);
    }
  }
  if (/href="#"/.test(html)) results.links.push({ path: rel, issue: 'bare-hash-anchor' });

  /* An in-page anchor pointing at an id the page does not contain is a link
     that clicks to nothing. sr-decontaminate only flags a bare `href="#"`, so
     63 of these (#seog__inquiry, #bookAppointment, #main-content — WordPress
     widgets this rebuild does not render) survived every earlier pass. */
  const idsOnPage = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  for (const m of html.matchAll(/href="#([^"]+)"/g)) {
    if (!idsOnPage.has(m[1])) danglingAnchors.set(m[1], (danglingAnchors.get(m[1]) || 0) + 1);
  }
}

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full); else yield full;
  }
}

/* ---- report ---- */
const rec = results.recall.map(r => r.recall);
const avg = rec.reduce((a, b) => a + b, 0) / (rec.length || 1);
const below = results.recall.filter(r => r.recall < 95).sort((a, b) => a.recall - b.recall);

console.log('pages verified      :', results.pages, '(missing:', results.missing.length + ')');
console.log('content recall avg  :', avg.toFixed(2) + '%', '| min:', Math.min(...rec).toFixed(1) + '%');
console.log('pages below 95%     :', below.length);
below.slice(0, 8).forEach(r => console.log('   ', r.path, r.recall + '%', 'lost e.g.', r.lost.slice(0, 6).join(',')));
console.log('SEO issues          :', results.seo.length);
results.seo.slice(0, 8).forEach(r => console.log('   ', r.path, r.issues.join(',')));
console.log('a11y issues         :', results.a11y.length);
results.a11y.slice(0, 8).forEach(r => console.log('   ', r.path, r.issues.join(',')));
console.log('broken internal links:', brokenLinks.size);
[...brokenLinks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([h, n]) => console.log('   ', h, '(' + n + ' refs)'));
console.log('broken asset refs   :', brokenAssets.size);
[...brokenAssets.entries()].slice(0, 8).forEach(([h, n]) => console.log('   ', h, '(' + n + ')'));
console.log('bare-# anchors      :', results.links.length);
console.log('dangling #anchors   :', danglingAnchors.size);
[...danglingAnchors.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([h,n])=>console.log('   #'+h,'('+n+' refs)'));

fs.writeFileSync('build/verify-report.json', JSON.stringify({
  pages: results.pages, avgRecall: +avg.toFixed(2), below95: below,
  seo: results.seo, a11y: results.a11y,
  brokenLinks: Object.fromEntries(brokenLinks), brokenAssets: Object.fromEntries(brokenAssets),
  bareHash: results.links,
  danglingAnchors: Object.fromEntries(danglingAnchors),
}, null, 1));
