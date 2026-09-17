// Raw WordPress HTML -> normalized content blocks. Node builtins only (B12).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RAW = path.join(ROOT, 'audit', 'raw');

const ENT = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', hellip: '…', trade: '™',
  reg: '®', copy: '©', eacute: 'é', deg: '°',
  times: '×', middot: '·',
};

export function decodeEntities(s = '') {
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => cp(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => cp(parseInt(d, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, n) => (ENT[n] !== undefined ? ENT[n] : m));
}
function cp(n) { try { return String.fromCodePoint(n); } catch { return ''; } }

// The source is double-encoded in places: "site€¦ We get it" is a mangled U+2026.
// Built from escape sequences so the repair table itself stays ASCII-safe.
const MOJIBAKE = [
  ['â€™', '’'],
  ['â€', '“'],
  ['â€', '”'],
  ['â€”', '—'],
  ['â€–', '–'],
  ['â€¦', '…'],
  ['€¦', '…'],
  ['€™', '’'],
  ['€', '“'],
  ['Â ', ' '],
];

export function fixText(s = '') {
  let t = decodeEntities(s);
  for (const [from, to] of MOJIBAKE) t = t.split(from).join(to);
  return t.replace(/[\t  ]+/g, ' ').trim();
}

// Remove elements whole, one tag family at a time (skill rule: never span across tokens).
function dropElement(html, tag) {
  const re = new RegExp('<' + tag + '\\b[^>]*>[\\s\\S]*?<\\/' + tag + '\\s*>', 'gi');
  let prev;
  do { prev = html; html = html.replace(re, ''); } while (html !== prev);
  return html.replace(new RegExp('<' + tag + '\\b[^>]*\\/>', 'gi'), '');
}

// The live site is compromised: 169 of 172 crawled pages carry a hidden block
// of `rel="dofollow"` links to ~60 unrelated gambling/adult domains, cloaked
// with `position:absolute;left:-99999px;clip:rect(0 0 0 0)`. It is invisible to
// visitors and exists only to pass PageRank to those domains.
//
// This is NOT page copy and is deliberately not preserved: reproducing it would
// carry a live Google penalty risk into the new site. Recorded as a removal.
export const INJECTION_REMOVALS = [];
function stripHiddenInjection(html, tag = '') {
  let h = html;
  const before = h.length;

  // 1. the named container the injector uses
  let prev;
  do {
    prev = h;
    h = h.replace(/<div[^>]*class="[^"]*netlink-links[^"]*"[\s\S]*?<\/div>/gi, '');
  } while (h !== prev);

  // 2. any element cloaked off-screen or clipped to nothing
  const CLOAK = /style="[^"]*(?:left\s*:\s*-9{4,}px|clip\s*:\s*rect\(0\s+0\s+0\s+0\)|text-indent\s*:\s*-9{4,}px)[^"]*"/i;
  h = h.replace(/<(div|ul|section|span|p)\b[^>]*>/gi, (m, t, off) => m) // keep structure scan simple
    .replace(/<div\b([^>]*)>([\s\S]*?)<\/div>/gi, (m, attrs) => (CLOAK.test(attrs) ? '' : m));

  if (h.length !== before) INJECTION_REMOVALS.push({ page: tag, bytesRemoved: before - h.length });
  return h;
}

export function stripChrome(html, tag = '') {
  let h = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const t of ['script', 'style', 'noscript', 'template', 'iframe', 'svg']) h = dropElement(h, t);
  h = stripHiddenInjection(h, tag);
  for (const t of ['header', 'footer', 'nav']) h = dropElement(h, t);
  return h;
}

function attrs(tagText) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m;
  while ((m = re.exec(tagText))) out[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? '');
  return out;
}

const BLOCK_H = /^h[1-6]$/;
const BLOCK_BOUNDARY = /^(p|div|section|article|td|th|tr|table|figcaption|figure|main|aside|dd|dt|dl|address|hr)$/;

// Walk the body as a token stream; emit ordered blocks.
export function extractBlocks(html, tag = '') {
  const body = (html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];
  const clean = stripChrome(body, tag);
  const blocks = [];
  const tokens = clean.split(/(<[^>]+>)/);

  let cur = null;
  let listBuf = null;
  let liBuf = null;
  let inLink = null;
  let selectBuf = null;
  let optionBuf = null;

  const flush = () => {
    if (cur) {
      const t = fixText(cur.text);
      if (t) { cur.text = t; blocks.push(cur); }
    }
    cur = null;
  };
  const flushList = () => {
    if (listBuf && listBuf.items.length) blocks.push(listBuf);
    listBuf = null; liBuf = null;
  };
  const pushLi = () => {
    if (liBuf !== null && listBuf) {
      const t = fixText(liBuf);
      if (t) listBuf.items.push(t);
    }
  };

  for (const tk of tokens) {
    if (!tk) continue;

    if (tk[0] === '<') {
      const closing = tk[1] === '/';
      const name = (tk.match(/^<\/?\s*([a-zA-Z0-9-]+)/) || [, ''])[1].toLowerCase();
      const a = closing ? {} : attrs(tk);

      // Form controls carry real page content: on the /rep/* lead pages and
      // /payment-authorization the field labels ARE the page. Stripping <form>
      // wholesale lost them, so the fields are captured as structured blocks.
      if (!closing && name === 'select') {
        selectBuf = { type: 'field', inputType: 'select', name: a.name || a.id || '', label: fixText(a['aria-label'] || a.title || ''), options: [] };
        continue;
      }
      if (closing && name === 'select') {
        if (selectBuf) { blocks.push(selectBuf); selectBuf = null; }
        continue;
      }
      if (!closing && name === 'option') { optionBuf = ''; continue; }
      if (closing && name === 'option') {
        if (selectBuf && optionBuf !== null) { const t = fixText(optionBuf); if (t) selectBuf.options.push(t); }
        optionBuf = null;
        continue;
      }

      if (!closing && (name === 'input' || name === 'textarea')) {
        const type = (a.type || (name === 'textarea' ? 'textarea' : 'text')).toLowerCase();
        if (['hidden', 'submit', 'button', 'image'].includes(type)) {
          if (a.value && type !== 'hidden') blocks.push({ type: 'paragraph', text: fixText(a.value), links: [] });
          continue;
        }
        blocks.push({
          type: 'field', inputType: type,
          name: a.name || a.id || '',
          label: fixText(a.placeholder || a['aria-label'] || a.title || ''),
          required: 'required' in a,
        });
        continue;
      }
      if (!closing && name === 'button') { flush(); cur = { type: 'text', text: '', links: [] }; continue; }
      if (closing && name === 'button') { flush(); continue; }

      if (!closing && name === 'img') {
        const src = a.src || a['data-src'] || a['data-lazy-src'] || '';
        if (src && !/^data:/.test(src)) {
          blocks.push({ type: 'image', src, alt: fixText(a.alt || ''), w: +a.width || null, h: +a.height || null });
        }
        continue;
      }
      if (name === 'br') { if (liBuf !== null) liBuf += ' '; else if (cur) cur.text += ' '; continue; }

      if (!closing && name === 'a') { inLink = { href: a.href || '', start: cur ? cur.text.length : 0 }; continue; }
      if (closing && name === 'a') {
        if (inLink && cur) {
          const label = cur.text.slice(inLink.start).trim();
          if (label && inLink.href) cur.links.push({ href: inLink.href, text: fixText(label) });
        }
        inLink = null;
        continue;
      }

      if (!closing && BLOCK_H.test(name)) { flush(); flushList(); cur = { type: 'heading', level: +name[1], text: '', links: [] }; continue; }
      if (closing && BLOCK_H.test(name)) { flush(); continue; }

      if (!closing && (name === 'ul' || name === 'ol')) { flush(); flushList(); listBuf = { type: 'list', ordered: name === 'ol', items: [] }; continue; }
      if (closing && (name === 'ul' || name === 'ol')) { pushLi(); liBuf = null; flushList(); continue; }
      if (!closing && name === 'li') { pushLi(); liBuf = ''; continue; }
      if (closing && name === 'li') { pushLi(); liBuf = null; continue; }

      if (!closing && name === 'blockquote') { flush(); flushList(); cur = { type: 'quote', text: '', links: [] }; continue; }
      if (closing && name === 'blockquote') { flush(); continue; }

      if (BLOCK_BOUNDARY.test(name)) { if (liBuf === null) flush(); continue; }
      continue; // inline tags: span, strong, em, b, i, u, small, sup, sub...
    }

    // Text node
    if (optionBuf !== null) { optionBuf += tk; continue; }
    if (!tk.trim()) { if (liBuf !== null) liBuf += ' '; else if (cur) cur.text += ' '; continue; }
    if (liBuf !== null) { liBuf += tk; continue; }
    if (!cur) cur = { type: 'text', text: '', links: [] };
    cur.text += tk;
  }
  flush(); flushList();

  for (const b of blocks) if (b.type === 'text') b.type = 'paragraph';
  return blocks;
}

// ---- run over every page in the build manifest ----
if (process.argv[1] && process.argv[1].endsWith('extract-blocks.mjs')) {
  const manifest = JSON.parse(fs.readFileSync('build/page-manifest.json', 'utf8'));
  const content = JSON.parse(fs.readFileSync('audit/content-inventory.json', 'utf8')).pages;
  const byUrl = new Map(content.map(p => [p.url, p]));
  const out = {};
  let totalBlocks = 0, missing = 0;

  for (const m of manifest.manifest) {
    const page = byUrl.get(m.url);
    const file = page && page.savedAs ? path.join(RAW, path.basename(page.savedAs)) : null;
    if (!file || !fs.existsSync(file)) { missing++; out[m.path] = { url: m.url, error: 'raw-missing', blocks: [] }; continue; }
    const blocks = extractBlocks(fs.readFileSync(file, 'utf8'), m.path);
    totalBlocks += blocks.length;
    out[m.path] = { url: m.url, savedAs: page.savedAs, blocks };
  }
  fs.writeFileSync('build/content-blocks.json', JSON.stringify(out));
  fs.writeFileSync('build/injection-removals.json', JSON.stringify({
   note: 'hidden dofollow spam-link blocks removed from the source; see SKILL bylaw B4',
   pages: INJECTION_REMOVALS.length,
   totalBytes: INJECTION_REMOVALS.reduce((a,b)=>a+b.bytesRemoved,0),
   items: INJECTION_REMOVALS,
  }, null, 1));
  console.log('spam-injection blocks removed from', INJECTION_REMOVALS.length, 'pages');
  console.log('pages:', Object.keys(out).length, 'blocks:', totalBlocks, 'raw-missing:', missing);
}
