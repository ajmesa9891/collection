// Read-aloud with the Web Speech API, bilingual aware.
import { getLang } from './i18n.js';

const synth = window.speechSynthesis;
let voices = [];

function loadVoices() {
  voices = synth ? synth.getVoices() : [];
}
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

export function listVoices(prefix) {
  loadVoices();
  return voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix));
}

function pickVoice(lang) {
  const saved = localStorage.getItem(`bb.voice.${lang}`);
  if (saved) {
    const v = voices.find((x) => x.voiceURI === saved);
    if (v) return v;
  }
  const norm = (v) => v.lang.toLowerCase().replace('_', '-');
  const prefs = lang === 'es' ? ['es-us', 'es-mx', 'es-419', 'es-es', 'es'] : ['en-us', 'en-gb', 'en'];
  for (const p of prefs) {
    const local = voices.find((v) => norm(v).startsWith(p) && v.localService);
    if (local) return local;
    const any = voices.find((v) => norm(v).startsWith(p));
    if (any) return any;
  }
  return null;
}

function setTalking(on) {
  document.body.classList.toggle('talking', on);
}

let token = 0;

/**
 * Speak a bilingual pair (or list of pairs) according to the language mode.
 * In "both" mode each pair is spoken in English, then Spanish.
 */
export function say(items, { mode } = {}) {
  if (!synth) return Promise.resolve();
  if (!Array.isArray(items)) items = [items];
  items = items.filter(Boolean);
  const lang = mode || getLang();
  stop();
  const my = ++token;
  loadVoices();
  const rate = parseFloat(localStorage.getItem('bb.rate') || '0.9');

  const queue = [];
  for (const it of items) {
    const pair = typeof it === 'string' ? { en: it, es: it } : it;
    if (lang === 'en' || lang === 'both') queue.push(['en', pair.en]);
    if (lang === 'es' || (lang === 'both' && pair.es !== pair.en)) queue.push(['es', pair.es]);
  }

  return new Promise((resolve) => {
    if (!queue.length) return resolve();
    setTalking(true);
    let left = queue.length;
    for (const [l, text] of queue) {
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice(l);
      if (v) u.voice = v;
      u.lang = v?.lang || (l === 'es' ? 'es-US' : 'en-US');
      u.rate = rate;
      u.pitch = 1.15;
      const done = () => {
        if (--left === 0 && my === token) {
          setTalking(false);
          resolve();
        }
      };
      u.onend = done;
      u.onerror = done;
      synth.speak(u);
    }
  });
}

export function stop() {
  token++;
  if (synth) synth.cancel();
  setTalking(false);
}

/** Tiny celebratory "ding" sounds with WebAudio (no audio files needed). */
let ctx;
export function chime(kind = 'happy') {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === 'happy' ? [523, 659, 784, 1047] : kind === 'tap' ? [880] : [392, 330];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.11;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.32);
    });
  } catch {
    /* audio unavailable */
  }
}

export function buzz(pattern = 30) {
  navigator.vibrate?.(pattern);
}
