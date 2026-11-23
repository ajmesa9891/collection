// Bouncy Hoops! — Blumgi Bounce-Inspired Physics Basketball Game
(function () {
  'use strict';

  const SAVE_KEY = 'bouncy_hoops_save_v1';
  const { STAGE_W, STAGE_H, WORLDS, CHARACTERS, LEVELS, getWorld, getChar, generateEndlessLevel } = window.BounceData;
  const GRAVITY = 980;
  const BALL_R = 22;
  const FLOOR_Y = 492;

  // ==================== SAVE STATE ====================
  const DEFAULT_SAVE = {
    stars: 0,
    unlockedLevel: 1,
    currentLevel: 1,
    levelStars: {},
    char: 'slime',
    ownedChars: ['slime'],
    mode: 'kid', // 'kid' (5+) | 'pro' (7+)
    sfx: true,
    unlockAll: false,
    endlessBest: 0,
  };

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_SAVE));
      const parsed = JSON.parse(raw);
      return {
        ...JSON.parse(JSON.stringify(DEFAULT_SAVE)),
        ...parsed,
        levelStars: { ...(parsed.levelStars || {}) },
        ownedChars: Array.isArray(parsed.ownedChars) ? parsed.ownedChars : ['slime'],
      };
    } catch (_) {
      return JSON.parse(JSON.stringify(DEFAULT_SAVE));
    }
  }

  let save = loadSave();
  function persistSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {}
  }

  // ==================== DOM ELEMENTS ====================
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const hudLevel = document.getElementById('hud-level');
  const hudStars = document.getElementById('hud-stars');
  const btnRetryShot = document.getElementById('btn-retry-shot');
  const btnSound = document.getElementById('btn-sound');
  const btnHome = document.getElementById('btn-home');
  const tipPill = document.getElementById('tip-pill');

  const startScreen = document.getElementById('start-screen');
  const modePill = document.getElementById('mode-pill');
  const startLevelPill = document.getElementById('start-level-pill');
  const btnPlay = document.getElementById('btn-play');
  const btnLevels = document.getElementById('btn-levels');
  const btnChars = document.getElementById('btn-chars');
  const btnSettings = document.getElementById('btn-settings');

  const winScreen = document.getElementById('win-screen');
  const winTitle = document.getElementById('win-title');
  const winStars = document.getElementById('win-stars');
  const winSub = document.getElementById('win-sub');
  const btnNext = document.getElementById('btn-next');
  const btnReplay = document.getElementById('btn-replay');
  const btnWinChars = document.getElementById('btn-win-chars');

  const levelsDialog = document.getElementById('levels-dialog');
  const levelsBody = document.getElementById('levels-body');
  const charsDialog = document.getElementById('chars-dialog');
  const charsBody = document.getElementById('chars-body');
  const settingsDialog = document.getElementById('settings-dialog');
  const modeKidBtn = document.getElementById('mode-kid');
  const modeProBtn = document.getElementById('mode-pro');
  const toggleSfxBtn = document.getElementById('toggle-sfx');
  const toggleUnlockBtn = document.getElementById('toggle-unlock');
  const btnResetSave = document.getElementById('btn-reset-save');

  // Safari fallback for <dialog closedby="any">
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (e, dialog) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => { pressedOutside = outside(e, dialog); });
      dialog.addEventListener('pointerup', (e) => { if (pressedOutside && outside(e, dialog)) dialog.close(); });
    }
  }
  for (const dialog of [levelsDialog, charsDialog, settingsDialog]) {
    dialog.addEventListener('close', () => { dialog.returnValue = ''; });
  }

  // ==================== GAME STATE ====================
  let gameState = 'menu'; // 'menu' | 'aim' | 'flying' | 'scored'
  let activeLevel = null;
  let activeWorld = null;
  let endlessRound = 0;

  let simTime = 0;
  let scoreTimer = 0;
  let flyTime = 0;
  let restTimer = 0;
  let netWiggle = 0;
  let bounceCount = 0;

  // Ball state
  const ball = {
    x: 160,
    y: 455,
    vx: 0,
    vy: 0,
    sx: 1,
    sy: 1,
    portalCooldown: 0,
    trail: [],
  };

  // Aim / Charge state
  let isHolding = false;
  let holdTime = 0;
  let aimAngle = -0.82; // radians (pointing up-right)
  let aimPower = 0.5;
  let pointerStart = null;
  let dragAimActive = false;

  // Dynamic level copies
  let walls = [];
  let trampolines = [];
  let bumpers = [];
  let portals = [];
  let stars = [];
  let hoop = { x: 760, y: 270, baseX: 760, baseY: 270, facing: 'left', rimW: 86, moveY: 0, moveSpeed: 1 };
  let particles = [];

  // Canvas viewport transform
  let viewScale = 1;
  let viewOffsetX = 0;
  let viewOffsetY = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = window.innerWidth;
    const h = window.innerHeight;
    viewScale = Math.min(w / STAGE_W, h / STAGE_H);
    viewOffsetX = (w - STAGE_W * viewScale) / 2;
    viewOffsetY = (h - STAGE_H * viewScale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  function screenToStage(clientX, clientY) {
    return {
      x: (clientX - viewOffsetX) / viewScale,
      y: (clientY - viewOffsetY) / viewScale,
    };
  }

  // ==================== PARTICLES ====================
  function spawnConfetti(x, y, count = 28, colors = ['#f43f5e', '#facc15', '#4ade80', '#38bdf8', '#a855f7']) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 120 + Math.random() * 340;
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 110,
        size: 5 + Math.random() * 6,
        color: colors[i % colors.length],
        life: 0.7 + Math.random() * 0.6,
        maxLife: 1.3,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 10,
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.vy += 580 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
    }
  }

  // ==================== LOAD LEVEL ====================
  function loadLevel(lvl) {
    activeLevel = lvl;
    activeWorld = getWorld(lvl.world);
    simTime = 0;
    netWiggle = 0;
    particles = [];

    const isKid = save.mode === 'kid';
    hoop = {
      x: lvl.hoop.x,
      y: lvl.hoop.y,
      baseX: lvl.hoop.x,
      baseY: lvl.hoop.y,
      facing: lvl.hoop.facing || 'left',
      rimW: isKid ? 96 : 78,
      moveY: lvl.hoop.moveY || 0,
      moveSpeed: (lvl.hoop.moveSpeed || 1.3) * (isKid ? 0.78 : 1.15),
    };

    walls = (lvl.walls || []).map((w) => ({
      ...w,
      baseX: w.x,
      baseY: w.y,
      bounce: w.bounce || 0.82,
      speed: (w.speed || 1.5) * (isKid ? 0.78 : 1.15),
    }));

    trampolines = (lvl.trampolines || []).map((t) => ({ ...t, squash: 0 }));
    bumpers = (lvl.bumpers || []).map((b) => ({ ...b, pulse: 0 }));
    portals = (lvl.portals || []).map((p) => ({ ...p }));
    stars = (lvl.stars || []).map((s) => ({ x: s.x, y: s.y, collected: false, phase: Math.random() * 6 }));

    resetBall();
    updateHud();
  }

  function resetBall() {
    ball.x = activeLevel.ball.x;
    ball.y = activeLevel.ball.y;
    ball.vx = 0;
    ball.vy = 0;
    ball.sx = 1;
    ball.sy = 1;
    ball.portalCooldown = 0;
    ball.trail = [];
    flyTime = 0;
    restTimer = 0;
    bounceCount = 0;
    isHolding = false;
    holdTime = 0;
    dragAimActive = false;

    // Default helpful launch angle aimed nicely upward-right
    aimAngle = -0.92;
    aimPower = 0.55;
    if (gameState !== 'menu') {
      gameState = 'aim';
    }
  }

  // ==================== INPUT (ONE-BUTTON HOLD OR DRAG AIM) ====================
  function beginCharge(stagePt) {
    if (gameState === 'flying') {
      // Quick tap while ball is flying resets immediately for zero waiting!
      window.BounceAudio.playClick();
      resetBall();
      return;
    }
    if (gameState !== 'aim') return;
    window.BounceAudio.unlock();
    isHolding = true;
    holdTime = 0;
    pointerStart = stagePt || null;
    dragAimActive = false;
  }

  function moveCharge(stagePt) {
    if (!isHolding || gameState !== 'aim' || !pointerStart) return;
    const dx = stagePt.x - pointerStart.x;
    const dy = stagePt.y - pointerStart.y;
    if (Math.hypot(dx, dy) > 14) {
      dragAimActive = true;
      // Direct slingshot OR point-towards aim: pointing upward/right from ball feels super natural for kids
      const tx = stagePt.x - ball.x;
      const ty = stagePt.y - ball.y;
      if (ty < 30) {
        aimAngle = Math.atan2(Math.min(-25, ty), tx);
        // Clamp to upward hemisphere
        aimAngle = Math.max(-Math.PI + 0.18, Math.min(-0.18, aimAngle));
      }
    }
  }

  function releaseCharge() {
    if (!isHolding || gameState !== 'aim') return;
    isHolding = false;
    const speed = 520 + aimPower * 650;
    ball.vx = Math.cos(aimAngle) * speed;
    ball.vy = Math.sin(aimAngle) * speed;
    ball.sx = 1.28;
    ball.sy = 0.76;
    gameState = 'flying';
    flyTime = 0;
    restTimer = 0;
    bounceCount = 0;
    window.BounceAudio.playLaunch(aimPower);
  }

  canvas.addEventListener('pointerdown', (e) => {
    beginCharge(screenToStage(e.clientX, e.clientY));
  });
  window.addEventListener('pointermove', (e) => {
    if (isHolding) moveCharge(screenToStage(e.clientX, e.clientY));
  });
  window.addEventListener('pointerup', () => {
    releaseCharge();
  });
  window.addEventListener('pointercancel', () => {
    isHolding = false;
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      if (gameState === 'aim' || gameState === 'flying') {
        e.preventDefault();
        beginCharge(null);
      }
    } else if (e.code === 'KeyR' && gameState === 'flying') {
      resetBall();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      releaseCharge();
    }
  });

  // ==================== PHYSICS ENGINE ====================
  function updateMovingParts(t) {
    for (const w of walls) {
      if (w.moveY) w.y = w.baseY + Math.sin(t * w.speed) * w.moveY;
      if (w.moveX) w.x = w.baseX + Math.sin(t * w.speed) * w.moveX;
    }
    if (hoop.moveY) {
      hoop.y = hoop.baseY + Math.sin(t * hoop.moveSpeed) * hoop.moveY;
    }
  }

  function collideCircleRect(b, rx, ry, rw, rh, restitution, isTrampoline, trampPower) {
    const closestX = Math.max(rx, Math.min(b.x, rx + rw));
    const closestY = Math.max(ry, Math.min(b.y, ry + rh));
    const dx = b.x - closestX;
    const dy = b.y - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= BALL_R * BALL_R) return false;

    const dist = Math.sqrt(distSq) || 0.001;
    let nx = dx / dist;
    let ny = dy / dist;

    // Push out
    const overlap = BALL_R - dist;
    b.x += nx * overlap;
    b.y += ny * overlap;

    const dot = b.vx * nx + b.vy * ny;
    if (dot < 0) {
      if (isTrampoline && ny < -0.4) {
        b.vy = -Math.max(660, Math.abs(b.vy) * (trampPower || 1.36));
        b.vx *= 1.04;
      } else {
        b.vx -= (1 + restitution) * dot * nx;
        b.vy -= (1 + restitution) * dot * ny;
      }
      return true;
    }
    return false;
  }

  function collideCirclePoint(b, px, py, pr, restitution) {
    const dx = b.x - px;
    const dy = b.y - py;
    const minD = BALL_R + pr;
    const distSq = dx * dx + dy * dy;
    if (distSq >= minD * minD) return false;

    const dist = Math.sqrt(distSq) || 0.001;
    const nx = dx / dist;
    const ny = dy / dist;
    b.x = px + nx * minD;
    b.y = py + ny * minD;

    const dot = b.vx * nx + b.vy * ny;
    if (dot < 0) {
      b.vx -= (1 + restitution) * dot * nx;
      b.vy -= (1 + restitution) * dot * ny;
      return true;
    }
    return false;
  }

  function stepPhysics(b, dt, isPreview) {
    b.vy += GRAVITY * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.portalCooldown > 0) b.portalCooldown -= dt;

    // Stage bounds (left, right, ceiling, floor)
    if (b.x - BALL_R < 16) {
      b.x = 16 + BALL_R;
      b.vx = Math.abs(b.vx) * 0.85;
      if (!isPreview) onBallBounce(0.8);
    } else if (b.x + BALL_R > STAGE_W - 16) {
      b.x = STAGE_W - 16 - BALL_R;
      b.vx = -Math.abs(b.vx) * 0.85;
      if (!isPreview) onBallBounce(0.8);
    }
    if (b.y - BALL_R < 16) {
      b.y = 16 + BALL_R;
      b.vy = Math.abs(b.vy) * 0.85;
      if (!isPreview) onBallBounce(0.75);
    }
    if (b.y + BALL_R > FLOOR_Y) {
      b.y = FLOOR_Y - BALL_R;
      if (Math.abs(b.vy) > 95) {
        b.vy = -Math.abs(b.vy) * 0.72;
        b.vx *= 0.92;
        if (!isPreview) onBallBounce(Math.min(1, Math.abs(b.vy) / 500));
      } else {
        b.vy = 0;
        b.vx *= 0.94;
      }
    }

    // Walls
    for (const w of walls) {
      if (collideCircleRect(b, w.x, w.y, w.w, w.h, w.bounce, false, 1)) {
        if (!isPreview) onBallBounce(0.9);
      }
    }

    // Trampolines
    for (const tr of trampolines) {
      if (collideCircleRect(b, tr.x, tr.y, tr.w, tr.h, 1.0, true, tr.power)) {
        if (!isPreview) {
          tr.squash = 1;
          bounceCount++;
          b.sx = 0.72;
          b.sy = 1.35;
          window.BounceAudio.playTrampoline();
          spawnConfetti(b.x, tr.y, 12, ['#4ade80', '#facc15', '#ffffff']);
        }
      }
    }

    // Bumpers
    for (const bp of bumpers) {
      const dx = b.x - bp.x;
      const dy = b.y - bp.y;
      const minD = BALL_R + bp.r;
      const dSq = dx * dx + dy * dy;
      if (dSq < minD * minD) {
        const d = Math.sqrt(dSq) || 0.001;
        const nx = dx / d;
        const ny = dy / d;
        b.x = bp.x + nx * minD;
        b.y = bp.y + ny * minD;
        const spd = Math.max(460, Math.hypot(b.vx, b.vy) * (bp.power || 1.22));
        b.vx = nx * spd;
        b.vy = ny * spd;
        if (!isPreview) {
          bp.pulse = 1;
          bounceCount++;
          b.sx = 1.25;
          b.sy = 0.78;
          window.BounceAudio.playTrampoline();
          spawnConfetti(bp.x + nx * bp.r, bp.y + ny * bp.r, 10, ['#f472b6', '#facc15', '#ffffff']);
        }
      }
    }

    // Portals
    for (const pt of portals) {
      if (b.portalCooldown > 0) continue;
      const dA = Math.hypot(b.x - pt.ax, b.y - pt.ay);
      if (dA < pt.r + 6) {
        b.x = pt.bx;
        b.y = pt.by;
        b.portalCooldown = 0.45;
        if (!isPreview) {
          bounceCount++;
          window.BounceAudio.playPortal();
          spawnConfetti(pt.ax, pt.ay, 12, ['#38bdf8', '#ffffff']);
          spawnConfetti(pt.bx, pt.by, 14, ['#fb923c', '#facc15']);
        }
      }
    }

    // Hoop backboard & rims
    const rimLeftX = hoop.x - hoop.rimW / 2;
    const rimRightX = hoop.x + hoop.rimW / 2;
    const boardX = hoop.facing === 'left' ? rimRightX + 4 : rimLeftX - 18;
    if (collideCircleRect(b, boardX, hoop.y - 74, 14, 96, 0.75, false, 1)) {
      if (!isPreview) {
        bounceCount++;
        window.BounceAudio.playRimClank();
      }
    }
    if (collideCirclePoint(b, rimLeftX, hoop.y, 7, 0.65) || collideCirclePoint(b, rimRightX, hoop.y, 7, 0.65)) {
      if (!isPreview) {
        window.BounceAudio.playRimClank();
      }
    }
  }

  function onBallBounce(intensity) {
    bounceCount++;
    ball.sx = 1.24;
    ball.sy = 0.78;
    window.BounceAudio.playBounce(intensity);
  }

  function checkScoreAndStars(prevY) {
    // Collect stars
    for (const st of stars) {
      if (st.collected) continue;
      if (Math.hypot(ball.x - st.x, ball.y - st.y) < BALL_R + 22) {
        st.collected = true;
        window.BounceAudio.playStar();
        spawnConfetti(st.x, st.y, 14, ['#facc15', '#fef08a', '#ffffff']);
      }
    }

    // Check hoop swish (ball center passes downward across hoop.y between rims)
    const rimLeftX = hoop.x - hoop.rimW / 2 + 8;
    const rimRightX = hoop.x + hoop.rimW / 2 - 8;
    if (
      ball.vy > 0 &&
      prevY <= hoop.y + 8 &&
      ball.y >= hoop.y - 4 &&
      ball.x >= rimLeftX &&
      ball.x <= rimRightX
    ) {
      onScored();
    }
  }

  function onScored() {
    gameState = 'scored';
    scoreTimer = 0;
    netWiggle = 1;
    window.BounceAudio.playSwish();
    spawnConfetti(hoop.x, hoop.y + 10, 52);

    const collectedCount = stars.filter((s) => s.collected).length;
    const rating = Math.min(3, 1 + collectedCount);
    const earned = 3 + collectedCount * 2 + (bounceCount > 0 ? 1 : 0);
    save.stars += earned;

    if (!activeLevel.isEndless) {
      const prev = save.levelStars[String(activeLevel.id)] || 0;
      save.levelStars[String(activeLevel.id)] = Math.max(prev, rating);
      if (activeLevel.id >= save.unlockedLevel && activeLevel.id < LEVELS.length) {
        save.unlockedLevel = activeLevel.id + 1;
      }
      save.currentLevel = Math.min(LEVELS.length, activeLevel.id + 1);
    } else {
      save.endlessBest = Math.max(save.endlessBest, activeLevel.endlessRound);
    }
    persistSave();
    updateHud();

    winTitle.textContent = bounceCount >= 2 ? '🔥 MEGA TRICK SHOT!' : bounceCount === 1 ? '✨ BANK SHOT SWISH!' : '🏀 SWISH!!';
    winStars.textContent = '⭐'.repeat(rating) + '☆'.repeat(3 - rating);
    winSub.textContent = `You won +${earned} Stars!`;
    btnNext.textContent = activeLevel.isEndless
      ? `TRICK SHOT #${activeLevel.endlessRound + 1} ▶`
      : activeLevel.id < LEVELS.length
        ? `LEVEL ${activeLevel.id + 1} ▶`
        : '🌈 ENDLESS TRICK SHOTS ▶';
  }

  // ==================== TRAJECTORY PREVIEW ====================
  function computeTrajectoryDots() {
    const speed = 520 + aimPower * 650;
    const sim = {
      x: ball.x,
      y: ball.y,
      vx: Math.cos(aimAngle) * speed,
      vy: Math.sin(aimAngle) * speed,
      portalCooldown: 0,
    };
    const dots = [];
    const totalSteps = save.mode === 'kid' ? 54 : 20;
    const stepDt = 1 / 60;
    for (let i = 0; i < totalSteps; i++) {
      stepPhysics(sim, stepDt, true);
      if (i % 3 === 1) {
        dots.push({ x: sim.x, y: sim.y });
      }
    }
    return dots;
  }

  // ==================== RENDERING ====================
  function drawBackground(w, h) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, activeWorld.skyTop);
    grad.addColorStop(1, activeWorld.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Decorative clouds or stars in stage coords
    ctx.save();
    ctx.translate(viewOffsetX, viewOffsetY);
    ctx.scale(viewScale, viewScale);

    if (activeWorld.id === 'sky') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      for (let i = 0; i < 24; i++) {
        const sx = ((i * 173) % (STAGE_W - 60)) + 30;
        const sy = ((i * 97) % 300) + 30;
        const r = 2 + (i % 3);
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 250 + simTime * 10) % (STAGE_W + 160)) - 80;
        const cy = 75 + (i % 2) * 58;
        ctx.beginPath();
        ctx.arc(cx, cy, 32, 0, Math.PI * 2);
        ctx.arc(cx + 28, cy - 8, 26, 0, Math.PI * 2);
        ctx.arc(cx + 54, cy, 28, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawStage() {
    ctx.save();
    ctx.translate(viewOffsetX, viewOffsetY);
    ctx.scale(viewScale, viewScale);

    // Outer playful arena border
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, STAGE_W - 32, STAGE_H - 32);

    // Floor
    ctx.fillStyle = activeWorld.floorFill;
    ctx.fillRect(16, FLOOR_Y, STAGE_W - 32, STAGE_H - FLOOR_Y - 16);
    ctx.fillStyle = activeWorld.floorStroke;
    ctx.fillRect(16, FLOOR_Y, STAGE_W - 32, 8);

    // Start pad
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(activeLevel.ball.x - 38, FLOOR_Y - 6, 76, 12, 6);
    ctx.fill();

    // Walls
    for (const w of walls) {
      ctx.fillStyle = activeWorld.wallFill;
      ctx.strokeStyle = activeWorld.wallStroke;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(w.x, w.y, w.w, w.h, 12);
      ctx.fill();
      ctx.stroke();

      // Glossy highlight
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath();
      ctx.roundRect(w.x + 6, w.y + 6, Math.max(6, w.w - 12), 10, 5);
      ctx.fill();
    }

    // Trampolines
    for (const tr of trampolines) {
      const sq = tr.squash * 6;
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(tr.x, tr.y + sq, tr.w, tr.h - sq * 0.5, 10);
      ctx.fill();
      ctx.stroke();

      // Up arrows on trampoline
      ctx.fillStyle = '#fef08a';
      ctx.font = '900 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▲  ▲  ▲', tr.x + tr.w / 2, tr.y + 15 + sq * 0.6);
    }

    // Bumpers
    for (const bp of bumpers) {
      const r = bp.r + bp.pulse * 8;
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Portals
    for (const pt of portals) {
      drawPortal(pt.ax, pt.ay, pt.r, '#38bdf8', '#e0f2fe');
      drawPortal(pt.bx, pt.by, pt.r, '#fb923c', '#ffedd5');
    }

    // Collectible Stars
    for (const st of stars) {
      if (st.collected) continue;
      const bob = Math.sin(simTime * 4 + st.phase) * 5;
      drawStarShape(st.x, st.y + bob, 18, '#facc15', '#ffffff');
    }

    // Hoop (backboard + net + rim)
    drawHoop();

    // Dotted Rainbow Trajectory Preview while aiming
    if (gameState === 'aim' && isHolding) {
      const dots = computeTrajectoryDots();
      const rainbow = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a855f7'];
      for (let i = 0; i < dots.length; i++) {
        const alpha = 1 - (i / dots.length) * 0.65;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = rainbow[i % rainbow.length];
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(dots[i].x, dots[i].y, 6.5 - (i / dots.length) * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Power ring around ball
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R + 12, -Math.PI / 2, -Math.PI / 2 + aimPower * Math.PI * 2);
      ctx.stroke();
    }

    // Ball Trail
    for (let i = 0; i < ball.trail.length; i++) {
      const pt = ball.trail[i];
      const frac = i / ball.trail.length;
      ctx.globalAlpha = frac * 0.45;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, BALL_R * frac * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Bouncy Character Ball!
    drawCharacterBall();

    // Particles
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawPortal(x, y, r, color, inner) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(simTime * 2.5);
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = inner;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStarShape(cx, cy, r, fill, stroke) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.48;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawHoop() {
    const rimLeftX = hoop.x - hoop.rimW / 2;
    const rimRightX = hoop.x + hoop.rimW / 2;
    const boardX = hoop.facing === 'left' ? rimRightX + 4 : rimLeftX - 18;

    // Backboard
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(boardX, hoop.y - 74, 14, 96, 6);
    ctx.fill();
    ctx.stroke();

    // Animated Net
    const wig = Math.sin(simTime * 26) * netWiggle * 12;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rimLeftX + 4, hoop.y);
    ctx.lineTo(rimLeftX + 16 + wig, hoop.y + 52);
    ctx.lineTo(rimRightX - 16 + wig, hoop.y + 52);
    ctx.lineTo(rimRightX - 4, hoop.y);
    // Cross net lines
    ctx.moveTo(rimLeftX + 16, hoop.y);
    ctx.lineTo(rimRightX - 24 + wig, hoop.y + 52);
    ctx.moveTo(rimRightX - 16, hoop.y);
    ctx.lineTo(rimLeftX + 24 + wig, hoop.y + 52);
    ctx.stroke();

    // Rim bar
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rimLeftX, hoop.y);
    ctx.lineTo(rimRightX, hoop.y);
    ctx.stroke();
  }

  function drawCharacterBall() {
    const ch = getChar(save.char);
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.scale(ball.sx, ball.sy);

    // Body color (rainbow cycles!)
    let bodyColor = ch.body;
    if (ch.rainbow) {
      bodyColor = `hsl(${(simTime * 140) % 360}, 92%, 60%)`;
    }

    // Ears for Kitty / Frog
    if (ch.id === 'cat') {
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 16, -12);
        ctx.lineTo(side * 22, -28);
        ctx.lineTo(side * 4, -20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (ch.id === 'frog') {
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * 12, -18, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Main circle body
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glossy highlight
    ctx.fillStyle = ch.highlight;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(-7, -9, 7, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Expressive eyes looking along velocity / aim!
    const lookAngle = gameState === 'flying' ? Math.atan2(ball.vy, ball.vx) : aimAngle;
    const lx = Math.cos(lookAngle) * 3.5;
    const ly = Math.sin(lookAngle) * 3.5;

    for (const ex of [-7, 7]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, -3, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(ex + lx * 0.55, -3 + ly * 0.55, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cute smile
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 4, 5.5, 0.15, Math.PI - 0.15);
    ctx.stroke();

    ctx.restore();
  }

  // ==================== MAIN LOOP ====================
  let lastFrame = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.033, (now - lastFrame) / 1000);
    lastFrame = now;
    simTime += dt;

    updateMovingParts(simTime);
    updateParticles(dt);

    // Recover squash & animations
    ball.sx += (1 - ball.sx) * Math.min(1, dt * 12);
    ball.sy += (1 - ball.sy) * Math.min(1, dt * 12);
    netWiggle = Math.max(0, netWiggle - dt * 1.8);
    for (const tr of trampolines) tr.squash = Math.max(0, tr.squash - dt * 5);
    for (const bp of bumpers) bp.pulse = Math.max(0, bp.pulse - dt * 5);

    if (gameState === 'aim' && isHolding) {
      holdTime += dt;
      // Smoothly oscillate power up & down (classic Blumgi hold-to-charge!)
      const wave = 0.5 - 0.5 * Math.cos(holdTime * 2.5);
      aimPower = 0.22 + wave * 0.78;
      if (!dragAimActive) {
        // Gentle helpful aim angle
        aimAngle = -0.88 - wave * 0.12;
      }
      ball.sx = 1 + aimPower * 0.16;
      ball.sy = 1 - aimPower * 0.14;
    } else if (gameState === 'flying') {
      flyTime += dt;
      const prevY = ball.y;
      // Sub-step twice for crisp collision stability
      stepPhysics(ball, dt * 0.5, false);
      stepPhysics(ball, dt * 0.5, false);
      checkScoreAndStars(prevY);

      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 14) ball.trail.shift();

      const spd = Math.hypot(ball.vx, ball.vy);
      if (spd < 45 && ball.y > FLOOR_Y - BALL_R - 8) {
        restTimer += dt;
      } else {
        restTimer = 0;
      }

      if (restTimer > 0.75 || flyTime > 6.5) {
        resetBall();
      }
    } else if (gameState === 'scored') {
      scoreTimer += dt;
      stepPhysics(ball, dt * 0.35, false);
      if (scoreTimer > 0.9 && winScreen.classList.contains('hidden')) {
        winScreen.classList.remove('hidden');
      }
    }

    drawBackground(window.innerWidth, window.innerHeight);
    drawStage();
  }

  // ==================== UI & DIALOGS ====================
  function updateHud() {
    hudStars.textContent = `⭐ ${save.stars}`;
    if (activeLevel && activeWorld) {
      hudLevel.textContent = activeLevel.isEndless
        ? `🌈 #${activeLevel.endlessRound}`
        : `${activeWorld.emoji} Lv ${activeLevel.id}`;
    }
    btnSound.textContent = save.sfx ? '🔊' : '🔇';
  }

  function updateStartUI() {
    const lvl = LEVELS[Math.min(save.currentLevel - 1, LEVELS.length - 1)];
    const w = getWorld(lvl.world);
    startLevelPill.textContent = `${w.emoji} Level ${lvl.id}: ${lvl.name}`;
    if (save.mode === 'kid') {
      modePill.textContent = '🧸 Kid Mode (Ages 5+)';
      modePill.classList.remove('big-kid');
    } else {
      modePill.textContent = '⚡ Big Kid Mode (Ages 7+)';
      modePill.classList.add('big-kid');
    }
    updateHud();
  }

  function startLevel(lvl) {
    window.BounceAudio.unlock();
    loadLevel(lvl);
    gameState = 'aim';
    startScreen.classList.add('hidden');
    winScreen.classList.add('hidden');
    btnHome.classList.remove('hidden');
    btnRetryShot.classList.remove('hidden');
    tipPill.textContent = `💡 ${lvl.tip}`;
    tipPill.classList.remove('hidden');
  }

  function goToMenu() {
    gameState = 'menu';
    winScreen.classList.add('hidden');
    btnHome.classList.add('hidden');
    btnRetryShot.classList.add('hidden');
    tipPill.classList.add('hidden');
    startScreen.classList.remove('hidden');
    const lvl = LEVELS[Math.min(save.currentLevel - 1, LEVELS.length - 1)];
    loadLevel(lvl);
    updateStartUI();
  }

  function renderLevelsDialog() {
    levelsBody.innerHTML = '';
    for (const w of WORLDS) {
      const card = document.createElement('div');
      card.className = 'world-card';
      card.innerHTML = `<div class="world-title">${w.emoji} ${w.name}</div>`;
      const grid = document.createElement('div');
      grid.className = 'level-grid';
      for (const lvl of LEVELS.filter((l) => l.world === w.id)) {
        const unlocked = save.unlockAll || lvl.id <= save.unlockedLevel;
        const st = save.levelStars[String(lvl.id)] || 0;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'level-tile' + (lvl.id === save.currentLevel ? ' current' : '');
        btn.disabled = !unlocked;
        btn.innerHTML = `
          <span class="level-num">${unlocked ? lvl.id : '🔒'}</span>
          <span class="level-stars">${unlocked ? '⭐'.repeat(st) + '☆'.repeat(3 - st) : ''}</span>
        `;
        btn.addEventListener('click', () => {
          window.BounceAudio.playClick();
          save.currentLevel = lvl.id;
          persistSave();
          levelsDialog.close();
          startLevel(lvl);
        });
        grid.appendChild(btn);
      }
      card.appendChild(grid);
      levelsBody.appendChild(card);
    }

    const endBtn = document.createElement('button');
    endBtn.type = 'button';
    endBtn.className = 'btn-toy btn-gold';
    endBtn.style.width = '100%';
    endBtn.textContent = save.endlessBest > 0
      ? `🌈 Endless Trick Shots (Best #${save.endlessBest})`
      : '🌈 Play Endless Trick Shots!';
    endBtn.addEventListener('click', () => {
      window.BounceAudio.playClick();
      endlessRound = 1;
      levelsDialog.close();
      startLevel(generateEndlessLevel(endlessRound));
    });
    levelsBody.appendChild(endBtn);
  }

  function renderCharsDialog() {
    charsBody.innerHTML = '';
    const bal = document.createElement('div');
    bal.style.fontWeight = '900';
    bal.textContent = `Your Stars: ⭐ ${save.stars}`;
    charsBody.appendChild(bal);

    const grid = document.createElement('div');
    grid.className = 'char-grid';
    for (const ch of CHARACTERS) {
      const owned = save.ownedChars.includes(ch.id);
      const eq = save.char === ch.id;
      const card = document.createElement('div');
      card.className = 'char-card' + (eq ? ' equipped' : '');
      card.innerHTML = `
        <div class="char-emoji">${ch.emoji}</div>
        <div class="char-name">${ch.name}</div>
      `;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'char-btn' + (eq ? ' eq' : '');
      if (eq) {
        btn.textContent = '✓ Playing';
        btn.disabled = true;
      } else if (owned) {
        btn.textContent = 'Pick Buddy';
        btn.addEventListener('click', () => {
          save.char = ch.id;
          persistSave();
          window.BounceAudio.playClick();
          renderCharsDialog();
        });
      } else {
        btn.textContent = `⭐ ${ch.cost}`;
        btn.disabled = save.stars < ch.cost;
        btn.addEventListener('click', () => {
          if (save.stars < ch.cost) return;
          save.stars -= ch.cost;
          save.ownedChars.push(ch.id);
          save.char = ch.id;
          persistSave();
          window.BounceAudio.playUnlock();
          updateHud();
          renderCharsDialog();
        });
      }
      card.appendChild(btn);
      grid.appendChild(card);
    }
    charsBody.appendChild(grid);
  }

  function syncSettings() {
    modeKidBtn.classList.toggle('active', save.mode === 'kid');
    modeProBtn.classList.toggle('active', save.mode === 'pro');
    toggleSfxBtn.textContent = save.sfx ? 'ON' : 'OFF';
    toggleSfxBtn.classList.toggle('on', save.sfx);
    toggleUnlockBtn.textContent = save.unlockAll ? 'ON' : 'OFF';
    toggleUnlockBtn.classList.toggle('on', save.unlockAll);
  }

  // Wire buttons
  btnPlay.addEventListener('click', () => {
    window.BounceAudio.playClick();
    startLevel(LEVELS[Math.min(save.currentLevel - 1, LEVELS.length - 1)]);
  });
  btnNext.addEventListener('click', () => {
    window.BounceAudio.playClick();
    if (activeLevel.isEndless) {
      endlessRound++;
      startLevel(generateEndlessLevel(endlessRound));
    } else if (activeLevel.id < LEVELS.length) {
      startLevel(LEVELS[activeLevel.id]);
    } else {
      endlessRound = 1;
      startLevel(generateEndlessLevel(endlessRound));
    }
  });
  btnReplay.addEventListener('click', () => {
    window.BounceAudio.playClick();
    startLevel(activeLevel);
  });
  btnRetryShot.addEventListener('click', () => {
    window.BounceAudio.playClick();
    resetBall();
  });
  btnHome.addEventListener('click', () => {
    window.BounceAudio.playClick();
    goToMenu();
  });
  btnSound.addEventListener('click', () => {
    save.sfx = !save.sfx;
    window.BounceAudio.setSfx(save.sfx);
    persistSave();
    updateHud();
  });
  btnLevels.addEventListener('click', () => {
    window.BounceAudio.playClick();
    renderLevelsDialog();
    levelsDialog.showModal();
  });
  btnChars.addEventListener('click', () => {
    window.BounceAudio.playClick();
    renderCharsDialog();
    charsDialog.showModal();
  });
  btnWinChars.addEventListener('click', () => {
    window.BounceAudio.playClick();
    renderCharsDialog();
    charsDialog.showModal();
  });
  btnSettings.addEventListener('click', () => {
    window.BounceAudio.playClick();
    syncSettings();
    settingsDialog.showModal();
  });
  modeKidBtn.addEventListener('click', () => {
    save.mode = 'kid';
    persistSave();
    window.BounceAudio.playClick();
    syncSettings();
    updateStartUI();
  });
  modeProBtn.addEventListener('click', () => {
    save.mode = 'pro';
    persistSave();
    window.BounceAudio.playClick();
    syncSettings();
    updateStartUI();
  });
  toggleSfxBtn.addEventListener('click', () => {
    save.sfx = !save.sfx;
    window.BounceAudio.setSfx(save.sfx);
    persistSave();
    syncSettings();
    updateHud();
  });
  toggleUnlockBtn.addEventListener('click', () => {
    save.unlockAll = !save.unlockAll;
    persistSave();
    window.BounceAudio.playClick();
    syncSettings();
  });
  btnResetSave.addEventListener('click', () => {
    if (window.confirm('Restart Bouncy Hoops from Level 1?')) {
      save = JSON.parse(JSON.stringify(DEFAULT_SAVE));
      persistSave();
      window.BounceAudio.setSfx(save.sfx);
      settingsDialog.close();
      goToMenu();
    }
  });

  // Boot
  window.BounceAudio.setSfx(save.sfx);
  goToMenu();
  requestAnimationFrame(loop);
})();
