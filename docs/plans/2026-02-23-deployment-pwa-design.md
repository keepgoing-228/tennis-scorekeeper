# Deployment & PWA Design

## Summary

Deploy the tennis scorekeeper app to GitHub Pages with PWA support for offline use and installability.

## Hosting: GitHub Pages

The app deploys to `https://keepgoing-228.github.io/tennis-scorekeeper/`.

- A GitHub Actions workflow builds the app on every push to `main` and deploys `dist/` to GitHub Pages.
- Vite config sets `base: "/tennis-scorekeeper/"` so asset paths resolve correctly under the subdirectory.
- GitHub Pages source is set to "GitHub Actions" in repo settings.

## PWA: Offline Support & Installability

Use `vite-plugin-pwa` to generate a service worker and web manifest.

- **Service worker:** Precaches all built assets on first load. After the first visit, the app works fully offline.
- **Web manifest:** Defines app name ("Tennis Scorekeeper"), icons, theme color, and display mode ("standalone") so browsers offer an install prompt.
- **Icons:** Simple app icons at 192x192 and 512x512.
- **Cache strategy:** Precache — all assets cached at install time. No runtime caching needed since the app is fully client-side with IndexedDB for data.

## Future Considerations

- When a PostgreSQL backend is added, the service worker strategy may need updating to handle API calls (network-first for data, cache-first for assets).
- Custom domain can be added later via GitHub Pages settings.

## Decisions

- **Hosting:** GitHub Pages (free, no extra account needed)
- **PWA plugin:** vite-plugin-pwa (standard Vite integration)
- **Cache strategy:** Precache all assets
- **Domain:** Free subdomain (keepgoing-228.github.io/tennis-scorekeeper)
