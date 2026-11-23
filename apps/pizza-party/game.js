// Pizza Party! — Visual Order-Matching Cooking Game for Ages 4-5
(function () {
  'use strict';

  const SAVE_KEY = 'pizza_party_save_v1';
  const ANIMALS = ['🐻', '🐰', '🦖', '🐱', '🐸', '🤖', '🐶', '🐼'];
  const SAUCES = {
    tomato: { emoji: '🍅', color: '#ef4444' },
    cheese: { emoji: '🧀', color: '#fde047' },
    berry:  { emoji: '🍓', color: '#f472b6' },
  };
  const TOPS = {
    pepperoni: { emoji: '🍕', draw: (c, x, y) => { c.fillStyle = '#dc2626'; c.beginPath(); c.arc(x, y, 13, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fca5a5'; c.beginPath(); c.arc(x - 3, y - 3, 3, 0, Math.PI * 2); c.fill(); } },
    mushroom:  { emoji: '🍄', draw: (c, x, y) => { c.fillStyle = '#e7e5e4'; c.fillRect(x - 4, y, 8, 10); c.fillStyle = '#a8a29e'; c.beginPath(); c.arc(x, y, 12, Math.PI, 0); c.fill(); } },
    pineapple: { emoji: '🍍', draw: (c, x, y) => { c.fillStyle = '#facc15'; c.strokeStyle = '#ca8a04'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - 11); c.lineTo(x + 11, y + 8); c.lineTo(x - 11, y + 8); c.closePath(); c.fill(); c.stroke(); } },
    olive:     { emoji: '🫒', draw: (c, x, y) => { c.strokeStyle = '#1e293b'; c.lineWidth = 6; c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.stroke(); } },
    sprinkles: { emoji: '🌈', draw: (c, x, y) => { const cols = ['#f43f5e','#38bdf8','#4ade80','#a855f7','#facc15']; for (let i = 0; i < 4; i++) { c.fillStyle = cols[(Math.floor(x + y) + i) % cols.length]; c.fillRect(x + (i - 1.5) * 6, y + ((i % 2) - 0.5) * 8, 5, 10); } } },
  };

  let save;
  try { save = { day: 1, coins: 0, sfx: true, ...(JSON.parse(localStorage.getItem(SAVE_KEY)) || {}) }; }
  catch (_) { save = { day: 1, coins: 0, sfx: true }; }
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} };

  let audioCtx = null;
  function tone(f, d, t = 'triangle', v = 0.14, s = null) {
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
  const canvas = document.getElementById('pizza-canvas');
  const ctx = canvas.getContext('2d');
  const hudDay = document.getElementById('hud-day');
  const hudCoins = document.getElementById('hud-coins');
  const btnMode = document.getElementById('btn-mode');
  const btnSound = document.getElementById('btn-sound');
  const animalEmoji = document.getElementById('animal-emoji');
  const orderLabel = document.getElementById('order-label');
  const orderIcons = document.getElementById('order-icons');
  const ovenBadge = document.getElementById('oven-badge');
  const btnClear = document.getElementById('btn-clear');
  const btnBake = document.getElementById('btn-bake');
  const btnServe = document.getElementById('btn-serve');
  const toastEl = document.getElementById('celebrate-toast');

  // State
  let freePlay = false;
  let ordersDoneToday = 0;
  let currentOrder = { animal: '🐻', sauce: 'tomato', toppings: ['pepperoni'] };
  let pizza = { sauce: null, toppings: [], baked: false, baking: false };
  let toastTimer = null;

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1400);
  }

  function nextOrder() {
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const sauceKeys = Object.keys(SAUCES);
    const topKeys = Object.keys(TOPS);
    const sauce = sauceKeys[Math.floor(Math.random() * sauceKeys.length)];
    const count = Math.min(3, 1 + Math.floor((save.day - 1) / 2));
    const chosen = [];
    while (chosen.length < count) {
      const k = topKeys[Math.floor(Math.random() * topKeys.length)];
      if (!chosen.includes(k)) chosen.push(k);
    }
    currentOrder = { animal, sauce, toppings: chosen };
    resetPizza();
    renderOrderBubble();
  }

  function resetPizza() {
    pizza = { sauce: null, toppings: [], baked: false, baking: false };
    ovenBadge.classList.add('hidden');
    btnBake.disabled = false;
    btnServe.disabled = true;
    document.querySelectorAll('.ing-btn').forEach((b) => b.classList.remove('active'));
    drawPizza();
    renderOrderBubble();
  }

  function renderOrderBubble() {
    animalEmoji.textContent = currentOrder.animal;
    if (freePlay) {
      orderLabel.textContent = 'Free-Play Chef!';
      orderIcons.innerHTML = '<span class="order-chip done">🎨</span><span class="order-chip done">🍕</span>';
      return;
    }
    orderLabel.textContent = 'Make my pizza:';
    orderIcons.innerHTML = '';

    const sChip = document.createElement('span');
    sChip.className = 'order-chip' + (pizza.sauce === currentOrder.sauce ? ' done' : '');
    sChip.textContent = SAUCES[currentOrder.sauce].emoji;
    orderIcons.appendChild(sChip);

    const placedTypes = new Set(pizza.toppings.map((t) => t.type));
    for (const tk of currentOrder.toppings) {
      const chip = document.createElement('span');
      chip.className = 'order-chip' + (placedTypes.has(tk) ? ' done' : '');
      chip.textContent = TOPS[tk].emoji;
      orderIcons.appendChild(chip);
    }
  }

  function drawPizza() {
    ctx.clearRect(0, 0, 320, 320);
    const cx = 160, cy = 160;

    // Wooden Paddle
    ctx.fillStyle = '#d97706';
    ctx.beginPath(); ctx.arc(cx, cy, 148, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = 6; ctx.stroke();

    // Dough Crust
    ctx.fillStyle = pizza.baked ? '#f59e0b' : '#fde68a';
    ctx.beginPath(); ctx.arc(cx, cy, 130, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pizza.baked ? '#b45309' : '#f59e0b'; ctx.lineWidth = 8; ctx.stroke();

    // Sauce
    if (pizza.sauce) {
      ctx.fillStyle = SAUCES[pizza.sauce].color;
      ctx.beginPath(); ctx.arc(cx, cy, 108, 0, Math.PI * 2); ctx.fill();
      // Melted cheese shimmer when baked
      if (pizza.baked) {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
        ctx.beginPath(); ctx.arc(cx, cy, 102, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Toppings
    for (const item of pizza.toppings) {
      TOPS[item.type].draw(ctx, item.x, item.y);
    }

    // Slice lines once baked!
    if (pizza.baked) {
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.35)';
      ctx.lineWidth = 3;
      for (let a = 0; a < 4; a++) {
        const ang = (a * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(ang) * 124, cy - Math.sin(ang) * 124);
        ctx.lineTo(cx + Math.cos(ang) * 124, cy + Math.sin(ang) * 124);
        ctx.stroke();
      }
    }
  }

  // Sauce & Topping Buttons
  document.querySelectorAll('[data-sauce]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (pizza.baking || pizza.baked) return;
      pizza.sauce = btn.dataset.sauce;
      document.querySelectorAll('[data-sauce]').forEach((b) => b.classList.toggle('active', b === btn));
      tone(420, 0.12, 'sine', 0.14, 560);
      drawPizza();
      renderOrderBubble();
    });
  });

  document.querySelectorAll('[data-top]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (pizza.baking || pizza.baked) return;
      const type = btn.dataset.top;
      // Sprinkle 5 cute pieces across the pizza
      for (let i = 0; i < 5; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 18 + Math.random() * 76;
        pizza.toppings.push({ type, x: 160 + Math.cos(ang) * rad, y: 160 + Math.sin(ang) * rad });
      }
      if (pizza.toppings.length > 45) pizza.toppings.splice(0, pizza.toppings.length - 45);
      btn.classList.add('active');
      tone(580 + Math.random() * 140, 0.09, 'triangle', 0.13, 760);
      drawPizza();
      renderOrderBubble();
    });
  });

  btnClear.addEventListener('click', () => {
    tone(300, 0.1, 'sine', 0.1, 220);
    resetPizza();
  });

  btnBake.addEventListener('click', () => {
    if (pizza.baking || pizza.baked) return;
    pizza.baking = true;
    btnBake.disabled = true;
    ovenBadge.classList.remove('hidden');
    tone(330, 0.25, 'triangle', 0.12, 440);
    setTimeout(() => {
      pizza.baking = false;
      pizza.baked = true;
      ovenBadge.classList.add('hidden');
      btnServe.disabled = false;
      drawPizza();
      tone(880, 0.25, 'sine', 0.16, 1318);
      showToast('🔔 DING! READY TO SERVE!');
    }, 950);
  });

  btnServe.addEventListener('click', () => {
    if (!pizza.baked) return;
    const placedTypes = new Set(pizza.toppings.map((t) => t.type));
    const exactMatch = freePlay || (
      pizza.sauce === currentOrder.sauce &&
      currentOrder.toppings.every((t) => placedTypes.has(t))
    );

    const reward = exactMatch ? 10 : 5;
    save.coins += reward;
    if (!freePlay) {
      ordersDoneToday++;
      if (ordersDoneToday >= 3) {
        ordersDoneToday = 0;
        save.day += 1;
      }
    }
    persist();
    updateHud();

    animalEmoji.classList.add('happy');
    tone(523, 0.14, 'triangle', 0.16, 1046);
    showToast(exactMatch ? `😋 YUMMY!! +${reward} 🪙` : `😊 TASTY! +${reward} 🪙`);

    setTimeout(() => {
      animalEmoji.classList.remove('happy');
      nextOrder();
    }, 1150);
  });

  btnMode.addEventListener('click', () => {
    freePlay = !freePlay;
    btnMode.textContent = freePlay ? '🎨 Free Play' : '📋 Orders';
    tone(520, 0.08, 'sine', 0.12, 660);
    renderOrderBubble();
  });

  btnSound.addEventListener('click', () => {
    save.sfx = !save.sfx;
    persist();
    updateHud();
  });

  function updateHud() {
    hudDay.textContent = `☀️ Day ${save.day}`;
    hudCoins.textContent = `🪙 ${save.coins}`;
    btnSound.textContent = save.sfx ? '🔊' : '🔇';
  }

  updateHud();
  nextOrder();
})();
