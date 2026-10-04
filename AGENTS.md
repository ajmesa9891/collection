# Agent & Developer Guidelines: Multi-SPA Collection

Welcome! This repository is a collection of completely independent, frontend-only Single-Page Applications (SPAs) unified in a single repository for ease of development and deployment to **GitHub Pages**.

---

## 1. Architecture & Core Principles

- **Pure Frontend**: Every SPA in this repo is strictly client-side. There is no backend, server-side database, or server runtime.
- **Complete Independence**: Every application in `apps/<spa-name>/` operates autonomously:
  - No shared runtime dependencies or state between apps.
  - An update or refactor in one SPA must never affect or break another.
  - Each app has its own HTML entry point, stylesheets, assets, and logic.
- **Strict Relative Pathing**:
  - **CRITICAL**: Because this site is published on GitHub Pages under a repository subpath (e.g., `https://<username>.github.io/collection/apps/<spa-name>/`), **never use root-relative paths** like `/apps/...`, `/style.css`, or `/assets/...`.
  - Always use relative paths: `./style.css`, `./assets/sound.mp3`, `../assets/...`, or import maps.
- **Index Portal**: The root `index.html` acts as the directory and launcher for all SPAs.

---

## 2. Directory Structure

```text
collection/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions workflow for Pages deployment
├── apps/
│   ├── _template-react-tailwind/ # Starter template for new React + Tailwind SPAs
│   ├── green-light-red-light-game/ # Vanilla JS reaction game
│   │   ├── index.html
│   │   ├── README.md
│   │   └── LICENSE
│   ├── toddler-snake-timer/    # Visual countdown timer for toddlers
│   │   ├── index.html
│   │   ├── bite.mp3
│   │   ├── roblox-yummy.mp3
│   │   └── LICENSE
│   └── <future-spa-name>/      # Each new SPA lives in its own isolated directory
├── AGENTS.md                   # This instruction file for AI agents & contributors
├── index.html                  # Root landing page / app launcher
└── README.md                   # Repository overview & documentation
```

---

## 3. Technology Choices for SPAs

1. **Vanilla JS / HTML / CSS**:
   - Ideal for ultra-lightweight games, utilities, and widgets.
   - Zero build step; runs directly in browser.
   - Example: `apps/green-light-red-light-game/`.

2. **React + Tailwind CSS**:
   - Zero-build approach (recommended for simple SPAs):
     - Tailwind CSS via CDN (`https://cdn.tailwindcss.com`).
     - React 18/19 via ESM (e.g. `https://esm.sh/react`, `https://esm.sh/react-dom/client`) or Babel standalone.
     - See `apps/_template-react-tailwind/index.html` for a working example.
   - Bundled approach (if complex libraries or npm dependencies are needed):
     - Vite + React + Tailwind inside `apps/<spa-name>/`.
     - In `vite.config.js`, always set `base: './'` so built assets resolve properly in subdirectories.
     - Output built static files to the app directory or build step.

---

## 4. Step-by-Step: Adding a New SPA

When the user requests a new SPA:

1. **Create the App Folder**:
   - Create `apps/<spa-name>/` (use kebab-case, e.g. `apps/pomodoro-timer/`).

2. **Create the App Files**:
   - Place `index.html` as the entry point.
   - Keep all scripts, styles, sounds, and image assets inside `apps/<spa-name>/` (or its subfolders).
   - Verify all links and asset references use relative paths (`./`).

3. **Register the App in Root `index.html`**:
   - Open root `index.html`.
   - Add the new app entry into the `APPS` registry array:
     ```javascript
     {
       id: "your-app-id",
       title: "Your App Title",
       description: "Short, engaging summary of what the app does.",
       path: "apps/your-app-id/",
       githubPath: "https://github.com/ajmesa9891/collection/tree/main/apps/your-app-id",
       icon: "🚀", // Emoji or icon
       category: "Tools", // E.g., Games, Kids, Timers, Tools, Utilities
       tags: ["React", "Tailwind", "Utility"]
     }
     ```
   - Update the pre-rendered HTML card in `index.html` so it renders even if JavaScript is delayed or disabled.

4. **Test the New App Locally**:
   - Run `powershell -ExecutionPolicy Bypass -File .\serve.ps1` (or double-click `serve.bat`).
   - Ensure the app loads without console errors.
   - Test audio, touch interactions, responsiveness on mobile viewports, and edge cases.
   - Verify that clicking the app card from the root `index.html` successfully navigates to `apps/<spa-name>/`.

---

## 5. Deployment Guidelines

- **GitHub Pages Configuration**:
  - Repository Settings -> Pages:
    - **Source**: "GitHub Actions" (using `.github/workflows/deploy.yml`) OR "Deploy from a branch" (`main` branch, `/ (root)` folder).
    - Both deployment methods work seamlessly because all static assets are tracked in the repository and require zero server execution.
- **Workflow Automation**:
  - The `.github/workflows/deploy.yml` action deploys automatically on every push to `main`.
