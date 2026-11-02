// Main application controller for Bloom Buddy (bilingual EN/ES/Both nature explorer for 4-year-olds).
import {
  getLang,
  setLang,
  cycleLang,
  STR,
  tr,
  join,
  html,
  esc,
  monthBi,
  dateBi,
  seasonOf,
  SEASON_EMOJI,
  SEASON_TIPS,
  flag,
  countryBi,
} from './i18n.js';
import { say, stop, chime, buzz, listVoices } from './speech.js';
import { db, uid, blobUrl } from './db.js';
import {
  getKeys,
  setKeys,
  loadDevKeys,
  processImage,
  plantnetIdentify,
  geminiIdentify,
  geminiDescribe,
  inatTaxon,
  inatPhenology,
  inatSeasonPhotos,
  gbifKey,
  gbifCountries,
  fallbackPlantContent,
} from './api.js';
import { buddySvg, renderSeasonWheel } from './mascot.js';
import { createPlantWorldMap, createRideMap, distanceMeters, totalDistanceMeters, formatDistanceBi } from './map.js';

// ---------- State ----------
const state = {
  screen: 'home', // 'home' | 'identifying' | 'disambiguate' | 'card' | 'book' | 'ride' | 'ride-summary'
  selectedMonth: new Date().getMonth(),
  finds: [],
  rides: [],
  currentFind: null,
  currentPlant: null,
  bookFilter: 'all', // 'all' | 'spring' | 'summer' | 'fall' | 'winter' | 'rides'
  activeRide: null, // { id, startedAt, points:[], findIds:[], watchId }
  rideSummary: null,
  pendingCandidates: [],
  pendingPhoto: null,
  pendingThumb: null,
  pendingCoords: null,
};

let worldMapInstance = null;
let rideMapInstance = null;

// ---------- Geolocation helper ----------
function getCurrentCoords(timeout = 5000) {
  return new Promise((resolve) => {
    const cached = {
      lat: parseFloat(localStorage.getItem('bb.lastLat')),
      lng: parseFloat(localStorage.getItem('bb.lastLng')),
    };
    const fallback = Number.isFinite(cached.lat) && Number.isFinite(cached.lng) ? cached : { lat: null, lng: null };
    if (!navigator.geolocation) return resolve(fallback);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        localStorage.setItem('bb.lastLat', String(coords.lat));
        localStorage.setItem('bb.lastLng', String(coords.lng));
        resolve(coords);
      },
      () => resolve(fallback),
      { enableHighAccuracy: true, timeout, maximumAge: 60000 }
    );
  });
}

// ---------- Data loading ----------
async function refreshData() {
  const [finds, rides] = await Promise.all([db.all('finds'), db.all('rides')]);
  state.finds = finds.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  state.rides = rides.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
}

// ---------- Top bar & Language pill ----------
function langPillLabel() {
  const l = getLang();
  if (l === 'en') return '🇺🇸 EN';
  if (l === 'es') return '🇲🇽 ES';
  return '🇺🇸+🇲🇽';
}

function renderHeader() {
  const hdr = document.getElementById('app-header');
  if (!hdr) return;
  const showBack = state.screen !== 'home';
  hdr.innerHTML = `
    <div class="hdr-left">
      ${
        showBack
          ? `<button class="btn-icon btn-home" data-action="go-home" aria-label="Home">🏠</button>`
          : `<button class="btn-parent" id="parent-lock-btn" title="${esc(STR.parentHold.en)}" aria-label="Parent settings">🔒</button>`
      }
    </div>
    <div class="hdr-title" data-action="go-home">
      <span class="hdr-bee">🐝</span>
      <span class="hdr-name">Bloom Buddy</span>
    </div>
    <div class="hdr-right">
      <button class="btn-lang" data-action="cycle-lang" aria-label="Change language">${langPillLabel()}</button>
    </div>
  `;
  bindParentLongPress();
}

function bindParentLongPress() {
  const btn = document.getElementById('parent-lock-btn');
  if (!btn) return;
  let timer = null;
  const start = () => {
    btn.classList.add('holding');
    timer = setTimeout(() => {
      btn.classList.remove('holding');
      buzz(40);
      openParentDialog();
    }, 900);
  };
  const cancel = () => {
    btn.classList.remove('holding');
    if (timer) clearTimeout(timer);
    timer = null;
  };
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', cancel);
  btn.addEventListener('pointerleave', cancel);
  btn.addEventListener('pointercancel', cancel);
  // Also allow double-click on desktop for convenience
  btn.addEventListener('dblclick', openParentDialog);
}

// ---------- Screen Router ----------
function render() {
  renderHeader();
  const main = document.getElementById('app-main');
  if (!main) return;

  if (state.screen === 'home') renderHome(main);
  else if (state.screen === 'identifying') renderIdentifying(main);
  else if (state.screen === 'disambiguate') renderDisambiguate(main);
  else if (state.screen === 'card') renderPlantCard(main);
  else if (state.screen === 'book') renderBook(main);
  else if (state.screen === 'ride') renderRide(main);
  else if (state.screen === 'ride-summary') renderRideSummary(main);
}

// ---------- 1. HOME SCREEN (Season Wheel + Buddy Greeting + Big Actions) ----------
function buildHomeGreetingBi() {
  const now = new Date();
  const season = seasonOf(now.getMonth());
  const dBi = dateBi(now);
  const sBi = STR[season];
  return join([tr('todayIs', { date: dBi }), tr('itsSeason', { season: sBi })]);
}

function buildMonthSpeechBi(m) {
  const mBi = monthBi(m, 'long');
  const sId = seasonOf(m);
  const sBi = STR[sId];
  const monthFinds = state.finds.filter((f) => f.month === m);
  const count = monthFinds.length;
  const baseKey = count === 0 ? 'monthInfo0' : count === 1 ? 'monthInfo1' : 'monthInfoN';
  const base = tr(baseKey, { month: mBi, season: sBi, n: count });
  const tips = SEASON_TIPS[sId] || [];
  const tip = tips[m % tips.length];
  return tip ? join([base, tip]) : base;
}

function renderHome(main) {
  const m = state.selectedMonth;
  const sId = seasonOf(m);
  const mBi = monthBi(m, 'long');
  const sBi = STR[sId];
  const sEmoji = SEASON_EMOJI[sId];
  const monthFinds = state.finds.filter((f) => f.month === m);

  const greetingBi = m === new Date().getMonth() ? buildHomeGreetingBi() : buildMonthSpeechBi(m);

  main.innerHTML = `
    <section class="home-screen">
      <!-- Buddy speech card -->
      <div class="buddy-banner" data-action="speak-greeting" role="button" tabindex="0">
        <div class="buddy-avatar">${buddySvg('happy', 78)}</div>
        <div class="buddy-speech">
          <div class="speech-season-chip season-chip-${sId}">
            <span>${sEmoji}</span> ${html(mBi)} · ${html(sBi)}
          </div>
          <div class="speech-text">${html(greetingBi)}</div>
        </div>
        <div class="speech-speaker" aria-hidden="true">🔊</div>
      </div>

      <!-- Interactive 12-Month Season Wheel -->
      <div class="wheel-card">
        <div class="wheel-wrap" id="wheel-container">
          ${renderSeasonWheel(state.finds, m)}
        </div>
        ${
          monthFinds.length > 0
            ? `<div class="wheel-month-strip">
                ${monthFinds
                  .slice(0, 6)
                  .map((f) => {
                    const u = blobUrl(`thumb-${f.id}`, f.thumb || f.photo);
                    return `<button class="mini-sticker" data-action="open-find" data-find="${esc(f.id)}" title="${esc(f.commonName?.en || '')}">
                      ${u ? `<img src="${u}" alt=""/>` : `<span>${esc(f.emoji || '🌸')}</span>`}
                    </button>`;
                  })
                  .join('')}
              </div>`
            : ''
        }
      </div>

      <!-- 3 Giant Kid Action Buttons -->
      <div class="home-actions">
        <button class="big-btn big-btn-ride" data-action="start-ride">
          <span class="big-btn-emoji">🚲</span>
          <span class="big-btn-label">${html('ride')}</span>
        </button>
        <button class="big-btn big-btn-snap" data-action="snap-photo">
          <span class="big-btn-emoji">📸</span>
          <span class="big-btn-label">${html('snap')}</span>
        </button>
        <button class="big-btn big-btn-book" data-action="open-book">
          <span class="big-btn-emoji">📒</span>
          <span class="big-btn-label">${html('book')}</span>
          ${state.finds.length ? `<span class="big-btn-badge">${state.finds.length}</span>` : ''}
        </button>
      </div>
    </section>
  `;
}

// ---------- 2. SNAP & IDENTIFY FLOW ----------
function triggerCamera() {
  const input = document.getElementById('camera-input');
  if (!input) return;
  input.value = '';
  input.click();
}

async function handlePhotoSelected(file) {
  if (!file) return;
  chime('tap');
  buzz(25);

  const keys = getKeys();
  if (!keys.gemini && !keys.plantnet) {
    say(STR.needKeys);
    openParentDialog();
    return;
  }

  state.screen = 'identifying';
  const { photo, thumb } = await processImage(file);
  state.pendingPhoto = photo;
  state.pendingThumb = thumb;
  render();
  say(STR.looking);

  const coords = await getCurrentCoords(4500);
  state.pendingCoords = coords;

  try {
    // 1. Run Pl@ntNet (if key exists and CORS allowed) in parallel with a short timer
    let candidates = [];
    try {
      const pn = await plantnetIdentify(photo);
      if (Array.isArray(pn)) candidates = pn;
    } catch (e) {
      console.warn('Pl@ntNet skipped/fallback to Gemini vision:', e.message);
    }

    // 2. Ask Gemini (with image + Pl@ntNet candidates if any)
    let gem = null;
    if (keys.gemini) {
      gem = await geminiIdentify(photo, candidates, coords);
    } else if (candidates.length > 0) {
      // Pl@ntNet only fallback
      const top = candidates[0];
      const tax = await inatTaxon(top.scientific).catch(() => null);
      gem = await fallbackPlantContent(top.scientific, top.common, tax?.nameEs || '');
      gem.confidence = top.score > 0.45 ? 'high' : top.score > 0.2 ? 'medium' : 'low';
    }

    if (!gem || gem.is_plant === false) {
      chime('oops');
      say(STR.notPlant);
      state.screen = state.activeRide ? 'ride' : 'home';
      render();
      return;
    }

    // Check if low confidence and multiple candidates exist -> show "Which one looks like yours?"
    const topScore = candidates[0]?.score ?? (gem.confidence === 'high' ? 0.85 : gem.confidence === 'medium' ? 0.55 : 0.25);
    if (topScore < 0.35 && (candidates.length >= 2 || gem.alternatives?.length)) {
      const optionNames = candidates.length >= 2
        ? candidates.slice(0, 3).map((c) => ({ scientific: c.scientific, common: c.common, image: c.image }))
        : [gem.scientific_name, ...(gem.alternatives || []).slice(0, 2)].map((s) => ({ scientific: s, common: '', image: '' }));

      // Fetch photos/names from iNaturalist for any missing preview image
      await Promise.all(
        optionNames.map(async (opt) => {
          const t = await inatTaxon(opt.scientific).catch(() => null);
          if (t) {
            if (!opt.image) opt.image = t.photo;
            opt.nameEs = t.nameEs;
          }
        })
      );
      state.pendingCandidates = optionNames;
      state.pendingGeminiInitial = gem;
      state.screen = 'disambiguate';
      render();
      say(STR.whichOne);
      return;
    }

    await finalizeIdentifiedPlant(gem, candidates[0]?.gbif || null);
  } catch (err) {
    console.error('Identification error:', err);
    chime('oops');
    say(STR.errorGeneric);
    state.screen = state.activeRide ? 'ride' : 'home';
    render();
  }
}

async function finalizeIdentifiedPlant(gem, knownGbif = null) {
  const scientific = (gem.scientific_name || 'Plantae').trim();
  const plantKey = scientific.toLowerCase();
  const coords = state.pendingCoords || { lat: null, lng: null };

  // Enrich with iNaturalist + GBIF in parallel (non-blocking if offline/slow)
  let plantRecord = await db.get('plants', plantKey).catch(() => null);
  if (!plantRecord) {
    const [taxon, gKey] = await Promise.all([
      inatTaxon(scientific).catch(() => null),
      knownGbif ? Promise.resolve(knownGbif) : gbifKey(scientific).catch(() => null),
    ]);

    const [pheno, seasonPhotos, countries] = await Promise.all([
      taxon?.id ? inatPhenology(taxon.id, coords).catch(() => null) : Promise.resolve(null),
      taxon?.id ? inatSeasonPhotos(taxon.id, coords).catch(() => null) : Promise.resolve(null),
      gKey ? gbifCountries(gKey).catch(() => []) : Promise.resolve([]),
    ]);

    // Prefer iNaturalist Spanish common name if Gemini left it identical to scientific
    if (taxon?.nameEs && (!gem.common_name?.es || gem.common_name.es.toLowerCase() === scientific.toLowerCase())) {
      gem.common_name.es = taxon.nameEs.charAt(0).toUpperCase() + taxon.nameEs.slice(1);
    }

    plantRecord = {
      key: plantKey,
      scientific,
      commonName: gem.common_name,
      kind: gem.kind || 'flower',
      emoji: gem.emoji || '🌸',
      colors: gem.colors || [],
      greeting: gem.greeting,
      facts: gem.facts || [],
      senses: gem.senses || [],
      seasons: gem.seasons,
      home: gem.home,
      safety: gem.safety,
      question: gem.question,
      taxonId: taxon?.id || null,
      gbifKey: gKey || null,
      phenology: pheno,
      seasonPhotos: seasonPhotos || {},
      countries: countries || [],
      updatedAt: Date.now(),
    };
    await db.put('plants', plantRecord);
  }

  const now = new Date();
  const prevSameSpecies = state.finds.filter((f) => f.plantKey === plantKey).length;
  const findRecord = {
    id: uid(),
    plantKey,
    scientific,
    commonName: plantRecord.commonName,
    emoji: plantRecord.emoji,
    season: seasonOf(now.getMonth()),
    month: now.getMonth(),
    createdAt: Date.now(),
    lat: coords.lat,
    lng: coords.lng,
    photo: state.pendingPhoto,
    thumb: state.pendingThumb,
    rideId: state.activeRide?.id || null,
  };

  await db.put('finds', findRecord);
  if (state.activeRide) {
    state.activeRide.findIds.push(findRecord.id);
    await db.put('rides', {
      id: state.activeRide.id,
      startedAt: state.activeRide.startedAt,
      points: state.activeRide.points,
      findIds: state.activeRide.findIds,
    });
  }

  await refreshData();
  state.currentFind = findRecord;
  state.currentPlant = plantRecord;
  state.selectedMonth = findRecord.month;
  state.screen = 'card';
  chime('happy');
  buzz([40, 60, 80]);
  render();

  const stickerLine = prevSameSpecies > 0 ? tr('seenBefore', { n: prevSameSpecies + 1 }) : STR.newSticker;
  say([stickerLine, plantRecord.greeting, plantRecord.facts?.[0], plantRecord.question].filter(Boolean));
}

function renderIdentifying(main) {
  const previewUrl = blobUrl('pending-preview', state.pendingThumb || state.pendingPhoto);
  main.innerHTML = `
    <section class="identifying-screen">
      <div class="id-photo-ring">
        ${previewUrl ? `<img src="${previewUrl}" alt="Your plant photo"/>` : ''}
        <div class="id-scanner"></div>
      </div>
      <div class="id-mascot">${buddySvg('thinking', 110)}</div>
      <div class="id-bubble">${html('looking')}</div>
    </section>
  `;
}

function renderDisambiguate(main) {
  const previewUrl = blobUrl('pending-preview', state.pendingThumb || state.pendingPhoto);
  main.innerHTML = `
    <section class="disambiguate-screen">
      <div class="buddy-banner" data-action="speak-text" data-say-en="${esc(STR.whichOne.en)}" data-say-es="${esc(STR.whichOne.es)}">
        <div class="buddy-avatar">${buddySvg('thinking', 70)}</div>
        <div class="buddy-speech"><div class="speech-text">${html('whichOne')}</div></div>
        <div class="speech-speaker">🔊</div>
      </div>

      <div class="disambig-yours">
        <img src="${previewUrl}" alt="Your photo"/>
      </div>

      <div class="disambig-grid">
        ${state.pendingCandidates
          .map(
            (c, i) => `
          <button class="disambig-choice" data-action="pick-candidate" data-index="${i}">
            ${c.image ? `<img src="${esc(c.image)}" alt="${esc(c.scientific)}"/>` : `<div class="disambig-placeholder">🌿</div>`}
            <div class="disambig-name">${esc(c.common || c.scientific)}</div>
            ${c.nameEs ? `<div class="disambig-es">${esc(c.nameEs)}</div>` : ''}
          </button>`
          )
          .join('')}
      </div>

      <button class="big-btn big-btn-snap" data-action="snap-photo">
        <span class="big-btn-emoji">📸</span>
        <span class="big-btn-label">${html('tryAgain')}</span>
      </button>
    </section>
  `;
}

// ---------- 3. PLANT CARD SCREEN ----------
function monthStateIcons(pheno, m) {
  if (!pheno || !pheno.states) return [];
  const total = Math.max(1, pheno.total?.[m] || 1);
  const s = pheno.states;
  const icons = [];
  if ((s.flower?.[m] || 0) >= 3 && (s.flower[m] / total > 0.08 || s.flower[m] >= 15)) icons.push({ id: 'flower', icon: '🌸' });
  if ((s.fruit?.[m] || 0) >= 3 && (s.fruit[m] / total > 0.06 || s.fruit[m] >= 12)) icons.push({ id: 'fruit', icon: '🍒' });
  if ((s.bud?.[m] || 0) >= 2 && (s.bud[m] / total > 0.06 || s.bud[m] >= 8)) icons.push({ id: 'bud', icon: '🌱' });
  if ((s.color?.[m] || 0) >= 3 && (s.color[m] / total > 0.08 || s.color[m] >= 10)) icons.push({ id: 'color', icon: '🍂' });
  if ((s.bare?.[m] || 0) >= 3 && (s.bare[m] / total > 0.12 || s.bare[m] >= 10)) icons.push({ id: 'bare', icon: '🪵' });
  if (!icons.length && ((s.green?.[m] || 0) >= 3 || (pheno.total?.[m] || 0) >= 10)) icons.push({ id: 'green', icon: '🌿' });
  if (!icons.length) icons.push({ id: 'sleep', icon: '💤' });
  return icons.slice(0, 2);
}

function buildPhenologyMonthSpeech(plant, m, icons) {
  const mBi = monthBi(m, 'long');
  const pName = plant.commonName || { en: plant.scientific, es: plant.scientific };
  const activeIds = icons.map((x) => x.id).filter((id) => id !== 'sleep');
  if (!activeIds.length) return tr('phMonthSleep', { month: mBi, plant: pName });
  const labels = activeIds.map((id) => STR[`ph_${id}`]).filter(Boolean);
  const joined =
    labels.length === 1
      ? labels[0]
      : {
          en: `${labels[0].en} ${STR.and.en} ${labels[1].en}`,
          es: `${labels[0].es} ${STR.and.es} ${labels[1].es}`,
        };
  return tr('phMonth', { month: mBi, plant: pName, things: joined });
}

function renderPlantCard(main) {
  const find = state.currentFind;
  const plant = state.currentPlant;
  if (!find || !plant) {
    state.screen = 'home';
    return renderHome(main);
  }

  const photoUrl = blobUrl(`photo-${find.id}`, find.photo || find.thumb);
  const foundDate = dateBi(new Date(find.createdAt));
  const safetyLevel = plant.safety?.level || 'safe';
  const safetyEmoji = safetyLevel === 'danger' ? '⚠️' : safetyLevel === 'careful' ? '👀' : '✅';
  const nowMonth = new Date().getMonth();

  const seasonsOrder = ['spring', 'summer', 'fall', 'winter'];

  main.innerHTML = `
    <article class="plant-card-screen">
      ${
        state.activeRide
          ? `<button class="ride-return-pill" data-action="return-to-ride">🚲 ← ${html('ride')}</button>`
          : ''
      }

      <!-- Hero Photo + Name + Big Speaker -->
      <div class="card-hero">
        <div class="card-hero-photo">
          <img src="${photoUrl}" alt="${esc(plant.commonName?.en || plant.scientific)}"/>
          <span class="card-season-tag season-chip-${find.season}">${SEASON_EMOJI[find.season]} ${html(monthBi(find.month, 'short'))}</span>
        </div>
        <div class="card-title-row" data-action="speak-card-intro" role="button" tabindex="0">
          <div class="card-emoji">${esc(plant.emoji || '🌸')}</div>
          <div class="card-names">
            <h1 class="card-common">${html(plant.commonName)}</h1>
            <div class="card-sci">${esc(plant.scientific)}</div>
          </div>
          <button class="btn-speak-big" aria-label="Read aloud">🔊</button>
        </div>
        <div class="card-found-meta">${html(tr('foundOn', { date: foundDate }))}</div>
      </div>

      <!-- Safety Banner -->
      <div class="safety-banner safety-${safetyLevel}" data-action="speak-pair" data-en="${esc(plant.safety?.note?.en || '')}" data-es="${esc(plant.safety?.note?.es || '')}" role="button" tabindex="0">
        <span class="safety-icon">${safetyEmoji}</span>
        <div class="safety-text">
          <strong>${html(safetyLevel)}</strong>
          <div>${html(plant.safety?.note || STR[safetyLevel])}</div>
        </div>
        <span class="safety-audio">🔊</span>
      </div>

      <!-- Four Seasons Strip (real photos from iNaturalist + what it does in each season) -->
      <section class="card-section">
        <h2 class="section-heading">🌦️ ${html('fourSeasons')}</h2>
        <div class="seasons-grid">
          ${seasonsOrder
            .map((s) => {
              const sp = plant.seasonPhotos?.[s];
              const textBi = plant.seasons?.[s] || { en: '', es: '' };
              const isFoundSeason = find.season === s;
              const imgSrc = sp?.url || (isFoundSeason ? photoUrl : '');
              return `
                <button class="season-panel season-panel-${s} ${isFoundSeason ? 'is-found-season' : ''}"
                        data-action="speak-pair"
                        data-en="${esc(`${STR[s].en}: ${textBi.en}`)}"
                        data-es="${esc(`${STR[s].es}: ${textBi.es}`)}">
                  <div class="season-panel-hdr">
                    <span>${SEASON_EMOJI[s]}</span>
                    <span>${html(s)}</span>
                    <span class="mini-speaker">🔊</span>
                  </div>
                  <div class="season-panel-img">
                    ${
                      imgSrc
                        ? `<img src="${esc(imgSrc)}" alt="${esc(STR[s].en)}" loading="lazy"/>`
                        : `<div class="season-panel-fallback">${SEASON_EMOJI[s]}</div>`
                    }
                  </div>
                  <p class="season-panel-desc">${html(textBi)}</p>
                </button>
              `;
            })
            .join('')}
        </div>
      </section>

      <!-- 12-Month Bloom & Leaf Calendar -->
      <section class="card-section">
        <h2 class="section-heading">📅 ${html('plantYear')}</h2>
        <div class="pheno-strip">
          ${Array.from({ length: 12 }, (_, m) => {
            const icons = monthStateIcons(plant.phenology, m);
            const speechBi = buildPhenologyMonthSpeech(plant, m, icons);
            const s = seasonOf(m);
            const mShort = monthBi(m, 'narrow');
            return `
              <button class="pheno-cell pheno-season-${s} ${m === nowMonth ? 'is-now-month' : ''}"
                      data-action="speak-pair"
                      data-en="${esc(speechBi.en)}"
                      data-es="${esc(speechBi.es)}">
                <span class="pheno-m">${esc(mShort.en)}</span>
                <span class="pheno-icons">${icons.map((x) => x.icon).join('')}</span>
                ${m === nowMonth ? `<span class="pheno-now-dot"></span>` : ''}
              </button>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Fun Facts + Senses Prompts -->
      <section class="card-section">
        <h2 class="section-heading">✨ ${html('funFacts')}</h2>
        <div class="facts-list">
          ${(plant.facts || [])
            .map(
              (f, idx) => `
            <button class="fact-item" data-action="speak-pair" data-en="${esc(f.en)}" data-es="${esc(f.es)}">
              <span class="fact-num">${['1️⃣', '2️⃣', '3️⃣'][idx] || '⭐'}</span>
              <span class="fact-body">${html(f)}</span>
              <span class="mini-speaker">🔊</span>
            </button>`
            )
            .join('')}
        </div>

        <h3 class="section-subheading">🔍 ${html('explore')}</h3>
        <div class="facts-list">
          ${(plant.senses || [])
            .map(
              (s, idx) => `
            <button class="fact-item sense-item" data-action="speak-pair" data-en="${esc(s.en)}" data-es="${esc(s.es)}">
              <span class="fact-num">${idx === 0 ? '👀' : '🖐️'}</span>
              <span class="fact-body">${html(s)}</span>
              <span class="mini-speaker">🔊</span>
            </button>`
            )
            .join('')}
          ${
            plant.question
              ? `<button class="fact-item question-item" data-action="speak-pair" data-en="${esc(plant.question.en)}" data-es="${esc(plant.question.es)}">
                  <span class="fact-num">🐝</span>
                  <span class="fact-body">${html(plant.question)}</span>
                  <span class="mini-speaker">🔊</span>
                </button>`
              : ''
          }
        </div>
      </section>

      <!-- Where It Lives (World Map + GBIF Heatmap + Country Flags) -->
      <section class="card-section">
        <h2 class="section-heading">🌎 ${html('whereLives')}</h2>
        <button class="fact-item home-desc-btn" data-action="speak-pair" data-en="${esc(plant.home?.en || '')}" data-es="${esc(plant.home?.es || '')}">
          <span class="fact-num">🗺️</span>
          <span class="fact-body">${html(plant.home || STR.foundHere)}</span>
          <span class="mini-speaker">🔊</span>
        </button>
        <div class="world-map-box" id="plant-world-map"></div>
        ${
          plant.countries?.length
            ? `<div class="country-flags">
                ${plant.countries
                  .map((cc) => {
                    const cBi = countryBi(cc);
                    return `<button class="flag-chip" data-action="speak-pair" data-en="${esc(cBi.en)}" data-es="${esc(cBi.es)}">
                      <span class="flag-emoji">${flag(cc)}</span>
                      <span>${html(cBi)}</span>
                    </button>`;
                  })
                  .join('')}
              </div>`
            : ''
        }
      </section>
    </article>
  `;

  worldMapInstance = createPlantWorldMap(document.getElementById('plant-world-map'), {
    gbifKey: plant.gbifKey,
    lat: find.lat,
    lng: find.lng,
    emoji: plant.emoji || '🌸',
    label: plant.commonName?.en || plant.scientific,
  });
}

// ---------- 4. STICKER BOOK SCREEN ----------
function renderBook(main) {
  const filter = state.bookFilter;
  const filteredFinds =
    filter === 'all' ? state.finds : state.finds.filter((f) => f.season === filter);

  const countBi =
    state.finds.length === 0
      ? STR.bookEmpty
      : state.finds.length === 1
      ? STR.bookCount1
      : tr('bookCountN', { n: state.finds.length });

  main.innerHTML = `
    <section class="book-screen">
      <div class="buddy-banner" data-action="speak-pair" data-en="${esc(countBi.en)}" data-es="${esc(countBi.es)}">
        <div class="buddy-avatar">${buddySvg('happy', 68)}</div>
        <div class="buddy-speech"><div class="speech-text">${html(countBi)}</div></div>
        <div class="speech-speaker">🔊</div>
      </div>

      <!-- Filter Tabs -->
      <div class="book-tabs">
        <button class="book-tab ${filter === 'all' ? 'active' : ''}" data-action="book-filter" data-filter="all">⭐ ${html('all')}</button>
        <button class="book-tab ${filter === 'spring' ? 'active' : ''}" data-action="book-filter" data-filter="spring">🌱</button>
        <button class="book-tab ${filter === 'summer' ? 'active' : ''}" data-action="book-filter" data-filter="summer">☀️</button>
        <button class="book-tab ${filter === 'fall' ? 'active' : ''}" data-action="book-filter" data-filter="fall">🍂</button>
        <button class="book-tab ${filter === 'winter' ? 'active' : ''}" data-action="book-filter" data-filter="winter">❄️</button>
        <button class="book-tab ${filter === 'rides' ? 'active' : ''}" data-action="book-filter" data-filter="rides">🚲 ${state.rides.length || ''}</button>
      </div>

      ${
        filter === 'rides'
          ? renderPastRidesList()
          : filteredFinds.length === 0
          ? `<div class="book-empty">
              <div class="book-empty-icon">🌼</div>
              <p>${html('bookEmpty')}</p>
              <button class="big-btn big-btn-snap" data-action="snap-photo">
                <span class="big-btn-emoji">📸</span>
                <span class="big-btn-label">${html('snap')}</span>
              </button>
            </div>`
          : `<div class="sticker-grid">
              ${filteredFinds
                .map((f) => {
                  const u = blobUrl(`thumb-${f.id}`, f.thumb || f.photo);
                  return `
                    <button class="sticker-card season-border-${f.season}" data-action="open-find" data-find="${esc(f.id)}">
                      <div class="sticker-circle">
                        ${u ? `<img src="${u}" alt="${esc(f.commonName?.en || '')}"/>` : `<span>${esc(f.emoji || '🌸')}</span>`}
                        <span class="sticker-season-badge">${SEASON_EMOJI[f.season] || '🌸'}</span>
                      </div>
                      <div class="sticker-title">${html(f.commonName || { en: f.scientific, es: f.scientific })}</div>
                      <div class="sticker-month">${html(monthBi(f.month, 'short'))}</div>
                    </button>
                  `;
                })
                .join('')}
            </div>`
      }
    </section>
  `;
}

function renderPastRidesList() {
  if (!state.rides.length) {
    return `<div class="book-empty">
      <div class="book-empty-icon">🚲</div>
      <button class="big-btn big-btn-ride" data-action="start-ride">
        <span class="big-btn-emoji">🚲</span>
        <span class="big-btn-label">${html('ride')}</span>
      </button>
    </div>`;
  }
  return `<div class="rides-list">
    ${state.rides
      .map((r) => {
        const dBi = dateBi(new Date(r.startedAt), { month: 'short', day: 'numeric' });
        const distBi = formatDistanceBi(totalDistanceMeters(r.points || []));
        const count = r.findIds?.length || 0;
        return `<button class="ride-history-item" data-action="open-ride" data-ride="${esc(r.id)}">
          <span class="ride-item-icon">🚲</span>
          <div class="ride-item-info">
            <strong>${html(dBi)}</strong>
            <div>${html(distBi)} · 🌸 ${count}</div>
          </div>
          <span>➡️</span>
        </button>`;
      })
      .join('')}
  </div>`;
}

// ---------- 5. RIDE MODE (Live GPS Route + Big Snap Button + Summary) ----------
async function startRideMode() {
  if (!state.activeRide) {
    const ride = {
      id: uid(),
      startedAt: Date.now(),
      points: [],
      findIds: [],
      watchId: null,
    };
    state.activeRide = ride;
    await db.put('rides', { id: ride.id, startedAt: ride.startedAt, points: [], findIds: [] });

    if (navigator.geolocation) {
      ride.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude, at: Date.now() };
          localStorage.setItem('bb.lastLat', String(pt.lat));
          localStorage.setItem('bb.lastLng', String(pt.lng));
          const pts = ride.points;
          if (!pts.length || distanceMeters(pts[pts.length - 1], pt) >= 6) {
            pts.push(pt);
            db.put('rides', { id: ride.id, startedAt: ride.startedAt, points: pts, findIds: ride.findIds }).catch(() => {});
            updateRideOverlay();
          }
        },
        (err) => console.warn('GPS watch error:', err.message),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    }
    say(STR.startRide);
  }
  state.screen = 'ride';
  render();
}

function updateRideOverlay() {
  if (state.screen !== 'ride' || !state.activeRide) return;
  const r = state.activeRide;
  const rideFinds = state.finds.filter((f) => r.findIds.includes(f.id));
  rideMapInstance?.setPoints(r.points, true);
  rideMapInstance?.setFinds(rideFinds);
  const distEl = document.getElementById('ride-live-dist');
  if (distEl) distEl.innerHTML = html(formatDistanceBi(totalDistanceMeters(r.points)));
  const countEl = document.getElementById('ride-live-count');
  if (countEl) countEl.textContent = String(rideFinds.length);
}

async function finishRideMode() {
  const r = state.activeRide;
  if (!r) return;
  if (r.watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(r.watchId);
  const saved = {
    id: r.id,
    startedAt: r.startedAt,
    endedAt: Date.now(),
    points: r.points,
    findIds: r.findIds,
  };
  await db.put('rides', saved);
  state.activeRide = null;
  await refreshData();
  state.rideSummary = saved;
  state.screen = 'ride-summary';
  chime('happy');
  render();

  const n = saved.findIds.length;
  const msg = n === 0 ? STR.rideDone0 : n === 1 ? STR.rideDone1 : tr('rideDoneN', { n });
  const dist = tr('rideDistance', { d: formatDistanceBi(totalDistanceMeters(saved.points)) });
  say([msg, dist]);
}

function renderRide(main) {
  const r = state.activeRide;
  const rideFinds = r ? state.finds.filter((f) => r.findIds.includes(f.id)) : [];
  const distBi = formatDistanceBi(totalDistanceMeters(r?.points || []));

  main.innerHTML = `
    <section class="ride-screen">
      <div class="ride-top-hud">
        <div class="ride-stat">
          <span>🚲</span>
          <strong id="ride-live-dist">${html(distBi)}</strong>
        </div>
        <div class="ride-stat">
          <span>🌸</span>
          <strong id="ride-live-count">${rideFinds.length}</strong>
        </div>
        <button class="btn-stop-ride" data-action="finish-ride">🏁 ${html('finish')}</button>
      </div>

      <div class="ride-map-box" id="ride-live-map"></div>

      <div class="ride-bottom-bar">
        <button class="big-btn big-btn-snap ride-snap-btn" data-action="snap-photo">
          <span class="big-btn-emoji">📸</span>
          <span class="big-btn-label">${html('snap')}</span>
        </button>
      </div>
    </section>
  `;

  rideMapInstance = createRideMap(document.getElementById('ride-live-map'), {
    onPinTap: (find) => openFindCard(find.id),
  });
  rideMapInstance?.setPoints(r?.points || [], true);
  rideMapInstance?.setFinds(rideFinds);
}

function renderRideSummary(main) {
  const r = state.rideSummary;
  if (!r) {
    state.screen = 'home';
    return renderHome(main);
  }
  const rideFinds = state.finds.filter((f) => (r.findIds || []).includes(f.id));
  const n = rideFinds.length;
  const msgBi = n === 0 ? STR.rideDone0 : n === 1 ? STR.rideDone1 : tr('rideDoneN', { n });
  const distBi = formatDistanceBi(totalDistanceMeters(r.points || []));

  main.innerHTML = `
    <section class="ride-summary-screen">
      <div class="buddy-banner" data-action="speak-pair" data-en="${esc(msgBi.en)}" data-es="${esc(msgBi.es)}">
        <div class="buddy-avatar">${buddySvg('celebrate', 82)}</div>
        <div class="buddy-speech">
          <div class="speech-text">${html(msgBi)}</div>
          <div class="speech-sub">🚲 ${html(distBi)}</div>
        </div>
        <div class="speech-speaker">🔊</div>
      </div>

      <div class="ride-summary-map" id="ride-summary-map"></div>

      ${
        rideFinds.length
          ? `<div class="sticker-grid">
              ${rideFinds
                .map((f) => {
                  const u = blobUrl(`thumb-${f.id}`, f.thumb || f.photo);
                  return `<button class="sticker-card season-border-${f.season}" data-action="open-find" data-find="${esc(f.id)}">
                    <div class="sticker-circle">
                      ${u ? `<img src="${u}" alt=""/>` : `<span>${esc(f.emoji || '🌸')}</span>`}
                    </div>
                    <div class="sticker-title">${html(f.commonName || { en: f.scientific, es: f.scientific })}</div>
                  </button>`;
                })
                .join('')}
            </div>`
          : ''
      }

      <button class="big-btn big-btn-ride" data-action="go-home">
        <span class="big-btn-emoji">🏠</span>
        <span class="big-btn-label">${html('home')}</span>
      </button>
    </section>
  `;

  const sumMap = createRideMap(document.getElementById('ride-summary-map'), {
    onPinTap: (find) => openFindCard(find.id),
  });
  sumMap?.setPoints(r.points || [], false);
  sumMap?.setFinds(rideFinds);
  sumMap?.fitAll(r.points || [], rideFinds);
}

// ---------- Open a saved Find ----------
async function openFindCard(findId) {
  const find = state.finds.find((f) => f.id === findId);
  if (!find) return;
  let plant = await db.get('plants', find.plantKey).catch(() => null);
  if (!plant) {
    plant = await fallbackPlantContent(find.scientific, find.commonName?.en, find.commonName?.es);
    plant.commonName = find.commonName || plant.common_name;
  }
  state.currentFind = find;
  state.currentPlant = plant;
  state.screen = 'card';
  chime('tap');
  render();
  say([plant.commonName, plant.greeting]);
}

// ---------- 6. PARENT SETTINGS DIALOG ----------
function openParentDialog() {
  const dlg = document.getElementById('parent-dialog');
  if (!dlg) return;
  const keys = getKeys();
  const rate = localStorage.getItem('bb.rate') || '0.9';
  const enVoices = listVoices('en');
  const esVoices = listVoices('es');
  const savedEn = localStorage.getItem('bb.voice.en') || '';
  const savedEs = localStorage.getItem('bb.voice.es') || '';

  dlg.innerHTML = `
    <div class="parent-modal">
      <div class="parent-hdr">
        <h2>🔒 Parent Settings</h2>
        <button class="btn-icon" data-action="close-parent" aria-label="Close">✖️</button>
      </div>
      <div class="parent-body">
        <label class="parent-field">
          <span>Gemini API Key (AI Studio)</span>
          <input type="password" id="inp-gemini-key" value="${esc(keys.gemini)}" placeholder="AIza... or AQ..." autocomplete="off"/>
        </label>
        <label class="parent-field">
          <span>Pl@ntNet API Key (my.plantnet.org)</span>
          <input type="password" id="inp-plantnet-key" value="${esc(keys.plantnet)}" placeholder="2b10..." autocomplete="off"/>
          <small>Remember to add your domain / <code>localhost</code> under Pl@ntNet allowed domains (CORS).</small>
        </label>
        <label class="parent-field">
          <span>Speech Speed (${rate}x)</span>
          <input type="range" id="inp-speech-rate" min="0.7" max="1.15" step="0.05" value="${esc(rate)}"/>
        </label>
        ${
          enVoices.length
            ? `<label class="parent-field">
                <span>English Voice</span>
                <select id="inp-voice-en">
                  <option value="">Auto</option>
                  ${enVoices.map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === savedEn ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}
                </select>
              </label>`
            : ''
        }
        ${
          esVoices.length
            ? `<label class="parent-field">
                <span>Spanish Voice (Voz en Español)</span>
                <select id="inp-voice-es">
                  <option value="">Auto</option>
                  ${esVoices.map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === savedEs ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}
                </select>
              </label>`
            : ''
        }
        <div class="parent-actions">
          <button class="parent-btn primary" data-action="save-parent">💾 Save Settings</button>
          <button class="parent-btn" data-action="export-backup">📦 Export Backup (JSON)</button>
          <button class="parent-btn danger" data-action="clear-all-data">🗑️ Clear All Finds</button>
        </div>
      </div>
    </div>
  `;
  dlg.showModal();
}

async function exportBackupJson() {
  const [finds, plants, rides] = await Promise.all([db.all('finds'), db.all('plants'), db.all('rides')]);
  // Strip binary Blobs for lightweight JSON metadata export
  const cleanFinds = finds.map(({ photo, thumb, ...rest }) => rest);
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), finds: cleanFinds, plants, rides }, null, 2)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bloom-buddy-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

// ---------- Global Event Delegation ----------
function bindEvents() {
  document.addEventListener('click', async (e) => {
    // Season wheel slice tap
    const slice = e.target.closest('.wheel-slice');
    if (slice) {
      const m = Number(slice.dataset.month);
      state.selectedMonth = m;
      chime('tap');
      buzz(15);
      render();
      say(buildMonthSpeechBi(m));
      return;
    }

    // Season wheel sticker tap
    const wSticker = e.target.closest('.wheel-sticker');
    if (wSticker && wSticker.dataset.find) {
      openFindCard(wSticker.dataset.find);
      return;
    }

    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    if (action === 'cycle-lang') {
      const next = cycleLang();
      chime('tap');
      render();
      const greet =
        next === 'en'
          ? { en: 'English!', es: 'English!' }
          : next === 'es'
          ? { en: '¡Español!', es: '¡Español!' }
          : { en: 'English and Español!', es: '¡Inglés y Español!' };
      say(greet, { mode: next === 'both' ? 'both' : next });
    } else if (action === 'go-home') {
      stop();
      state.screen = state.activeRide ? 'ride' : 'home';
      render();
    } else if (action === 'center-tap' || action === 'speak-greeting') {
      chime('tap');
      const m = state.selectedMonth;
      say(m === new Date().getMonth() ? buildHomeGreetingBi() : buildMonthSpeechBi(m));
    } else if (action === 'snap-photo') {
      triggerCamera();
    } else if (action === 'open-book') {
      state.screen = 'book';
      render();
      const countBi =
        state.finds.length === 0
          ? STR.bookEmpty
          : state.finds.length === 1
          ? STR.bookCount1
          : tr('bookCountN', { n: state.finds.length });
      say(countBi);
    } else if (action === 'start-ride') {
      startRideMode();
    } else if (action === 'finish-ride') {
      finishRideMode();
    } else if (action === 'return-to-ride') {
      state.screen = 'ride';
      render();
    } else if (action === 'open-find') {
      openFindCard(el.dataset.find);
    } else if (action === 'open-ride') {
      const r = state.rides.find((x) => x.id === el.dataset.ride);
      if (r) {
        state.rideSummary = r;
        state.screen = 'ride-summary';
        render();
      }
    } else if (action === 'book-filter') {
      state.bookFilter = el.dataset.filter;
      chime('tap');
      render();
    } else if (action === 'speak-card-intro') {
      const p = state.currentPlant;
      if (p) say([p.commonName, p.greeting, ...(p.facts || [])]);
    } else if (action === 'speak-pair') {
      chime('tap');
      say({ en: el.dataset.en || '', es: el.dataset.es || '' });
    } else if (action === 'pick-candidate') {
      const idx = Number(el.dataset.index);
      const chosen = state.pendingCandidates[idx];
      if (!chosen) return;
      state.screen = 'identifying';
      render();
      say(STR.looking);
      try {
        const keys = getKeys();
        const desc = keys.gemini
          ? await geminiDescribe(chosen.scientific, state.pendingCoords || {})
          : await fallbackPlantContent(chosen.scientific, chosen.common, chosen.nameEs);
        await finalizeIdentifiedPlant(desc);
      } catch (err) {
        console.error(err);
        state.screen = 'home';
        render();
      }
    } else if (action === 'close-parent') {
      document.getElementById('parent-dialog')?.close();
    } else if (action === 'save-parent') {
      const gemini = document.getElementById('inp-gemini-key')?.value || '';
      const plantnet = document.getElementById('inp-plantnet-key')?.value || '';
      const rate = document.getElementById('inp-speech-rate')?.value || '0.9';
      const vEn = document.getElementById('inp-voice-en')?.value ?? '';
      const vEs = document.getElementById('inp-voice-es')?.value ?? '';
      setKeys({ gemini, plantnet });
      localStorage.setItem('bb.rate', rate);
      localStorage.setItem('bb.voice.en', vEn);
      localStorage.setItem('bb.voice.es', vEs);
      document.getElementById('parent-dialog')?.close();
      chime('happy');
    } else if (action === 'export-backup') {
      exportBackupJson();
    } else if (action === 'clear-all-data') {
      if (confirm('Delete all plant stickers and rides on this phone?')) {
        await Promise.all([db.clear('finds'), db.clear('rides')]);
        await refreshData();
        document.getElementById('parent-dialog')?.close();
        state.screen = 'home';
        render();
      }
    }
  });

  const camInput = document.getElementById('camera-input');
  camInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoSelected(file);
  });
}

// ---------- Init ----------
async function init() {
  setLang(getLang());
  await loadDevKeys();
  await refreshData();
  bindEvents();
  render();
}

init();
