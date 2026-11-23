// Chomp Hole! — Kid-Friendly Hole.io Growth Arcade
(function () {
  'use strict';

  const WORLD_SIZE = 1500;
  const MAPS = {
    town: {
      bg: '#86efac', road: '#94a3b8',
      items: [
        { emoji: '🌼', r: 14, pts: 1 }, { emoji: '🦆', r: 16, pts: 1 }, { emoji: '🚧', r: 17, pts: 1 },
        { emoji: '🚲', r: 22, pts: 2 }, { emoji: '🚗', r: 28, pts: 3 }, { emoji: '🚌', r: 34, pts: 4 },
        { emoji: '🌳', r: 36, pts: 4 }, { emoji: '🏠', r: 46, pts: 6 }, { emoji: '🏰', r: 60, pts: 10 },
      ],
    },
    candy: {
      bg: '#fbcfe8', road: '#fde68a',
      items: [
        { emoji: '🍬', r: 14, pts: 1 }, { emoji: '🍩', r: 17, pts: 1 }, { emoji: '🧁', r: 19, pts: 2 },
        { emoji: '🍦', r: 24, pts: 2 }, { emoji: '🍭', r: 30, pts: 3 }, { emoji: '🎂', r: 38, pts: 5 },
        { emoji: '🍪', r: 44, pts: 6 }, { emoji: '🎪', r: 58, pts: 10 },
      ],
    },
    dino: {
      bg: '#bef264', road: '#d6d3d1',
      items: [
        { emoji: '🥚', r: 14, pts: 1 }, { emoji: '🌿', r: 16, pts: 1 }, { emoji: '🦴', r: 18, pts: 2 },
        { emoji: '🦎', r: 24, pts: 2 }, { emoji: '🦕', r: 34, pts: 4 }, { emoji: '🦖', r: 42, pts: 6 },
        { emoji: '🌴', r: 38, pts: 4 }, { emoji: '🌋', r: 62, pts: 10 },
      ],
    },
  };

  const RINGS = ['#facc15', '#ec4899', '#38bdf8', '#a855f7', '#4ade80'];

  let sfx = true;
  let audioCtx = null;
  function tone(f, d, t = 'sine', v = 0.13, s = null) {
    if (!sfx) return;
    if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.setValueAtTime(f, now);
    if (s) o.frequency.exponentialRampToValueAtTime(s, now + d);
    g.gain.setValueAtTime(0.001, now); g.gain.linearRampToValueAtTime(v, now + 0.01); g.gain.exponentialRampToValueAtTime(0.001, now + d);
    o.connect(g); g.connect(audioCtx.destination); o.start(now); o.stop(now + d + 0.02);
  }

  // DOM
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const hudEaten = document.getElementById('hud-eaten');
  const hudSize = document.getElementById('hud-size');
  const hudTimer = document.getElementById('hud-timer');
  const btnSound = document.getElementById('btn-sound');
  const btnHome = document.getElementById('btn-home');
  const startScreen = document.getElementById('start-screen');
  const btnPlay = document.getElementById('btn-play');
  const btnMode = document.getElementById('btn-mode');
  const btnSkin = document.getElementById('btn-skin');
  const winScreen = document.getElementById('win-screen');
  const winTitle = document.getElementById('win-title');
  const winBig = document.getElementById('win-big');
  const winSub = document.getElementById('win-sub');
  const btnAgain = document.getElementById('btn-again');
  const btnMenu = document.getElementById('btn-menu');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  let state = 'menu';
  let mapKey = 'town';
  let zenMode = true;
  let ringIdx = 0;

  let hole = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, r: 28, targetR: 28, score: 0 };
  let props = [];
  let eatenCount = 0;
  let timeLeft = 60;
  let popups = [];
  let pointerTarget = null;
  const keys = { u: false, d: false, l: false, r: false };

  function buildWorld() {
    const m = MAPS[mapKey];
    hole = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, r: 30, targetR: 30, score: 0 };
    props = [];
    eatenCount = 0;
    timeLeft = 60;
    popups = [];

    // Spawn 64 items weighted from small to huge so growth feels awesome!
    const total = 64;
    for (let i = 0; i < total; i++) {
      const tier = i < 26 ? Math.floor(Math.random() * 3)
        : i < 46 ? 3 + Math.floor(Math.random() * Math.min(3, m.items.length - 3))
        : Math.min(m.items.length - 1, 5 + Math.floor(Math.random() * 4));
      const spec = m.items[Math.min(tier, m.items.length - 1)];
      let x, y;
      do {
        x = 90 + Math.random() * (WORLD_SIZE - 180);
        y = 90 + Math.random() * (WORLD_SIZE - 180);
      } while (Math.hypot(x - hole.x, y - hole.y) < 110);
      props.push({ ...spec, x, y, eaten: false, shrink: 1 });
    }
    updateHud();
  }

  function updateHud() {
    hudEaten.textContent = `🍽️ ${eatenCount} / ${props.length}`;
    hudSize.textContent = `⭐ Size ${Math.max(1, Math.floor((hole.r - 22) / 8))}`;
    hudTimer.textContent = `⏱️ ${Math.ceil(timeLeft)}s`;
    hudTimer.classList.toggle('hidden', zenMode || state !== 'playing');
    btnSound.textContent = sfx ? '🔊' : '🔇';
    btnMode.textContent = zenMode ? '🧸 Zen Mode' : '⏱️ 60s Party';
  }

  function startPlay() {
    buildWorld();
    state = 'playing';
    startScreen.classList.add('hidden');
    winScreen.classList.add('hidden');
    btnHome.classList.remove('hidden');
    updateHud();
    tone(440, 0.14, 'triangle', 0.14, 660);
  }

  function finishGame(clearedAll) {
    state = 'win';
    winTitle.textContent = clearedAll ? '🎉 TOWN GOBBLED!!' : '⏱️ PARTY TIME UP!';
    winBig.textContent = `🍽️ ${eatenCount} / ${props.length}`;
    winSub.textContent = clearedAll ? 'You ate EVERY single toy!' : 'Awesome chomping!';
    winScreen.classList.remove('hidden');
    tone(523, 0.25, 'triangle', 0.16, 1046);
  }

  // Controls (Pointer glide + Keyboard)
  canvas.addEventListener('pointerdown', (e) => { pointerTarget = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('pointermove', (e) => { if (pointerTarget) pointerTarget = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('pointerup', () => { pointerTarget = null; });
  window.addEventListener('pointercancel', () => { pointerTarget = null; });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') keys.u = true;
    if (e.key === 'ArrowDown' || e.key === 's') keys.d = true;
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.l = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.r = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') keys.u = false;
    if (e.key === 'ArrowDown' || e.key === 's') keys.d = false;
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.l = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.r = false;
  });

  document.querySelectorAll('.map-btn').forEach((b) => {
    b.addEventListener('click', () => {
      mapKey = b.dataset.map;
      document.querySelectorAll('.map-btn').forEach((x) => x.classList.toggle('active', x === b));
      buildWorld();
      tone(520, 0.08, 'sine', 0.1, 640);
    });
  });

  btnPlay.addEventListener('click', startPlay);
  btnAgain.addEventListener('click', startPlay);
  btnMenu.addEventListener('click', () => { state = 'menu'; winScreen.classList.add('hidden'); btnHome.classList.add('hidden'); startScreen.classList.remove('hidden'); });
  btnHome.addEventListener('click', () => { state = 'menu'; winScreen.classList.add('hidden'); btnHome.classList.add('hidden'); startScreen.classList.remove('hidden'); updateHud(); });
  btnSound.addEventListener('click', () => { sfx = !sfx; updateHud(); });
  btnMode.addEventListener('click', () => { zenMode = !zenMode; updateHud(); tone(480, 0.08, 'sine', 0.1, 600); });
  btnSkin.addEventListener('click', () => { ringIdx = (ringIdx + 1) % RINGS.length; tone(600, 0.08, 'triangle', 0.12, 760); });

  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    const w = window.innerWidth, h = window.innerHeight;

    if (state === 'playing') {
      let vx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
      let vy = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
      if (pointerTarget) {
        const dx = pointerTarget.x - w / 2;
        const dy = pointerTarget.y - h / 2;
        const d = Math.hypot(dx, dy);
        if (d > 14) { vx = dx / d; vy = dy / d; }
      }
      const mag = Math.hypot(vx, vy);
      if (mag > 0) {
        const spd = 280 + hole.r * 1.4;
        hole.x = Math.max(hole.r, Math.min(WORLD_SIZE - hole.r, hole.x + (vx / mag) * spd * dt));
        hole.y = Math.max(hole.r, Math.min(WORLD_SIZE - hole.r, hole.y + (vy / mag) * spd * dt));
      }

      hole.r += (hole.targetR - hole.r) * Math.min(1, dt * 6);

      // Swallow items smaller than the hole!
      for (const p of props) {
        if (p.eaten) {
          if (p.shrink > 0) p.shrink = Math.max(0, p.shrink - dt * 5);
          continue;
        }
        const d = Math.hypot(p.x - hole.x, p.y - hole.y);
        if (hole.r > p.r * 0.92 && d < hole.r + p.r * 0.25) {
          p.eaten = true;
          eatenCount++;
          hole.score += p.pts;
          hole.targetR = Math.min(115, 30 + Math.sqrt(hole.score) * 6.5);
          popups.push({ x: p.x, y: p.y, text: `+${p.pts}`, life: 0.7 });
          tone(340 + Math.min(500, eatenCount * 10), 0.1, 'sine', 0.13, 560 + Math.min(500, eatenCount * 10));
          updateHud();
          if (eatenCount >= props.length) finishGame(true);
        }
      }

      if (!zenMode) {
        timeLeft -= dt;
        updateHud();
        if (timeLeft <= 0) finishGame(false);
      }
    }

    for (let i = popups.length - 1; i >= 0; i--) {
      popups[i].life -= dt;
      popups[i].y -= 45 * dt;
      if (popups[i].life <= 0) popups.splice(i, 1);
    }

    // Dynamic zoom out as hole grows!
    const zoom = Math.max(0.55, 1.05 - (hole.r - 30) * 0.005);
    const m = MAPS[mapKey];
    ctx.fillStyle = m.bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-hole.x, -hole.y);

    // Town Grid Roads
    ctx.fillStyle = m.road;
    for (let g = 250; g < WORLD_SIZE; g += 350) {
      ctx.fillRect(0, g - 28, WORLD_SIZE, 56);
      ctx.fillRect(g - 28, 0, 56, WORLD_SIZE);
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, WORLD_SIZE - 20, WORLD_SIZE - 20);

    // Smiling Chomp Hole
    ctx.save();
    ctx.translate(hole.x, hole.y);
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = RINGS[ringIdx];
    ctx.lineWidth = Math.max(8, hole.r * 0.16);
    ctx.beginPath(); ctx.arc(0, 0, hole.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#020617';
    ctx.beginPath(); ctx.arc(0, 0, hole.r * 0.72, 0, Math.PI * 2); ctx.fill();
    // Cute Eyes on top rim
    for (const ex of [-hole.r * 0.32, hole.r * 0.32]) {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex, -hole.r * 0.78, hole.r * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(ex, -hole.r * 0.74, hole.r * 0.08, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Props (Emoji Toys)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of props) {
      if (p.shrink <= 0.02) continue;
      ctx.save();
      ctx.translate(p.eaten ? (p.x + hole.x) * 0.5 : p.x, p.eaten ? (p.y + hole.y) * 0.5 : p.y);
      ctx.scale(p.shrink, p.shrink);
      ctx.font = `${Math.round(p.r * 2.1)}px sans-serif`;
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    }

    // Score Popups
    ctx.font = '900 22px "Fredoka", sans-serif';
    for (const pop of popups) {
      ctx.globalAlpha = Math.max(0, pop.life / 0.7);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  buildWorld();
  requestAnimationFrame(loop);
})();
