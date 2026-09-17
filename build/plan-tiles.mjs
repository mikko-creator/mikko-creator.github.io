// Purpose-made abstract tiles for the portfolio categories.
//
// The project screenshots are among the ~356 assets lost with the closed GCS
// bucket, so tiles need stand-in art. Two earlier attempts were wrong:
//   - environmental renders (a law library, a spa room) read as the CLIENT'S
//     actual premises, which is the documentary role B3 forbids;
//   - reusing the service art put two glasses toasting on the law tiles and a
//     flame on a dental one — right register, wrong meaning.
// These are deliberately non-representational: architectural glass forms that
// carry a category by shape and colour alone, asserting nothing about a real
// place, person or result.
import fs from 'node:fs';

const STYLE = 'abstract non-representational composition, deep violet and royal purple with ' +
  'warm gold light accents, dark premium editorial aesthetic, frosted and polished glass forms, ' +
  'volumetric haze, soft rim lighting, high detail, 8k, sophisticated, ' +
  'no text, no words, no letters, no logos, no watermark, no people, no recognisable place';

const NEG = 'text, words, letters, typography, logo, watermark, signature, people, face, portrait, ' +
  'interior room, building interior, office, storefront, furniture, wine glass, drink, flame, fire, ' +
  'screenshot, ui mockup, chart, deformed';

const TILES = [
  ['tile-law', 'tall parallel columns of clear glass rising in ordered ranks, balanced and symmetrical, gold light between them'],
  ['tile-medical', 'smooth concentric arcs of frosted glass nested inside one another, calm and clean, soft gold glow at the centre'],
  ['tile-construction', 'interlocking glass beams forming an open lattice frame, structural and angular, gold edge light'],
  ['tile-dispensary', 'organic overlapping glass petals fanning outward from a warm gold core, botanical in rhythm only'],
  ['tile-general', 'a loose grid of floating rectangular glass panels at varied depths, gallery-like, gold edge light'],
];

const plan = TILES.map(([id, prompt]) => ({
  id, prompt: prompt + ', ' + STYLE, negative: NEG,
  size: 'landscape_4_3', model: 'dev',
}));

const file = 'build/image-plan.json';
const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
const ids = new Set(plan.map(p => p.id));
existing.plan = existing.plan.filter(p => !ids.has(p.id)).concat(plan);
existing.count = existing.plan.length;
fs.writeFileSync(file, JSON.stringify(existing, null, 1));
console.log('portfolio tiles added to the plan:', plan.map(p => p.id).join(', '));
console.log('plan size now:', existing.plan.length);
