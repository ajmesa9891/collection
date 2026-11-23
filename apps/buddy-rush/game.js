// Buddy Rush! — Full 3D Three.js Crowd-Runner Game
(function () {
  'use strict';

  const SAVE_KEY = 'buddy_rush_save_v1';
  const TRACK_WIDTH = 12;
  const TRACK_HALF = TRACK_WIDTH / 2;
  const MAX_VISUAL_BUDDIES = 72;
  const GOLDEN_ANGLE = 2.399963229728653;

  // ==================== SAVE STATE ====================
  const DEFAULT_SAVE = {
    stars: 0,
    unlockedLevel: 1, // 1..15
    currentLevel: 1,
    levelStars: {}, // { "1": 3, "2": 2, ... }
    skin: 'bot',
    ownedSkins: ['bot'],
    upgrades: {
      startSquad: 0, // 0..4
      power: 0,      // 0..4
      magnet: 0,     // 0..4
    },
    mode: 'little', // 'little' (4-5 yrs) | 'big' (6+ yrs)
    sfx: true,
    music: true,
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
        upgrades: { ...DEFAULT_SAVE.upgrades, ...(parsed.upgrades || {}) },
        levelStars: { ...(parsed.levelStars || {}) },
        ownedSkins: Array.isArray(parsed.ownedSkins) ? parsed.ownedSkins : ['bot'],
      };
    } catch (_) {
      return JSON.parse(JSON.stringify(DEFAULT_SAVE));
    }
  }

  let save = loadSave();
  function persistSave() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (_) {}
  }

  // ==================== DOM REFERENCES ====================
  const container = document.getElementById('game-container');
  const hudLevel = document.getElementById('hud-level');
  const hudStars = document.getElementById('hud-stars');
  const btnSound = document.getElementById('btn-sound');
  const btnHome = document.getElementById('btn-home');
  const progressWrap = document.getElementById('progress-wrap');
  const progressFill = document.getElementById('progress-fill');
  const progressRunner = document.getElementById('progress-runner');
  const progressBoss = document.getElementById('progress-boss');
  const squadBadge = document.getElementById('squad-badge');
  const bossHud = document.getElementById('boss-hud');
  const bossNameEl = document.getElementById('boss-name');
  const bossBarFill = document.getElementById('boss-bar-fill');
  const toastBanner = document.getElementById('toast-banner');
  const dragHint = document.getElementById('drag-hint');

  const startScreen = document.getElementById('start-screen');
  const modePill = document.getElementById('mode-pill');
  const startLevelPreview = document.getElementById('start-level-preview');
  const btnPlay = document.getElementById('btn-play');
  const btnWorlds = document.getElementById('btn-worlds');
  const btnShop = document.getElementById('btn-shop');
  const btnSettings = document.getElementById('btn-settings');

  const resultScreen = document.getElementById('result-screen');
  const resultTitle = document.getElementById('result-title');
  const resultStars = document.getElementById('result-stars');
  const resultSubtitle = document.getElementById('result-subtitle');
  const statBuddies = document.getElementById('stat-buddies');
  const statStars = document.getElementById('stat-stars');
  const btnNext = document.getElementById('btn-next');
  const btnReplay = document.getElementById('btn-replay');
  const btnResultShop = document.getElementById('btn-result-shop');

  const worldsDialog = document.getElementById('worlds-dialog');
  const worldsList = document.getElementById('worlds-list');
  const shopDialog = document.getElementById('shop-dialog');
  const shopBody = document.getElementById('shop-body');
  const settingsDialog = document.getElementById('settings-dialog');
  const modeLittleBtn = document.getElementById('mode-little');
  const modeBigBtn = document.getElementById('mode-big');
  const toggleSfxBtn = document.getElementById('toggle-sfx');
  const toggleMusicBtn = document.getElementById('toggle-music');
  const toggleUnlockBtn = document.getElementById('toggle-unlock');
  const btnReset = document.getElementById('btn-reset');

  // Progressive enhancement fallback for <dialog closedby="any"> (Safari)
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (e, dialog) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => {
        pressedOutside = outside(e, dialog);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && outside(e, dialog)) dialog.close();
      });
    }
  }

  for (const dialog of [worldsDialog, shopDialog, settingsDialog]) {
    dialog.addEventListener('close', () => {
      dialog.returnValue = '';
    });
  }

  // ==================== THREE.JS SETUP ====================
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.5, 240);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.88);
  hemiLight.position.set(0, 40, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(14, 28, 16);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 2;
  dirLight.shadow.camera.far = 90;
  const dCam = 22;
  dirLight.shadow.camera.left = -dCam;
  dirLight.shadow.camera.right = dCam;
  dirLight.shadow.camera.top = dCam;
  dirLight.shadow.camera.bottom = -dCam;
  scene.add(dirLight);
  scene.add(dirLight.target);

  // World root groups
  const worldGroup = new THREE.Group();
  const squadGroup = new THREE.Group();
  const particleGroup = new THREE.Group();
  scene.add(worldGroup);
  scene.add(squadGroup);
  scene.add(particleGroup);

  // Shared geometries for performance
  const GEOS = {
    bodyCyl: new THREE.CylinderGeometry(0.28, 0.32, 0.56, 10),
    headSphere: new THREE.SphereGeometry(0.28, 10, 10),
    eyeSphere: new THREE.SphereGeometry(0.055, 6, 6),
    visorBox: new THREE.BoxGeometry(0.34, 0.12, 0.12),
    antennaStick: new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6),
    antennaBall: new THREE.SphereGeometry(0.07, 6, 6),
    beakCone: new THREE.ConeGeometry(0.11, 0.24, 6),
    wingBox: new THREE.BoxGeometry(0.12, 0.22, 0.28),
    earTall: new THREE.CylinderGeometry(0.06, 0.08, 0.42, 6),
    earRound: new THREE.SphereGeometry(0.11, 7, 7),
    spikeCone: new THREE.ConeGeometry(0.09, 0.2, 5),
    crownCyl: new THREE.CylinderGeometry(0.16, 0.12, 0.14, 6),
    starOct: new THREE.OctahedronGeometry(0.45, 0),
    confettiBox: new THREE.BoxGeometry(0.22, 0.22, 0.22),
    slimeBody: new THREE.SphereGeometry(0.36, 10, 8),
  };

  const MAT_EYE = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
  const MAT_WHITE = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const MAT_GOLD = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.35, emissive: 0xca8a04, emissiveIntensity: 0.25 });
  const MAT_CYAN_GLOW = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6, roughness: 0.2 });

  // ==================== GAME STATE ====================
  let gameState = 'menu'; // 'menu' | 'playing' | 'boss' | 'stairs' | 'result'
  let activeLevel = null;
  let activeWorld = null;
  let endlessRound = 0;

  let squadCount = 3;
  let squadX = 0;
  let targetX = 0;
  let squadZ = 0;
  let boostTimer = 0;
  let rescueUsed = false;
  let starsCollected = 0;
  let runTime = 0;
  let cameraShake = 0;
  let hasMovedOnce = false;

  // Dynamic entities in current level
  let visualBuddies = [];
  let gates = [];
  let enemies = [];
  let obstacles = [];
  let collectibles = [];
  let boostPads = [];
  let bossEntity = null;
  let stairSteps = [];
  let stairState = null;
  let particles = [];
  let toastTimeout = null;

  // ==================== PARTICLE SYSTEM ====================
  function spawnBurst(x, y, z, colorHex, count = 12, speed = 5.5) {
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < count; i++) {
      if (particles.length > 180) {
        const old = particles.shift();
        particleGroup.remove(old.mesh);
      }
      const mesh = new THREE.Mesh(GEOS.confettiBox, mat);
      mesh.position.set(x, y, z);
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.35 + Math.random() * 0.85) * speed;
      const p = {
        mesh,
        vx: Math.cos(angle) * spd,
        vy: 2.5 + Math.random() * speed * 0.9,
        vz: Math.sin(angle) * spd,
        rotX: (Math.random() - 0.5) * 10,
        rotY: (Math.random() - 0.5) * 10,
        life: 0.55 + Math.random() * 0.45,
        maxLife: 1.0,
      };
      p.maxLife = p.life;
      particleGroup.add(mesh);
      particles.push(p);
    }
  }

  function spawnRainbowBurst(x, y, z, count = 28) {
    const colors = [0xf43f5e, 0xf97316, 0xfacc15, 0x22c55e, 0x3b82f6, 0xa855f7];
    for (let i = 0; i < colors.length; i++) {
      spawnBurst(x, y, z, colors[i], Math.ceil(count / colors.length), 7.5);
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particleGroup.remove(p.mesh);
        particles.splice(i, 1);
        continue;
      }
      p.vy -= 14 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += p.rotX * dt;
      p.mesh.rotation.y += p.rotY * dt;
      const s = Math.max(0.01, p.life / p.maxLife);
      p.mesh.scale.setScalar(s);
    }
  }

  // ==================== BUDDY MESH BUILDER ====================
  function createBuddyMesh(skin, index) {
    const group = new THREE.Group();
    let bodyColor = skin.body;
    if (skin.rainbow) {
      const rainbowPalette = [0xf43f5e, 0xf97316, 0xfacc15, 0x22c55e, 0x38bdf8, 0xa855f7, 0xec4899];
      bodyColor = rainbowPalette[index % rainbowPalette.length];
    }

    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.35, metalness: 0.08 });
    const accentMat = new THREE.MeshStandardMaterial({ color: skin.accent, roughness: 0.4 });

    // Body
    const body = new THREE.Mesh(GEOS.bodyCyl, bodyMat);
    body.position.y = 0.32;
    body.castShadow = true;
    group.add(body);

    // Head
    const head = new THREE.Mesh(GEOS.headSphere, bodyMat);
    head.position.y = 0.76;
    head.castShadow = true;
    group.add(head);

    if (skin.id === 'bot') {
      const visor = new THREE.Mesh(GEOS.visorBox, MAT_CYAN_GLOW);
      visor.position.set(0, 0.78, -0.22);
      group.add(visor);
      const stick = new THREE.Mesh(GEOS.antennaStick, MAT_WHITE);
      stick.position.set(0, 1.08, 0);
      group.add(stick);
      const ball = new THREE.Mesh(GEOS.antennaBall, MAT_GOLD);
      ball.position.set(0, 1.2, 0);
      group.add(ball);
    } else if (skin.id === 'duck') {
      const beak = new THREE.Mesh(GEOS.beakCone, accentMat);
      beak.rotation.x = -Math.PI / 2;
      beak.position.set(0, 0.74, -0.32);
      group.add(beak);
      const wingL = new THREE.Mesh(GEOS.wingBox, bodyMat);
      wingL.position.set(-0.32, 0.36, 0);
      const wingR = wingL.clone();
      wingR.position.x = 0.32;
      group.add(wingL, wingR);
    } else if (skin.id === 'dino') {
      for (let s = 0; s < 3; s++) {
        const spike = new THREE.Mesh(GEOS.spikeCone, accentMat);
        spike.position.set(0, 0.96 - s * 0.22, 0.14 + s * 0.08);
        spike.rotation.x = 0.55;
        group.add(spike);
      }
    } else if (skin.id === 'bunny') {
      const earL = new THREE.Mesh(GEOS.earTall, bodyMat);
      earL.position.set(-0.12, 1.15, 0);
      earL.rotation.z = 0.14;
      const earR = new THREE.Mesh(GEOS.earTall, bodyMat);
      earR.position.set(0.12, 1.15, 0);
      earR.rotation.z = -0.14;
      group.add(earL, earR);
    } else if (skin.id === 'bear') {
      const earL = new THREE.Mesh(GEOS.earRound, accentMat);
      earL.position.set(-0.2, 1.0, 0);
      const earR = new THREE.Mesh(GEOS.earRound, accentMat);
      earR.position.set(0.2, 1.0, 0);
      group.add(earL, earR);
    }

    // Eyes (facing forward along -Z)
    if (skin.id !== 'bot') {
      const eyeL = new THREE.Mesh(GEOS.eyeSphere, MAT_EYE);
      eyeL.position.set(-0.1, 0.82, -0.24);
      const eyeR = new THREE.Mesh(GEOS.eyeSphere, MAT_EYE);
      eyeR.position.set(0.1, 0.82, -0.24);
      group.add(eyeL, eyeR);
    }

    return group;
  }

  function syncVisualBuddies() {
    const desired = Math.min(Math.max(0, squadCount), MAX_VISUAL_BUDDIES);
    const skin = window.BuddyData.getSkin(save.skin);
    const powerScale = 1 + save.upgrades.power * 0.045;

    while (visualBuddies.length < desired) {
      const idx = visualBuddies.length;
      const mesh = createBuddyMesh(skin, idx);
      mesh.scale.setScalar(powerScale);
      const offset = computeFormationOffset(idx);
      mesh.position.set(squadX + offset.x, 0, squadZ + offset.z);
      squadGroup.add(mesh);
      visualBuddies.push({
        mesh,
        phase: Math.random() * Math.PI * 2,
        ox: offset.x,
        oz: offset.z,
      });
    }

    while (visualBuddies.length > desired) {
      const removed = visualBuddies.pop();
      squadGroup.remove(removed.mesh);
    }

    // Recompute tidy formation targets
    for (let i = 0; i < visualBuddies.length; i++) {
      const off = computeFormationOffset(i);
      visualBuddies[i].ox = off.x;
      visualBuddies[i].oz = off.z;
    }

    // Update badge
    squadBadge.textContent = String(squadCount);
    squadBadge.classList.remove('pop');
    void squadBadge.offsetWidth;
    squadBadge.classList.add('pop');
  }

  function computeFormationOffset(i) {
    if (i === 0) return { x: 0, z: 0 };
    const r = 0.54 * Math.sqrt(i);
    const theta = i * GOLDEN_ANGLE;
    return {
      x: Math.cos(theta) * r,
      z: Math.sin(theta) * r,
    };
  }

  function getSquadRadius() {
    return Math.min(2.6, 0.45 + 0.32 * Math.sqrt(Math.min(squadCount, MAX_VISUAL_BUDDIES)));
  }

  // ==================== CANVAS TEXTURES FOR GATES & SIGNS ====================
  function createGateTexture(op, val, isLittleMode) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const isDouble = op === 'x';
    const isGood = op === '+' || op === 'x';

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    if (isDouble) {
      grad.addColorStop(0, 'rgba(250, 204, 21, 0.90)');
      grad.addColorStop(1, 'rgba(249, 115, 22, 0.86)');
    } else if (isGood) {
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.88)');
      grad.addColorStop(1, 'rgba(37, 99, 235, 0.86)');
    } else {
      grad.addColorStop(0, 'rgba(251, 113, 133, 0.88)');
      grad.addColorStop(1, 'rgba(225, 29, 72, 0.86)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Glossy top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(10, 10, 236, 70);

    // Thick white inner border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.strokeRect(8, 8, 240, 240);

    // Main text
    const label = op === 'x' ? `×${val}` : `${op}${val}`;
    ctx.font = '900 102px "Fredoka", "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.strokeText(label, 128, isLittleMode ? 96 : 126);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, 128, isLittleMode ? 96 : 126);

    // Kid-friendly visual cues underneath!
    if (isLittleMode) {
      if (isDouble) {
        ctx.font = '900 32px "Fredoka", sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = 'rgba(113,63,18,0.6)';
        ctx.lineWidth = 6;
        ctx.strokeText('★ DOUBLE! ★', 128, 186);
        ctx.fillText('★ DOUBLE! ★', 128, 186);
      } else if (isGood) {
        // Draw visual buddy dots so 4-year-olds can count/compare by sight!
        const dotCount = Math.min(val, 8);
        const cols = Math.min(dotCount, 4);
        const rows = Math.ceil(dotCount / 4);
        const spacing = 42;
        for (let i = 0; i < dotCount; i++) {
          const r = Math.floor(i / 4);
          const c = i % 4;
          const rowCols = r === rows - 1 ? dotCount - r * 4 : 4;
          const dx = 128 + (c - (rowCols - 1) / 2) * spacing;
          const dy = 176 + (r - (rows - 1) / 2) * 38;
          ctx.beginPath();
          ctx.arc(dx, dy, 15, 0, Math.PI * 2);
          ctx.fillStyle = '#fef08a';
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }
      } else {
        ctx.font = '900 34px "Fredoka", sans-serif';
        ctx.fillStyle = '#ffe4e6';
        ctx.fillText('OOPS!', 128, 186);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  function createCountSprite(text, bgColor = '#9333ea') {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(12, 12, 136, 72, 34);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.font = '900 48px "Fredoka", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), 80, 50);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.3, 1.38, 1);
    return { sprite, canvas, ctx, tex, bgColor };
  }

  function updateCountSprite(badge, text) {
    const { ctx, tex, bgColor } = badge;
    ctx.clearRect(0, 0, 160, 96);
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(12, 12, 136, 72, 34);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.font = '900 48px "Fredoka", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), 80, 50);
    tex.needsUpdate = true;
  }

  // ==================== BUILD 3D LEVEL ====================
  function clearGroup(grp) {
    while (grp.children.length > 0) {
      grp.remove(grp.children[0]);
    }
  }

  function buildWorldScenery(world, length) {
    const sideCount = Math.floor(length / 12) + 4;
    for (let i = 0; i < sideCount; i++) {
      const z = 10 - i * 12;
      for (const side of [-1, 1]) {
        const x = side * (9.5 + (i % 3) * 2.4 + Math.random() * 1.5);
        if (world.id === 'meadow') {
          const tree = new THREE.Group();
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.45, 2.0, 7),
            new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 })
          );
          trunk.position.y = 1.0;
          const foliage = new THREE.Mesh(
            new THREE.SphereGeometry(1.55, 8, 8),
            new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x22c55e : 0x16a34a, roughness: 0.7 })
          );
          foliage.position.y = 2.7;
          tree.add(trunk, foliage);
          tree.position.set(x, 0, z);
          worldGroup.add(tree);
        } else if (world.id === 'candy') {
          const lolli = new THREE.Group();
          const stick = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.14, 3.2, 6),
            MAT_WHITE
          );
          stick.position.y = 1.6;
          const colors = [0xf43f5e, 0x38bdf8, 0xfacc15, 0xa855f7, 0x4ade80];
          const top = new THREE.Mesh(
            new THREE.CylinderGeometry(1.3, 1.3, 0.45, 14),
            new THREE.MeshStandardMaterial({ color: colors[(i + (side > 0 ? 2 : 0)) % colors.length], roughness: 0.3 })
          );
          top.rotation.x = Math.PI / 2;
          top.position.y = 3.4;
          lolli.add(stick, top);
          lolli.position.set(x, 0, z);
          worldGroup.add(lolli);
        } else if (world.id === 'jungle') {
          const palm = new THREE.Group();
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.26, 0.45, 4.2, 7),
            new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
          );
          trunk.position.y = 2.1;
          trunk.rotation.z = side * -0.14;
          palm.add(trunk);
          const frondMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
          for (let f = 0; f < 5; f++) {
            const frond = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.4, 5), frondMat);
            frond.position.set(side * 0.4, 4.1, 0);
            frond.rotation.z = 1.25;
            frond.rotation.y = (f / 5) * Math.PI * 2;
            palm.add(frond);
          }
          palm.position.set(x, 0, z);
          worldGroup.add(palm);
        } else if (world.id === 'frost') {
          if (i % 2 === 0) {
            const pine = new THREE.Group();
            const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.4, 7), new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.6 }));
            c1.position.y = 1.4;
            const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.0, 7), new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 }));
            c2.position.y = 2.8;
            const cap = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.1, 7), MAT_WHITE);
            cap.position.y = 3.8;
            pine.add(c1, c2, cap);
            pine.position.set(x, 0, z);
            worldGroup.add(pine);
          } else {
            // Cute snowman!
            const snow = new THREE.Group();
            const b1 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8), MAT_WHITE);
            b1.position.y = 0.9;
            const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), MAT_WHITE);
            b2.position.y = 2.2;
            const nose = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0xf97316 }));
            nose.rotation.x = Math.PI / 2;
            nose.position.set(0, 2.2, 0.7);
            snow.add(b1, b2, nose);
            snow.position.set(x, 0, z);
            worldGroup.add(snow);
          }
        } else if (world.id === 'space') {
          if (i % 2 === 0) {
            const planetColors = [0xf472b6, 0x38bdf8, 0xfacc15, 0xa855f7, 0x34d399];
            const planet = new THREE.Group();
            const sphere = new THREE.Mesh(
              new THREE.SphereGeometry(1.3 + (i % 3) * 0.4, 12, 12),
              new THREE.MeshStandardMaterial({ color: planetColors[i % planetColors.length], roughness: 0.35 })
            );
            planet.add(sphere);
            if (i % 4 === 0) {
              const ring = new THREE.Mesh(
                new THREE.TorusGeometry(2.4, 0.16, 6, 20),
                new THREE.MeshBasicMaterial({ color: 0xfef08a })
              );
              ring.rotation.x = 1.2;
              planet.add(ring);
            }
            planet.position.set(x * 1.15, 3 + (i % 4) * 1.8, z);
            worldGroup.add(planet);
          }
        }
      }
    }

    // Sky clouds (or twinkling space stars)
    if (world.id === 'space') {
      const starGeo = new THREE.OctahedronGeometry(0.22, 0);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      for (let i = 0; i < 65; i++) {
        const s = new THREE.Mesh(starGeo, starMat);
        s.position.set((Math.random() - 0.5) * 90, 6 + Math.random() * 24, 15 - Math.random() * (length + 80));
        worldGroup.add(s);
      }
    } else {
      const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
      for (let i = 0; i < 18; i++) {
        const cloud = new THREE.Group();
        const s1 = new THREE.Mesh(new THREE.SphereGeometry(1.8, 7, 7), cloudMat);
        const s2 = new THREE.Mesh(new THREE.SphereGeometry(1.3, 7, 7), cloudMat);
        s2.position.set(1.5, -0.2, 0);
        const s3 = new THREE.Mesh(new THREE.SphereGeometry(1.4, 7, 7), cloudMat);
        s3.position.set(-1.5, -0.25, 0);
        cloud.add(s1, s2, s3);
        cloud.position.set((Math.random() - 0.5) * 54, 14 + Math.random() * 8, 5 - Math.random() * (length + 50));
        worldGroup.add(cloud);
      }
    }
  }

  function buildGatePair(ev, isLittleMode) {
    const scaleGate = (g) => {
      if (isLittleMode || g.op === 'x') return { op: g.op, val: g.val };
      return { op: g.op, val: g.val * 2 };
    };

    const leftSpec = scaleGate(ev.left);
    const rightSpec = scaleGate(ev.right);
    const pair = {
      z: -ev.z,
      triggered: false,
      moving: !!ev.moving,
      moveSpeed: ev.moveSpeed || 1.2,
      movePhase: Math.random() * Math.PI * 2,
      left: buildSingleGate(leftSpec, -2.9, -ev.z, isLittleMode),
      right: buildSingleGate(rightSpec, 2.9, -ev.z, isLittleMode),
    };
    gates.push(pair);
  }

  function buildSingleGate(spec, x, z, isLittleMode) {
    const group = new THREE.Group();
    const width = 5.1;
    const height = 3.7;
    const tex = createGateTexture(spec.op, spec.val, isLittleMode);
    const paneMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.94, side: THREE.DoubleSide });
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), paneMat);
    pane.position.y = height / 2 + 0.15;
    group.add(pane);

    const pillarColor = spec.op === 'x' ? 0xfacc15 : spec.op === '+' ? 0x60a5fa : 0xfb7185;
    const pillarMat = new THREE.MeshStandardMaterial({ color: pillarColor, roughness: 0.35 });
    const postGeo = new THREE.CylinderGeometry(0.18, 0.18, height + 0.35, 8);
    const postL = new THREE.Mesh(postGeo, pillarMat);
    postL.position.set(-width / 2, (height + 0.35) / 2, 0);
    const postR = postL.clone();
    postR.position.x = width / 2;
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.28, 0.32), MAT_WHITE);
    topBar.position.y = height + 0.25;
    group.add(postL, postR, topBar);

    group.position.set(x, 0, z);
    worldGroup.add(group);
    return {
      group,
      pane,
      op: spec.op,
      val: spec.val,
      baseX: x,
      currentX: x,
      halfWidth: width / 2,
    };
  }

  function buildEnemySquad(ev, world, isLittleMode) {
    const count = isLittleMode ? ev.count : (ev.bigCount || Math.round(ev.count * 1.6));
    const group = new THREE.Group();
    group.position.set(ev.x, 0, -ev.z);

    const slimeMat = new THREE.MeshStandardMaterial({ color: world.enemyColor, roughness: 0.35 });
    const units = [];
    const visCount = Math.min(count, 24);
    for (let i = 0; i < visCount; i++) {
      const unit = new THREE.Group();
      const body = new THREE.Mesh(GEOS.slimeBody, slimeMat);
      body.scale.set(1, 0.85, 1);
      body.position.y = 0.34;
      body.castShadow = true;
      const eyeL = new THREE.Mesh(GEOS.eyeSphere, MAT_EYE);
      eyeL.position.set(-0.12, 0.42, 0.3);
      const eyeR = new THREE.Mesh(GEOS.eyeSphere, MAT_EYE);
      eyeR.position.set(0.12, 0.42, 0.3);
      unit.add(body, eyeL, eyeR);

      const off = computeFormationOffset(i);
      unit.position.set(off.x * 1.15, 0, off.z * 1.15);
      group.add(unit);
      units.push({ mesh: unit, phase: Math.random() * Math.PI * 2 });
    }

    const badge = createCountSprite(count, '#e11d48');
    badge.sprite.position.set(0, 2.2, 0);
    group.add(badge.sprite);

    worldGroup.add(group);
    enemies.push({
      group,
      x: ev.x,
      z: -ev.z,
      count,
      units,
      badge,
      color: world.enemyColor,
      popTimer: 0,
    });
  }

  function buildObstacle(ev, world) {
    if (ev.type === 'bumper') {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3 });
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 1.4, 14), mat);
      cyl.position.y = 0.7;
      cyl.castShadow = true;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.16, 8, 18), MAT_WHITE);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.15;
      group.add(cyl, ring);
      group.position.set(ev.x, 0, -ev.z);
      worldGroup.add(group);
      obstacles.push({ type: 'bumper', group, x: ev.x, z: -ev.z, radius: 1.35, hitCooldown: 0 });
    } else if (ev.type === 'slider') {
      const w = ev.width || 3.8;
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
      const block = new THREE.Mesh(new THREE.BoxGeometry(w, 1.35, 1.15), mat);
      block.position.y = 0.72;
      block.castShadow = true;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.28, 1.18), MAT_WHITE);
      stripe.position.y = 0.72;
      group.add(block, stripe);
      group.position.set(0, 0, -ev.z);
      worldGroup.add(group);
      obstacles.push({
        type: 'slider',
        group,
        x: 0,
        z: -ev.z,
        halfW: w / 2,
        speed: ev.speed || 1.6,
        phase: Math.random() * Math.PI * 2,
        hitCooldown: 0,
      });
    } else if (ev.type === 'spinner') {
      const radius = ev.radius || 3.2;
      const group = new THREE.Group();
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.5, 1.7, 10),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 })
      );
      post.position.y = 0.85;
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 2, 0.55, 0.55),
        new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.35 })
      );
      arm.position.y = 0.95;
      arm.castShadow = true;
      group.add(post, arm);
      group.position.set(ev.x || 0, 0, -ev.z);
      worldGroup.add(group);
      obstacles.push({
        type: 'spinner',
        group,
        arm,
        x: ev.x || 0,
        z: -ev.z,
        radius,
        speed: ev.speed || 1.5,
        angle: Math.random() * Math.PI,
        hitCooldown: 0,
      });
    }
  }

  function buildStars(ev) {
    const count = ev.count || 4;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(GEOS.starOct, MAT_GOLD);
      mesh.position.set(ev.x, 1.05, -(ev.z + i * 2.5));
      mesh.castShadow = true;
      worldGroup.add(mesh);
      collectibles.push({ mesh, collected: false, baseY: 1.05, phase: i * 0.6 });
    }
  }

  function buildBoostPad(ev) {
    const group = new THREE.Group();
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.12, 4.6),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.5 })
    );
    pad.position.y = 0.06;
    const chev = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 1.6, 3),
      MAT_GOLD
    );
    chev.rotation.x = -Math.PI / 2;
    chev.position.y = 0.22;
    group.add(pad, chev);
    group.position.set(ev.x, 0, -ev.z);
    worldGroup.add(group);
    boostPads.push({ group, x: ev.x, z: -ev.z, used: false });
  }

  function buildBossAndStairs(level, world, isLittleMode) {
    const finishZ = -level.length;

    // Festive checkered finish line + arch
    const archMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
    const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5.2, 10), archMat);
    pL.position.set(-TRACK_HALF + 0.4, 2.6, finishZ);
    const pR = pL.clone();
    pR.position.x = TRACK_HALF - 0.4;
    const banner = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH, 1.0, 0.45), new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.35 }));
    banner.position.set(0, 5.2, finishZ);
    worldGroup.add(pL, pR, banner);

    // Boss Arena platform
    const arena = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK_WIDTH + 4, 0.5, 22),
      new THREE.MeshStandardMaterial({ color: world.track, roughness: 0.7 })
    );
    arena.position.set(0, -0.25, finishZ - 11);
    arena.receiveShadow = true;
    worldGroup.add(arena);

    // Build Giant Boss or Toy Castle
    const bossZ = finishZ - 12;
    const bossGroup = new THREE.Group();
    bossGroup.position.set(0, 0, bossZ);

    const maxHp = isLittleMode ? level.bossHp : (level.bigBossHp || Math.round(level.bossHp * 1.65));

    if (level.bossType === 'castle') {
      const wallMat = new THREE.MeshStandardMaterial({ color: world.bossColor, roughness: 0.45 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
      const keep = new THREE.Mesh(new THREE.BoxGeometry(5.6, 4.0, 3.6), wallMat);
      keep.position.y = 2.0;
      keep.castShadow = true;
      bossGroup.add(keep);

      for (const tx of [-2.9, 2.9]) {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 5.0, 10), wallMat);
        tower.position.set(tx, 2.5, 0.8);
        tower.castShadow = true;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.35, 2.1, 10), roofMat);
        roof.position.set(tx, 6.0, 0.8);
        bossGroup.add(tower, roof);
      }
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.4, 0.3), new THREE.MeshStandardMaterial({ color: 0x78350f }));
      door.position.set(0, 1.2, 1.85);
      bossGroup.add(door);
    } else {
      const bMat = new THREE.MeshStandardMaterial({ color: world.bossColor, roughness: 0.35 });
      const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(2.3, 14, 12), bMat);
      body.position.y = 2.4;
      body.castShadow = true;
      const belly = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 10), bellyMat);
      belly.position.set(0, 2.0, 1.35);
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), MAT_WHITE);
      eyeL.position.set(-0.75, 3.1, 1.85);
      const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), MAT_EYE);
      pupilL.position.set(-0.75, 3.1, 2.12);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.75;
      const pupilR = pupilL.clone();
      pupilR.position.x = 0.75;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.72, 0.8, 7), MAT_GOLD);
      crown.position.set(0, 4.9, 0);

      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.2, 8), bMat);
      armL.position.set(-2.5, 2.5, 0.2);
      armL.rotation.z = 0.65;
      const armR = armL.clone();
      armR.position.x = 2.5;
      armR.rotation.z = -0.65;

      bossGroup.add(body, belly, eyeL, pupilL, eyeR, pupilR, crown, armL, armR);
    }

    worldGroup.add(bossGroup);
    bossEntity = {
      group: bossGroup,
      z: bossZ,
      hp: maxHp,
      maxHp,
      name: level.bossName || world.bossName,
      color: world.bossColor,
      hitFlash: 0,
      hitTimer: 0,
      defeated: false,
    };

    // Rainbow Bonus Staircase behind Boss (×1 to ×5)
    const stairColors = [0xf43f5e, 0xf97316, 0xfacc15, 0x22c55e, 0x3b82f6];
    stairSteps = [];
    for (let s = 0; s < 5; s++) {
      const stepH = (s + 1) * 1.15;
      const stepZ = finishZ - 24 - s * 4.5;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(TRACK_WIDTH + 1, stepH, 4.3),
        new THREE.MeshStandardMaterial({ color: stairColors[s], roughness: 0.35 })
      );
      mesh.position.set(0, stepH / 2 - 0.5, stepZ);
      mesh.receiveShadow = true;
      worldGroup.add(mesh);

      const multSprite = createCountSprite(`×${s + 1}`, '#0f172a');
      multSprite.sprite.position.set(TRACK_HALF - 0.8, stepH + 0.65, stepZ);
      worldGroup.add(multSprite.sprite);

      stairSteps.push({
        index: s,
        mult: s + 1,
        topY: stepH - 0.5,
        z: stepZ,
        color: stairColors[s],
      });
    }
  }

  function loadLevelScene(level) {
    activeLevel = level;
    activeWorld = window.BuddyData.getWorld(level.world);
    const isLittleMode = save.mode === 'little';

    clearGroup(worldGroup);
    clearGroup(squadGroup);
    clearGroup(particleGroup);
    visualBuddies = [];
    gates = [];
    enemies = [];
    obstacles = [];
    collectibles = [];
    boostPads = [];
    particles = [];
    stairState = null;

    // Sky & fog
    scene.background = new THREE.Color(activeWorld.sky);
    scene.fog = new THREE.Fog(activeWorld.fog, 36, 130);

    // Ground plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, level.length + 180),
      new THREE.MeshStandardMaterial({ color: activeWorld.ground, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.55, -level.length / 2 - 20);
    ground.receiveShadow = true;
    worldGroup.add(ground);

    // Main Track
    const trackLen = level.length + 16;
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK_WIDTH, 0.5, trackLen),
      new THREE.MeshStandardMaterial({ color: activeWorld.track, roughness: 0.72 })
    );
    track.position.set(0, -0.25, -level.length / 2 + 4);
    track.receiveShadow = true;
    worldGroup.add(track);

    // Track side curbs
    const curbGeo = new THREE.BoxGeometry(0.55, 0.72, trackLen);
    const curbMat = new THREE.MeshStandardMaterial({ color: activeWorld.trackEdge, roughness: 0.5 });
    const curbL = new THREE.Mesh(curbGeo, curbMat);
    curbL.position.set(-TRACK_HALF - 0.25, -0.1, -level.length / 2 + 4);
    const curbR = curbL.clone();
    curbR.position.x = TRACK_HALF + 0.25;
    worldGroup.add(curbL, curbR);

    // Center dashed lane guide
    const stripeMat = new THREE.MeshBasicMaterial({ color: activeWorld.stripe });
    for (let z = 0; z < level.length; z += 6) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 3.0), stripeMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, -z);
      worldGroup.add(dash);
    }

    // World scenery
    buildWorldScenery(activeWorld, level.length);

    // Level events
    for (const ev of level.events) {
      if (ev.type === 'gates') buildGatePair(ev, isLittleMode);
      else if (ev.type === 'enemies') buildEnemySquad(ev, activeWorld, isLittleMode);
      else if (ev.type === 'bumper' || ev.type === 'slider' || ev.type === 'spinner') buildObstacle(ev, activeWorld);
      else if (ev.type === 'stars') buildStars(ev);
      else if (ev.type === 'boost') buildBoostPad(ev);
    }

    // Boss & Rainbow Staircase
    buildBossAndStairs(level, activeWorld, isLittleMode);

    // Initialize squad
    const startCounts = [3, 5, 7, 10, 14];
    squadCount = startCounts[Math.min(save.upgrades.startSquad, 4)];
    squadX = 0;
    targetX = 0;
    squadZ = 0;
    boostTimer = 0;
    rescueUsed = false;
    starsCollected = 0;
    runTime = 0;
    cameraShake = 0;
    hasMovedOnce = false;

    syncVisualBuddies();
    updateCamera(1);
    updateHud();
  }

  // ==================== INPUT (TOUCH DRAG + MOUSE DRAG + KEYBOARD) ====================
  let isDragging = false;
  let lastPointerX = 0;
  const keys = { left: false, right: false };

  function onPointerDown(e) {
    if (gameState !== 'playing') return;
    window.BuddyAudio.unlock();
    isDragging = true;
    lastPointerX = e.clientX;
    hasMovedOnce = true;
    dragHint.classList.add('hidden');
  }

  function onPointerMove(e) {
    if (!isDragging || gameState !== 'playing') return;
    const dx = e.clientX - lastPointerX;
    lastPointerX = e.clientX;
    const sensitivity = (TRACK_WIDTH / Math.min(window.innerWidth, 560)) * 1.35;
    targetX += dx * sensitivity;
    const maxOffset = Math.max(1.8, TRACK_HALF - getSquadRadius() - 0.35);
    targetX = Math.max(-maxOffset, Math.min(maxOffset, targetX));
  }

  function onPointerUp() {
    isDragging = false;
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      keys.left = true;
      if (gameState === 'playing') {
        hasMovedOnce = true;
        dragHint.classList.add('hidden');
      }
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      keys.right = true;
      if (gameState === 'playing') {
        hasMovedOnce = true;
        dragHint.classList.add('hidden');
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });

  // ==================== TOAST HELPER ====================
  function showToast(text) {
    toastBanner.textContent = text;
    toastBanner.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastBanner.classList.remove('show');
    }, 1500);
  }

  // ==================== GAMEPLAY LOOP ====================
  function checkFairyRescue() {
    if (squadCount <= 0) {
      if (save.mode === 'little' && !rescueUsed && gameState === 'playing') {
        rescueUsed = true;
        squadCount = 4;
        syncVisualBuddies();
        spawnRainbowBurst(squadX, 1.4, squadZ, 24);
        window.BuddyAudio.playRescue();
        showToast('✨ Fairy Rescue! +4 Buddies!');
        return true;
      }
      return false;
    }
    return true;
  }

  function applyGate(gate) {
    if (gate.op === '+') {
      squadCount = Math.min(999, squadCount + gate.val);
      window.BuddyAudio.playGateGood();
      spawnBurst(squadX, 1.4, squadZ, 0x38bdf8, 16, 6);
    } else if (gate.op === 'x') {
      squadCount = Math.min(999, squadCount * gate.val);
      window.BuddyAudio.playGateDouble();
      spawnRainbowBurst(squadX, 1.5, squadZ, 24);
      showToast(`⭐ DOUBLE! ${squadCount} Buddies!`);
    } else if (gate.op === '-') {
      squadCount = Math.max(0, squadCount - gate.val);
      window.BuddyAudio.playGateBad();
      spawnBurst(squadX, 1.2, squadZ, 0xfb7185, 12, 4.5);
    }
    syncVisualBuddies();
    if (!checkFairyRescue()) {
      endRun(false, 1);
    }
  }

  function updatePlaying(dt) {
    runTime += dt;
    const isLittleMode = save.mode === 'little';
    const modeSpeedMult = isLittleMode ? 0.84 : 1.08;
    const boostMult = boostTimer > 0 ? 1.48 : 1.0;
    if (boostTimer > 0) boostTimer -= dt;

    // Keyboard steering
    const keySteer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (keySteer !== 0) {
      targetX += keySteer * 10.5 * dt;
    }
    const maxOffset = Math.max(1.8, TRACK_HALF - getSquadRadius() - 0.35);
    targetX = Math.max(-maxOffset, Math.min(maxOffset, targetX));
    squadX += (targetX - squadX) * Math.min(1, dt * 13);

    // Forward run
    const speed = activeLevel.speed * modeSpeedMult * boostMult;
    squadZ -= speed * dt;

    // Progress bar
    const progress = Math.max(0, Math.min(1, -squadZ / activeLevel.length));
    progressFill.style.width = `${progress * 100}%`;
    progressRunner.style.left = `${progress * 100}%`;

    // Update Gates
    for (const pair of gates) {
      if (pair.moving && !pair.triggered) {
        const shift = Math.sin(runTime * pair.moveSpeed + pair.movePhase) * 1.45;
        pair.left.currentX = pair.left.baseX + shift;
        pair.right.currentX = pair.right.baseX + shift;
        pair.left.group.position.x = pair.left.currentX;
        pair.right.group.position.x = pair.right.currentX;
      }

      if (!pair.triggered && squadZ <= pair.z + 0.65 && squadZ >= pair.z - 1.5) {
        pair.triggered = true;
        // Pick whichever gate center is closer to squadX
        const distL = Math.abs(squadX - pair.left.currentX);
        const distR = Math.abs(squadX - pair.right.currentX);
        const chosen = distL <= distR ? pair.left : pair.right;
        chosen.pane.visible = false;
        applyGate(chosen);
      }
    }

    // Update Stars (with magnet upgrade!)
    const magnetRange = 2.0 + save.upgrades.magnet * 0.9;
    for (const st of collectibles) {
      if (st.collected) continue;
      st.mesh.rotation.y += dt * 3.2;
      st.mesh.position.y = st.baseY + Math.sin(runTime * 4 + st.phase) * 0.16;

      const dx = squadX - st.mesh.position.x;
      const dz = squadZ - st.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < magnetRange + getSquadRadius()) {
        st.mesh.position.x += dx * Math.min(1, dt * 10);
        st.mesh.position.z += dz * Math.min(1, dt * 10);
      }
      if (dist < 1.15 + getSquadRadius() * 0.7) {
        st.collected = true;
        st.mesh.visible = false;
        starsCollected += 1;
        window.BuddyAudio.playStar();
        spawnBurst(st.mesh.position.x, 1.1, st.mesh.position.z, 0xfacc15, 6, 3.8);
      }
    }

    // Update Boost Pads
    for (const pad of boostPads) {
      if (pad.used) continue;
      if (Math.abs(squadZ - pad.z) < 2.2 && Math.abs(squadX - pad.x) < 2.1 + getSquadRadius() * 0.5) {
        pad.used = true;
        boostTimer = 1.25;
        starsCollected += 2;
        window.BuddyAudio.playBoost();
        spawnRainbowBurst(squadX, 0.8, squadZ, 16);
        showToast('⚡ ZOOM BOOST!');
      }
    }

    // Update Obstacles
    for (const obs of obstacles) {
      if (obs.hitCooldown > 0) obs.hitCooldown -= dt;

      if (obs.type === 'slider') {
        obs.x = Math.sin(runTime * obs.speed + obs.phase) * (TRACK_HALF - obs.halfW - 0.35);
        obs.group.position.x = obs.x;
      } else if (obs.type === 'spinner') {
        obs.angle += obs.speed * dt;
        obs.arm.rotation.y = obs.angle;
      }

      if (obs.hitCooldown > 0) continue;

      let hit = false;
      const sqRad = getSquadRadius() * 0.75;
      if (obs.type === 'bumper') {
        if (Math.hypot(squadX - obs.x, squadZ - obs.z) < obs.radius + sqRad) {
          hit = true;
          // Gentle bounce away
          targetX += (squadX >= obs.x ? 1.6 : -1.6);
        }
      } else if (obs.type === 'slider') {
        if (Math.abs(squadZ - obs.z) < 0.9 + sqRad * 0.6 && Math.abs(squadX - obs.x) < obs.halfW + sqRad * 0.5) {
          hit = true;
        }
      } else if (obs.type === 'spinner') {
        const dz = squadZ - obs.z;
        const dx = squadX - obs.x;
        if (Math.hypot(dx, dz) < obs.radius + sqRad * 0.5) {
          // Check distance to rotating bar line
          const cosA = Math.cos(-obs.angle);
          const sinA = Math.sin(-obs.angle);
          const localX = dx * cosA - dz * sinA;
          const localZ = dx * sinA + dz * cosA;
          if (Math.abs(localX) < obs.radius + sqRad * 0.4 && Math.abs(localZ) < 0.45 + sqRad * 0.45) {
            hit = true;
          }
        }
      }

      if (hit) {
        obs.hitCooldown = 0.55;
        const loss = isLittleMode ? 1 : Math.min(3, Math.max(1, Math.floor(squadCount * 0.14)));
        squadCount = Math.max(0, squadCount - loss);
        cameraShake = 0.25;
        window.BuddyAudio.playBump();
        spawnBurst(squadX, 1.0, squadZ, 0xf97316, 10, 5);
        syncVisualBuddies();
        if (!checkFairyRescue()) {
          endRun(false, 1);
          return;
        }
      }
    }

    // Update Enemy Squads (Friendly Boop-Pop Clashes!)
    for (const en of enemies) {
      if (en.count <= 0) continue;
      for (const u of en.units) {
        u.mesh.position.y = Math.abs(Math.sin(runTime * 6 + u.phase)) * 0.25;
      }

      const dist = Math.hypot(squadX - en.x, squadZ - en.z);
      if (dist < 2.2 + getSquadRadius()) {
        // Pull enemy center slightly toward player during clash
        en.popTimer += dt;
        const popInterval = 0.055;
        while (en.popTimer >= popInterval && en.count > 0 && squadCount > 0) {
          en.popTimer -= popInterval;
          en.count -= 1;
          squadCount -= 1;
          window.BuddyAudio.playPop();
          spawnBurst((squadX + en.x) * 0.5, 0.9, (squadZ + en.z) * 0.5, en.color, 5, 4.5);

          if (en.units.length > en.count) {
            const popped = en.units.pop();
            en.group.remove(popped.mesh);
          }
          updateCountSprite(en.badge, en.count);
          syncVisualBuddies();
        }

        if (en.count <= 0) {
          en.group.visible = false;
          starsCollected += 3;
          spawnRainbowBurst(en.x, 1.2, en.z, 14);
        }

        if (!checkFairyRescue()) {
          endRun(false, 1);
          return;
        }
      }
    }

    // Reached Finish Line -> Enter Boss Arena!
    if (squadZ <= -activeLevel.length) {
      gameState = 'boss';
      targetX = 0;
      progressWrap.classList.add('hidden');
      bossHud.classList.remove('hidden');
      bossNameEl.textContent = `👑 ${bossEntity.name}`;
      bossBarFill.style.width = '100%';
      dragHint.classList.add('hidden');
      showToast(`💥 GO TEAM! POP ${bossEntity.name.toUpperCase()}!`);
    }
  }

  function updateBossBattle(dt) {
    runTime += dt;
    squadX += (0 - squadX) * Math.min(1, dt * 6);
    const stopZ = bossEntity.z + 3.2;

    if (squadZ > stopZ) {
      squadZ -= 11 * dt;
    } else {
      // Swarm booping the boss!
      bossEntity.hitTimer += dt;
      const hitInterval = 0.075;
      const dmgPerBuddy = 1 + save.upgrades.power * 0.35;

      while (bossEntity.hitTimer >= hitInterval && bossEntity.hp > 0 && squadCount > 0) {
        bossEntity.hitTimer -= hitInterval;
        bossEntity.hp = Math.max(0, bossEntity.hp - dmgPerBuddy);
        bossEntity.hitFlash = 0.14;
        squadCount -= 1;
        cameraShake = 0.16;
        window.BuddyAudio.playBossHit();
        spawnBurst(
          (Math.random() - 0.5) * 2.4,
          1.8 + Math.random() * 1.4,
          bossEntity.z + 1.5,
          0xfacc15,
          7,
          5.5
        );
        syncVisualBuddies();
        bossBarFill.style.width = `${(bossEntity.hp / bossEntity.maxHp) * 100}%`;
      }

      // Boss defeated!
      if (bossEntity.hp <= 0 && !bossEntity.defeated) {
        bossEntity.defeated = true;
        bossEntity.group.visible = false;
        bossHud.classList.add('hidden');
        spawnRainbowBurst(0, 2.5, bossEntity.z, 55);
        window.BuddyAudio.playVictory();

        // Keep at least 1 celebratory buddy for the Rainbow Staircase!
        if (squadCount <= 0) {
          squadCount = 1;
          syncVisualBuddies();
        }
        startRainbowStairs();
        return;
      }

      // Ran out of buddies before boss fell
      if (squadCount <= 0 && bossEntity.hp > 0) {
        bossHud.classList.add('hidden');
        endRun(false, 1);
        return;
      }
    }

    // Animate Boss bounce + squash on hit
    if (bossEntity && !bossEntity.defeated) {
      if (bossEntity.hitFlash > 0) {
        bossEntity.hitFlash -= dt;
        bossEntity.group.scale.set(1.12, 0.86, 1.12);
      } else {
        const b = Math.sin(runTime * 5) * 0.04;
        bossEntity.group.scale.set(1 - b, 1 + b, 1 - b);
      }
    }
  }

  function startRainbowStairs() {
    gameState = 'stairs';
    // Decide how many steps (1..5) the surviving buddies reach
    const targetStep = Math.min(5, Math.max(1, 1 + Math.floor(squadCount / 4)));
    stairState = {
      currentStep: -1,
      targetStep,
      timer: 0,
      targetY: 0,
    };
    showToast('🌈 RAINBOW BONUS STAIRS!');
  }

  function updateRainbowStairs(dt) {
    runTime += dt;
    stairState.timer += dt;
    const stepIdx = Math.min(stairState.targetStep - 1, Math.floor(stairState.timer / 0.55));
    const step = stairSteps[stepIdx];

    if (stepIdx > stairState.currentStep) {
      stairState.currentStep = stepIdx;
      window.BuddyAudio.playStairStep(stepIdx);
      spawnRainbowBurst(0, step.topY + 1.5, step.z, 18);
    }

    // Glide squad up onto the current rainbow step
    squadZ += (step.z - squadZ) * Math.min(1, dt * 6);
    stairState.targetY += (step.topY - stairState.targetY) * Math.min(1, dt * 7);

    if (stairState.timer >= stairState.targetStep * 0.55 + 0.85) {
      endRun(true, stairState.targetStep);
    }
  }

  function animateSquad(dt) {
    const baseY = gameState === 'stairs' && stairState ? stairState.targetY : 0;
    const hopFreq = gameState === 'menu' ? 5.5 : 11.5;
    const hopAmp = gameState === 'menu' ? 0.16 : 0.34;
    const tiltZ = (squadX - targetX) * 0.16;

    for (let i = 0; i < visualBuddies.length; i++) {
      const b = visualBuddies[i];
      const tx = squadX + b.ox;
      const tz = squadZ + b.oz;
      b.mesh.position.x += (tx - b.mesh.position.x) * Math.min(1, dt * 11);
      b.mesh.position.z += (tz - b.mesh.position.z) * Math.min(1, dt * 11);
      b.mesh.position.y = baseY + Math.abs(Math.sin(runTime * hopFreq + b.phase)) * hopAmp;
      b.mesh.rotation.z = tiltZ;
    }

    // Project floating squad count badge to 2D screen coordinates
    if (gameState === 'playing' || gameState === 'boss') {
      const worldPos = new THREE.Vector3(squadX, baseY + 2.35, squadZ);
      worldPos.project(camera);
      const sx = (worldPos.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-worldPos.y * 0.5 + 0.5) * window.innerHeight;
      squadBadge.style.left = `${sx}px`;
      squadBadge.style.top = `${sy}px`;
    }
  }

  function updateCamera(dt) {
    const zoomExtra = Math.min(5.5, Math.sqrt(Math.max(0, squadCount)) * 0.55);
    let desiredX = squadX * 0.42;
    let desiredY = 8.4 + zoomExtra * 0.48;
    let desiredZ = squadZ + 12.2 + zoomExtra;
    let lookZ = squadZ - 7.5;
    let lookY = 1.2;

    if (gameState === 'menu') {
      desiredX = Math.sin(runTime * 0.5) * 2.2;
      desiredY = 5.4;
      desiredZ = 8.2;
      lookZ = -4;
    } else if (gameState === 'boss') {
      desiredX = 2.8;
      desiredY = 9.5;
      desiredZ = bossEntity.z + 15.5;
      lookZ = bossEntity.z;
      lookY = 2.2;
    } else if (gameState === 'stairs' && stairState) {
      desiredX = 5.8;
      desiredY = stairState.targetY + 7.2;
      desiredZ = squadZ + 11.5;
      lookZ = squadZ - 2;
      lookY = stairState.targetY + 1.4;
    }

    if (cameraShake > 0) {
      cameraShake = Math.max(0, cameraShake - dt);
      desiredX += (Math.random() - 0.5) * cameraShake * 1.4;
      desiredY += (Math.random() - 0.5) * cameraShake * 1.2;
    }

    const lerpAmt = Math.min(1, dt * 6);
    camera.position.x += (desiredX - camera.position.x) * lerpAmt;
    camera.position.y += (desiredY - camera.position.y) * lerpAmt;
    camera.position.z += (desiredZ - camera.position.z) * lerpAmt;
    camera.lookAt(squadX * 0.25, lookY, lookZ);

    // Keep directional shadow frustum centered near squad
    dirLight.position.set(14, 28, squadZ + 16);
    dirLight.target.position.set(0, 0, squadZ - 8);
    dirLight.target.updateMatrixWorld();
  }

  // ==================== FLOW & SCREENS ====================
  function startLevel(levelObj) {
    window.BuddyAudio.unlock();
    loadLevelScene(levelObj);
    gameState = 'playing';
    startScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    bossHud.classList.add('hidden');
    progressWrap.classList.remove('hidden');
    btnHome.classList.remove('hidden');
    squadBadge.classList.remove('hidden');
    dragHint.classList.remove('hidden');

    const skin = window.BuddyData.getSkin(save.skin);
    progressRunner.textContent = skin.emoji;
    progressBoss.textContent = levelObj.bossType === 'castle' ? '🏰' : '👑';

    window.BuddyAudio.startMusic(activeWorld.id);
    updateHud();
  }

  function endRun(won, stairMult) {
    gameState = 'result';
    window.BuddyAudio.stopMusic();
    squadBadge.classList.add('hidden');
    bossHud.classList.add('hidden');
    dragHint.classList.add('hidden');

    const starBonusMult = 1 + save.upgrades.magnet * 0.2;
    let earnedStars = 0;

    if (won) {
      const baseReward = 14 + (activeLevel.isEndless ? activeLevel.endlessRound * 4 : activeLevel.id * 2);
      earnedStars = Math.round((baseReward + starsCollected) * stairMult * starBonusMult);
      save.stars += earnedStars;

      const starRating = stairMult >= 4 ? 3 : stairMult >= 2 ? 2 : 1;
      if (!activeLevel.isEndless) {
        const prev = save.levelStars[String(activeLevel.id)] || 0;
        save.levelStars[String(activeLevel.id)] = Math.max(prev, starRating);
        if (activeLevel.id >= save.unlockedLevel && activeLevel.id < window.BuddyData.LEVELS.length) {
          save.unlockedLevel = activeLevel.id + 1;
        }
        save.currentLevel = Math.min(window.BuddyData.LEVELS.length, activeLevel.id + 1);
      } else {
        save.endlessBest = Math.max(save.endlessBest, activeLevel.endlessRound);
      }
      persistSave();

      resultTitle.textContent = activeLevel.id === 15 ? '🎉 GALAXY CHAMPION!' : '🎉 YAY! YOU WON!';
      resultStars.textContent = '⭐'.repeat(starRating) + '☆'.repeat(3 - starRating);
      resultSubtitle.textContent = `Rainbow Stairs ×${stairMult} Bonus!`;
      btnNext.textContent = activeLevel.isEndless
        ? `RAINBOW RUN #${activeLevel.endlessRound + 1} ▶`
        : activeLevel.id < window.BuddyData.LEVELS.length
          ? `LEVEL ${activeLevel.id + 1} ▶`
          : '🌈 ENDLESS RAINBOW ▶';
      btnNext.classList.remove('hidden');
    } else {
      // Even on try-again, kids keep collected stars so it always feels rewarding!
      earnedStars = Math.max(3, starsCollected);
      save.stars += earnedStars;
      persistSave();
      window.BuddyAudio.playTryAgain();

      resultTitle.textContent = '💪 ALMOST THERE!';
      resultStars.textContent = '🌟';
      resultSubtitle.textContent = 'Tip: Pick Blue + and Gold ×2 gates!';
      btnNext.classList.add('hidden');
    }

    statBuddies.textContent = String(squadCount);
    statStars.textContent = `+${earnedStars} ⭐`;
    updateHud();
    resultScreen.classList.remove('hidden');
  }

  function goToMenu() {
    gameState = 'menu';
    window.BuddyAudio.stopMusic();
    resultScreen.classList.add('hidden');
    progressWrap.classList.add('hidden');
    btnHome.classList.add('hidden');
    squadBadge.classList.add('hidden');
    bossHud.classList.add('hidden');
    dragHint.classList.add('hidden');
    startScreen.classList.remove('hidden');

    const lvl = window.BuddyData.LEVELS[Math.min(save.currentLevel - 1, window.BuddyData.LEVELS.length - 1)];
    loadLevelScene(lvl);
    updateStartMenuUI();
  }

  function updateHud() {
    hudStars.textContent = `⭐ ${save.stars}`;
    if (activeLevel && activeWorld) {
      hudLevel.textContent = activeLevel.isEndless
        ? `🌈 #${activeLevel.endlessRound}`
        : `${activeWorld.emoji} Lv ${activeLevel.id}`;
    }
    btnSound.textContent = save.sfx ? '🔊' : '🔇';
  }

  function updateStartMenuUI() {
    const lvl = window.BuddyData.LEVELS[Math.min(save.currentLevel - 1, window.BuddyData.LEVELS.length - 1)];
    const w = window.BuddyData.getWorld(lvl.world);
    startLevelPreview.innerHTML = `<span>${w.emoji}</span><span>Level ${lvl.id}: ${lvl.name}</span>`;
    if (save.mode === 'little') {
      modePill.textContent = '🧸 Little Explorer (Ages 4–5)';
      modePill.classList.remove('big-kid');
    } else {
      modePill.textContent = '⚡ Big Kid Mode (Ages 6+)';
      modePill.classList.add('big-kid');
    }
    updateHud();
  }

  // ==================== DIALOGS (WORLDS, SHOP, SETTINGS) ====================
  function renderWorldsDialog() {
    worldsList.innerHTML = '';

    for (const world of window.BuddyData.WORLDS) {
      const section = document.createElement('div');
      section.className = 'world-section';

      const title = document.createElement('div');
      title.className = 'world-title';
      title.innerHTML = `<span>${world.emoji}</span><span>${world.name}</span>`;
      section.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'level-grid';
      const worldLevels = window.BuddyData.LEVELS.filter((l) => l.world === world.id);

      for (const lvl of worldLevels) {
        const unlocked = save.unlockAll || lvl.id <= save.unlockedLevel;
        const stars = save.levelStars[String(lvl.id)] || 0;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'level-tile' + (lvl.id === save.currentLevel ? ' current' : '');
        btn.disabled = !unlocked;
        btn.innerHTML = `
          <span class="level-num">${unlocked ? lvl.id : '🔒'}</span>
          <span class="level-name">${lvl.name}</span>
          <span class="level-stars">${unlocked ? ('⭐'.repeat(stars) + '☆'.repeat(3 - stars)) : ''}</span>
        `;
        btn.addEventListener('click', () => {
          window.BuddyAudio.playClick();
          save.currentLevel = lvl.id;
          persistSave();
          worldsDialog.close();
          startLevel(lvl);
        });
        grid.appendChild(btn);
      }

      section.appendChild(grid);
      worldsList.appendChild(section);
    }

    // Endless Rainbow Mode card
    const endlessSec = document.createElement('div');
    endlessSec.className = 'world-section';
    endlessSec.innerHTML = `
      <div class="world-title"><span>🌈</span><span>Endless Rainbow Mode</span></div>
    `;
    const endlessBtn = document.createElement('button');
    endlessBtn.type = 'button';
    endlessBtn.className = 'btn-toy btn-gold';
    endlessBtn.style.width = '100%';
    endlessBtn.textContent = save.endlessBest > 0
      ? `🌈 Play Endless (Best: Run #${save.endlessBest})`
      : '🌈 Start Endless Rainbow Run!';
    endlessBtn.addEventListener('click', () => {
      window.BuddyAudio.playClick();
      endlessRound = 1;
      worldsDialog.close();
      startLevel(window.BuddyData.generateEndlessLevel(endlessRound));
    });
    endlessSec.appendChild(endlessBtn);
    worldsList.appendChild(endlessSec);
  }

  function renderShopDialog() {
    shopBody.innerHTML = '';

    const bal = document.createElement('div');
    bal.className = 'shop-balance';
    bal.textContent = `Your Stars: ⭐ ${save.stars}`;
    shopBody.appendChild(bal);

    // Power Upgrades
    const upTitle = document.createElement('div');
    upTitle.className = 'shop-section-title';
    upTitle.textContent = '✨ Team Upgrades';
    shopBody.appendChild(upTitle);

    const upDefs = [
      { key: 'startSquad', icon: '👯', name: 'Start Buddies', desc: ['3 → 5', '5 → 7', '7 → 10', '10 → 14', 'MAX (14)!'], costs: [40, 80, 140, 220] },
      { key: 'power', icon: '💪', name: 'Super Boop', desc: ['Stronger Boss hits', 'Bigger Boss hits', 'Mega Boss hits', 'Ultra Boss hits', 'MAX Power!'], costs: [50, 95, 160, 240] },
      { key: 'magnet', icon: '🧲', name: 'Star Magnet', desc: ['+20% Stars & pull', '+40% Stars & pull', '+60% Stars & pull', '+80% Stars & pull', 'MAX Magnet!'], costs: [45, 90, 150, 230] },
    ];

    const upGrid = document.createElement('div');
    upGrid.className = 'shop-grid';
    for (const up of upDefs) {
      const lv = save.upgrades[up.key] || 0;
      const isMax = lv >= 4;
      const cost = isMax ? 0 : up.costs[lv];
      const card = document.createElement('div');
      card.className = 'shop-card' + (isMax ? ' equipped' : '');
      card.innerHTML = `
        <div class="shop-icon">${up.icon}</div>
        <div class="shop-name">${up.name} (Lv ${lv + 1})</div>
        <div class="shop-desc">${up.desc[lv]}</div>
      `;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shop-buy-btn' + (isMax ? ' equipped-btn' : '');
      btn.disabled = isMax || save.stars < cost;
      btn.textContent = isMax ? '✓ MAX' : `⭐ ${cost}`;
      btn.addEventListener('click', () => {
        if (isMax || save.stars < cost) return;
        save.stars -= cost;
        save.upgrades[up.key] = lv + 1;
        persistSave();
        window.BuddyAudio.playPurchase();
        updateHud();
        renderShopDialog();
        if (gameState === 'menu') loadLevelScene(activeLevel);
      });
      card.appendChild(btn);
      upGrid.appendChild(card);
    }
    shopBody.appendChild(upGrid);

    // 3D Buddy Skins
    const skinTitle = document.createElement('div');
    skinTitle.className = 'shop-section-title';
    skinTitle.textContent = '🎨 3D Buddy Teams';
    shopBody.appendChild(skinTitle);

    const skinGrid = document.createElement('div');
    skinGrid.className = 'shop-grid';
    for (const skin of window.BuddyData.SKINS) {
      const owned = save.ownedSkins.includes(skin.id);
      const equipped = save.skin === skin.id;
      const card = document.createElement('div');
      card.className = 'shop-card' + (equipped ? ' equipped' : '');
      card.innerHTML = `
        <div class="shop-icon">${skin.emoji}</div>
        <div class="shop-name">${skin.name}</div>
        <div class="shop-desc">${equipped ? 'Playing now!' : owned ? 'Ready to play' : '3D Team Skin'}</div>
      `;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shop-buy-btn' + (equipped ? ' equipped-btn' : '');
      if (equipped) {
        btn.textContent = '✓ Equipped';
        btn.disabled = true;
      } else if (owned) {
        btn.textContent = 'Pick Team';
        btn.addEventListener('click', () => {
          save.skin = skin.id;
          persistSave();
          window.BuddyAudio.playClick();
          renderShopDialog();
          if (gameState === 'menu') loadLevelScene(activeLevel);
        });
      } else {
        btn.textContent = `⭐ ${skin.cost}`;
        btn.disabled = save.stars < skin.cost;
        btn.addEventListener('click', () => {
          if (save.stars < skin.cost) return;
          save.stars -= skin.cost;
          save.ownedSkins.push(skin.id);
          save.skin = skin.id;
          persistSave();
          window.BuddyAudio.playPurchase();
          updateHud();
          renderShopDialog();
          if (gameState === 'menu') loadLevelScene(activeLevel);
        });
      }
      card.appendChild(btn);
      skinGrid.appendChild(card);
    }
    shopBody.appendChild(skinGrid);
  }

  function syncSettingsDialog() {
    modeLittleBtn.classList.toggle('active', save.mode === 'little');
    modeBigBtn.classList.toggle('active', save.mode === 'big');
    toggleSfxBtn.textContent = save.sfx ? 'ON' : 'OFF';
    toggleSfxBtn.classList.toggle('on', save.sfx);
    toggleMusicBtn.textContent = save.music ? 'ON' : 'OFF';
    toggleMusicBtn.classList.toggle('on', save.music);
    toggleUnlockBtn.textContent = save.unlockAll ? 'ON' : 'OFF';
    toggleUnlockBtn.classList.toggle('on', save.unlockAll);
  }

  // ==================== BUTTON WIRING ====================
  btnPlay.addEventListener('click', () => {
    window.BuddyAudio.playClick();
    const lvl = window.BuddyData.LEVELS[Math.min(save.currentLevel - 1, window.BuddyData.LEVELS.length - 1)];
    startLevel(lvl);
  });

  btnNext.addEventListener('click', () => {
    window.BuddyAudio.playClick();
    if (activeLevel.isEndless) {
      endlessRound += 1;
      startLevel(window.BuddyData.generateEndlessLevel(endlessRound));
    } else if (activeLevel.id < window.BuddyData.LEVELS.length) {
      startLevel(window.BuddyData.LEVELS[activeLevel.id]);
    } else {
      endlessRound = 1;
      startLevel(window.BuddyData.generateEndlessLevel(endlessRound));
    }
  });

  btnReplay.addEventListener('click', () => {
    window.BuddyAudio.playClick();
    startLevel(activeLevel);
  });

  btnResultShop.addEventListener('click', () => {
    window.BuddyAudio.playClick();
    renderShopDialog();
    shopDialog.showModal();
  });

  btnWorlds.addEventListener('click', () => {
    window.BuddyAudio.playClick();
    renderWorldsDialog();
    worldsDialog.showModal();
  });

  btnShop.addEventListener('click', () => {
    window.BuddyAudio.playClick();
    renderShopDialog();
    shopDialog.showModal();
  });

  btnSettings.addEventListener('click', () => {
    window.BuddyAudio.playClick();
    syncSettingsDialog();
    settingsDialog.showModal();
  });

  btnHome.addEventListener('click', () => {
    window.BuddyAudio.playClick();
    goToMenu();
  });

  btnSound.addEventListener('click', () => {
    save.sfx = !save.sfx;
    window.BuddyAudio.setSfx(save.sfx);
    if (!save.sfx) {
      window.BuddyAudio.setMusic(false);
    } else if (save.music) {
      window.BuddyAudio.setMusic(true);
      if (gameState === 'playing') window.BuddyAudio.startMusic(activeWorld.id);
    }
    persistSave();
    updateHud();
  });

  modeLittleBtn.addEventListener('click', () => {
    save.mode = 'little';
    persistSave();
    window.BuddyAudio.playClick();
    syncSettingsDialog();
    updateStartMenuUI();
    if (gameState === 'menu') loadLevelScene(activeLevel);
  });

  modeBigBtn.addEventListener('click', () => {
    save.mode = 'big';
    persistSave();
    window.BuddyAudio.playClick();
    syncSettingsDialog();
    updateStartMenuUI();
    if (gameState === 'menu') loadLevelScene(activeLevel);
  });

  toggleSfxBtn.addEventListener('click', () => {
    save.sfx = !save.sfx;
    window.BuddyAudio.setSfx(save.sfx);
    persistSave();
    syncSettingsDialog();
    updateHud();
  });

  toggleMusicBtn.addEventListener('click', () => {
    save.music = !save.music;
    window.BuddyAudio.setMusic(save.music);
    persistSave();
    syncSettingsDialog();
  });

  toggleUnlockBtn.addEventListener('click', () => {
    save.unlockAll = !save.unlockAll;
    persistSave();
    window.BuddyAudio.playClick();
    syncSettingsDialog();
  });

  btnReset.addEventListener('click', () => {
    if (window.confirm('Reset all stars, upgrades, and levels back to Level 1?')) {
      save = JSON.parse(JSON.stringify(DEFAULT_SAVE));
      persistSave();
      window.BuddyAudio.setSfx(save.sfx);
      window.BuddyAudio.setMusic(save.music);
      settingsDialog.close();
      goToMenu();
    }
  });

  // ==================== RESIZE & MAIN RENDER LOOP ====================
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let lastFrame = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;

    if (gameState === 'menu') {
      runTime += dt;
    } else if (gameState === 'playing') {
      updatePlaying(dt);
    } else if (gameState === 'boss') {
      updateBossBattle(dt);
    } else if (gameState === 'stairs') {
      updateRainbowStairs(dt);
    }

    animateSquad(dt);
    updateParticles(dt);
    updateCamera(dt);
    renderer.render(scene, camera);
  }

  // ==================== BOOT ====================
  window.BuddyAudio.setSfx(save.sfx);
  window.BuddyAudio.setMusic(save.music);
  goToMenu();
  requestAnimationFrame(animate);
})();
