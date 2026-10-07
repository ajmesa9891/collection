# The Kitchen Index — Family Culinary Archive

A clean, responsive, zero-maintenance Progressive Web App (PWA) designed for fast recipe discovery, precise ingredient ratios, baker's percentages, and concise cooking techniques.

## Features
- **PWA & Android Installable**: Full offline support via Service Worker and Web App Manifest. Can be installed directly to home screen on Android and iOS devices.
- **Concise View**: Ingredients with exact amounts, baker's percentages, and 1-click quantity scaling (0.5x, 1x, 2x).
- **Technique & Heat Focus**: Key oven temperatures and cook times highlighted; zero fluff.
- **Dynamic Filtering**:
  - Filter by 14 culinary categories (Baking, Stews, Slow Cooker, Pizza, Sauces & Dressings, Tofu, Salads, Soups, etc.).
  - Filter by status (`Tried in Kitchen`, `Family Staple`, `Want to Try`).
  - Filter by family rating (`Loved / Family Favorite`, `They Liked`).
  - Filter by special tags (`High-Protein`, `Baker's Percentages`).
- **Instant Full-Text Search**: Searches across titles, ingredients, tags, technique steps, and chef notes with a fast clear button.
- **Direct Link Sharing**: Every recipe has a direct link hash (`#recipe=whole-wheat-slider-buns`) for sharing via iMessage, WhatsApp, or email.
- **Copy Clean Recipe**: Copies a clean, formatted text version of the recipe directly to your clipboard.
- **100% Static & Client-Side**: No backend to deploy, no database to maintain, runs entirely client-side.

## Files
- `index.html`: Entry point and PWA application shell.
- `recipes.json`: Structured archive of recipes.
- `recipes.js`: Standalone synchronous data script for immediate local execution.
- `app.js`: Application logic, filtering, scaling, modal dialogs, and PWA service worker lifecycle.
- `style.css`: Responsive CSS styles with dark mode and mobile safe area insets.
- `manifest.json`: Web App Manifest with icons, theme colors, and standalone display mode.
- `sw.js`: Service worker implementing cache-first offline strategy.
- `icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`: PWA icons.

## Running Locally
Run `powershell -ExecutionPolicy Bypass -File .\serve.ps1` from the repository root, or open `index.html` directly in your browser.
