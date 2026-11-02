# 🐝 Bloom Buddy

A bilingual (**English & Español**) Progressive Web App (PWA) for preschoolers to learn about **seasons, months of the year, and plants** on family bike rides.

## Features
- **🎡 12-Month Season Wheel**: Shows today's date, month, and season, and places your plant stickers on the month you found them.
- **📸 Snap & Identify**: Uses **Pl@ntNet** + **Google Gemini** to identify flowers, trees, and plants from camera photos and write preschool-friendly facts in both English and Spanish.
- **🃏 Interactive Plant Card**:
  - **Read-Aloud (🔊)** for every section in **English**, **Spanish**, or **Both** sequentially.
  - **All Year Long (4 Seasons Strip)**: Real seasonal photos from iNaturalist + what the plant does in 🌱 Spring, ☀️ Summer, 🍂 Fall, and ❄️ Winter.
  - **12-Month Bloom & Leaf Calendar**: Real phenology observations near your location (flowering 🌸, fruiting 🍒, budding 🌱, autumn leaves 🍂, bare branches 🪵).
  - **Where It Lives Map**: World occurrence heatmap from GBIF + a pin where you found it + country flags.
  - **Fun Facts, Senses Prompts & Safety Badge** (✅ safe / 👀 careful / ⚠️ look, don't touch).
- **🚲 Ride Mode**: Tracks your bike ride GPS route on a live map, pins each treasure you find, and celebrates at the finish line.
- **📒 Sticker Book**: Keeps all your plant stickers and past bike rides on your device (IndexedDB).

## One-Time Parent Setup (API Keys)
1. Open the app and **hold down the 🔒 button** in the top-left corner for 1 second (or double-click on desktop) to open **Parent Settings**.
2. Paste your **Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/apikey)) and **Pl@ntNet API Key** (from [my.plantnet.org](https://my.plantnet.org)).
   - *Note for Pl@ntNet CORS*: In your Pl@ntNet account settings, add your GitHub Pages domain (e.g. `<username>.github.io`) and `localhost` under allowed domains. Even if Pl@ntNet blocks an origin, Bloom Buddy automatically falls back to Gemini vision so plant identification still works seamlessly.
3. Keys are stored only in `localStorage` on your device and are never committed to git.
