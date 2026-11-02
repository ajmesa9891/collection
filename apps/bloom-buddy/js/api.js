// External APIs: Pl@ntNet (ID), Gemini (kid-friendly content), iNaturalist (phenology + seasonal photos), GBIF (maps).
import { cachedJson } from './db.js';

// ---------- Keys & settings ----------
export function getKeys() {
  return {
    plantnet: localStorage.getItem('bb.key.plantnet') || '',
    gemini: localStorage.getItem('bb.key.gemini') || '',
  };
}
export function setKeys({ plantnet, gemini }) {
  if (plantnet != null) localStorage.setItem('bb.key.plantnet', plantnet.trim());
  if (gemini != null) localStorage.setItem('bb.key.gemini', gemini.trim());
}

/** On localhost only: load keys from the git-ignored dev-keys.local.json if none are saved yet. */
export async function loadDevKeys() {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const k = getKeys();
  if (!local || (k.plantnet && k.gemini)) return;
  try {
    const res = await fetch('./dev-keys.local.json', { cache: 'no-store' });
    if (!res.ok) return;
    const j = await res.json();
    setKeys({ plantnet: k.plantnet || j.plantnet || '', gemini: k.gemini || j.gemini || '' });
  } catch {
    /* no dev keys */
  }
}

export const DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
export function getModels() {
  const s = localStorage.getItem('bb.models');
  return s ? s.split(',').map((x) => x.trim()).filter(Boolean) : DEFAULT_MODELS;
}

// ---------- Image helpers ----------
/** Resize a photo File to a JPEG Blob (max side) and a square thumbnail. */
export async function processImage(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(file));
  const big = drawToBlob(bmp, 1280, false, 0.85);
  const thumb = drawToBlob(bmp, 360, true, 0.8);
  const [photo, th] = await Promise.all([big, thumb]);
  bmp.close?.();
  return { photo, thumb: th };
}

function drawToBlob(bmp, max, square, quality) {
  const { width: w, height: h } = bmp;
  let sx = 0, sy = 0, sw = w, sh = h;
  if (square) {
    const s = Math.min(w, h);
    sx = (w - s) / 2;
    sy = (h - s) / 2;
    sw = sh = s;
  }
  const scale = Math.min(1, max / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.round(sw * scale);
  c.height = Math.round(sh * scale);
  c.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, 'image/jpeg', quality));
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1]);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

function withTimeout(ms) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(new DOMException('Timeout', 'TimeoutError')), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(id) };
}

// ---------- Pl@ntNet ----------
export async function plantnetIdentify(photoBlob) {
  const { plantnet } = getKeys();
  if (!plantnet) return null;
  const fd = new FormData();
  fd.append('images', photoBlob, 'photo.jpg');
  fd.append('organs', 'auto');
  const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(plantnet)}&nb-results=4&lang=en&include-related-images=true`;
  const t = withTimeout(25000);
  try {
    const res = await fetch(url, { method: 'POST', body: fd, signal: t.signal });
    if (res.status === 404) return []; // "Species not found"
    const j = await res.json();
    if (!res.ok) throw new Error(j.message || `Pl@ntNet HTTP ${res.status}`);
    return (j.results || []).map((r) => ({
      scientific: r.species?.scientificNameWithoutAuthor,
      common: r.species?.commonNames?.[0] || '',
      score: r.score,
      gbif: r.gbif?.id ? Number(r.gbif.id) : null,
      image: r.images?.[0]?.url?.m || r.images?.[0]?.url?.s || '',
    }));
  } finally {
    t.done();
  }
}

// ---------- Gemini ----------
const BI = { type: 'object', properties: { en: { type: 'string' }, es: { type: 'string' } }, required: ['en', 'es'] };
const CONTENT_PROPS = {
  common_name: BI,
  kind: { type: 'string', enum: ['flower', 'tree', 'shrub', 'grass', 'vine', 'cactus', 'fern', 'succulent', 'weed', 'mushroom', 'other'] },
  emoji: { type: 'string', description: 'One emoji that best represents this plant' },
  colors: { type: 'array', items: { type: 'string', enum: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'white', 'brown', 'black'] } },
  greeting: BI,
  facts: { type: 'array', items: BI },
  senses: { type: 'array', items: BI },
  seasons: {
    type: 'object',
    properties: { spring: BI, summer: BI, fall: BI, winter: BI },
    required: ['spring', 'summer', 'fall', 'winter'],
  },
  home: BI,
  safety: {
    type: 'object',
    properties: { level: { type: 'string', enum: ['safe', 'careful', 'danger'] }, note: BI },
    required: ['level', 'note'],
  },
  question: BI,
};
const CONTENT_REQ = Object.keys(CONTENT_PROPS);

const ID_SCHEMA = {
  type: 'object',
  properties: {
    is_plant: { type: 'boolean' },
    scientific_name: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    alternatives: { type: 'array', items: { type: 'string' }, description: 'Up to 2 other likely scientific names' },
    ...CONTENT_PROPS,
  },
  required: ['is_plant', 'scientific_name', 'confidence', ...CONTENT_REQ],
};
const DESCRIBE_SCHEMA = {
  type: 'object',
  properties: { scientific_name: { type: 'string' }, ...CONTENT_PROPS },
  required: ['scientific_name', ...CONTENT_REQ],
};

function contextLine(ctx) {
  const month = new Date().toLocaleString('en-US', { month: 'long' });
  const where = ctx.lat != null ? ` near latitude ${ctx.lat.toFixed(1)}, longitude ${ctx.lng.toFixed(1)}` : '';
  return `A parent photographed this on a bike ride in ${month}${where}.`;
}

const STYLE = `You are Buddy the Bee, a cheerful nature guide for a 4-year-old child who does not read yet.
Write everything in BOTH English (en) and Latin-American Spanish (es), natural in each language (not word-for-word).
Use very short, simple sentences a preschooler understands (max 12 words), warm and playful. No markdown.
- common_name: the everyday name a family would use, in each language.
- greeting: an excited line naming the plant.
- facts: exactly 3 fun, true facts kids love (animals that use it, why it looks that way, foods, records).
- senses: exactly 2 safe prompts to look, count, touch or smell (never taste).
- seasons: what this plant does or looks like in each season, one short sentence each.
- home: where in the world it naturally comes from, and where people plant it.
- safety: "danger" if poisonous to touch or eat, has thorns/spines, stings, or irritates skin; "careful" if mildly so or if berries/parts shouldn't be eaten; otherwise "safe". note says simply what to do.
- question: one fun question to ask the child about the plant.`;

async function geminiCall(input, schema) {
  const { gemini } = getKeys();
  if (!gemini) throw new Error('NO_GEMINI_KEY');
  let lastErr;
  for (const model of getModels()) {
    const t = withTimeout(30000);
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': gemini },
        body: JSON.stringify({
          model,
          store: false,
          input,
          response_format: { type: 'text', mime_type: 'application/json', schema },
        }),
        signal: t.signal,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastErr = new Error(j.error?.message || `Gemini HTTP ${res.status}`);
        if ([400, 401, 403].includes(res.status)) throw lastErr; // bad key/request: no point retrying
        continue;
      }
      const text = (j.steps || [])
        .filter((s) => s.type === 'model_output')
        .flatMap((s) => s.content || [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');
      const data = JSON.parse(text);
      data._model = model;
      return data;
    } catch (e) {
      lastErr = e;
      if (e.message && /API key|permission|denied|invalid/i.test(e.message)) throw e;
    } finally {
      t.done();
    }
  }
  throw lastErr || new Error('Gemini failed');
}

/** Identify (or confirm Pl@ntNet's guess) and produce kid content, from the photo. */
export async function geminiIdentify(photoBlob, candidates, ctx) {
  const b64 = await blobToBase64(photoBlob);
  let hint = '';
  if (candidates?.length) {
    hint =
      '\nA plant-ID service suggested (scientific name, confidence 0-1): ' +
      candidates.map((c) => `${c.scientific} (${c.score.toFixed(2)})`).join('; ') +
      '. Use the photo to choose the best match; prefer these unless the photo clearly shows something else. Use the exact scientific name.';
  }
  const prompt = `${STYLE}\n\n${contextLine(ctx)}\nIdentify the plant (or mushroom) in the photo to species if possible, else genus.${hint}\nIf there is no plant, set is_plant=false and fill the other fields with short placeholders.`;
  return geminiCall(
    [
      { type: 'text', text: prompt },
      { type: 'image', data: b64, mime_type: 'image/jpeg' },
    ],
    ID_SCHEMA
  );
}

/** Kid content for a known species (used when the parent picks a different candidate). */
export async function geminiDescribe(scientific, ctx) {
  const prompt = `${STYLE}\n\n${contextLine(ctx)}\nThe plant is: ${scientific}. Write the content about this plant.`;
  return geminiCall([{ type: 'text', text: prompt }], DESCRIBE_SCHEMA);
}

// ---------- iNaturalist ----------
const INAT = 'https://api.inaturalist.org/v1';

export async function inatTaxon(scientific) {
  const j = await cachedJson(`${INAT}/taxa?q=${encodeURIComponent(scientific)}&per_page=5&locale=es`);
  const want = scientific.toLowerCase();
  const r = j.results?.find((x) => x.name?.toLowerCase() === want) || j.results?.find((x) => x.iconic_taxon_name === 'Plantae' || x.iconic_taxon_name === 'Fungi') || j.results?.[0];
  if (!r) return null;
  return {
    id: r.id,
    rank: r.rank,
    nameEs: r.preferred_common_name || '',
    photo: r.default_photo?.medium_url || '',
    wikipedia: r.wikipedia_url || '',
    count: r.observations_count,
  };
}

// iNaturalist annotation ids: term 12 = Plant Phenology (13 flowering, 14 fruiting, 15 flower budding);
// term 36 = Leaves (37 breaking leaf buds, 38 green leaves, 39 colored leaves, 40 no live leaves).
const PHENO = {
  flower: [12, 13],
  fruit: [12, 14],
  bud: [36, 37],
  green: [36, 38],
  color: [36, 39],
  bare: [36, 40],
};

function geoParams(ctx, radius) {
  return ctx?.lat != null ? `&lat=${ctx.lat.toFixed(2)}&lng=${ctx.lng.toFixed(2)}&radius=${radius}` : '';
}

async function histogram(taxonId, extra) {
  const j = await cachedJson(`${INAT}/observations/histogram?taxon_id=${taxonId}&interval=month_of_year&verifiable=true${extra}`, { maxAgeDays: 90 });
  const m = j.results?.month_of_year || {};
  return Array.from({ length: 12 }, (_, i) => m[i + 1] || 0);
}

/** Monthly phenology near the user: for each month, which states (flowers, fruit, leaves…) are common. */
export async function inatPhenology(taxonId, ctx) {
  // Pick a radius with enough data near the user, widening if needed.
  let geo = '';
  let total = null;
  for (const r of [250, 800]) {
    const g = geoParams(ctx, r);
    if (!g) break;
    const t = await histogram(taxonId, g);
    if (t.reduce((a, b) => a + b, 0) >= 40) {
      geo = g;
      total = t;
      break;
    }
  }
  if (!total) {
    geo = ctx?.lat != null ? (ctx.lat >= 0 ? '&swlat=0&swlng=-180&nelat=90&nelng=180' : '&swlat=-90&swlng=-180&nelat=0&nelng=180') : '';
    total = await histogram(taxonId, geo);
  }
  const states = {};
  for (const [k, [term, val]] of Object.entries(PHENO)) {
    states[k] = await histogram(taxonId, `${geo}&term_id=${term}&term_value_id=${val}`);
  }
  return { total, states };
}

/** One representative iNaturalist photo per season, near the user if possible. */
export async function inatSeasonPhotos(taxonId, ctx) {
  const south = ctx?.lat != null && ctx.lat < 0;
  const months = south ? { spring: 10, summer: 1, fall: 4, winter: 7 } : { spring: 4, summer: 7, fall: 10, winter: 1 };
  const out = {};
  for (const [season, month] of Object.entries(months)) {
    const base = `${INAT}/observations?taxon_id=${taxonId}&month=${month}&photos=true&quality_grade=research&per_page=5&order_by=votes`;
    let j = await cachedJson(base + geoParams(ctx, 800), { maxAgeDays: 90 }).catch(() => null);
    if (!j?.results?.length) j = await cachedJson(base, { maxAgeDays: 90 }).catch(() => null);
    const obs = j?.results?.find((o) => o.photos?.length);
    const p = obs?.photos?.[0];
    out[season] = p ? { url: p.url.replace('/square.', '/medium.'), by: obs.user?.login || '', license: p.license_code || '' } : null;
  }
  return out;
}

// ----------GBIF----------
export async function gbifKey(scientific) {
  const j = await cachedJson(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientific)}&kingdom=Plantae`);
  if (j.usageKey && j.matchType !== 'NONE') return j.usageKey;
  const f = await cachedJson(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientific)}`);
  return f.usageKey && f.matchType !== 'NONE' ? f.usageKey : null;
}

export async function gbifCountries(key) {
  const j = await cachedJson(`https://api.gbif.org/v1/occurrence/search?taxonKey=${key}&facet=country&facetLimit=15&limit=0`, { maxAgeDays: 120 });
  const counts = j.facets?.[0]?.counts || [];
  const total = counts.reduce((a, c) => a + c.count, 0) || 1;
  return counts
    .filter((c) => /^[A-Z]{2}$/.test(c.name) && !['ZZ', 'XK', 'XZ'].includes(c.name) && c.count / total > 0.002)
    .slice(0, 8)
    .map((c) => c.name);
}

export function gbifTileUrl(key) {
  return `https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?taxonKey=${key}&bin=hex&hexPerTile=40&style=orangeHeat.point`;
}

// ---------- Fallback (Wikipedia / basic template when Gemini key is absent) ----------
export async function fallbackPlantContent(scientific, commonEn = '', nameEs = '') {
  const enName = commonEn || scientific;
  const esName = nameEs || enName;
  let summaryEn = '';
  let summaryEs = '';
  try {
    const rEn = await cachedJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientific)}`);
    if (rEn?.extract) summaryEn = rEn.extract.split('. ').slice(0, 2).join('. ') + '.';
  } catch {}
  try {
    const rEs = await cachedJson(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientific)}`);
    if (rEs?.extract) summaryEs = rEs.extract.split('. ').slice(0, 2).join('. ') + '.';
  } catch {}

  return {
    is_plant: true,
    scientific_name: scientific,
    confidence: 'medium',
    common_name: { en: enName, es: esName },
    kind: 'flower',
    emoji: '🌿',
    colors: ['green'],
    greeting: {
      en: `Buzzz! Look! We found ${enName}!`,
      es: `¡Bzzzt! ¡Mira! ¡Encontramos ${esName}!`,
    },
    facts: [
      {
        en: summaryEn || `${enName} is a wonderful plant that grows outside in nature!`,
        es: summaryEs || `¡${esName} es una planta maravillosa que crece en la naturaleza!`,
      },
      {
        en: 'Plants drink water with their roots and love sunshine!',
        es: '¡Las plantas toman agua con sus raíces y aman el sol!',
      },
      {
        en: 'Bees, butterflies, and birds love visiting plants like this.',
        es: 'A las abejas, mariposas y pájaros les encanta visitar plantas así.',
      },
    ],
    senses: [
      { en: 'Look closely at its colors and shapes!', es: '¡Mira de cerca sus colores y formas!' },
      { en: 'Can you count how many leaves or petals you see?', es: '¿Puedes contar cuántas hojas o pétalos ves?' },
    ],
    seasons: {
      spring: { en: 'In spring, it wakes up and grows fresh new parts!', es: '¡En primavera, despierta y le crecen partes nuevas!' },
      summer: { en: 'In summer, it soaks up the warm sunshine.', es: 'En verano, disfruta del sol calientito.' },
      fall: { en: 'In fall, it gets ready for chilly weather.', es: 'En otoño, se prepara para el clima fresco.' },
      winter: { en: 'In winter, it rests and waits for spring.', es: 'En invierno, descansa y espera la primavera.' },
    },
    home: {
      en: 'It grows in nature and parks around the world!',
      es: '¡Crece en la naturaleza y en parques por el mundo!',
    },
    safety: {
      level: 'careful',
      note: {
        en: 'Look with your eyes and ask a grown-up before touching!',
        es: '¡Mira con los ojos y pregúntale a un adulto antes de tocar!',
      },
    },
    question: {
      en: 'What color do you see the most on this plant?',
      es: '¿Qué color ves más en esta planta?',
    },
  };
}

