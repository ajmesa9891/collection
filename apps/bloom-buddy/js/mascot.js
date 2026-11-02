// Buddy the Bee SVG mascot + Season Wheel SVG generator.
import { monthBi, seasonOf, SEASON_EMOJI, getLang, esc } from './i18n.js';
import { blobUrl } from './db.js';

/**
 * Returns inline SVG for Buddy the Bee.
 * @param {'happy'|'thinking'|'celebrate'|'curious'} mood
 * @param {number} size
 */
export function buddySvg(mood = 'happy', size = 88) {
  const mouth =
    mood === 'celebrate'
      ? '<path d="M40 58 Q50 70 60 58 Z" fill="#7c2d12"/>'
      : mood === 'thinking'
      ? '<circle cx="53" cy="60" r="3.5" fill="#7c2d12"/>'
      : '<path d="M41 57 Q50 66 59 57" stroke="#7c2d12" stroke-width="3.5" stroke-linecap="round" fill="none"/>';

  const eyes =
    mood === 'celebrate'
      ? `<path d="M34 46 Q39 40 44 46" stroke="#1e1b4b" stroke-width="3.5" stroke-linecap="round" fill="none"/>
         <path d="M56 46 Q61 40 66 46" stroke="#1e1b4b" stroke-width="3.5" stroke-linecap="round" fill="none"/>`
      : `<circle cx="39" cy="46" r="5" fill="#1e1b4b"/><circle cx="40.8" cy="44.2" r="1.8" fill="#fff"/>
         <circle cx="61" cy="46" r="5" fill="#1e1b4b"/><circle cx="62.8" cy="44.2" r="1.8" fill="#fff"/>`;

  return `<svg class="buddy-svg mood-${mood}" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Buddy the Bee">
    <defs>
      <linearGradient id="beeBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fde047"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
      <clipPath id="beeClip">
        <ellipse cx="50" cy="56" rx="28" ry="26"/>
      </clipPath>
    </defs>
    <!-- Wings -->
    <g class="bee-wings">
      <ellipse class="wing-l" cx="26" cy="36" rx="16" ry="11" transform="rotate(-25 26 36)" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2" opacity="0.92"/>
      <ellipse class="wing-r" cx="74" cy="36" rx="16" ry="11" transform="rotate(25 74 36)" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2" opacity="0.92"/>
    </g>
    <!-- Stinger -->
    <polygon points="46,81 54,81 50,90" fill="#451a03"/>
    <!-- Body + stripes -->
    <ellipse cx="50" cy="56" rx="28" ry="26" fill="url(#beeBody)" stroke="#451a03" stroke-width="3"/>
    <g clip-path="url(#beeClip)">
      <rect x="18" y="64" width="64" height="7" fill="#451a03"/>
      <rect x="18" y="75" width="64" height="6" fill="#451a03"/>
    </g>
    <!-- Antennae -->
    <path d="M42 32 Q36 18 28 20" stroke="#451a03" stroke-width="3" stroke-linecap="round" fill="none"/>
    <circle cx="27" cy="20" r="4" fill="#f59e0b" stroke="#451a03" stroke-width="2"/>
    <path d="M58 32 Q64 18 72 20" stroke="#451a03" stroke-width="3" stroke-linecap="round" fill="none"/>
    <circle cx="73" cy="20" r="4" fill="#f59e0b" stroke="#451a03" stroke-width="2"/>
    <!-- Cheeks -->
    <ellipse cx="32" cy="54" rx="4.5" ry="2.8" fill="#fb7185" opacity="0.75"/>
    <ellipse cx="68" cy="54" rx="4.5" ry="2.8" fill="#fb7185" opacity="0.75"/>
    <!-- Eyes & Mouth -->
    ${eyes}
    <g class="bee-mouth">${mouth}</g>
    <!-- Little explorer flower hat -->
    <g transform="translate(50,28)">
      <circle cx="0" cy="-2" r="5" fill="#fb7185" stroke="#451a03" stroke-width="1.5"/>
      <circle cx="0" cy="-2" r="2.2" fill="#fde047"/>
    </g>
  </svg>`;
}

const SEASON_COLORS = {
  spring: { fill: '#86efac', stroke: '#22c55e', dark: '#14532d' },
  summer: { fill: '#fde047', stroke: '#eab308', dark: '#713f12' },
  fall:   { fill: '#fdba74', stroke: '#f97316', dark: '#7c2d12' },
  winter: { fill: '#93c5fd', stroke: '#3b82f6', dark: '#1e3a8a' },
};

function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function wedgePath(cx, cy, rIn, rOut, a0, a1) {
  const [x1, y1] = polar(cx, cy, rOut, a0);
  const [x2, y2] = polar(cx, cy, rOut, a1);
  const [x3, y3] = polar(cx, cy, rIn, a1);
  const [x4, y4] = polar(cx, cy, rIn, a0);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rOut} ${rOut} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${rIn} ${rIn} 0 0 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
}

/**
 * Interactive 12-month Season Wheel SVG.
 * Shows 12 slices colored by season, highlights current month, and places photo stickers on months with finds.
 */
export function renderSeasonWheel(finds = [], activeMonth = new Date().getMonth()) {
  const cx = 180, cy = 180, rIn = 58, rOut = 158;
  const nowMonth = new Date().getMonth();
  const lang = getLang();

  // Group finds by 0-11 month
  const byMonth = Array.from({ length: 12 }, () => []);
  for (const f of finds) {
    const m = typeof f.month === 'number' ? f.month : new Date(f.createdAt || Date.now()).getMonth();
    byMonth[m].push(f);
  }

  let defs = '';
  let slices = '';
  let stickers = '';

  for (let m = 0; m < 12; m++) {
    const a0 = m * 30 - 15;
    const a1 = a0 + 30;
    const mid = a0 + 15;
    const season = seasonOf(m);
    const col = SEASON_COLORS[season];
    const isNow = m === nowMonth;
    const isSelected = m === activeMonth;
    const mBi = monthBi(m, 'short');
    const label = lang === 'es' ? mBi.es : lang === 'en' ? mBi.en : `${mBi.en}`;

    const [lx, ly] = polar(cx, cy, rOut - 22, mid);
    const list = byMonth[m];

    slices += `<g class="wheel-slice ${isNow ? 'is-now' : ''} ${isSelected ? 'is-selected' : ''}" data-month="${m}" role="button" tabindex="0" aria-label="${esc(mBi.en)} / ${esc(mBi.es)}">
      <path d="${wedgePath(cx, cy, rIn, rOut, a0, a1)}" fill="${col.fill}" stroke="#ffffff" stroke-width="3"/>
      ${isSelected ? `<path d="${wedgePath(cx, cy, rIn + 2, rOut - 2, a0 + 1, a1 - 1)}" fill="none" stroke="${col.dark}" stroke-width="3.5" stroke-dasharray="5 3"/>` : ''}
      <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="${col.dark}" font-size="12.5" font-weight="900">${esc(label.replace('.', ''))}</text>
    </g>`;

    if (list.length > 0) {
      const latest = list[list.length - 1];
      const url = blobUrl(`thumb-${latest.id}`, latest.thumb || latest.photo);
      const [sx, sy] = polar(cx, cy, (rIn + rOut) / 2 - 12, mid);
      const clipId = `mclip-${m}`;
      if (url) {
        defs += `<clipPath id="${clipId}"><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="15"/></clipPath>`;
        stickers += `<g class="wheel-sticker" data-month="${m}" data-find="${esc(latest.id)}">
          <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="16.5" fill="#ffffff" stroke="${col.dark}" stroke-width="2"/>
          <image href="${url}" x="${(sx - 15).toFixed(1)}" y="${(sy - 15).toFixed(1)}" width="30" height="30" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>
          ${list.length > 1 ? `<circle cx="${(sx + 12).toFixed(1)}" cy="${(sy - 12).toFixed(1)}" r="8" fill="#ef4444" stroke="#fff" stroke-width="1.5"/><text x="${(sx + 12).toFixed(1)}" y="${(sy - 12).toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="9.5" font-weight="900">${list.length}</text>` : ''}
        </g>`;
      } else {
        stickers += `<g class="wheel-sticker" data-month="${m}">
          <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="14" fill="#ffffff" stroke="${col.dark}" stroke-width="2"/>
          <text x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="15">${esc(latest.emoji || '🌸')}</text>
        </g>`;
      }
    }
  }

  // Pointer marker on the outer rim for Today's month
  const nowAngle = nowMonth * 30;
  const [px, py] = polar(cx, cy, rOut + 11, nowAngle);
  const [p1x, p1y] = polar(cx, cy, rOut + 20, nowAngle - 4);
  const [p2x, p2y] = polar(cx, cy, rOut + 20, nowAngle + 4);
  const pointer = `<polygon points="${px.toFixed(1)},${py.toFixed(1)} ${p1x.toFixed(1)},${p1y.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)}" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>`;

  // Center hub showing active month's season emoji
  const activeSeason = seasonOf(activeMonth);
  const hubCol = SEASON_COLORS[activeSeason];
  const centerEmoji = SEASON_EMOJI[activeSeason];

  return `<svg class="season-wheel-svg" viewBox="0 0 360 360" role="group" aria-label="12-month Season Wheel">
    <defs>${defs}</defs>
    <circle cx="${cx}" cy="${cy}" r="${rOut + 4}" fill="#ffffff" stroke="#e2e8f0" stroke-width="3"/>
    ${slices}
    ${stickers}
    ${pointer}
    <g class="wheel-center" data-action="center-tap" role="button" tabindex="0">
      <circle cx="${cx}" cy="${cy}" r="${rIn - 3}" fill="#ffffff" stroke="${hubCol.stroke}" stroke-width="5"/>
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" dominant-baseline="central" font-size="40">${centerEmoji}</text>
      <text x="${cx}" y="${cy + 30}" text-anchor="middle" fill="${hubCol.dark}" font-size="11" font-weight="900">🔊</text>
    </g>
  </svg>`;
}
