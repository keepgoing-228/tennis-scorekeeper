# Deployment & PWA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy the tennis scorekeeper to GitHub Pages as an installable PWA with offline support.

**Architecture:** Configure Vite with a base path for GitHub Pages, switch from BrowserRouter to HashRouter for SPA compatibility, add vite-plugin-pwa for service worker and manifest generation, and create a GitHub Actions workflow for automatic deployment on push to main.

**Tech Stack:** Vite, vite-plugin-pwa, GitHub Actions, GitHub Pages

---

### Task 1: Switch from BrowserRouter to HashRouter

GitHub Pages doesn't support SPA routing (refreshing `/new` returns 404). HashRouter uses `#/new` which works everywhere.

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update the import and component**

Replace the contents of `src/App.tsx` with:

```tsx
import { HashRouter, Routes, Route, Navigate } from "react-router";
import NewMatch from "./ui/pages/NewMatch.tsx";
import Scoring from "./ui/pages/Scoring.tsx";
import MatchHistory from "./ui/pages/MatchHistory.tsx";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/new" replace />} />
        <Route path="/new" element={<NewMatch />} />
        <Route path="/match/:id" element={<Scoring />} />
        <Route path="/history" element={<MatchHistory />} />
      </Routes>
    </HashRouter>
  );
}
```

**Step 2: Verify the app still works**

```bash
bun run build
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: switch to HashRouter for GitHub Pages compatibility"
```

---

### Task 2: Configure Vite base path

GitHub Pages serves from `/tennis-scorekeeper/`, so all asset URLs must be prefixed.

**Files:**
- Modify: `vite.config.ts`

**Step 1: Add the base path**

Replace the contents of `vite.config.ts` with:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/tennis-scorekeeper/',
  plugins: [react(), tailwindcss()],
})
```

**Step 2: Verify the build uses the base path**

```bash
bun run build
```

Expected: No errors. Check that `dist/index.html` references assets with `/tennis-scorekeeper/` prefix.

**Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "config: set base path for GitHub Pages"
```

---

### Task 3: Add vite-plugin-pwa

**Files:**
- Modify: `vite.config.ts`

**Step 1: Install the plugin**

```bash
bun add -D vite-plugin-pwa
```

**Step 2: Configure PWA in vite.config.ts**

Replace the contents of `vite.config.ts` with:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/tennis-scorekeeper/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Tennis Scorekeeper',
        short_name: 'Tennis',
        description: 'Track and analyze tennis match scores',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        scope: '/tennis-scorekeeper/',
        start_url: '/tennis-scorekeeper/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
```

**Step 3: Verify the build**

```bash
bun run build
```

Expected: No errors. `dist/` should now contain `manifest.webmanifest` and `sw.js`.

**Step 4: Commit**

```bash
git add vite.config.ts package.json bun.lockb
git commit -m "feat: add vite-plugin-pwa for offline support"
```

---

### Task 4: Generate PWA icons

Create simple PWA icons from the existing `public/tennis.svg`.

**Files:**
- Create: `public/pwa-192x192.png`
- Create: `public/pwa-512x512.png`

**Step 1: Generate icons**

If `magick` (ImageMagick) is available:

```bash
magick public/tennis.svg -resize 192x192 -background '#111827' -gravity center -extent 192x192 public/pwa-192x192.png
magick public/tennis.svg -resize 512x512 -background '#111827' -gravity center -extent 512x512 public/pwa-512x512.png
```

If ImageMagick is not available, use an alternative approach (e.g., `rsvg-convert`, or create simple placeholder PNGs with another tool).

**Step 2: Verify icons exist and are correct size**

```bash
file public/pwa-192x192.png public/pwa-512x512.png
```

Expected: Both files are PNG images.

**Step 3: Commit**

```bash
git add public/pwa-192x192.png public/pwa-512x512.png
git commit -m "feat: add PWA icons"
```

---

### Task 5: Update index.html metadata

**Files:**
- Modify: `index.html`

**Step 1: Update the head section**

Replace the contents of `index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/tennis-scorekeeper/tennis.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#111827" />
    <meta name="description" content="Track and analyze tennis match scores" />
    <link rel="apple-touch-icon" href="/tennis-scorekeeper/pwa-192x192.png" />
    <title>Tennis Scorekeeper</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: Verify the build**

```bash
bun run build
```

Expected: No errors.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: update HTML metadata for PWA"
```

---

### Task 6: Create GitHub Actions deployment workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1: Create the workflow file**

Create `.github/workflows/deploy.yml` with this content:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - run: bun install --frozen-lockfile

      - run: bun run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Step 2: Verify the YAML is valid**

```bash
cat .github/workflows/deploy.yml
```

Visually confirm the indentation is correct.

**Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Pages deployment workflow"
```

---

### Task 7: Final verification and push

**Step 1: Run full build**

```bash
bun run build
```

Expected: No errors.

**Step 2: Run tests**

```bash
bun run test
```

Expected: All tests pass.

**Step 3: Verify dist contents**

```bash
ls dist/
```

Expected: `index.html`, `assets/`, `manifest.webmanifest`, `sw.js`, `pwa-192x192.png`, `pwa-512x512.png`

**Step 4: Push to trigger deployment**

```bash
git push
```

**Step 5: Verify deployment**

After pushing, go to the GitHub repo Settings > Pages and ensure the source is set to "GitHub Actions". The workflow will run automatically. Once complete, the app will be live at `https://keepgoing-228.github.io/tennis-scorekeeper/`.
