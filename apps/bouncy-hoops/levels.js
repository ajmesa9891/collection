// Bouncy Hoops! — 3 Bright Worlds, 15 Handcrafted Physics Puzzle Levels + Endless Trick Shots
(function (global) {
  'use strict';

  // Virtual coordinate space: 960 x 540 (16:9 landscape, scales crisply to any screen)
  const STAGE_W = 960;
  const STAGE_H = 540;

  const WORLDS = [
    {
      id: 'playground',
      name: 'Sunny Park',
      emoji: '☀️',
      skyTop: '#38bdf8',
      skyBot: '#bae6fd',
      wallFill: '#fbbf24',
      wallStroke: '#d97706',
      floorFill: '#4ade80',
      floorStroke: '#16a34a',
    },
    {
      id: 'factory',
      name: 'Bounce Factory',
      emoji: '🎪',
      skyTop: '#f472b6',
      skyBot: '#fde68a',
      wallFill: '#a855f7',
      wallStroke: '#7e22ce',
      floorFill: '#fb7185',
      floorStroke: '#e11d48',
    },
    {
      id: 'sky',
      name: 'Starry Castle',
      emoji: '🏰',
      skyTop: '#312e81',
      skyBot: '#7c3aed',
      wallFill: '#38bdf8',
      wallStroke: '#0284c7',
      floorFill: '#6366f1',
      floorStroke: '#4338ca',
    },
  ];

  // Unlockable Blumgi-style bouncy characters
  const CHARACTERS = [
    { id: 'slime', name: 'Sunny Slime', emoji: '🟠', cost: 0, body: '#fb923c', highlight: '#fed7aa', cheek: '#f43f5e' },
    { id: 'frog', name: 'Bouncy Frog', emoji: '🐸', cost: 12, body: '#4ade80', highlight: '#bbf7d0', cheek: '#fb7185' },
    { id: 'cat', name: 'Happy Kitty', emoji: '🐱', cost: 24, body: '#f472b6', highlight: '#fbcfe8', cheek: '#fbbf24' },
    { id: 'dino', name: 'Dino Egg', emoji: '🦕', cost: 38, body: '#38bdf8', highlight: '#bae6fd', cheek: '#facc15' },
    { id: 'alien', name: 'Star Alien', emoji: '👽', cost: 52, body: '#a855f7', highlight: '#e9d5ff', cheek: '#34d399' },
    { id: 'rainbow', name: 'Rainbow Puff', emoji: '🌈', cost: 70, body: '#facc15', highlight: '#ffffff', cheek: '#ec4899', rainbow: true },
  ];

  // Handcrafted 15 Levels
  // Elements:
  // - ball: { x, y }
  // - hoop: { x, y, facing: 'left'|'right', moveY?: amp, moveX?: amp, moveSpeed?: rad/s }
  // - walls: [{ x, y, w, h, bounce?: 0.85, moveY?: amp, moveX?: amp, speed?: rad/s }]
  // - trampolines: [{ x, y, w, h, power?: 1.38 }]
  // - bumpers: [{ x, y, r, power?: 1.25 }]
  // - portals: [{ ax, ay, bx, by, r: 30 }]
  // - stars: [{ x, y }]
  const LEVELS = [
    // ================= WORLD 1: SUNNY PARK =================
    {
      id: 1,
      world: 'playground',
      name: 'First Swish!',
      tip: 'Hold to aim, let go to shoot!',
      ball: { x: 170, y: 455 },
      hoop: { x: 755, y: 270, facing: 'left' },
      walls: [],
      trampolines: [],
      bumpers: [],
      portals: [],
      stars: [{ x: 460, y: 240 }, { x: 615, y: 215 }],
    },
    {
      id: 2,
      world: 'playground',
      name: 'High Arc',
      tip: 'Pop over the sunny wall!',
      ball: { x: 150, y: 455 },
      hoop: { x: 785, y: 310, facing: 'left' },
      walls: [{ x: 445, y: 315, w: 46, h: 175 }],
      trampolines: [],
      bumpers: [],
      portals: [],
      stars: [{ x: 468, y: 220 }, { x: 645, y: 235 }],
    },
    {
      id: 3,
      world: 'playground',
      name: 'Boing Pad!',
      tip: 'Bounce off the green trampoline!',
      ball: { x: 155, y: 455 },
      hoop: { x: 790, y: 210, facing: 'left' },
      walls: [{ x: 410, y: 20, w: 44, h: 255 }],
      trampolines: [{ x: 430, y: 472, w: 155, h: 20, power: 1.35 }],
      bumpers: [],
      portals: [],
      stars: [{ x: 505, y: 390 }, { x: 655, y: 185 }],
    },
    {
      id: 4,
      world: 'playground',
      name: 'Bank Shot!',
      tip: 'Bounce off the right wall into the hoop!',
      ball: { x: 175, y: 455 },
      hoop: { x: 615, y: 210, facing: 'right' },
      walls: [
        { x: 540, y: 265, w: 195, h: 32 },
        { x: 880, y: 80, w: 36, h: 310, bounce: 0.96 },
      ],
      trampolines: [],
      bumpers: [],
      portals: [],
      stars: [{ x: 830, y: 175 }, { x: 730, y: 155 }],
    },
    {
      id: 5,
      world: 'playground',
      name: 'Bouncy Bumper',
      tip: 'Ricochet off the giant bumper!',
      ball: { x: 150, y: 455 },
      hoop: { x: 780, y: 280, facing: 'left' },
      walls: [{ x: 455, y: 295, w: 42, h: 195 }],
      trampolines: [],
      bumpers: [{ x: 476, y: 175, r: 42, power: 1.25 }],
      portals: [],
      stars: [{ x: 350, y: 240 }, { x: 650, y: 190 }],
    },

    // ================= WORLD 2: BOUNCE FACTORY =================
    {
      id: 6,
      world: 'factory',
      name: 'Elevator Gate',
      tip: 'Time your shot past the moving block!',
      ball: { x: 155, y: 455 },
      hoop: { x: 785, y: 265, facing: 'left' },
      walls: [{ x: 465, y: 250, w: 44, h: 145, moveY: 95, speed: 1.55 }],
      trampolines: [],
      bumpers: [],
      portals: [],
      stars: [{ x: 487, y: 155 }, { x: 655, y: 205 }],
    },
    {
      id: 7,
      world: 'factory',
      name: 'Double Boing!',
      tip: 'Bounce twice to reach the top hoop!',
      ball: { x: 135, y: 455 },
      hoop: { x: 805, y: 175, facing: 'left' },
      walls: [
        { x: 340, y: 20, w: 40, h: 250 },
        { x: 600, y: 265, w: 40, h: 225 },
      ],
      trampolines: [
        { x: 285, y: 472, w: 140, h: 20, power: 1.32 },
        { x: 470, y: 472, w: 120, h: 20, power: 1.38 },
      ],
      bumpers: [],
      portals: [],
      stars: [{ x: 355, y: 385 }, { x: 530, y: 210 }],
    },
    {
      id: 8,
      world: 'factory',
      name: 'Magic Portal!',
      tip: 'Shoot into the blue ring to teleport!',
      ball: { x: 150, y: 455 },
      hoop: { x: 790, y: 325, facing: 'left' },
      walls: [{ x: 500, y: 20, w: 46, h: 470 }],
      trampolines: [],
      bumpers: [],
      portals: [{ ax: 385, ay: 220, bx: 645, by: 165, r: 36 }],
      stars: [{ x: 300, y: 285 }, { x: 710, y: 235 }],
    },
    {
      id: 9,
      world: 'factory',
      name: 'Dancing Hoop',
      tip: 'Watch the hoop bob up and down!',
      ball: { x: 155, y: 455 },
      hoop: { x: 775, y: 265, facing: 'left', moveY: 75, moveSpeed: 1.4 },
      walls: [{ x: 440, y: 350, w: 44, h: 140 }],
      trampolines: [{ x: 295, y: 472, w: 125, h: 20, power: 1.28 }],
      bumpers: [],
      portals: [],
      stars: [{ x: 462, y: 220 }, { x: 635, y: 215 }],
    },
    {
      id: 10,
      world: 'factory',
      name: 'Pinball Party!',
      tip: 'Bounce through the bumper playground!',
      ball: { x: 145, y: 455 },
      hoop: { x: 800, y: 245, facing: 'left' },
      walls: [{ x: 460, y: 340, w: 42, h: 150 }],
      trampolines: [],
      bumpers: [
        { x: 370, y: 230, r: 34, power: 1.22 },
        { x: 560, y: 175, r: 36, power: 1.25 },
        { x: 600, y: 345, r: 32, power: 1.22 },
      ],
      portals: [],
      stars: [{ x: 465, y: 150 }, { x: 685, y: 205 }],
    },

    // ================= WORLD 3: STARRY CASTLE =================
    {
      id: 11,
      world: 'sky',
      name: 'Ceiling Rebound',
      tip: 'Skip off the starry roof!',
      ball: { x: 155, y: 455 },
      hoop: { x: 790, y: 320, facing: 'left' },
      walls: [
        { x: 400, y: 235, w: 46, h: 255 },
        { x: 540, y: 235, w: 46, h: 255 },
      ],
      trampolines: [{ x: 255, y: 472, w: 125, h: 20, power: 1.38 }],
      bumpers: [],
      portals: [],
      stars: [{ x: 490, y: 125 }, { x: 685, y: 230 }],
    },
    {
      id: 12,
      world: 'sky',
      name: 'Portal Bounce',
      tip: 'Hit the trampoline into the portal!',
      ball: { x: 145, y: 455 },
      hoop: { x: 785, y: 245, facing: 'left' },
      walls: [
        { x: 475, y: 20, w: 44, h: 470 },
        { x: 250, y: 20, w: 40, h: 260 },
      ],
      trampolines: [{ x: 240, y: 472, w: 150, h: 20, power: 1.38 }],
      bumpers: [],
      portals: [{ ax: 390, ay: 185, bx: 615, by: 155, r: 36 }],
      stars: [{ x: 325, y: 365 }, { x: 700, y: 195 }],
    },
    {
      id: 13,
      world: 'sky',
      name: 'Twin Gates',
      tip: 'Thread the needle between moving walls!',
      ball: { x: 140, y: 455 },
      hoop: { x: 810, y: 265, facing: 'left' },
      walls: [
        { x: 375, y: 245, w: 40, h: 135, moveY: 85, speed: 1.45 },
        { x: 585, y: 245, w: 40, h: 135, moveY: -85, speed: 1.45 },
      ],
      trampolines: [],
      bumpers: [],
      portals: [],
      stars: [{ x: 480, y: 215 }, { x: 695, y: 200 }],
    },
    {
      id: 14,
      world: 'sky',
      name: 'Castle Tower',
      tip: 'Use the bumper & trampoline combo!',
      ball: { x: 145, y: 455 },
      hoop: { x: 795, y: 185, facing: 'left', moveY: 50, moveSpeed: 1.25 },
      walls: [
        { x: 450, y: 240, w: 44, h: 250 },
        { x: 660, y: 320, w: 44, h: 170 },
      ],
      trampolines: [{ x: 515, y: 472, w: 130, h: 20, power: 1.42 }],
      bumpers: [{ x: 350, y: 195, r: 34, power: 1.2 }],
      portals: [],
      stars: [{ x: 472, y: 155 }, { x: 620, y: 175 }],
    },
    {
      id: 15,
      world: 'sky',
      name: 'Grand Star Finale!',
      tip: 'Portal + moving hoop for the crown!',
      ball: { x: 135, y: 455 },
      hoop: { x: 805, y: 255, facing: 'left', moveY: 65, moveSpeed: 1.35 },
      walls: [
        { x: 470, y: 20, w: 44, h: 470 },
      ],
      trampolines: [{ x: 225, y: 472, w: 140, h: 20, power: 1.36 }],
      bumpers: [{ x: 645, y: 355, r: 34, power: 1.25 }],
      portals: [{ ax: 385, ay: 185, bx: 605, by: 155, r: 36 }],
      stars: [{ x: 300, y: 345 }, { x: 705, y: 185 }],
    },
  ];

  function generateEndlessLevel(round) {
    const world = WORLDS[(round - 1) % WORLDS.length];
    const hoopY = 175 + ((round * 53) % 185);
    const hasPortal = round % 3 === 0;
    const walls = [];
    const trampolines = [];
    const bumpers = [];
    const portals = [];

    if (hasPortal) {
      walls.push({ x: 470, y: 20, w: 44, h: 470 });
      portals.push({ ax: 370, ay: 180 + (round % 2) * 80, bx: 610, by: 160, r: 36 });
    } else {
      walls.push({
        x: 420 + (round % 3) * 45,
        y: 280,
        w: 44,
        h: 195,
        moveY: round >= 2 ? 60 : 0,
        speed: 1.3 + Math.min(round * 0.08, 0.7),
      });
      if (round % 2 === 1) {
        trampolines.push({ x: 250 + (round % 2) * 50, y: 472, w: 140, h: 20, power: 1.36 });
      } else {
        bumpers.push({ x: 440, y: 175, r: 36, power: 1.25 });
      }
    }

    return {
      id: 100 + round,
      isEndless: true,
      endlessRound: round,
      world: world.id,
      name: `Trick Shot #${round}`,
      tip: 'Swish it for bonus stars!',
      ball: { x: 145, y: 455 },
      hoop: {
        x: 785,
        y: hoopY,
        facing: 'left',
        moveY: round >= 3 ? 55 : 0,
        moveSpeed: 1.25,
      },
      walls,
      trampolines,
      bumpers,
      portals,
      stars: [
        { x: 350, y: 225 },
        { x: 660, y: Math.max(120, hoopY - 50) },
      ],
    };
  }

  global.BounceData = {
    STAGE_W,
    STAGE_H,
    WORLDS,
    CHARACTERS,
    LEVELS,
    getWorld(id) {
      return WORLDS.find((w) => w.id === id) || WORLDS[0];
    },
    getChar(id) {
      return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
    },
    generateEndlessLevel,
  };
})(window);
