// Sand Dig! — Tactile Finger-Digging Physics Puzzle
(function () {
  'use strict';

  const SAVE_KEY = 'sand_dig_save_v1';
  // Logical grid resolution for sand mask (fast & crisp)
  const W = 480;
  const H = 640;

  const LEVELS = [
    { id: 1, theme: 'beach', emoji: '🏖️', sky: '#38bdf8', sand1: '#fde047', sand2: '#f59e0b', bg: '#78350f', spawn: { x: 240, y: 78 }, cup: { x: 240, y: 580 }, rocks: [], stars: [{ x: 240, y: 260 }, { x: 240, y: 420 }] },
    { id: 2, theme: 'beach', emoji: '🏖️', sky: '#38bdf8', sand1: '#fde047', sand2: '#f59e0b', bg: '#78350f', spawn: { x: 130, y: 78 }, cup: { x: 350, y: 580 }, rocks: [], stars: [{ x: 220, y: 270 }, { x: 310, y: 420 }] },
    { id: 3, theme: 'beach', emoji: '🏖️', sky: '#38bdf8', sand1: '#fde047', sand2: '#f59e0b', bg: '#78350f', spawn: { x: 240, y: 78 }, cup: { x: 240, y: 580 }, rocks: [{ x: 140, y: 290, w: 200, h: 36 }], stars: [{ x: 95, y: 310 }, { x: 385, y: 310 }] },
    { id: 4, theme: 'candy', emoji: '🍭', sky: '#fbcfe8', sand1: '#f9a8d4', sand2: '#ec4899', bg: '#831843', spawn: { x: 340, y: 78 }, cup: { x: 140, y: 580 }, rocks: [{ x: 180, y: 250, w: 220, h: 34 }], stars: [{ x: 120, y: 270 }, { x: 240, y: 430 }] },
    { id: 5, theme: 'candy', emoji: '🍭', sky: '#fbcfe8', sand1: '#f9a8d4', sand2: '#ec4899', bg: '#831843', spawn: { x: 140, y: 78 }, cup: { x: 340, y: 580 }, rocks: [{ x: 60, y: 220, w: 220, h: 34 }, { x: 200, y: 390, w: 220, h: 34 }], stars: [{ x: 340, y: 240 }, { x: 120, y: 410 }] },
    { id: 6, theme: 'candy', emoji: '🍭', sky: '#fbcfe8', sand1: '#c4b5fd', sand2: '#8b5cf6', bg: '#4c1d95', spawn: { x: 240, y: 78 }, cup: { x: 240, y: 580 }, rocks: [{ x: 165, y: 210, w: 150, h: 34 }, { x: 40, y: 370, w: 160, h: 34 }, { x: 280, y: 370, w: 160, h: 34 }], stars: [{ x: 110, y: 235 }, { x: 240, y: 385 }] },
    { id: 7, theme: 'crystal', emoji: '💎', sky: '#1e1b4b', sand1: '#38bdf8', sand2: '#0284c7', bg: '#0c4a6e', spawn: { x: 120, y: 78 }, cup: { x: 130, y: 580 }, rocks: [{ x: 40, y: 240, w: 250, h: 36 }, { x: 190, y: 400, w: 250, h: 36 }], stars: [{ x: 360, y: 260 }, { x: 120, y: 425 }] },
    { id: 8, theme: 'crystal', emoji: '💎', sky: '#1e1b4b', sand1: '#34d399', sand2: '#059669', bg: '#064e3b', spawn: { x: 350, y: 78 }, cup: { x: 340, y: 580 }, rocks: [{ x: 190, y: 220, w: 250, h: 36 }, { x: 40, y: 390, w: 250, h: 36 }], stars: [{ x: 115, y: 240 }, { x: 350, y: 410 }] },
    { id: 9, theme: 'crystal', emoji: '💎', sky: '#312e81', sand1: '#a78bfa', sand2: '#7c3aed', bg: '#3b0764', spawn: { x: 240, y: 78 }, cup: { x: 240, y: 580 }, rocks: [{ x: 110, y: 210, w: 260, h: 32 }, { x: 40, y: 340, w: 145, h: 32 }, { x: 295, y: 340, w: 145, h: 32 }, { x: 150, y: 465, w: 180, h: 32 }], stars: [{ x: 75, y: 225 }, { x: 240, y: 355 }] },
    { id: 10, theme: 'beach', emoji: '🌈', sky: '#38bdf8', sand1: '#fde047', sand2: '#ec4899', bg: '#581c87', spawn: { x: 120, y: 78 }, cup: { x: 360, y: 580 }, rocks: [{ x: 60, y: 200, w: 180, h: 32 }, { x: 240, y: 330, w: 180, h: 32 }, { x: 80, y: 455, w: 180, h: 32 }], stars: [{ x: 330, y: 215 }, { x: 130, y: 345 }, { x: 330, y: 470 }] },
  ];

  let save;
  try { save = { level: 1, stars: 0, sfx: true, ...(JSON.parse(localStorage.getItem(SAVE_KEY)) || {}) }; }
  catch (_) { save = { level: 1, stars: 0, sfx: true }; }
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} };

  let audioCtx = null;
  let lastDigSound = 0;
  function tone(f, d, t = 'sine', v = 0.12, s = null) {
    if (!save.sfx) return;
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

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const hudLevel = document.getElementById('hud-level');
  const hudStars = document.getElementById('hud-stars');
  const btnReset = document.getElementById('btn-reset');
  const btnSound = document.getElementById('btn-sound');
  const winScreen = document.getElementById('win-screen');
  const winStars = document.getElementById('win-stars');
  const winSub = document.getElementById('win-sub');
  const btnNext = document.getElementById('btn-next');
  const btnAgain = document.getElementById('btn-again');

  // Offscreen Sand Layer + Uint8Array mask (1 = sand, 2 = solid rock, 0 = empty)
  const sandCanvas = document.createElement('canvas');
  sandCanvas.width = W;
  sandCanvas.height = H;
  const sctx = sandCanvas.getContext('2d');
  const mask = new Uint8Array(W * H);

  let scale = 1, ox = 0, oy = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    ox = (window.innerWidth - W * scale) / 2;
    oy = (window.innerHeight - H * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  let lvl = LEVELS[0];
  let balls = [];
  let stars = [];
  let savedCount = 0;
  let won = false;
  let digging = false;
  let lastDigPt = null;

  function carveCircle(cx, cy, r) {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
    const y0 = Math.max(115, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
    const r2 = r * r;
    let carved = false;
    for (let y = y0; y <= y1; y++) {
      const dy = y - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        if (dx * dx + dy * dy <= r2 && mask[y * W + x] === 1) {
          mask[y * W + x] = 0;
          carved = true;
        }
      }
    }
    if (carved) {
      sctx.save();
      sctx.globalCompositeOperation = 'destination-out';
      sctx.beginPath();
      sctx.arc(cx, cy, r, 0, Math.PI * 2);
      sctx.fill();
      sctx.restore();
      const now = performance.now();
      if (now - lastDigSound > 80) {
        lastDigSound = now;
        tone(240 + Math.random() * 120, 0.05, 'triangle', 0.06, 180);
      }
    }
  }

  function loadLevel(levelObj) {
    lvl = levelObj;
    won = false;
    savedCount = 0;
    winScreen.classList.add('hidden');
    mask.fill(0);

    // Paint sand layer from y = 115 down to H
    sctx.clearRect(0, 0, W, H);
    const g = sctx.createLinearGradient(0, 115, 0, H);
    g.addColorStop(0, lvl.sand1);
    g.addColorStop(1, lvl.sand2);
    sctx.fillStyle = g;
    sctx.fillRect(0, 115, W, H - 115);

    // Subtle decorative sand stripes
    sctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let y = 140; y < H; y += 52) sctx.fillRect(0, y, W, 14);

    for (let y = 115; y < H; y++) {
      for (let x = 0; x < W; x++) mask[y * W + x] = 1;
    }

    // Carve starting pocket & cup pocket
    carveCircle(lvl.spawn.x, 128, 34);
    carveCircle(lvl.cup.x, lvl.cup.y - 18, 52);

    // Solid rocks (mask = 2)
    for (const rk of lvl.rocks) {
      const x0 = Math.max(0, Math.floor(rk.x)), x1 = Math.min(W - 1, Math.ceil(rk.x + rk.w));
      const y0 = Math.max(0, Math.floor(rk.y)), y1 = Math.min(H - 1, Math.ceil(rk.y + rk.h));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) mask[y * W + x] = 2;
      }
    }

    // Spawn 5 cheerful colorful marbles
    const ballCols = ['#ec4899', '#38bdf8', '#4ade80', '#a855f7', '#f97316'];
    balls = [];
    for (let i = 0; i < 5; i++) {
      balls.push({
        x: lvl.spawn.x + (i - 2) * 14,
        y: lvl.spawn.y + (i % 2) * 12,
        vx: (Math.random() - 0.5) * 20,
        vy: 0,
        r: 13,
        color: ballCols[i % ballCols.length],
        inCup: false,
      });
    }

    stars = lvl.stars.map((s) => ({ x: s.x, y: s.y, got: false }));
    updateHud();
  }

  function updateHud() {
    hudLevel.textContent = `${lvl.emoji} Level ${lvl.id}`;
    hudStars.textContent = `⭐ ${save.stars}`;
    btnSound.textContent = save.sfx ? '🔊' : '🔇';
  }

  // Pointer digging
  function toStage(e) { return { x: (e.clientX - ox) / scale, y: (e.clientY - oy) / scale }; }
  canvas.addEventListener('pointerdown', (e) => {
    digging = true;
    const p = toStage(e);
    lastDigPt = p;
    carveCircle(p.x, p.y, 32);
  });
  window.addEventListener('pointermove', (e) => {
    if (!digging) return;
    const p = toStage(e);
    if (lastDigPt) {
      const dist = Math.hypot(p.x - lastDigPt.x, p.y - lastDigPt.y);
      const steps = Math.max(1, Math.ceil(dist / 10));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        carveCircle(lastDigPt.x + (p.x - lastDigPt.x) * t, lastDigPt.y + (p.y - lastDigPt.y) * t, 32);
      }
    }
    lastDigPt = p;
  });
  window.addEventListener('pointerup', () => { digging = false; lastDigPt = null; });
  window.addEventListener('pointercancel', () => { digging = false; lastDigPt = null; });

  btnReset.addEventListener('click', () => { tone(360, 0.08, 'sine', 0.1, 480); loadLevel(lvl); });
  btnSound.addEventListener('click', () => { save.sfx = !save.sfx; persist(); updateHud(); });
  btnAgain.addEventListener('click', () => loadLevel(lvl));
  btnNext.addEventListener('click', () => {
    const nextIdx = lvl.id < LEVELS.length ? lvl.id : 0;
    save.level = nextIdx + 1;
    persist();
    loadLevel(LEVELS[nextIdx]);
  });

  function isSolid(x, y) {
    const ix = Math.round(x), iy = Math.round(y);
    if (ix < 0 || ix >= W || iy >= H) return true;
    if (iy < 0) return false;
    return mask[iy * W + ix] > 0;
  }

  function stepBalls(dt) {
    for (const b of balls) {
      if (b.inCup) continue;
      b.vy += 460 * dt;
      b.vx *= 0.992;
      b.vy = Math.min(b.vy, 420);

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Sample 12 points around ball perimeter for smooth sand/rock collision
      let nx = 0, ny = 0, hits = 0;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const px = b.x + Math.cos(a) * b.r;
        const py = b.y + Math.sin(a) * b.r;
        if (isSolid(px, py)) {
          nx -= Math.cos(a);
          ny -= Math.sin(a);
          hits++;
        }
      }
      if (hits > 0) {
        const len = Math.hypot(nx, ny) || 1;
        nx /= len; ny /= len;
        b.x += nx * 2.2;
        b.y += ny * 2.2;
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
          b.vx -= 1.32 * dot * nx;
          b.vy -= 1.32 * dot * ny;
        }
      }

      // Collect buried stars
      for (const s of stars) {
        if (!s.got && Math.hypot(b.x - s.x, b.y - s.y) < b.r + 18) {
          s.got = true;
          tone(880, 0.12, 'sine', 0.14, 1320);
        }
      }

      // Check Cup arrival!
      if (Math.abs(b.x - lvl.cup.x) < 44 && Math.abs(b.y - lvl.cup.y) < 34) {
        b.inCup = true;
        savedCount++;
        tone(520 + savedCount * 85, 0.12, 'triangle', 0.15, 720 + savedCount * 85);
        if (savedCount >= 4 && !won) {
          won = true;
          const gotStars = stars.filter((s) => s.got).length;
          const rating = Math.min(3, 1 + gotStars);
          save.stars += 3 + gotStars * 2;
          persist();
          updateHud();
          winStars.textContent = '⭐'.repeat(rating) + '☆'.repeat(3 - rating);
          winSub.textContent = `You collected ${gotStars} bonus stars!`;
          btnNext.textContent = lvl.id < LEVELS.length ? `LEVEL ${lvl.id + 1} ▶` : '🏆 PLAY LEVEL 1 ▶';
          setTimeout(() => winScreen.classList.remove('hidden'), 500);
        }
      }
    }

    // Soft ball-to-ball push
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        if (a.inCup || b.inCup) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const minD = a.r + b.r;
        if (d < minD) {
          const push = (minD - d) * 0.5;
          const ux = dx / d, uy = dy / d;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
        }
      }
    }
  }

  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.03, (now - last) / 1000);
    last = now;
    stepBalls(dt * 0.5);
    stepBalls(dt * 0.5);

    ctx.fillStyle = lvl.bg;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    // Dug tunnel backdrop & sky
    ctx.fillStyle = lvl.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = lvl.sky;
    ctx.fillRect(0, 0, W, 118);

    // Sand layer
    ctx.drawImage(sandCanvas, 0, 0);

    // Solid rocks
    for (const rk of lvl.rocks) {
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(rk.x, rk.y, rk.w, rk.h, 12); ctx.fill(); ctx.stroke();
    }

    // Waiting Green Toy Cup
    const cx = lvl.cup.x, cy = lvl.cup.y;
    ctx.fillStyle = '#22c55e'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(cx - 48, cy - 24); ctx.lineTo(cx + 48, cy - 24); ctx.lineTo(cx + 36, cy + 36); ctx.lineTo(cx - 36, cy + 36); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.roundRect(cx - 54, cy - 32, 108, 16, 8); ctx.fill(); ctx.stroke();

    // Buried Stars
    for (const s of stars) {
      if (s.got) continue;
      ctx.save(); ctx.translate(s.x, s.y);
      ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 18 : 8, a = (i * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }

    // Smiling Marbles
    for (const b of balls) {
      if (b.inCup) continue;
      ctx.fillStyle = b.color; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(b.x - 4, b.y - 2, 2.2, 0, Math.PI * 2); ctx.arc(b.x + 4, b.y - 2, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y + 1, 4, 0.2, Math.PI - 0.2); ctx.stroke();
    }

    ctx.restore();
  }

  loadLevel(LEVELS[Math.min(save.level - 1, LEVELS.length - 1)]);
  requestAnimationFrame(loop);
})();
