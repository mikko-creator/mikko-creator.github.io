// Build the generated-imagery plan.
// B3 boundary: generated art is ABSTRACT or ENVIRONMENTAL only. It never
// depicts a real person, a named client, a screenshot, or a claimed result.
// Real people use the real photographs already on disk.
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('build/page-manifest.json', 'utf8')).manifest;

const STYLE = 'cinematic, deep violet and royal purple palette with warm gold light accents, ' +
  'dark premium editorial aesthetic, volumetric haze, soft rim lighting, subtle glass and ' +
  'frosted translucent surfaces, high detail, 8k, sophisticated, no text, no words, no letters, no logos, no watermark';

const NEG = 'text, words, letters, typography, logo, watermark, signature, ui mockup, ' +
  'screenshot, chart with numbers, human face, portrait, people looking at camera, deformed';

const plan = [];
const add = (id, prompt, size = 'landscape_16_9', model = 'schnell') =>
  plan.push({ id, prompt: prompt + ', ' + STYLE, negative: NEG, size, model });

/* ---------- 1. signature heroes (higher-quality model) ---------- */
add('hero-home',
  'abstract sculptural composition of translucent frosted glass panels floating in dark space, ' +
  'a rising golden light beam passing through them, refraction and caustics, sense of ascent and guarantee',
  'portrait_4_3', 'dev');

add('hero-full-suite',
  'six interlocking translucent glass plates arranged as a layered stack, each catching gold light, ' +
  'orbiting a central warm core, symbolising a complete integrated service suite',
  'landscape_16_9', 'dev');

add('hero-guarantee',
  'a single polished obsidian monolith with a gold seal of light embedded at its centre, ' +
  'frosted glass shards suspended around it, monumental and reassuring',
  'landscape_16_9', 'dev');

add('hero-contact',
  'abstract network of glowing gold filaments converging into a single bright node inside ' +
  'a dark violet glass chamber, connection and arrival',
  'landscape_16_9', 'dev');

/* ---------- 2. service / concept art ---------- */
const SERVICES = [
  ['svc-seo', 'abstract ascending staircase of translucent glass planes climbing toward a bright gold summit, search and ranking ascent'],
  ['svc-web', 'wireframe architecture of a building made from luminous violet glass panels, structure and craft'],
  ['svc-content', 'flowing ribbons of frosted glass unfurling like pages caught in warm gold light'],
  ['svc-reputation', 'a protective dome of faceted violet glass shielding a steady gold ember at its core'],
  ['svc-cro', 'a funnel of descending glass rings narrowing toward a concentrated gold point of light'],
  ['svc-design', 'geometric prism refracting a single white beam into a violet-and-gold spectrum, creative craft'],
  ['svc-branding', 'a monogram-less emblem of layered gold and violet glass rings, identity and prestige'],
  ['svc-consulting', 'two abstract glass forms leaning toward one another across a lit table of dark stone, counsel'],
];
SERVICES.forEach(([id, p]) => add(id, p));

/* ---------- 3. industry environments (context, never "our client") ---------- */
const INDUSTRIES = [
  ['ind-dental', 'immaculate empty modern dental practice interior at dusk, clean minimal surfaces, no people'],
  ['ind-law-firm', 'empty sophisticated law office library at dusk, leather and dark wood, tall windows, no people'],
  ['ind-medical-spa', 'serene empty luxury medical spa treatment room, soft stone and water, no people'],
  ['ind-contracting', 'precision architectural construction site at golden hour, clean steel and glass frame, no people'],
];
INDUSTRIES.forEach(([id, p]) => add(id, p));

/* ---------- 4. section textures ---------- */
add('tex-results', 'abstract upward-sweeping gold light trails over a dark violet gradient field, momentum');
add('tex-reviews', 'field of softly glowing violet glass orbs receding into darkness, warm gold highlights');
add('tex-team', 'abstract arrangement of nine frosted glass panels standing together, warm gold backlight');
add('tex-video', 'dark violet studio space with a single frosted glass screen glowing warm gold, no text');
add('tex-blog', 'abstract stack of translucent glass sheets fanned open like an archive, gold edge light');
add('tex-portfolio', 'gallery of floating rectangular glass panels in a dark violet void, each edge-lit in gold');
add('tex-locations', 'abstract constellation of gold light points connected across a dark violet map-like plane, no text');

/* ---------- 5. one environmental image per location city ---------- */
const cities = new Map();
for (const m of manifest) {
  const hit = m.path.match(/^\/(?:our-locations|seo-services)\/(.+?)-seo$/);
  if (!hit) continue;
  const slug = hit[1];
  if (cities.has(slug)) continue;
  const name = slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  cities.set(slug, name);
}
for (const [slug, name] of cities) {
  add('city-' + slug,
    `${name} city skyline at blue hour seen from a distance, moody and cinematic, ` +
    'violet dusk sky with warm gold window lights, architectural, no people, no signage');
}

/* ---------- 6. blog / article headers by topic ---------- */
const ARTICLE_CONCEPTS = [
  [/chrome.extension|tool/i, 'abstract cluster of translucent glass tool-shaped forms floating in dark violet space'],
  [/tips.and.tricks|beginner/i, 'abstract path of illuminated glass stepping stones ascending through violet haze'],
  [/strateg/i, 'abstract chess-like arrangement of tall glass forms on a dark reflective plane, gold key light'],
  [/authority|rank/i, 'a tall crystalline glass tower rising above a violet cloud layer, gold crown of light'],
  [/keyword|research/i, 'abstract magnifying lens of gold-rimmed glass over a field of violet light points'],
  [/content/i, 'flowing translucent glass ribbons unfurling like manuscript pages in warm gold light'],
  [/link|backlink/i, 'interlocking gold and glass chain links suspended in dark violet space'],
  [/local|map|citation/i, 'abstract gold pin of light rising from a dark violet topographic glass plane'],
  [/mobile|responsive/i, 'nested rectangular glass panes of descending size, gold edge light, dark violet ground'],
  [/speed|performance|core.web/i, 'streaks of gold light accelerating through a violet glass tunnel'],
  [/analytic|report|traffic/i, 'abstract ascending bars of frosted violet glass lit from beneath in gold, no numbers'],
  [/social|media/i, 'network of gold filaments connecting floating violet glass nodes'],
  [/ecommerce|shop|sales/i, 'abstract glass vessel overflowing with warm gold light in a dark violet room'],
  [/video/i, 'a single frosted glass screen glowing gold in a dark violet studio void'],
  [/google|algorithm|update/i, 'vast abstract lattice of violet glass reconfiguring itself, gold light passing through'],
];
add('blog-default', 'abstract fan of translucent violet glass sheets with warm gold edge light, editorial');

const articleMap = {};
for (const m of manifest) {
  const isArticle =
    /^\/(las-vegas-seo-blog|seo-blog)\//.test(m.path) ||
    (m.pageType === 'page' && m.words > 400 && !/^\/(contact|our-team|portfolio)/.test(m.path)) ||
    /^\/(13-seo|5-important|9-seo|authority|beginner)/.test(m.path);
  if (!isArticle) continue;
  const hay = m.path + ' ' + (m.title || '') + ' ' + (m.h1 || '');
  const found = ARTICLE_CONCEPTS.find(([re]) => re.test(hay));
  articleMap[m.path] = found ? 'topic-' + ARTICLE_CONCEPTS.indexOf(found) : 'blog-default';
}
ARTICLE_CONCEPTS.forEach(([, prompt], i) => {
  if (Object.values(articleMap).includes('topic-' + i)) add('topic-' + i, prompt);
});

fs.writeFileSync('build/image-plan.json', JSON.stringify({
  generated: new Date().toISOString(),
  style: STYLE,
  negative: NEG,
  count: plan.length,
  cities: Object.fromEntries(cities),
  articleMap,
  plan,
}, null, 1));

const byModel = plan.reduce((a, p) => (a[p.model] = (a[p.model] || 0) + 1, a), {});
console.log('planned images:', plan.length, byModel);
console.log('cities:', cities.size, '| articles mapped:', Object.keys(articleMap).length);
