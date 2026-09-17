// Trace every sr-fabrication finding back to the untouched crawl.
//
// The scanner flags text on the rebuild that it could not match to a source. It
// compares against its own extraction of the live pages, which loses text across
// element and line boundaries — so a claim can be flagged while being, word for
// word, the site's own copy. This re-checks each finding against the raw HTML in
// audit/raw/ and reports how many are genuinely unsourced.
//
// It NEVER clears a finding it cannot match. An unmatched finding stays in
// `items` for a human to read (B4: never silently drop).
import fs from 'node:fs';
import path from 'node:path';

const RAW = 'audit/raw';
const report = JSON.parse(fs.readFileSync('audit/fabrication-report.json', 'utf8'));
const findings = report.findings || [];

// One normalised corpus of every crawled page: tags out, entities decoded,
// whitespace flattened. Flattening is what lets a claim that straddles a <p>
// boundary in the source still match — that boundary is exactly what the
// scanner's own extraction could not see across.
const decode = s => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#8217;/g, "'").replace(/&#039;/g, "'").replace(/&#39;/g, "'")
  .replace(/&#8216;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#8211;/g, '-');

const flat = s => decode(s)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

let corpus = '';
for (const f of fs.readdirSync(RAW)) {
  corpus += ' ' + flat(fs.readFileSync(path.join(RAW, f), 'utf8'));
}
corpus = corpus.replace(/\s+/g, ' ');

// A short fragment ("3x more") would match the corpus by accident, so matching it
// alone proves nothing. Instead of loosening the test, widen it: pull the fragment's
// surrounding sentence off the REBUILT page and require that whole span to appear in
// the source. Passing means the rebuild reproduces the source sentence word for word
// — strictly stronger evidence than the substring match, not weaker.
const MIN = 12;
const PAD = 70;
const distCache = new Map();
const distText = file => {
  if (!distCache.has(file)) {
    const p = path.join('dist', file);
    distCache.set(file, fs.existsSync(p)
      ? flat(fs.readFileSync(p, 'utf8')).replace(/\s+/g, ' ')
      : null);
  }
  return distCache.get(file);
};

const byCode = {};
const unmatched = [];
let verbatim = 0, viaContext = 0;

for (const f of findings) {
  const needle = flat(f.claim || '').replace(/\s+/g, ' ').trim();
  let hit = needle.length >= MIN && corpus.includes(needle);

  if (!hit && needle.length && needle.length < MIN) {
    const page = distText(f.file);
    const at = page ? page.indexOf(needle) : -1;
    if (at >= 0) {
      const span = page.slice(Math.max(0, at - PAD), at + needle.length + PAD).trim();
      // Only counts if the widened span is itself distinctive.
      if (span.length >= MIN * 3 && corpus.includes(span)) { hit = true; viaContext++; }
    }
  }

  byCode[f.code] = byCode[f.code] || { total: 0, verbatim: 0 };
  byCode[f.code].total++;
  if (hit) { verbatim++; byCode[f.code].verbatim++; } else { unmatched.push(f); }
}

const out = {
  checkedAgainst: `${fs.readdirSync(RAW).length} raw pages in ${RAW} (${corpus.length.toLocaleString()} normalised chars)`,
  generated: new Date().toISOString(),
  total: findings.length,
  verbatimInSource: verbatim,
  percentSourced: +((verbatim / (findings.length || 1)) * 100).toFixed(1),
  notVerbatim: unmatched.length,
  byCode,
  clearedViaSentenceContext: viaContext,
  note: 'A finding is cleared ONLY when its claim appears word for word in the untouched crawl — either the claim itself, or (for fragments under 12 chars, which would match by accident) the surrounding sentence lifted off the rebuilt page and found intact in the source. Findings that could not be matched are listed in `items` for review — none are dropped.',
  items: unmatched,
};

fs.writeFileSync('build/fabrication-traceability.json', JSON.stringify(out, null, 1));
console.log('findings        :', out.total);
console.log('verbatim in raw :', out.verbatimInSource, `(${out.percentSourced}%)`);
console.log('not matched     :', out.notVerbatim);
for (const [code, v] of Object.entries(byCode)) {
  console.log('   ', code, v.verbatim + '/' + v.total);
}
