// Bilingual (English / Spanish) strings and helpers.
// Every user-facing phrase is a { en, es } pair ("bi" = bilingual).

const LANG_KEY = 'bb.lang';

/** @returns {'en'|'es'|'both'} */
export function getLang() {
  return localStorage.getItem(LANG_KEY) || 'both';
}
export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang === 'es' ? 'es' : 'en';
  window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}
export function cycleLang() {
  const order = ['en', 'es', 'both'];
  const next = order[(order.indexOf(getLang()) + 1) % order.length];
  setLang(next);
  return next;
}

export const STR = {
  appName: { en: 'Bloom Buddy', es: 'Bloom Buddy' },
  snap: { en: 'Snap!', es: '¡Foto!' },
  ride: { en: 'Ride', es: 'Paseo' },
  book: { en: 'My Book', es: 'Mi Libro' },
  home: { en: 'Home', es: 'Inicio' },
  todayIs: { en: 'Today is {date}.', es: 'Hoy es {date}.' },
  itsSeason: { en: "It's {season}!", es: '¡Es {season}!' },
  tapMe: { en: 'Tap me!', es: '¡Tócame!' },
  monthInfo0: { en: '{month} is in {season}. We have not found plants in {month} yet.', es: '{month} es en {season}. Todavía no encontramos plantas en {month}.' },
  monthInfo1: { en: '{month} is in {season}. We found one plant in {month}!', es: '{month} es en {season}. ¡Encontramos una planta en {month}!' },
  monthInfoN: { en: '{month} is in {season}. We found {n} plants in {month}!', es: '{month} es en {season}. ¡Encontramos {n} plantas en {month}!' },

  // Seasons
  spring: { en: 'Spring', es: 'Primavera' },
  summer: { en: 'Summer', es: 'Verano' },
  fall: { en: 'Fall', es: 'Otoño' },
  winter: { en: 'Winter', es: 'Invierno' },

  // Identify flow
  looking: { en: 'Hmm… let me look closely!', es: 'Mmm… ¡déjame mirar de cerca!' },
  lookingSlow: { en: 'Still looking… buzz buzz!', es: 'Sigo mirando… ¡bzz bzz!' },
  notPlant: { en: "Hmm, I don't see a plant. Let's try again, closer!", es: 'Mmm, no veo una planta. ¡Probemos otra vez, más cerca!' },
  whichOne: { en: 'Which one looks like yours?', es: '¿Cuál se parece a la tuya?' },
  notSure: { en: "I'm not sure!", es: '¡No estoy seguro!' },
  tryAgain: { en: 'Try again', es: 'Otra vez' },
  offlineSaved: { en: "No internet. I saved your photo. We'll look later!", es: 'No hay internet. Guardé tu foto. ¡La miramos después!' },
  errorGeneric: { en: 'Oops! Something went wrong. Try again?', es: '¡Uy! Algo salió mal. ¿Otra vez?' },
  needKeys: { en: 'A grown-up needs to set up Bloom Buddy first. Ask Mom or Dad!', es: 'Un adulto tiene que configurar Bloom Buddy. ¡Pregúntale a mamá o papá!' },
  newSticker: { en: 'New sticker!', es: '¡Nueva calcomanía!' },
  seenBefore: { en: 'You found this one before! Now you have {n}!', es: '¡Ya encontraste esta antes! ¡Ahora tienes {n}!' },

  // Card sections
  fourSeasons: { en: 'All year long', es: 'Todo el año' },
  plantYear: { en: "The plant's year", es: 'El año de la planta' },
  whereLives: { en: 'Where it lives', es: 'Dónde vive' },
  funFacts: { en: 'Fun facts', es: 'Datos divertidos' },
  explore: { en: 'Explore!', es: '¡Explora!' },
  foundHere: { en: 'You found it here!', es: '¡La encontraste aquí!' },
  livesIn: { en: 'It also lives in:', es: 'También vive en:' },
  noData: { en: 'Not enough info yet.', es: 'Todavía no hay suficiente información.' },
  foundOn: { en: 'Found on {date}', es: 'Encontrada el {date}' },
  maybe: { en: 'Maybe', es: 'Quizás' },
  safe: { en: 'Safe to look and touch', es: 'Se puede mirar y tocar' },
  careful: { en: 'Be careful!', es: '¡Ten cuidado!' },
  danger: { en: "Look, don't touch!", es: '¡Mira, pero no toques!' },
  nowMonth: { en: 'now', es: 'ahora' },

  // Phenology states
  ph_flower: { en: 'flowers', es: 'flores' },
  ph_fruit: { en: 'fruits or seeds', es: 'frutos o semillas' },
  ph_bud: { en: 'new baby leaves', es: 'hojitas nuevas' },
  ph_green: { en: 'green leaves', es: 'hojas verdes' },
  ph_color: { en: 'colorful leaves', es: 'hojas de colores' },
  ph_bare: { en: 'no leaves, it is sleeping', es: 'no tiene hojas, está durmiendo' },
  ph_sleep: { en: 'it is resting', es: 'está descansando' },
  phMonth: { en: 'In {month}, the {plant} has {things}.', es: 'En {month}, {plant} tiene {things}.' },
  phMonthSleep: { en: 'In {month}, the {plant} is resting.', es: 'En {month}, {plant} está descansando.' },
  and: { en: 'and', es: 'y' },

  // Book
  bookEmpty: { en: "Your book is empty! Let's go find plants!", es: '¡Tu libro está vacío! ¡Vamos a buscar plantas!' },
  bookCount1: { en: 'You have one sticker!', es: '¡Tienes una calcomanía!' },
  bookCountN: { en: 'You have {n} stickers!', es: '¡Tienes {n} calcomanías!' },
  all: { en: 'All', es: 'Todas' },
  waiting: { en: 'Waiting…', es: 'Esperando…' },
  rides: { en: 'Rides', es: 'Paseos' },

  // Ride
  startRide: { en: "Let's ride! Find plants for me!", es: '¡A pasear! ¡Busca plantas para mí!' },
  stopRide: { en: 'Stop', es: 'Parar' },
  rideDone1: { en: 'Great ride! We found one treasure!', es: '¡Gran paseo! ¡Encontramos un tesoro!' },
  rideDoneN: { en: 'Great ride! We found {n} treasures!', es: '¡Gran paseo! ¡Encontramos {n} tesoros!' },
  rideDone0: { en: 'Great ride! Next time let\'s find a plant!', es: '¡Gran paseo! ¡La próxima vez busquemos una planta!' },
  rideDistance: { en: 'We rode {d}!', es: '¡Paseamos {d}!' },
  noGps: { en: 'I cannot find where we are. The map needs location.', es: 'No sé dónde estamos. El mapa necesita la ubicación.' },
  minutes: { en: '{n} min', es: '{n} min' },
  finish: { en: 'Done', es: 'Listo' },

  // Parent
  parentHold: { en: 'Hold for grown-ups', es: 'Mantén presionado (adultos)' },
};

/** Fill {placeholders} in a bilingual pair. Vars may be strings or {en, es} pairs. */
export function tr(key, vars = {}) {
  const s = typeof key === 'string' ? STR[key] : key;
  if (!s) return { en: key, es: key };
  const fill = (str, lang) =>
    str.replace(/\{(\w+)\}/g, (_, k) => {
      const v = vars[k];
      if (v == null) return '';
      return typeof v === 'object' ? v[lang] ?? v.en : String(v);
    });
  return { en: fill(s.en, 'en'), es: fill(s.es, 'es') };
}

/** Join several bilingual pairs into one. */
export function join(parts, sep = ' ') {
  return {
    en: parts.map((p) => p.en).join(sep),
    es: parts.map((p) => p.es).join(sep),
  };
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export { esc };

/** HTML for a bilingual pair, honoring the current language mode. */
export function html(bi) {
  if (typeof bi === 'string') bi = STR[bi] || { en: bi, es: bi };
  const lang = getLang();
  if (lang === 'en') return `<span lang="en">${esc(bi.en)}</span>`;
  if (lang === 'es') return `<span lang="es">${esc(bi.es)}</span>`;
  if (bi.en === bi.es) return `<span lang="en">${esc(bi.en)}</span>`;
  return `<span class="bi"><span lang="en">${esc(bi.en)}</span><span lang="es" class="bi-es">${esc(bi.es)}</span></span>`;
}

// ---------- Dates, months, seasons ----------

export function monthName(m /* 0-11 */, lang, style = 'long') {
  const d = new Date(2024, m, 15);
  const s = new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { month: style }).format(d);
  return lang === 'es' ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
export function monthBi(m, style = 'long') {
  return { en: monthName(m, 'en', style), es: monthName(m, 'es', style) };
}
export function dateBi(date = new Date(), opts = { weekday: 'long', month: 'long', day: 'numeric' }) {
  return {
    en: new Intl.DateTimeFormat('en-US', opts).format(date),
    es: new Intl.DateTimeFormat('es-MX', opts).format(date),
  };
}

export function isSouthern() {
  const lat = parseFloat(localStorage.getItem('bb.lastLat'));
  return Number.isFinite(lat) && lat < 0;
}

/** Season id for a 0-11 month. */
export function seasonOf(m) {
  const north = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'fall', 'fall', 'fall', 'winter'];
  const flip = { winter: 'summer', summer: 'winter', spring: 'fall', fall: 'spring' };
  const s = north[m];
  return isSouthern() ? flip[s] : s;
}

export const SEASON_EMOJI = { spring: '🌱', summer: '☀️', fall: '🍂', winter: '❄️' };

export const SEASON_TIPS = {
  spring: [
    { en: 'In spring, flowers wake up and bloom!', es: '¡En primavera, las flores despiertan y florecen!' },
    { en: 'In spring, trees grow tiny new leaves.', es: 'En primavera, los árboles tienen hojitas nuevas.' },
    { en: 'In spring, bees like me visit lots of flowers!', es: '¡En primavera, las abejas como yo visitamos muchas flores!' },
  ],
  summer: [
    { en: 'In summer, it is hot and plants grow big!', es: '¡En verano hace calor y las plantas crecen mucho!' },
    { en: 'In summer, many fruits get ripe and yummy.', es: 'En verano, muchas frutas maduran y están ricas.' },
    { en: 'In summer, trees give us cool shade.', es: 'En verano, los árboles nos dan sombra fresca.' },
  ],
  fall: [
    { en: 'In fall, leaves turn red, orange, and yellow!', es: '¡En otoño, las hojas se ponen rojas, anaranjadas y amarillas!' },
    { en: 'In fall, leaves fall down. Crunch crunch!', es: 'En otoño, las hojas se caen. ¡Crunch crunch!' },
    { en: 'In fall, squirrels hide acorns for winter.', es: 'En otoño, las ardillas esconden bellotas para el invierno.' },
  ],
  winter: [
    { en: 'In winter, many trees sleep with no leaves.', es: 'En invierno, muchos árboles duermen sin hojas.' },
    { en: 'In winter, pine trees stay green!', es: '¡En invierno, los pinos siguen verdes!' },
    { en: 'In winter, seeds rest under the ground.', es: 'En invierno, las semillas descansan bajo la tierra.' },
  ],
};

/** Flag emoji for an ISO 3166 alpha-2 country code. */
export function flag(cc) {
  if (!cc || cc.length !== 2) return '🏳️';
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
export function countryBi(cc) {
  try {
    return {
      en: new Intl.DisplayNames(['en'], { type: 'region' }).of(cc),
      es: new Intl.DisplayNames(['es'], { type: 'region' }).of(cc),
    };
  } catch {
    return { en: cc, es: cc };
  }
}
