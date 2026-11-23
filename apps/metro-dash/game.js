// Metro Dash! — 3D Kids Endless Runner (Three.js)
(function () {
  'use strict';

  const SAVE_KEY = 'metro_dash_save_v1';
  const LANES = [-3.0, 0, 3.0];
  const RUNNERS = [
    { id: 'kid', name: 'Dash Kid', emoji: '🧢', cost: 0, body: 0x22c55e, head: 0xfde68a, hat: 0xef4444 },
    { id: 'pup', name: 'Robo Pup', emoji: '🐶', cost: 40, body: 0x3b82f6, head: 0x93c5fd, hat: 0xfacc15 },
    { id: 'dino', name: 'Dino Skater', emoji: '🦖', cost: 85, body: 0x10b981, head: 0x34d399, hat: 0xf97316 },
    { id: 'cat', name: 'Super Cat', emoji: '🐱', cost: 140, body: 0xec4899, head: 0xf9a8d4, hat: 0x8b5cf6 },
  ];

  const DEFAULT_SAVE = { coins: 0, best: 0, runner: 'kid', owned: ['kid'], kidMode: true, sfx: true };
  let save;
  try {
    save = { ...DEFAULT_SAVE, ...(JSON.parse(localStorage.getItem(SAVE_KEY)) || {}) };
    if (!Array.isArray(save.owned)) save.owned = ['kid'];
  } catch (_) {
    save = { ...DEFAULT_SAVE };
  }
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} };

  // Procedural SFX
  let audioCtx = null;
  function beep(freq, dur, type = 'triangle', vol = 0.14, slide = null) {
    if (!save.sfx) return;
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // DOM
  const host = document.getElementById('game-host');
  const hudHearts = document.getElementById('hud-hearts');
  const hudCoins = document.getElementById('hud-coins');
  const hudDist = document.getElementById('hud-dist');
  const btnSound = document.getElementById('btn-sound');
  const btnHome = document.getElementById('btn-home');
  const powerToast = document.getElementById('power-toast');
  const touchPad = document.getElementById('touch-pad');
  const startScreen = document.getElementById('start-screen');
  const bestPill = document.getElementById('best-pill');
  const btnPlay = document.getElementById('btn-play');
  const btnShop = document.getElementById('btn-shop');
  const btnMode = document.getElementById('btn-mode');
  const overScreen = document.getElementById('over-screen');
  const overSub = document.getElementById('over-sub');
  const stDist = document.getElementById('st-dist');
  const stCoins = document.getElementById('st-coins');
  const btnAgain = document.getElementById('btn-again');
  const btnOverShop = document.getElementById('btn-over-shop');
  const shopDialog = document.getElementById('shop-dialog');
  const shopBody = document.getElementById('shop-body');

  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const out = (e, d) => { const r = d.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
    let downOut = false;
    shopDialog.addEventListener('pointerdown', (e) => { downOut = out(e, shopDialog); });
    shopDialog.addEventListener('pointerup', (e) => { if (downOut && out(e, shopDialog)) shopDialog.close(); });
  }
  shopDialog.addEventListener('close', () => { shopDialog.returnValue = ''; });

  // Three.js Setup
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x38bdf8);
  scene.fog = new THREE.Fog(0xbae6fd, 35, 115);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.5, 160);
  camera.position.set(0, 6.2, 10.5);
  camera.lookAt(0, 1.5, -10);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 0.85);
  sun.position.set(12, 24, 14);
  scene.add(sun);

  // Endless Track & Side Buildings
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  const track = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.4, 220), trackMat);
  track.position.set(0, -0.2, -90);
  scene.add(track);

  const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
  for (const lx of LANES) {
    for (const dx of [-0.7, 0.7]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 220), railMat);
      rail.position.set(lx + dx, 0.04, -90);
      scene.add(rail);
    }
  }

  // Scrolling city buildings
  const buildings = [];
  const bColors = [0x6366f1, 0xec4899, 0xf59e0b, 0x10b981, 0x3b82f6, 0x8b5cf6];
  for (let i = 0; i < 24; i++) {
    const h = 6 + (i % 4) * 3.5;
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, h, 7),
      new THREE.MeshStandardMaterial({ color: bColors[i % bColors.length], roughness: 0.7 })
    );
    const side = i % 2 === 0 ? -1 : 1;
    b.position.set(side * 9.5, h / 2 - 0.5, 10 - Math.floor(i / 2) * 14);
    scene.add(b);
    buildings.push(b);
  }

  // Player Mesh
  const playerGroup = new THREE.Group();
  scene.add(playerGroup);
  function rebuildPlayer() {
    while (playerGroup.children.length) playerGroup.remove(playerGroup.children[0]);
    const r = RUNNERS.find((x) => x.id === save.runner) || RUNNERS[0];
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 1.1, 10), new THREE.MeshStandardMaterial({ color: r.body }));
    body.position.y = 0.65;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 10), new THREE.MeshStandardMaterial({ color: r.head }));
    head.position.y = 1.48;
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.54, 0.55, 8), new THREE.MeshStandardMaterial({ color: r.hat }));
    hat.position.y = 1.98;
    const jet = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.35), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    jet.position.set(0, 0.85, 0.48);
    jet.name = 'jetpack';
    jet.visible = false;
    playerGroup.add(body, head, hat, jet);
  }
  rebuildPlayer();

  // Dynamic World Objects
  const objGroup = new THREE.Group();
  scene.add(objGroup);
  let obstacles = [];
  let coins = [];
  let powerups = [];

  // Game State
  let state = 'menu'; // 'menu' | 'playing' | 'over'
  let lane = 1;
  let playerX = 0;
  let playerY = 0;
  let playerVy = 0;
  let hearts = 3;
  let invuln = 0;
  let jetpackTimer = 0;
  let magnetTimer = 0;
  let runCoins = 0;
  let distance = 0;
  let spawnTimer = 0;
  let runTime = 0;
  let toastTimer = null;

  function showToast(msg) {
    powerToast.textContent = msg;
    powerToast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => powerToast.classList.remove('show'), 1400);
  }

  function clearWorld() {
    while (objGroup.children.length) objGroup.remove(objGroup.children[0]);
    obstacles = [];
    coins = [];
    powerups = [];
  }

  const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.14, 12);
  const coinMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.3 });
  const trainColors = [0xef4444, 0x3b82f6, 0x22c55e, 0xa855f7, 0xf97316];

  function spawnRow() {
    const z = -98;
    const openLane = Math.floor(Math.random() * 3);

    // Spawn 1 or 2 obstacles (always leave at least 1 clear lane!)
    for (let l = 0; l < 3; l++) {
      if (l === openLane) continue;
      if (Math.random() < (save.kidMode ? 0.52 : 0.72)) {
        const isTrain = Math.random() < 0.58;
        if (isTrain) {
          const g = new THREE.Group();
          const len = 10;
          const col = trainColors[Math.floor(Math.random() * trainColors.length)];
          const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.7, len), new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 }));
          body.position.y = 1.35;
          const win = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 0.15), new THREE.MeshBasicMaterial({ color: 0xbae6fd }));
          win.position.set(0, 1.9, len / 2 + 0.05);
          g.add(body, win);
          g.position.set(LANES[l], 0, z);
          objGroup.add(g);
          obstacles.push({ mesh: g, lane: l, z, halfLen: len / 2, height: 2.7, hit: false });
        } else {
          // Jumpable candy-striped barrier
          const g = new THREE.Group();
          const bar = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.05, 0.55), new THREE.MeshStandardMaterial({ color: 0xf97316 }));
          bar.position.y = 0.55;
          const top = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.25, 0.6), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
          top.position.y = 1.05;
          g.add(bar, top);
          g.position.set(LANES[l], 0, z);
          objGroup.add(g);
          obstacles.push({ mesh: g, lane: l, z, halfLen: 0.5, height: 1.15, hit: false });
        }
      }
    }

    // Spawn line of coins in open lane
    const coinY = jetpackTimer > 0 ? 4.4 : 0.85;
    for (let c = 0; c < 5; c++) {
      const m = new THREE.Mesh(coinGeo, coinMat);
      m.rotation.z = Math.PI / 2;
      m.position.set(LANES[openLane], coinY, z - c * 2.5);
      objGroup.add(m);
      coins.push({ mesh: m, taken: false });
    }

    // Occasional Power-up (Jetpack or Magnet)
    if (Math.random() < 0.22) {
      const type = Math.random() < 0.5 ? 'jetpack' : 'magnet';
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.65, 0),
        new THREE.MeshStandardMaterial({
          color: type === 'jetpack' ? 0xf43f5e : 0x38bdf8,
          emissive: type === 'jetpack' ? 0xbe123c : 0x0284c7,
          emissiveIntensity: 0.5,
        })
      );
      m.position.set(LANES[openLane], 1.2, z + 5);
      objGroup.add(m);
      powerups.push({ mesh: m, type, taken: false });
    }
  }

  function moveLane(dir) {
    if (state !== 'playing') return;
    const next = Math.max(0, Math.min(2, lane + dir));
    if (next !== lane) {
      lane = next;
      beep(dir > 0 ? 520 : 440, 0.08, 'sine', 0.1, dir > 0 ? 640 : 380);
    }
  }

  function doJump() {
    if (state !== 'playing' || jetpackTimer > 0) return;
    if (playerY <= 0.05) {
      playerVy = 13.5;
      beep(320, 0.14, 'triangle', 0.14, 680);
    }
  }

  // Swipe + Keyboard + Touch Buttons
  let swipeStart = null;
  renderer.domElement.addEventListener('pointerdown', (e) => {
    swipeStart = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointerup', (e) => {
    if (!swipeStart || state !== 'playing') return;
    const dx = e.clientX - swipeStart.x;
    const dy = e.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.hypot(dx, dy) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) moveLane(dx > 0 ? 1 : -1);
    else if (dy < -18) doJump();
  });

  window.addEventListener('keydown', (e) => {
    if (state !== 'playing') return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveLane(-1);
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveLane(1);
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.code === 'Space') { e.preventDefault(); doJump(); }
  });

  document.getElementById('pad-left').addEventListener('click', () => moveLane(-1));
  document.getElementById('pad-right').addEventListener('click', () => moveLane(1));
  document.getElementById('pad-jump').addEventListener('click', () => doJump());

  function updateHud() {
    hudHearts.textContent = '❤️'.repeat(Math.max(0, hearts)) + '🤍'.repeat(Math.max(0, (save.kidMode ? 3 : 1) - hearts));
    hudCoins.textContent = `🪙 ${save.coins + runCoins}`;
    hudDist.textContent = `${Math.floor(distance)}m`;
    btnSound.textContent = save.sfx ? '🔊' : '🔇';
    btnMode.textContent = save.kidMode ? '🧸 Kid Mode' : '⚡ Big Kid';
    bestPill.textContent = `🏆 Best: ${save.best}m • 🪙 ${save.coins}`;
  }

  function startGame() {
    clearWorld();
    state = 'playing';
    lane = 1;
    playerX = 0;
    playerY = 0;
    playerVy = 0;
    hearts = save.kidMode ? 3 : 1;
    invuln = 0;
    jetpackTimer = 0;
    magnetTimer = 0;
    runCoins = 0;
    distance = 0;
    spawnTimer = 0.3;
    startScreen.classList.add('hidden');
    overScreen.classList.add('hidden');
    btnHome.classList.remove('hidden');
    touchPad.classList.remove('hidden');
    updateHud();
    beep(523, 0.12, 'triangle', 0.14, 784);
  }

  function endGame() {
    state = 'over';
    save.coins += runCoins;
    const d = Math.floor(distance);
    if (d > save.best) save.best = d;
    persist();
    touchPad.classList.add('hidden');
    stDist.textContent = `${d}m`;
    stCoins.textContent = `+${runCoins} 🪙`;
    overSub.textContent = d >= save.best && d > 0 ? '🌟 NEW RECORD!' : 'Awesome dodging!';
    overScreen.classList.remove('hidden');
    updateHud();
    beep(392, 0.22, 'triangle', 0.15, 523);
  }

  function goHome() {
    state = 'menu';
    clearWorld();
    startScreen.classList.remove('hidden');
    overScreen.classList.add('hidden');
    btnHome.classList.add('hidden');
    touchPad.classList.add('hidden');
    updateHud();
  }

  function renderShop() {
    shopBody.innerHTML = '';
    for (const r of RUNNERS) {
      const owned = save.owned.includes(r.id);
      const eq = save.runner === r.id;
      const div = document.createElement('div');
      div.className = 'shop-item' + (eq ? ' eq' : '');
      div.innerHTML = `<div class="em">${r.emoji}</div><div class="nm">${r.name}</div>`;
      const b = document.createElement('button');
      b.type = 'button';
      if (eq) { b.textContent = '✓ Running'; b.disabled = true; }
      else if (owned) {
        b.textContent = 'Pick';
        b.addEventListener('click', () => { save.runner = r.id; persist(); rebuildPlayer(); renderShop(); });
      } else {
        b.textContent = `🪙 ${r.cost}`;
        b.disabled = save.coins < r.cost;
        b.addEventListener('click', () => {
          if (save.coins < r.cost) return;
          save.coins -= r.cost; save.owned.push(r.id); save.runner = r.id;
          persist(); rebuildPlayer(); updateHud(); renderShop();
          beep(660, 0.18, 'triangle', 0.15, 990);
        });
      }
      div.appendChild(b);
      shopBody.appendChild(div);
    }
  }

  btnPlay.addEventListener('click', startGame);
  btnAgain.addEventListener('click', startGame);
  btnHome.addEventListener('click', goHome);
  btnSound.addEventListener('click', () => { save.sfx = !save.sfx; persist(); updateHud(); });
  btnMode.addEventListener('click', () => { save.kidMode = !save.kidMode; persist(); updateHud(); });
  btnShop.addEventListener('click', () => { renderShop(); shopDialog.showModal(); });
  btnOverShop.addEventListener('click', () => { renderShop(); shopDialog.showModal(); });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Main Loop
  let last = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    runTime += dt;

    const baseSpeed = save.kidMode ? 17 : 23;
    const speed = state === 'playing'
      ? Math.min(34, baseSpeed + distance * 0.015) * (jetpackTimer > 0 ? 1.45 : 1)
      : 7;

    // Scroll side buildings
    for (const b of buildings) {
      b.position.z += speed * dt;
      if (b.position.z > 20) b.position.z -= 168;
    }

    // Shift sky color gently by biome every 150m
    const biome = Math.floor(distance / 150) % 3;
    const skyColors = [0x38bdf8, 0xfb923c, 0xa855f7];
    scene.background.lerp(new THREE.Color(skyColors[biome]), dt * 1.5);

    if (state === 'playing') {
      distance += speed * dt * 0.45;
      if (invuln > 0) invuln -= dt;
      if (jetpackTimer > 0) jetpackTimer -= dt;
      if (magnetTimer > 0) magnetTimer -= dt;

      const jetMesh = playerGroup.getObjectByName('jetpack');
      if (jetMesh) jetMesh.visible = jetpackTimer > 0;

      // Smooth lane movement & jump/jetpack
      playerX += (LANES[lane] - playerX) * Math.min(1, dt * 15);
      if (jetpackTimer > 0) {
        playerY += (4.3 - playerY) * Math.min(1, dt * 7);
        playerVy = 0;
      } else {
        playerVy -= 34 * dt;
        playerY += playerVy * dt;
        if (playerY < 0) { playerY = 0; playerVy = 0; }
      }

      playerGroup.position.set(playerX, playerY + (playerY === 0 ? Math.abs(Math.sin(runTime * 13)) * 0.22 : 0), 0);
      playerGroup.visible = invuln <= 0 || Math.floor(runTime * 16) % 2 === 0;

      // Spawn rows
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnRow();
        spawnTimer = Math.max(0.85, (save.kidMode ? 1.55 : 1.15) - distance * 0.0005);
      }

      // Update obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.z += speed * dt;
        o.mesh.position.z = o.z;
        if (o.z > 16) { objGroup.remove(o.mesh); obstacles.splice(i, 1); continue; }

        if (!o.hit && invuln <= 0 && jetpackTimer <= 0) {
          if (Math.abs(o.z) < o.halfLen + 0.55 && Math.abs(playerX - LANES[o.lane]) < 1.1 && playerY < o.height - 0.15) {
            o.hit = true;
            hearts -= 1;
            invuln = 1.6;
            beep(180, 0.2, 'sawtooth', 0.12, 90);
            if (hearts <= 0) { endGame(); break; }
            else showToast('🛡️ OOPS! KEEP RUNNING!');
          }
        }
      }

      // Update coins
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        c.mesh.position.z += speed * dt;
        c.mesh.rotation.y += dt * 4;
        if (c.mesh.position.z > 12) { objGroup.remove(c.mesh); coins.splice(i, 1); continue; }
        if (c.taken) continue;

        if (magnetTimer > 0 && Math.abs(c.mesh.position.z) < 12) {
          c.mesh.position.x += (playerX - c.mesh.position.x) * Math.min(1, dt * 12);
          c.mesh.position.y += (playerY + 1 - c.mesh.position.y) * Math.min(1, dt * 12);
        }
        if (Math.hypot(c.mesh.position.x - playerX, c.mesh.position.y - (playerY + 1), c.mesh.position.z) < 1.45) {
          c.taken = true;
          c.mesh.visible = false;
          runCoins += 1;
          beep(880, 0.08, 'sine', 0.1, 1200);
        }
      }

      // Update power-ups
      for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.mesh.position.z += speed * dt;
        p.mesh.rotation.y += dt * 3;
        if (p.mesh.position.z > 12) { objGroup.remove(p.mesh); powerups.splice(i, 1); continue; }
        if (!p.taken && Math.hypot(p.mesh.position.x - playerX, p.mesh.position.z) < 1.6) {
          p.taken = true;
          p.mesh.visible = false;
          if (p.type === 'jetpack') { jetpackTimer = 5.5; showToast('🚀 RAINBOW JETPACK!'); }
          else { magnetTimer = 7.0; showToast('🧲 COIN MAGNET!'); }
          beep(523, 0.25, 'triangle', 0.16, 1046);
        }
      }

      updateHud();
    } else {
      playerGroup.position.set(0, Math.abs(Math.sin(runTime * 6)) * 0.2, 0);
      playerGroup.visible = true;
    }

    camera.position.x += (playerX * 0.45 - camera.position.x) * Math.min(1, dt * 6);
    camera.position.y += (6.0 + playerY * 0.45 - camera.position.y) * Math.min(1, dt * 5);
    camera.lookAt(playerX * 0.25, 1.4 + playerY * 0.35, -10);
    renderer.render(scene, camera);
  }

  updateHud();
  requestAnimationFrame(animate);
})();
