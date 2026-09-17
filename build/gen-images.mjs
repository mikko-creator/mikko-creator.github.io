// Generate the planned imagery through fal.ai. Node builtins only (B12).
// Resumable: an image already on disk is never regenerated (B5).
// Every failure is recorded, never swallowed (B4).
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.FAL_KEY;
if (!KEY) { console.error('FAL_KEY not set in the environment'); process.exit(2); }

const OUT = path.join(process.cwd(), 'assets', 'generated');
fs.mkdirSync(OUT, { recursive: true });

const planFile = JSON.parse(fs.readFileSync('build/image-plan.json', 'utf8'));
const only = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1].split(',')
  : null;
const plan = only ? planFile.plan.filter(p => only.includes(p.id)) : planFile.plan;

const ENDPOINT = {
  schnell: 'https://queue.fal.run/fal-ai/flux/schnell',
  dev: 'https://queue.fal.run/fal-ai/flux/dev',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function falJson(url, init = {}, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { Authorization: 'Key ' + KEY, 'Content-Type': 'application/json', ...(init.headers || {}) },
      });
      const text = await res.text();
      if (!res.ok) { last = new Error('HTTP ' + res.status + ' ' + text.slice(0, 200)); await sleep(1200 * (i + 1)); continue; }
      return JSON.parse(text);
    } catch (e) { last = e; await sleep(1200 * (i + 1)); }
  }
  throw last;
}

async function generate(item) {
  const dest = path.join(OUT, item.id + '.jpg');
  if (fs.existsSync(dest) && fs.statSync(dest).size > 5000) {
    return { id: item.id, status: 'cached', file: 'assets/generated/' + item.id + '.jpg', bytes: fs.statSync(dest).size };
  }

  const submit = await falJson(ENDPOINT[item.model] || ENDPOINT.schnell, {
    method: 'POST',
    body: JSON.stringify({
      prompt: item.prompt,
      image_size: item.size,
      num_images: 1,
      enable_safety_checker: true,
      ...(item.model === 'dev'
        ? { num_inference_steps: 34, guidance_scale: 3.5 }
        : { num_inference_steps: 4 }),
    }),
  });

  const statusUrl = submit.status_url;
  const resultUrl = submit.response_url;
  if (!statusUrl) throw new Error('no status_url: ' + JSON.stringify(submit).slice(0, 200));

  const deadline = Date.now() + 180000;
  for (;;) {
    if (Date.now() > deadline) throw new Error('timeout waiting for ' + item.id);
    const st = await falJson(statusUrl);
    if (st.status === 'COMPLETED') break;
    if (st.status === 'FAILED' || st.status === 'ERROR') throw new Error('fal ' + st.status + ' ' + JSON.stringify(st).slice(0, 200));
    await sleep(1400);
  }

  const result = await falJson(resultUrl);
  const img = (result.images || [])[0];
  if (!img || !img.url) throw new Error('no image in result: ' + JSON.stringify(result).slice(0, 200));

  const bin = await fetch(img.url);
  if (!bin.ok) throw new Error('download HTTP ' + bin.status);
  const buf = Buffer.from(await bin.arrayBuffer());
  if (buf.length < 5000) throw new Error('suspiciously small image: ' + buf.length + ' bytes');
  fs.writeFileSync(dest, buf);

  return {
    id: item.id, status: 'generated', file: 'assets/generated/' + item.id + '.jpg',
    bytes: buf.length, width: img.width, height: img.height,
    model: item.model, prompt: item.prompt, seed: result.seed ?? null,
  };
}

// bounded concurrency
async function pool(items, size, worker) {
  const out = [];
  let i = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    for (;;) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return out;
}

const results = await pool(plan, 4, async (item) => {
  try {
    const r = await generate(item);
    process.stdout.write((r.status === 'cached' ? '.' : '+'));
    return r;
  } catch (e) {
    process.stdout.write('x');
    return { id: item.id, status: 'failed', reason: String(e.message || e), model: item.model };
  }
});
process.stdout.write('\n');

const ok = results.filter(r => r.status !== 'failed');
const failed = results.filter(r => r.status === 'failed');

const manifestPath = 'build/generated-manifest.json';
const prior = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).images || {} : {};
const images = { ...prior };
for (const r of ok) images[r.id] = r;
fs.writeFileSync(manifestPath, JSON.stringify({
  generated: new Date().toISOString(),
  total: Object.keys(images).length,
  images,
  failed,
}, null, 1));

// B4: failures go into the project failure ledger, not into a shrug.
if (failed.length) {
  const fp = 'audit/failures.json';
  const ledger = JSON.parse(fs.readFileSync(fp, 'utf8'));
  for (const f of failed) {
    ledger.items.push({
      stage: 'imagegen:fal', target: f.id, reason: f.reason,
      extra: { model: f.model }, at: new Date().toISOString(),
    });
  }
  fs.writeFileSync(fp, JSON.stringify(ledger, null, 1));
}

console.log('generated/cached:', ok.length, ' failed:', failed.length, ' on disk:', Object.keys(images).length);
if (failed.length) failed.slice(0, 8).forEach(f => console.log('  FAIL', f.id, '-', f.reason.slice(0, 120)));
