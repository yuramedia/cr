# Astro Crunchyroll Tracker Workspace Rules

## Development Workflow

- Always start the local development server in background mode:
  ```bash
  astro dev --background
  ```
- Manage background processes using:
  - `astro dev status` - Check dev server status
  - `astro dev logs` - View server logs
  - `astro dev stop` - Terminate background server

## Codebase Architecture

- **Static Site Hosting:** Hosted on GitHub Pages (`https://cr.yuramedia.com`). Must preserve client-side fetch architecture.
- **Vite & TailwindCSS v4:** Powered by Astro's Tailwind plugin. Styling must remain strictly responsive with modern HSL theme variables.
- **CORS Bypass:** All Crunchyroll API calls must utilize the dynamic CORS proxy resolver `getProxyUrl(url)` which evaluates the `cr_use_cors_proxy` setting from `localStorage`.

## Caching Strategy
- Episode feed is cached for **1 minute** (`CACHE_LIFETIME = 1 * 60 * 1000`).
- Auto-refresh checks are visibility-aware; polling stops when the browser tab is inactive to preserve resources.
- Series covers are cached in `localStorage` under key `cr_series_covers_cache_v3`.
