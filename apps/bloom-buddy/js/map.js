// Leaflet map wrappers: (1) Plant Card world distribution + pin, (2) Ride Mode live GPS route + treasure pins.
import { gbifTileUrl } from './api.js';
import { esc } from './i18n.js';
import { blobUrl } from './db.js';

function hasLeaflet() {
  return typeof window.L !== 'undefined';
}

/**
 * Render the Plant Card "Where it lives" world/regional map.
 * Overlays GBIF occurrence density tiles + a pin where the child found the plant.
 */
export function createPlantWorldMap(container, { gbifKey, lat, lng, emoji = '🌸', label = '' }) {
  if (!container || !hasLeaflet()) return null;
  container.innerHTML = '';
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const center = hasCoords ? [lat, lng] : [30, -20];
  const zoom = hasCoords ? 2 : 1;

  const map = L.map(container, {
    center,
    zoom,
    minZoom: 1,
    maxZoom: 12,
    zoomControl: true,
    attributionControl: false,
    worldCopyJump: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
  }).addTo(map);

  if (gbifKey) {
    L.tileLayer(gbifTileUrl(gbifKey), {
      maxZoom: 12,
      opacity: 0.85,
    }).addTo(map);
  }

  if (hasCoords) {
    const icon = L.divIcon({
      className: 'bb-pin',
      html: `<div class="bb-pin-bubble"><span>${esc(emoji)}</span></div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 38],
    });
    const marker = L.marker([lat, lng], { icon }).addTo(map);
    if (label) marker.bindPopup(`<strong>${esc(label)}</strong>`);
  }

  setTimeout(() => map.invalidateSize(), 150);
  return map;
}

/**
 * Create a live Ride Map showing the bike route polyline, current position, and plant find markers.
 */
export function createRideMap(container, { onPinTap } = {}) {
  if (!container || !hasLeaflet()) return null;
  container.innerHTML = '';

  const lastLat = parseFloat(localStorage.getItem('bb.lastLat'));
  const lastLng = parseFloat(localStorage.getItem('bb.lastLng'));
  const start = Number.isFinite(lastLat) && Number.isFinite(lastLng) ? [lastLat, lastLng] : [39.5, -98.35];
  const startZoom = Number.isFinite(lastLat) ? 16 : 4;

  const map = L.map(container, {
    center: start,
    zoom: startZoom,
    zoomControl: false,
    attributionControl: false,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  const routeLine = L.polyline([], {
    color: '#f97316',
    weight: 6,
    opacity: 0.9,
    lineCap: 'round',
  }).addTo(map);

  const bikeIcon = L.divIcon({
    className: 'bb-bike-marker',
    html: `<div class="bb-bike-dot">🚲</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
  let bikeMarker = null;
  const findMarkers = [];

  function setPoints(points = [], follow = true) {
    const latlngs = points.map((p) => [p.lat, p.lng]);
    routeLine.setLatLngs(latlngs);
    if (latlngs.length > 0) {
      const last = latlngs[latlngs.length - 1];
      if (!bikeMarker) {
        bikeMarker = L.marker(last, { icon: bikeIcon }).addTo(map);
      } else {
        bikeMarker.setLatLng(last);
      }
      if (follow) map.setView(last, Math.max(map.getZoom(), 16), { animate: true });
    }
  }

  function setFinds(finds = []) {
    findMarkers.forEach((m) => m.remove());
    findMarkers.length = 0;
    for (const f of finds) {
      if (!Number.isFinite(f.lat) || !Number.isFinite(f.lng)) continue;
      const thumb = blobUrl(`thumb-${f.id}`, f.thumb || f.photo);
      const html = thumb
        ? `<div class="bb-find-pin"><img src="${thumb}" alt=""/></div>`
        : `<div class="bb-find-pin"><span>${esc(f.emoji || '🌸')}</span></div>`;
      const icon = L.divIcon({
        className: 'bb-find-marker',
        html,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });
      const m = L.marker([f.lat, f.lng], { icon }).addTo(map);
      m.on('click', () => onPinTap?.(f));
      findMarkers.push(m);
    }
  }

  function fitAll(points = [], finds = []) {
    const all = [
      ...points.map((p) => [p.lat, p.lng]),
      ...finds.filter((f) => Number.isFinite(f.lat) && Number.isFinite(f.lng)).map((f) => [f.lat, f.lng]),
    ];
    if (all.length >= 2) {
      map.fitBounds(all, { padding: [36, 36], maxZoom: 17 });
    } else if (all.length === 1) {
      map.setView(all[0], 16);
    }
  }

  setTimeout(() => map.invalidateSize(), 150);
  return { map, setPoints, setFinds, fitAll };
}

/** Haversine distance in meters between two {lat, lng} points. */
export function distanceMeters(a, b) {
  if (!a || !b) return 0;
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function totalDistanceMeters(points = []) {
  let sum = 0;
  for (let i = 1; i < points.length; i++) sum += distanceMeters(points[i - 1], points[i]);
  return sum;
}

export function formatDistanceBi(meters) {
  const miles = meters / 1609.344;
  const km = meters / 1000;
  if (meters < 250) {
    const ft = Math.max(10, Math.round(meters * 3.28084));
    const m = Math.max(5, Math.round(meters));
    return { en: `${ft} feet`, es: `${m} metros` };
  }
  return {
    en: `${miles.toFixed(1)} miles`,
    es: `${km.toFixed(1)} kilómetros`,
  };
}
