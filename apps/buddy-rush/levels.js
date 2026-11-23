// Buddy Rush! — 5 Worlds, 15 Handcrafted Levels + Endless Rainbow Mode
(function (global) {
  'use strict';

  const WORLDS = [
    {
      id: 'meadow',
      name: 'Sunny Meadow',
      emoji: '🌻',
      sky: 0x7dd3fc,
      fog: 0xbae6fd,
      ground: 0x4ade80,
      track: 0xfef3c7,
      trackEdge: 0xf59e0b,
      stripe: 0xfde68a,
      enemyColor: 0xa855f7,
      bossColor: 0x9333ea,
      bossName: 'Bouncy Slime King',
      accent: '#22c55e',
    },
    {
      id: 'candy',
      name: 'Candy Kingdom',
      emoji: '🍭',
      sky: 0xfbcfe8,
      fog: 0xfce7f3,
      ground: 0xf9a8d4,
      track: 0xfff1f2,
      trackEdge: 0xf43f5e,
      stripe: 0xfecdd3,
      enemyColor: 0xf97316,
      bossColor: 0xea580c,
      bossName: 'Giant Cupcake',
      accent: '#ec4899',
    },
    {
      id: 'jungle',
      name: 'Dino Jungle',
      emoji: '🦕',
      sky: 0xfde68a,
      fog: 0xfef3c7,
      ground: 0x16a34a,
      track: 0xd6d3d1,
      trackEdge: 0xb45309,
      stripe: 0xe7e5e4,
      enemyColor: 0xef4444,
      bossColor: 0xdc2626,
      bossName: 'Mega Dino-Bot',
      accent: '#f59e0b',
    },
    {
      id: 'frost',
      name: 'Frozen Frostland',
      emoji: '⛄',
      sky: 0xbae6fd,
      fog: 0xe0f2fe,
      ground: 0xf0f9ff,
      track: 0x67e8f9,
      trackEdge: 0x0284c7,
      stripe: 0xa5f3fc,
      enemyColor: 0x6366f1,
      bossColor: 0x4f46e5,
      bossName: 'King Snow-Golem',
      accent: '#0ea5e9',
    },
    {
      id: 'space',
      name: 'Starry Space',
      emoji: '🚀',
      sky: 0x1e1b4b,
      fog: 0x312e81,
      ground: 0x1e1b4b,
      track: 0x3b0764,
      trackEdge: 0xc084fc,
      stripe: 0x581c87,
      enemyColor: 0x10b981,
      bossColor: 0x059669,
      bossName: 'Mega Astro-King',
      accent: '#8b5cf6',
    },
  ];

  // Buddy Skins unlockable in the Shop
  const SKINS = [
    { id: 'bot', name: 'Blue Bots', emoji: '🤖', cost: 0, body: 0x3b82f6, accent: 0x93c5fd, cheek: 0xfde047 },
    { id: 'duck', name: 'Sunny Duckies', emoji: '🐤', cost: 60, body: 0xfacc15, accent: 0xf97316, cheek: 0xfca5a5 },
    { id: 'dino', name: 'Dino Pals', emoji: '🦖', cost: 130, body: 0x22c55e, accent: 0xfde047, cheek: 0x86efac },
    { id: 'bunny', name: 'Star Bunnies', emoji: '🐰', cost: 220, body: 0xf472b6, accent: 0xfdf2f8, cheek: 0xfda4af },
    { id: 'bear', name: 'Rainbow Bears', emoji: '🧸', cost: 340, body: 0x8b5cf6, accent: 0xfbbf24, cheek: 0xf472b6, rainbow: true },
  ];

  // Handcrafted 15 Levels across 5 Worlds
  // z coordinates run forward into negative Z (e.g. z = 25 means 25 units ahead from start)
  // Track width is 12 units (x from -5.2 to +5.2). Left lane ~ -2.8, Center ~ 0, Right ~ +2.8.
  const LEVELS = [
    // ================= WORLD 1: SUNNY MEADOW =================
    {
      id: 1,
      world: 'meadow',
      name: 'First Steps',
      length: 145,
      speed: 10.5,
      bossType: 'castle',
      bossName: 'Meadow Toy Castle',
      bossHp: 8,
      bigBossHp: 14,
      events: [
        { type: 'stars', z: 18, x: 0, count: 4 },
        { type: 'gates', z: 34, left: { op: '+', val: 2 }, right: { op: '+', val: 4 } },
        { type: 'bumper', z: 54, x: 2.6 },
        { type: 'stars', z: 54, x: -2.6, count: 3 },
        { type: 'gates', z: 74, left: { op: '+', val: 3 }, right: { op: '+', val: 1 } },
        { type: 'enemies', z: 95, x: 0, count: 3, bigCount: 6 },
        { type: 'gates', z: 118, left: { op: '+', val: 4 }, right: { op: '-', val: 1 } },
      ],
    },
    {
      id: 2,
      world: 'meadow',
      name: 'Double Magic!',
      length: 165,
      speed: 11.0,
      bossType: 'boss',
      bossName: 'Bouncy Berry Slime',
      bossHp: 14,
      bigBossHp: 24,
      events: [
        { type: 'gates', z: 26, left: { op: '+', val: 3 }, right: { op: '+', val: 1 } },
        { type: 'stars', z: 44, x: -2.5, count: 4 },
        { type: 'bumper', z: 52, x: 0 },
        { type: 'gates', z: 72, left: { op: '-', val: 2 }, right: { op: 'x', val: 2 } },
        { type: 'enemies', z: 96, x: 1.8, count: 4, bigCount: 8 },
        { type: 'boost', z: 112, x: -2.4 },
        { type: 'gates', z: 134, left: { op: '+', val: 5 }, right: { op: '-', val: 2 } },
      ],
    },
    {
      id: 3,
      world: 'meadow',
      name: 'Meadow Bridge',
      length: 185,
      speed: 11.4,
      bossType: 'boss',
      bossName: 'King Meadow Slime',
      bossHp: 20,
      bigBossHp: 34,
      events: [
        { type: 'gates', z: 26, left: { op: '+', val: 4 }, right: { op: '+', val: 2 } },
        { type: 'spinner', z: 48, x: 0, speed: 1.4, radius: 3.1 },
        { type: 'gates', z: 72, left: { op: 'x', val: 2 }, right: { op: '-', val: 2 }, moving: true, moveSpeed: 1.1 },
        { type: 'enemies', z: 96, x: -2.0, count: 5, bigCount: 10 },
        { type: 'stars', z: 114, x: 2.4, count: 4 },
        { type: 'bumper', z: 126, x: -2.2 },
        { type: 'bumper', z: 126, x: 2.2 },
        { type: 'gates', z: 148, left: { op: '+', val: 5 }, right: { op: 'x', val: 2 } },
        { type: 'enemies', z: 165, x: 0, count: 6, bigCount: 12 },
      ],
    },

    // ================= WORLD 2: CANDY KINGDOM =================
    {
      id: 4,
      world: 'candy',
      name: 'Sugar Sprint',
      length: 180,
      speed: 11.6,
      bossType: 'castle',
      bossName: 'Wafer Fortress',
      bossHp: 22,
      bigBossHp: 38,
      events: [
        { type: 'stars', z: 18, x: 2.4, count: 4 },
        { type: 'gates', z: 32, left: { op: '+', val: 3 }, right: { op: '+', val: 5 } },
        { type: 'slider', z: 54, speed: 1.5, width: 3.6 },
        { type: 'gates', z: 78, left: { op: 'x', val: 2 }, right: { op: '-', val: 2 } },
        { type: 'enemies', z: 102, x: 0, count: 6, bigCount: 12 },
        { type: 'boost', z: 120, x: 2.5 },
        { type: 'bumper', z: 132, x: -2.0 },
        { type: 'gates', z: 152, left: { op: '-', val: 2 }, right: { op: '+', val: 6 } },
      ],
    },
    {
      id: 5,
      world: 'candy',
      name: 'Lollipop Lanes',
      length: 195,
      speed: 12.0,
      bossType: 'boss',
      bossName: 'Gummy Giant',
      bossHp: 26,
      bigBossHp: 46,
      events: [
        { type: 'gates', z: 28, left: { op: '+', val: 4 }, right: { op: '+', val: 2 } },
        { type: 'bumper', z: 48, x: -2.8 },
        { type: 'stars', z: 48, x: 2.8, count: 4 },
        { type: 'gates', z: 72, left: { op: 'x', val: 2 }, right: { op: '+', val: 3 }, moving: true, moveSpeed: 1.2 },
        { type: 'slider', z: 96, speed: 1.7, width: 3.8 },
        { type: 'enemies', z: 118, x: -2.2, count: 6, bigCount: 12 },
        { type: 'enemies', z: 118, x: 2.2, count: 6, bigCount: 12 },
        { type: 'boost', z: 138, x: 0 },
        { type: 'gates', z: 162, left: { op: '-', val: 3 }, right: { op: 'x', val: 2 } },
      ],
    },
    {
      id: 6,
      world: 'candy',
      name: 'Frosting Fortress',
      length: 210,
      speed: 12.3,
      bossType: 'boss',
      bossName: 'Giant Cupcake',
      bossHp: 34,
      bigBossHp: 58,
      events: [
        { type: 'gates', z: 26, left: { op: '+', val: 5 }, right: { op: '-', val: 1 } },
        { type: 'spinner', z: 48, x: 0, speed: 1.6, radius: 3.3 },
        { type: 'gates', z: 74, left: { op: '+', val: 3 }, right: { op: 'x', val: 2 } },
        { type: 'enemies', z: 98, x: 0, count: 8, bigCount: 15 },
        { type: 'slider', z: 122, speed: 1.8, width: 4.0 },
        { type: 'stars', z: 140, x: -2.5, count: 5 },
        { type: 'gates', z: 158, left: { op: 'x', val: 2 }, right: { op: '-', val: 3 }, moving: true, moveSpeed: 1.3 },
        { type: 'enemies', z: 184, x: 0, count: 9, bigCount: 18 },
      ],
    },

    // ================= WORLD 3: DINO JUNGLE =================
    {
      id: 7,
      world: 'jungle',
      name: 'T-Rex Trail',
      length: 205,
      speed: 12.4,
      bossType: 'castle',
      bossName: 'Jungle Temple',
      bossHp: 32,
      bigBossHp: 56,
      events: [
        { type: 'boost', z: 18, x: 0 },
        { type: 'gates', z: 36, left: { op: '+', val: 5 }, right: { op: '+', val: 2 } },
        { type: 'slider', z: 60, speed: 1.8, width: 3.8 },
        { type: 'bumper', z: 82, x: 2.5 },
        { type: 'bumper', z: 82, x: -2.5 },
        { type: 'gates', z: 104, left: { op: '-', val: 2 }, right: { op: 'x', val: 2 } },
        { type: 'enemies', z: 130, x: 0, count: 9, bigCount: 16 },
        { type: 'stars', z: 150, x: 2.2, count: 5 },
        { type: 'gates', z: 172, left: { op: '+', val: 6 }, right: { op: '-', val: 2 } },
      ],
    },
    {
      id: 8,
      world: 'jungle',
      name: 'Bridge of Buddies',
      length: 215,
      speed: 12.7,
      bossType: 'boss',
      bossName: 'Stompy Stego',
      bossHp: 38,
      bigBossHp: 66,
      events: [
        { type: 'gates', z: 26, left: { op: '+', val: 4 }, right: { op: '+', val: 6 } },
        { type: 'spinner', z: 50, x: -1.6, speed: 1.7, radius: 2.8 },
        { type: 'boost', z: 66, x: 2.8 },
        { type: 'gates', z: 86, left: { op: 'x', val: 2 }, right: { op: '-', val: 3 }, moving: true, moveSpeed: 1.4 },
        { type: 'enemies', z: 112, x: -2.0, count: 8, bigCount: 15 },
        { type: 'slider', z: 136, speed: 1.9, width: 4.0 },
        { type: 'gates', z: 162, left: { op: '+', val: 5 }, right: { op: 'x', val: 2 } },
        { type: 'enemies', z: 188, x: 1.8, count: 10, bigCount: 18 },
      ],
    },
    {
      id: 9,
      world: 'jungle',
      name: 'Volcano Summit',
      length: 230,
      speed: 13.0,
      bossType: 'boss',
      bossName: 'Mega Dino-Bot',
      bossHp: 46,
      bigBossHp: 78,
      events: [
        { type: 'gates', z: 26, left: { op: '+', val: 5 }, right: { op: '-', val: 2 } },
        { type: 'slider', z: 48, speed: 1.9, width: 4.0 },
        { type: 'gates', z: 74, left: { op: 'x', val: 2 }, right: { op: '+', val: 4 } },
        { type: 'enemies', z: 98, x: 0, count: 10, bigCount: 18 },
        { type: 'spinner', z: 124, x: 0, speed: 1.8, radius: 3.4 },
        { type: 'stars', z: 142, x: -2.6, count: 5 },
        { type: 'boost', z: 152, x: 2.6 },
        { type: 'gates', z: 174, left: { op: '-', val: 3 }, right: { op: 'x', val: 2 }, moving: true, moveSpeed: 1.5 },
        { type: 'enemies', z: 202, x: 0, count: 12, bigCount: 22 },
      ],
    },

    // ================= WORLD 4: FROZEN FROSTLAND =================
    {
      id: 10,
      world: 'frost',
      name: 'Snowball Slide',
      length: 220,
      speed: 13.0,
      bossType: 'castle',
      bossName: 'Crystal Igloo',
      bossHp: 44,
      bigBossHp: 74,
      events: [
        { type: 'gates', z: 26, left: { op: '+', val: 6 }, right: { op: '+', val: 3 } },
        { type: 'slider', z: 50, speed: 2.0, width: 4.0 },
        { type: 'boost', z: 68, x: -2.5 },
        { type: 'gates', z: 88, left: { op: 'x', val: 2 }, right: { op: '-', val: 3 } },
        { type: 'bumper', z: 112, x: 0 },
        { type: 'enemies', z: 132, x: 0, count: 12, bigCount: 20 },
        { type: 'stars', z: 152, x: 2.5, count: 5 },
        { type: 'gates', z: 174, left: { op: '-', val: 2 }, right: { op: 'x', val: 2 }, moving: true, moveSpeed: 1.4 },
        { type: 'slider', z: 196, speed: 2.0, width: 3.8 },
      ],
    },
    {
      id: 11,
      world: 'frost',
      name: 'Penguin Parade',
      length: 235,
      speed: 13.3,
      bossType: 'boss',
      bossName: 'Frosty Yeti',
      bossHp: 52,
      bigBossHp: 88,
      events: [
        { type: 'gates', z: 26, left: { op: '+', val: 5 }, right: { op: '+', val: 2 } },
        { type: 'bumper', z: 48, x: -2.4 },
        { type: 'bumper', z: 48, x: 2.4 },
        { type: 'gates', z: 74, left: { op: 'x', val: 2 }, right: { op: '-', val: 3 } },
        { type: 'enemies', z: 98, x: -2.2, count: 9, bigCount: 16 },
        { type: 'enemies', z: 98, x: 2.2, count: 9, bigCount: 16 },
        { type: 'spinner', z: 126, x: 0, speed: 1.9, radius: 3.5 },
        { type: 'boost', z: 146, x: 0 },
        { type: 'gates', z: 170, left: { op: '+', val: 6 }, right: { op: 'x', val: 2 }, moving: true, moveSpeed: 1.5 },
        { type: 'enemies', z: 204, x: 0, count: 14, bigCount: 24 },
      ],
    },
    {
      id: 12,
      world: 'frost',
      name: 'Ice Palace',
      length: 245,
      speed: 13.6,
      bossType: 'boss',
      bossName: 'King Snow-Golem',
      bossHp: 60,
      bigBossHp: 100,
      events: [
        { type: 'gates', z: 26, left: { op: '+', val: 6 }, right: { op: '-', val: 2 } },
        { type: 'spinner', z: 50, x: 0, speed: 2.0, radius: 3.5 },
        { type: 'gates', z: 76, left: { op: '-', val: 3 }, right: { op: 'x', val: 2 } },
        { type: 'slider', z: 100, speed: 2.1, width: 4.2 },
        { type: 'enemies', z: 124, x: 0, count: 14, bigCount: 24 },
        { type: 'stars', z: 144, x: -2.6, count: 6 },
        { type: 'boost', z: 154, x: 2.6 },
        { type: 'gates', z: 178, left: { op: 'x', val: 2 }, right: { op: '+', val: 5 }, moving: true, moveSpeed: 1.6 },
        { type: 'enemies', z: 212, x: 0, count: 16, bigCount: 28 },
      ],
    },

    // ================= WORLD 5: STARRY SPACE =================
    {
      id: 13,
      world: 'space',
      name: 'Moon Hop',
      length: 235,
      speed: 13.6,
      bossType: 'castle',
      bossName: 'Starship Station',
      bossHp: 58,
      bigBossHp: 96,
      events: [
        { type: 'boost', z: 18, x: 0 },
        { type: 'gates', z: 36, left: { op: '+', val: 6 }, right: { op: '+', val: 3 } },
        { type: 'bumper', z: 58, x: -2.6 },
        { type: 'bumper', z: 58, x: 0 },
        { type: 'gates', z: 82, left: { op: 'x', val: 2 }, right: { op: '-', val: 3 } },
        { type: 'enemies', z: 108, x: 0, count: 14, bigCount: 24 },
        { type: 'slider', z: 134, speed: 2.1, width: 4.2 },
        { type: 'stars', z: 154, x: 2.4, count: 6 },
        { type: 'gates', z: 178, left: { op: '-', val: 3 }, right: { op: 'x', val: 2 }, moving: true, moveSpeed: 1.6 },
        { type: 'enemies', z: 206, x: 0, count: 15, bigCount: 26 },
      ],
    },
    {
      id: 14,
      world: 'space',
      name: 'Comet Run',
      length: 250,
      speed: 14.0,
      bossType: 'boss',
      bossName: 'Cosmic Octopus',
      bossHp: 68,
      bigBossHp: 112,
      events: [
        { type: 'gates', z: 26, left: { op: '+', val: 6 }, right: { op: '-', val: 2 } },
        { type: 'spinner', z: 52, x: -1.5, speed: 2.0, radius: 2.9 },
        { type: 'spinner', z: 74, x: 1.5, speed: -2.0, radius: 2.9 },
        { type: 'gates', z: 98, left: { op: 'x', val: 2 }, right: { op: '+', val: 5 }, moving: true, moveSpeed: 1.6 },
        { type: 'enemies', z: 124, x: 0, count: 16, bigCount: 28 },
        { type: 'boost', z: 146, x: -2.4 },
        { type: 'slider', z: 168, speed: 2.2, width: 4.2 },
        { type: 'gates', z: 194, left: { op: 'x', val: 2 }, right: { op: '-', val: 4 } },
        { type: 'enemies', z: 222, x: 0, count: 18, bigCount: 30 },
      ],
    },
    {
      id: 15,
      world: 'space',
      name: 'Galaxy Grand Finale!',
      length: 270,
      speed: 14.2,
      bossType: 'boss',
      bossName: 'Mega Astro-King',
      bossHp: 80,
      bigBossHp: 135,
      events: [
        { type: 'boost', z: 18, x: 0 },
        { type: 'gates', z: 36, left: { op: '+', val: 6 }, right: { op: '+', val: 4 } },
        { type: 'slider', z: 60, speed: 2.1, width: 4.2 },
        { type: 'gates', z: 86, left: { op: 'x', val: 2 }, right: { op: '-', val: 3 }, moving: true, moveSpeed: 1.6 },
        { type: 'enemies', z: 112, x: 0, count: 16, bigCount: 28 },
        { type: 'spinner', z: 138, x: 0, speed: 2.1, radius: 3.6 },
        { type: 'stars', z: 156, x: 0, count: 7 },
        { type: 'gates', z: 178, left: { op: '+', val: 7 }, right: { op: 'x', val: 2 } },
        { type: 'boost', z: 196, x: 0 },
        { type: 'enemies', z: 218, x: 0, count: 20, bigCount: 34 },
        { type: 'gates', z: 244, left: { op: 'x', val: 2 }, right: { op: '+', val: 8 } },
      ],
    },
  ];

  // Endless Rainbow Mode generator for infinite replayability
  function generateEndlessLevel(round) {
    const world = WORLDS[(round - 1) % WORLDS.length];
    const length = 210 + Math.min(round * 12, 90);
    const speed = Math.min(11.8 + round * 0.35, 15.0);
    const events = [];
    let z = 28;
    let step = 0;
    while (z < length - 32) {
      if (step % 3 === 0) {
        const useDouble = Math.random() < 0.48;
        const leftGood = Math.random() < 0.5;
        const goodGate = useDouble
          ? { op: 'x', val: 2 }
          : { op: '+', val: 3 + Math.floor(Math.random() * 5) };
        const otherGate =
          Math.random() < 0.6
            ? { op: '-', val: 1 + Math.floor(Math.random() * 3) }
            : { op: '+', val: 1 + Math.floor(Math.random() * 3) };
        events.push({
          type: 'gates',
          z,
          left: leftGood ? goodGate : otherGate,
          right: leftGood ? otherGate : goodGate,
          moving: round >= 2 && Math.random() < 0.4,
          moveSpeed: 1.2 + Math.min(round * 0.1, 0.6),
        });
      } else if (step % 3 === 1) {
        const r = Math.random();
        if (r < 0.35) {
          events.push({ type: 'slider', z, speed: 1.6 + Math.min(round * 0.12, 0.8), width: 3.8 });
        } else if (r < 0.68) {
          events.push({ type: 'spinner', z, x: 0, speed: (Math.random() < 0.5 ? 1 : -1) * (1.5 + Math.min(round * 0.1, 0.8)), radius: 3.3 });
        } else {
          events.push({ type: 'bumper', z, x: (Math.random() < 0.5 ? -2.4 : 2.4) });
          events.push({ type: 'boost', z: z + 4, x: (Math.random() < 0.5 ? 2.4 : -2.4) });
        }
      } else {
        const enemyCount = 5 + Math.min(round * 2, 16);
        events.push({ type: 'enemies', z, x: (Math.random() - 0.5) * 3.5, count: enemyCount, bigCount: Math.round(enemyCount * 1.6) });
        events.push({ type: 'stars', z: z + 14, x: (Math.random() - 0.5) * 4.5, count: 5 });
      }
      z += 25;
      step++;
    }

    return {
      id: 100 + round,
      isEndless: true,
      endlessRound: round,
      world: world.id,
      name: `Rainbow Run #${round}`,
      length,
      speed,
      bossType: round % 2 === 0 ? 'boss' : 'castle',
      bossName: world.bossName,
      bossHp: 24 + round * 10,
      bigBossHp: 40 + round * 16,
      events,
    };
  }

  global.BuddyData = {
    WORLDS,
    SKINS,
    LEVELS,
    getWorld(id) {
      return WORLDS.find((w) => w.id === id) || WORLDS[0];
    },
    getSkin(id) {
      return SKINS.find((s) => s.id === id) || SKINS[0];
    },
    generateEndlessLevel,
  };
})(window);
