// Monster Hill! — Kid-Friendly Physics Hill-Climb Driving Game
(function () {
  'use strict';

  const SAVE_KEY = 'monster_hill_save_v1';
  const TRUCKS = [
    { id: 'red', name: 'Red Crusher', emoji: '🛻', cost: 0, body: '#ef4444', stripe: '#facc15', power: 1.0 },
    { id: 'dino', name: 'Dino Truck', emoji: '🦖', cost: 25, body: '#22c55e', stripe: '#fde047', power: 1.08 },
    { id: 'fire', name: 'Fire Engine', emoji: '🚒', cost: 55, body: '#dc2626', stripe: '#ffffff', power: 1.14 },
    { id: 'moon', name: 'Space Rover', emoji: '🚀', cost: 90, body: '#8b5cf6', stripe: '#38bdf8', power: 1.2 },
  ];

  const STAGES = [
    { id: 1, name: 'Sunny Meadow', emoji: '🌻', sky1: '#38bdf8', sky2: '#bae6fd', ground: '#4ade80', crust: '#16a34a', len: 2200, amp1: 38, amp2: 18, grav: 760 },
    { id: 2, name: 'Bumpy Pasture', emoji: '🐄', sky1: '#60a5fa', sky2: '#dbeafe', ground: '#22c55e', crust: '#15803d', len: 2500, amp1: 52, amp2: 26, grav: 760 },
    { id: 3, name: 'Rainbow Jumps', emoji: '🌈', sky1: '#38bdf8', sky2: '#fde68a', ground: '#4ade80', crust: '#16a34a', len: 2800, amp1: 68, amp2: 32, grav: 740 },
    { id: 4, name: 'Sandy Dunes', emoji: '🏜️', sky1: '#fb923c', sky2: '#fef08a', ground: '#f59e0b', crust: '#d97706', len: 2700, amp1: 56, amp2: 28, grav: 760 },
    { id: 5, name: 'Cactus Canyon', emoji: '🌵', sky1: '#f97316', sky2: '#fed7aa', ground: '#eab308', crust: '#b45309', len: 3000, amp1: 72, amp2: 34, grav: 760 },
    { id: 6, name: 'Pyramid Leap', emoji: '🐪', sky1: '#f472b6', sky2: '#fde68a', ground: '#f59e0b', crust: '#b45309', len: 3200, amp1: 82, amp2: 38, grav: 740 },
    { id: 7, name: 'Moon Craters', emoji: '🌙', sky1: '#1e1b4b', sky2: '#4338ca', ground: '#94a3b8', crust: '#cbd5e1', len: 2800, amp1: 64, amp2: 30, grav: 440 },
    { id: 8, name: 'Starlight Bounce', emoji: '⭐', sky1: '#0f172a', sky2: '#6d28d9', ground: '#a78bfa', crust: '#ddd6fe', len: 3100, amp1: 78, amp2: 36, grav: 420 },
    { id: 9, name: 'Galaxy Grand Prix', emoji: '🚀', sky1: '#1e1b4b', sky2: '#ec4899', ground: '#818cf8', crust: '#c4b5fd', len: 3400, amp1: 86, amp2: 40, grav: 430 },
  ];

  const DEFAULT_SAVE = { stars: 0, unlocked: 1, current: 1, truck: 'red', owned: ['red'], sfx: true };
  let save;
  try {
    save = { ...DEFAULT_SAVE, ...(JSON.parse(localStorage.getItem(SAVE_KEY)) || {}) };
    if (!Array.isArray(save.owned)) save.owned = ['red'];
  } catch (_) { save = { ...DEFAULT_SAVE }; }
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} };

  let audioCtx = null;
  function tone(f, d, t = 'triangle', v = 0.13, s = null) {
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

  // DOM
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const hudStage = document.getElementById('hud-stage');
  const hudStars = document.getElementById('hud-stars');
  const btnSound = document.getElementById('btn-sound');
  const btnHome = document.getElementById('btn-home');
  const progBar = document.getElementById('prog-bar');
  const progFill = document.getElementById('prog-fill');
  const driveHint = document.getElementById('drive-hint');
  const startScreen = document.getElementById('start-screen');
  const startStage = document.getElementById('start-stage');
  const btnPlay = document.getElementById('btn-play');
  const btnStages = document.getElementById('btn-stages');
  const btnGarage = document.getElementById('btn-garage');
  const btnResetAll = document.getElementById('btn-reset-all');
  const winScreen = document.getElementById('win-screen');
  const winStars = document.getElementById('win-stars');
  const winSub = document.getElementById('win-sub');
  const btnNext = document.getElementById('btn-next');
  const btnReplay = document.getElementById('btn-replay');
  const stagesDialog = document.getElementById('stages-dialog');
  const stagesBody = document.getElementById('stages-body');
  const garageDialog = document.getElementById('garage-dialog');
  const garageBody = document.getElementById('garage-body');

  for (const d of [stagesDialog, garageDialog]) {
    d.addEventListener('close', () => { d.returnValue = ''; });
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const out = (e) => { const r = d.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
      let pOut = false;
      d.addEventListener('pointerdown', (e) => { pOut = out(e); });
      d.addEventListener('pointerup', (e) => { if (pOut && out(e)) d.close(); });
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // State
  let state = 'menu';
  let stage = STAGES[0];
  let gasHeld = false;
  let brakeHeld = false;
  let truck = { x: 120, y: 260, vx: 0, vy: 0, angle: 0, va: 0, wheelRot: 0, flippedTimer: 0 };
  let stageStars = [];
  let collected = 0;
  let confetti = [];
  let camX = 0;

  function groundY(x) {
    if (x < 220) return 380;
    const t = (x - 220) / 170;
    const ramp = Math.min(1, (x - 220) / 300);
    return 380 - ramp * (Math.sin(t * 1.15) * stage.amp1 + Math.sin(t * 2.45 + stage.id) * stage.amp2);
  }

  function loadStage(st) {
    stage = st;
    truck = { x: 120, y: groundY(120) - 48, vx: 0, vy: 0, angle: 0, va: 0, wheelRot: 0, flippedTimer: 0 };
    camX = 0;
    collected = 0;
    confetti = [];
    stageStars = [];
    for (let x = 360; x < stage.len - 180; x += 240) {
      stageStars.push({ x, y: groundY(x) - 62, got: false });
    }
    updateHud();
  }

  function updateHud() {
    hudStage.textContent = `${stage.emoji} Stage ${stage.id}`;
    hudStars.textContent = `⭐ ${save.stars}`;
    btnSound.textContent = save.sfx ? '🔊' : '🔇';
    const cur = STAGES[Math.min(save.current - 1, STAGES.length - 1)];
    startStage.textContent = `${cur.emoji} Stage ${cur.id}: ${cur.name}`;
  }

  function startPlay(st) {
    loadStage(st);
    state = 'playing';
    startScreen.classList.add('hidden');
    winScreen.classList.add('hidden');
    btnHome.classList.remove('hidden');
    progBar.classList.remove('hidden');
    driveHint.classList.remove('hidden');
    tone(440, 0.14, 'triangle', 0.14, 660);
  }

  function finishStage() {
    state = 'win';
    gasHeld = false;
    brakeHeld = false;
    driveHint.classList.add('hidden');
    const rating = collected >= Math.ceil(stageStars.length * 0.65) ? 3 : collected >= 3 ? 2 : 1;
    const earned = 6 + collected * 2;
    save.stars += earned;
    if (stage.id >= save.unlocked && stage.id < STAGES.length) save.unlocked = stage.id + 1;
    save.current = Math.min(STAGES.length, stage.id + 1);
    persist();
    updateHud();
    winStars.textContent = '⭐'.repeat(rating) + '☆'.repeat(3 - rating);
    winSub.textContent = `You collected ${collected} stars (+${earned} ⭐)!`;
    btnNext.textContent = stage.id < STAGES.length ? `STAGE ${stage.id + 1} ▶` : '🏆 PLAY STAGE 1 ▶';
    winScreen.classList.remove('hidden');
    for (let i = 0; i < 45; i++) {
      confetti.push({ x: truck.x, y: truck.y - 30, vx: (Math.random() - 0.5) * 420, vy: -150 - Math.random() * 280, c: ['#f43f5e','#facc15','#4ade80','#38bdf8','#a855f7'][i%5], life: 1.5 });
    }
    tone(523, 0.15, 'triangle', 0.15, 1046);
  }

  // Pure Screen-Half Touch Controls (Hold Right half = Drive/Gas, Hold Left half = Brake/Reverse) + Keyboard
  const activeTouches = new Map();
  function syncTouchDrive() {
    let g = false, b = false;
    for (const side of activeTouches.values()) {
      if (side === 'right') g = true;
      if (side === 'left') b = true;
    }
    gasHeld = g;
    brakeHeld = b;
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (state !== 'playing') return;
    driveHint.classList.add('hidden');
    activeTouches.set(e.pointerId, e.clientX >= window.innerWidth * 0.45 ? 'right' : 'left');
    syncTouchDrive();
  });
  window.addEventListener('pointermove', (e) => {
    if (!activeTouches.has(e.pointerId)) return;
    activeTouches.set(e.pointerId, e.clientX >= window.innerWidth * 0.45 ? 'right' : 'left');
    syncTouchDrive();
  });
  const endTouch = (e) => {
    if (activeTouches.delete(e.pointerId)) syncTouchDrive();
  };
  window.addEventListener('pointerup', endTouch);
  window.addEventListener('pointercancel', endTouch);

  window.addEventListener('keydown', (e) => {
    if (state === 'playing') driveHint.classList.add('hidden');
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') gasHeld = true;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') brakeHeld = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') gasHeld = false;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') brakeHeld = false;
  });

  function renderStages() {
    stagesBody.innerHTML = '';
    for (const s of STAGES) {
      const unlocked = s.id <= save.unlocked;
      const div = document.createElement('div');
      div.className = 'tile-card' + (s.id === save.current ? ' eq' : '');
      div.innerHTML = `<div class="em">${unlocked ? s.emoji : '🔒'}</div><div class="nm">${s.id}. ${s.name}</div>`;
      const b = document.createElement('button');
      b.type = 'button'; b.disabled = !unlocked; b.textContent = unlocked ? 'Drive' : 'Locked';
      b.addEventListener('click', () => { save.current = s.id; persist(); stagesDialog.close(); startPlay(s); });
      div.appendChild(b);
      stagesBody.appendChild(div);
    }
  }

  function renderGarage() {
    garageBody.innerHTML = '';
    for (const tr of TRUCKS) {
      const owned = save.owned.includes(tr.id);
      const eq = save.truck === tr.id;
      const div = document.createElement('div');
      div.className = 'tile-card' + (eq ? ' eq' : '');
      div.innerHTML = `<div class="em">${tr.emoji}</div><div class="nm">${tr.name}</div>`;
      const b = document.createElement('button');
      b.type = 'button';
      if (eq) { b.textContent = '✓ Driving'; b.disabled = true; }
      else if (owned) { b.textContent = 'Pick'; b.addEventListener('click', () => { save.truck = tr.id; persist(); renderGarage(); }); }
      else {
        b.textContent = `⭐ ${tr.cost}`; b.disabled = save.stars < tr.cost;
        b.addEventListener('click', () => {
          if (save.stars < tr.cost) return;
          save.stars -= tr.cost; save.owned.push(tr.id); save.truck = tr.id;
          persist(); updateHud(); renderGarage(); tone(660, 0.18, 'triangle', 0.15, 990);
        });
      }
      div.appendChild(b);
      garageBody.appendChild(div);
    }
  }

  btnPlay.addEventListener('click', () => startPlay(STAGES[Math.min(save.current - 1, STAGES.length - 1)]));
  btnNext.addEventListener('click', () => startPlay(STAGES[stage.id < STAGES.length ? stage.id : 0]));
  btnReplay.addEventListener('click', () => startPlay(stage));
  btnHome.addEventListener('click', () => {
    state = 'menu'; gasHeld = false; brakeHeld = false; activeTouches.clear();
    btnHome.classList.add('hidden'); progBar.classList.add('hidden');
    driveHint.classList.add('hidden'); winScreen.classList.add('hidden'); startScreen.classList.remove('hidden');
    loadStage(STAGES[Math.min(save.current - 1, STAGES.length - 1)]);
  });
  btnSound.addEventListener('click', () => { save.sfx = !save.sfx; persist(); updateHud(); });
  btnStages.addEventListener('click', () => { renderStages(); stagesDialog.showModal(); });
  btnGarage.addEventListener('click', () => { renderGarage(); garageDialog.showModal(); });
  btnResetAll.addEventListener('click', () => {
    if (window.confirm('Restart Monster Hill from Stage 1?')) {
      save = { ...DEFAULT_SAVE, owned: ['red'] };
      persist();
      loadStage(STAGES[0]);
    }
  });

  // Main Physics + Draw Loop
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    const w = window.innerWidth, h = window.innerHeight;

    if (state === 'playing') {
      const trSpec = TRUCKS.find((t) => t.id === save.truck) || TRUCKS[0];
      const accel = 420 * trSpec.power;
      if (gasHeld) { truck.vx = Math.min(460 * trSpec.power, truck.vx + accel * dt); truck.va -= 2.2 * dt; }
      if (brakeHeld) { truck.vx = Math.max(-200, truck.vx - 360 * dt); truck.va += 2.2 * dt; }
      truck.vx *= (1 - 0.45 * dt);
      truck.vy += stage.grav * dt;
      truck.x = Math.max(60, truck.x + truck.vx * dt);
      truck.y += truck.vy * dt;

      // Two-wheel ground contact + gentle spring suspension
      const wOff = 38;
      const rearX = truck.x - Math.cos(truck.angle) * wOff;
      const frontX = truck.x + Math.cos(truck.angle) * wOff;
      const gRear = groundY(rearX);
      const gFront = groundY(frontX);
      const gMid = (gRear + gFront) * 0.5;
      const slopeAngle = Math.atan2(gFront - gRear, wOff * 2);

      const grounded = truck.y >= gMid - 42;
      if (grounded) {
        truck.y = gMid - 42;
        if (truck.vy > 80) tone(140, 0.08, 'sine', 0.08, 90);
        truck.vy = Math.min(0, truck.vy);
        truck.angle += (slopeAngle - truck.angle) * Math.min(1, dt * 11);
        truck.va *= 0.7;
      } else {
        truck.angle += truck.va * dt;
        truck.va *= 0.96;
      }

      // Kid-friendly auto-righting roll cage!
      if (Math.abs(truck.angle) > 1.75) {
        truck.flippedTimer += dt;
        if (truck.flippedTimer > 0.75) {
          truck.angle = 0; truck.va = 0; truck.vy = -260; truck.flippedTimer = 0;
          tone(280, 0.2, 'triangle', 0.14, 620);
        }
      } else {
        truck.flippedTimer = 0;
      }

      truck.wheelRot += truck.vx * dt * 0.04;
      progFill.style.width = `${Math.min(100, (truck.x / stage.len) * 100)}%`;

      // Collect stars
      for (const s of stageStars) {
        if (!s.got && Math.hypot(truck.x - s.x, truck.y - s.y) < 58) {
          s.got = true; collected++; tone(880, 0.1, 'sine', 0.13, 1280);
        }
      }

      if (truck.x >= stage.len) finishStage();
    }

    for (let i = confetti.length - 1; i >= 0; i--) {
      const p = confetti[i]; p.life -= dt; if (p.life <= 0) { confetti.splice(i, 1); continue; }
      p.vy += 450 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }

    camX += (truck.x - w * 0.3 - camX) * Math.min(1, dt * 7);
    const yShift = h * 0.62 - 380;

    // Sky
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, stage.sky1); g.addColorStop(1, stage.sky2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(-camX, yShift);

    // Terrain
    ctx.beginPath();
    const startX = Math.floor(camX / 24) * 24 - 48;
    const endX = startX + w + 120;
    ctx.moveTo(startX, groundY(startX));
    for (let x = startX; x <= endX; x += 24) ctx.lineTo(x, groundY(x));
    ctx.lineTo(endX, h - yShift + 200);
    ctx.lineTo(startX, h - yShift + 200);
    ctx.closePath();
    ctx.fillStyle = stage.ground; ctx.fill();

    ctx.beginPath();
    ctx.moveTo(startX, groundY(startX));
    for (let x = startX; x <= endX; x += 24) ctx.lineTo(x, groundY(x));
    ctx.strokeStyle = stage.crust; ctx.lineWidth = 14; ctx.stroke();

    // Finish Flag
    const fx = stage.len, fy = groundY(fx);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(fx - 5, fy - 130, 10, 130);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(fx + 5, fy - 128, 56, 38);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(fx + 5, fy - 128, 28, 19); ctx.fillRect(fx + 33, fy - 109, 28, 19);

    // Stars
    for (const s of stageStars) {
      if (s.got) continue;
      ctx.save(); ctx.translate(s.x, s.y + Math.sin(now * 0.005 + s.x) * 6);
      ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 18 : 8, a = (i * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }

    // Monster Truck
    const trSpec = TRUCKS.find((t) => t.id === save.truck) || TRUCKS[0];
    ctx.save();
    ctx.translate(truck.x, truck.y);
    ctx.rotate(truck.angle);
    // Suspension
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-36, 4); ctx.lineTo(-36, 22); ctx.moveTo(36, 4); ctx.lineTo(36, 22); ctx.stroke();
    // Body
    ctx.fillStyle = trSpec.body; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(-54, -22, 108, 32, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath(); ctx.roundRect(-24, -44, 52, 24, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = trSpec.stripe; ctx.fillRect(-48, -8, 96, 8);
    // Wheels
    for (const wx of [-36, 36]) {
      ctx.save(); ctx.translate(wx, 22); ctx.rotate(truck.wheelRot);
      ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e293b'; ctx.fillRect(-3, -18, 6, 10);
      ctx.restore();
    }
    ctx.restore();

    // Confetti
    for (const p of confetti) {
      ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 9, 9);
    }
    ctx.restore();
  }

  loadStage(STAGES[Math.min(save.current - 1, STAGES.length - 1)]);
  requestAnimationFrame(loop);
})();
