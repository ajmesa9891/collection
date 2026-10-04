# Mini App Collection 🕹️

A curated monorepo of completely independent, frontend-only Single-Page Applications (SPAs) and interactive mini-tools, designed for zero-friction development and automated deployment to **GitHub Pages**.

🌐 **Live Site**: [https://ajmesa9891.github.io/collection/](https://ajmesa9891.github.io/collection/)

---

## 🚀 Applications Included

| App | Category | Tech | Path |
| --- | --- | --- | --- |
| **[Green Light, Red Light](apps/green-light-red-light-game/)** | Games / Kids | Vanilla JS, CSS3, HTML5 | [`apps/green-light-red-light-game/`](apps/green-light-red-light-game/) |
| **[Toddler Snake Timer](apps/toddler-snake-timer/)** | Timers / Kids | Tailwind CSS, Tone.js, Canvas | [`apps/toddler-snake-timer/`](apps/toddler-snake-timer/) |
| **[React + Tailwind Template](apps/_template-react-tailwind/)** | Template / Starter | React 18, Tailwind CSS, Babel | [`apps/_template-react-tailwind/`](apps/_template-react-tailwind/) |

---

## 🛠️ Architecture & Philosophy

- **Zero Backend**: All apps are pure clientside applications (HTML, CSS, JS/React) running entirely inside the browser.
- **Total Independence**: Each SPA lives in its own directory under `apps/` with its own assets, stylesheets, and logic. No shared dependencies or coupled states.
- **Strict Relative Pathing**: Every asset, script, and link uses relative paths (`./`) so that apps function seamlessly on GitHub Pages subpaths.
- **Universal Launcher**: Root [`index.html`](index.html) serves as the catalog and launcher page featuring real-time search, category filters, and direct launch links.

---

## 💻 Local Development

### Option 1: Built-in Windows Launcher (Zero Installation Required)
Simply double-click [`serve.bat`](serve.bat) in File Explorer, or run in PowerShell:
```powershell
.\serve.ps1
```
This automatically starts a local HTTP server at `http://localhost:8000` and opens your browser. Any edits made to apps or the index page appear immediately on refresh (F5).

### Option 2: Python (if installed)
```bash
python -m http.server 8000
```

### Option 3: Node / npx (if installed)
```bash
npx serve .
```

### Option 4: VS Code / Live Server
Install the **Live Server** extension, right-click `index.html`, and select **Open with Live Server**.

---

## ➕ Adding a New SPA

1. **Create the folder**:
   ```bash
   cp -r apps/_template-react-tailwind apps/my-new-app
   ```
   *(or create an empty folder for a vanilla JS app)*
2. **Build your SPA**:
   - Keep all scripts, styles, and assets inside `apps/my-new-app/`.
   - Ensure all asset URLs and links use relative paths (`./`).
3. **Register on the launcher**:
   - Add your app card and metadata to [`index.html`](index.html).
4. **Push to main**:
   - GitHub Pages will automatically publish the new app!

For more in-depth guidelines for agents and developers, see [AGENTS.md](AGENTS.md).

---

## 🚢 GitHub Pages Publishing

This repository includes an automated GitHub Actions deployment workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

To activate GitHub Pages:
1. Go to repository **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, choose **GitHub Actions** (recommended) or **Deploy from a branch** (`main` / root).
3. The site will be available at `https://<your-username>.github.io/collection/`.

---

## 📄 License

MIT (see individual app folders for specific licenses).
