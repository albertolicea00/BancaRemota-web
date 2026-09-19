# Banca Remota — Landing Page

[![GitHub Stars](https://img.shields.io/github/stars/albertolicea00/BancaRemota?style=flat&logo=github&label=stars&color=B38B4D)](https://github.com/albertolicea00/BancaRemota)
![HTML](https://img.shields.io/badge/HTML-E34F26?style=flat&logo=html5&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Alpine.js](https://img.shields.io/badge/Alpine.js-8BC0D0?style=flat&logo=alpinedotjs&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

Landing page + web USSD dialer for the [Banca Remota](https://github.com/albertolicea00/BancaRemota) iOS app. No build step.

[Mira la versión en español](README.es.md)

## Structure

```
├── index.html        landing page
├── dial.html         web USSD dialer (BPA / BANDEC / BM, works standalone from iOS home screen)
├── style.css         component styles
├── app.js            Alpine.js components (landing page + shared notify form)
├── op-icons.json     icon paths used by dial.html's operation cards
├── codes.json        local copy of the USSD codes — NOT fetched by dial.html at runtime
│                      (see Offline support below); kept in this repo, but unused by any page
├── sw.js             service worker — full offline support, see Offline support below
├── api/subscribe.js  Vercel serverless — adds emails to Brevo
├── vercel.json       clean URLs + long-term caching for /assets
├── assets/           mockups, icons, bank logos
└── .env.example      required env vars
```

## Pages

**`index.html`** — landing page: hero, feature walkthrough (scroll-pinned tabs, desktop only), FAQ, bank compatibility section with a `codes.json` download link for contributors, and the "Avísame" (notify me) subscribe form. Fetches `https://api.github.com/repos/albertolicea00/BancaRemota` client-side to show live GitHub star count.

**`dial.html`** — web USSD dialer: pick a bank (bottom tab bar on mobile, 3-column layout on desktop), search operations by name, tap a card to open `tel:<code>` and place the call. Same dark mode, notify form, and iOS install guide as the landing page. See **Offline support** below for how it gets its data and works with no connection.

Both pages share `app.js` (`notifyForm()` for the subscribe form, dark-mode handling) and the `.op-card` / `.bank-card` styling in `style.css`.

## Notify me / subscribe form

`notifyForm()` in `app.js` posts `{ email }` to `POST /api/subscribe` (`api/subscribe.js`, Vercel serverless), which adds the address to a Brevo list — used both for "notify when the app hits the App Store" and generally on the landing page FAQ. Requires `BREVO_API_KEY` and `BREVO_LIST_ID` (see `.env.example`).

## iOS "Add to Home Screen" guide

On iOS Safari (detected via UA / `MacIntel` + multi-touch, not standalone yet), both pages show a modal after ~1.5s guiding the user through Share → Add to Home Screen, so the site behaves like an installed app (own icon, no Safari chrome, `apple-mobile-web-app-capable`). Dismissal is remembered in `localStorage['installGuideDismissed']`. The nav's "Install" button re-opens it on demand via a `open-install-guide` custom event. Irrelevant on Android/desktop — gated behind the iOS check.

## Offline support

`dial.html` does not fetch the local `codes.json` — it always pulls the latest from the main [BancaRemota repository](https://github.com/albertolicea00/BancaRemota)'s raw GitHub content (the web app directly relies on `codes.json` from the main iOS project):

```
https://raw.githubusercontent.com/albertolicea00/BancaRemota/refs/heads/main/BancaRemota/codes.json
```

The actual offline capability lives in `sw.js`, a service worker registered from both `index.html` and `dial.html`. A `localStorage`-only cache (an earlier approach) only covers _data_ — it does nothing for the HTML/CSS/JS shell itself, so the page could still fail to load at all when opened offline after the browser's own HTTP cache expires. `sw.js` instead caches everything needed to render the app into Cache Storage (which has no expiry):

- **Precached on install**: both pages, `style.css`, `app.js`, `op-icons.json`, the bank icon SVGs, favicon, the remote `codes.json`, and the Tailwind/Alpine CDN scripts the pages depend on. Precached explicitly rather than left to first-use caching, because the page's own first fetch for `codes.json` fires from Alpine's `init()` _before_ the service worker finishes registering (registration only starts on the `load` event) — without precaching it, a brand-new install that goes offline before a second visit would show a working shell with no codes.
- **Runtime (stale-while-revalidate)**: anything else requested later is served from cache instantly if present, with a background refetch to keep it current for next time.

Net effect: after one successful online visit, the dialer (and the landing page) keep working with zero connection indefinitely — including weeks or months later — while still picking up USSD code fixes pushed to the main [BancaRemota](https://github.com/albertolicea00/BancaRemota) repo whenever a connection is available, without shipping a new deploy of this site.

Two things to know when touching `sw.js`: bump `CACHE_NAME` whenever the precache list changes, or returning users keep serving the old cached shell; and cross-origin CDN URLs with no `Access-Control-Allow-Origin` header (like `cdn.tailwindcss.com`) must be cached via a manual `fetch()` + `cache.put()` with `mode: 'no-cors'` — `cache.add()`/`addAll()` throw on opaque responses by spec.

The `codes.json` committed to _this_ repo is not read by any page — it's the same content the iOS app ships with, referenced from `index.html` (the "Bancos soportados" section links to and describes the raw GitHub copy for contributors editing USSD codes). Whether it should stay in sync manually or be removed from this repo entirely is worth deciding — flagging it rather than guessing.

## Local dev

```bash
npx serve .
```

## Deploy

Push to `main` → Vercel auto-deploys. Add env vars from `.env.example` in the Vercel dashboard.

## Colors

| Token            | Hex       |                      |
| ---------------- | --------- | -------------------- |
| `--color-gold`   | `#B38B4D` | Primary brand accent |
| `--color-accent` | `#81D717` | Lime highlights      |
| `--color-bpa`    | `#1E5F52` | BPA green            |
| `--color-bandec` | `#5B2A1F` | BANDEC brown         |
| `--color-bm`     | `#1A3A6B` | BM navy              |

## More Apps

Other apps by the same author:

- `LlamaCon99` — Cross-platform app for calling Cuban numbers using the `99` prefix and identifying incoming `99` calls using your own contacts. [iOS & Android](https://github.com/albertolicea00/LlamaCon99)

- `Qvacell` — Unofficial alternative to ETECSA’s mobile app in Cuba. [iOS](https://github.com/albertolicea00/Qvacell-ios) · [Android](https://github.com/albertolicea00/Qvacell-apk)

- `Casero.cu` — Native clients for Cuban lodging hosts to submit guest reports to the official portal. [iOS](https://github.com/albertolicea00/casero.cu-ios) · [Android](https://github.com/albertolicea00/casero.cu-apk)

## Contributing

See the main project's [CONTRIBUTING.md](https://github.com/albertolicea00/BancaRemota/blob/main/CONTRIBUTING.md). Issues, PRs, and commit messages must be in English.

---

_Part of the [Banca Remota](https://github.com/albertolicea00/BancaRemota) project by [Alberto Licea](https://www.linkedin.com/in/albertolicea00)._
