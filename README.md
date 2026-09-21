# ZUI IPTV Player

> Modern, keyboard/remote-navigable IPTV client built for **LG webOS TVs**.  
> Supports M3U playlists, Xtream Codes (Live · VOD · Series), EPG and more.

---

## Screenshots

<!-- Add your screenshots to docs/screenshots/ — they'll render here on GitHub -->

| Home | Live TV |
|------|---------|
| ![Home](docs/screenshots/home.png) | ![Live TV](docs/screenshots/live.png) |

| Movies | Series |
|--------|--------|
| ![Movies](docs/screenshots/movies.png) | ![Series](docs/screenshots/series.png) |

| Player (VOD) | Settings |
|--------------|----------|
| ![Player](docs/screenshots/player.png) | ![Settings](docs/screenshots/settings.png) |

---

## Features

- 📺 **Live TV** — channel list with categories, EPG now/next, favorites, recently watched
- 🎬 **Movies (VOD)** — full poster grid, sort by date/rating/year/title, favorites, resume progress
- 📼 **Series** — season/episode browser with continue-watching support
- 📡 **EPG** — XMLTV guide with timeline view
- 🔄 **Multi-source** — M3U URL + Xtream Codes, multiple sources simultaneously
- 🛡️ **Safe 1.0.1 release posture** — legacy Cloud Sync is disabled until its
  authentication and credential-transfer protocol is replaced
- 🔤 **Subtitles** — CC quick-toggle in player OSD, size control (small/medium/large)
- 🔒 **Parental control** — PIN-protected categories
- 🌍 **5 languages** — Turkish, English, German, French, Spanish
- ⌨️ **Full D-pad navigation** — spatial nav for LG Magic Remote and standard remote
- 🎨 **Aurora design system** — dark theme, gold accent, glassmorphism cards

---

## Tech Stack

| Layer | Library |
|-------|---------|
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS v3 |
| State | Zustand 4 (with persist) |
| Spatial Nav | `@noriginmedia/norigin-spatial-navigation` |
| HLS playback | hls.js 1.5 |
| MPEG-TS | mpegts.js 1.7 |
| i18n | i18next + react-i18next |
| DB (local) | IndexedDB via `idb` (EPG cache, channel cache) |
| Build | Vite 5 + `@webos-tools/cli` |

---

## Compatibility and requirements

The currently verified physical device is **LG 55NANO81T6A**, reporting SDK
`10.3.1` and firmware `33.31.61`. Older platform versions are not yet part of
the release acceptance matrix. In particular, webOS 4.5 has a reported black
screen that has not been reproduced or closed by this project.

- Installing a ready-made IPK: Windows 10/11 (64-bit), a Node.js version
  supported by the selected webOS CLI, and an LG TV with Developer Mode enabled.
  The current CLI 3.2.6 is tested on Node 24; the legacy pair
  Node `16.20.2`/CLI `3.2.5` remains this project's reproduced packaging setup.
- Building from source: Node.js 24 for TypeScript/Vite, plus Node.js `16.20.2`
  for the webOS CLI packaging/install steps.
- TV and PC must be reachable on the same network.

See the verified Windows flow and SSH-key troubleshooting guide in
[`docs/SIDELOAD.md`](docs/SIDELOAD.md).
Optional Windows helpers for ready-made IPK users and source developers live in
[`scripts/windows-setup/`](scripts/windows-setup/README.md).

---

## Development Setup

```bash
# Clone
git clone https://github.com/Simulate-X/ZUI_IPTV_Player.git
cd ZUI_IPTV_Player

# Install dependencies (Node.js 24)
npm install

# Start dev server (browser preview)
npm run dev
```

> The dev server runs in the browser. Full functionality (especially video playback) requires deployment on a webOS TV.

---

## Build & Deploy to TV

Full sideload instructions: [`docs/SIDELOAD.md`](docs/SIDELOAD.md)

Before distributing a build, also review the documented
[`known issues`](docs/KNOWN_ISSUES.md) and
[`Cloud Sync security status`](docs/SECURITY_STATUS.md).

**Quick deploy:**

```bash
# 1. Build
npm run build

# 2. Package → dist-ipk/com.zui.player_1.0.1_all.ipk
ares-package dist -o dist-ipk

# 3. Install on TV (requires ares-setup-device done once)
ares-install -d tv dist-ipk/com.zui.player_1.0.1_all.ipk

# 4. Launch
ares-launch -d tv com.zui.player
```

The repository also contains `scripts/deploy.ps1`, which builds with Node 24,
switches to Node 16.20.2, packages, installs, and launches. Because it changes
the active NVM version and writes to the TV, review the script before use.

---

## Source Types

| Type | How to add |
|------|-----------|
| **M3U URL** | Onboarding → M3U List → paste URL |
| **Xtream Codes** | Onboarding → Xtream Codes → host + user + pass |
| **Cloud Sync** | Disabled in the public 1.0.1 build; use direct M3U/Xtream entry |

---

## Cloud Sync status in 1.0.1

Cloud Sync is intentionally disabled in the public 1.0.1 build. Its application
entry points are removed and client/configuration gates prevent a Supabase
connection even when old local settings or Vite environment variables exist.
The Home screen still contains the non-interactive legacy subtitle
`M3U · Xtream · Cloud`; this is a cosmetic label only and does not enable the
feature.

Direct M3U and Xtream entry remain available. A future replacement requires a
new server-authorized pairing and credential-transfer design. See the public
[`Cloud Sync security status`](docs/SECURITY_STATUS.md). Cloud Sync v2 remains a
separate, approval-gated task.

---

## Localization

The app ships with 5 languages selectable from Settings:

| Code | Language |
|------|----------|
| `tr` | Türkçe (default) |
| `en` | English |
| `de` | Deutsch |
| `fr` | Français |
| `es` | Español |

Translation files: [`src/locales/`](src/locales/)

---

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── player/       # VideoPlayer, OSD, ErrorOverlay
│   └── ui/           # Toast, Spinner, modal primitives
├── hooks/            # usePlayer, useRemote, useAudioWatchdog, …
├── screens/          # Full-page screens (Home, Live, Movies, Series, …)
├── services/         # API clients, player strategies (Native/HLS/MpegTS)
│   └── playerStrategies/
├── state/            # Zustand stores
├── types/            # Shared TypeScript types
├── locales/          # i18n JSON files (tr, en, de, fr, es)
└── workers/          # Web Workers (M3U parser, EPG parser)
docs/
├── ARCHITECTURE.md
├── SIDELOAD.md
├── PERMANENT_INSTALL.md
└── cloud-sync/
    └── schema.sql
```

---

## License

ZUI IPTV Player source code is licensed under the [MIT License](LICENSE),
Copyright (c) 2026 Kaan AYSAL. Third-party dependencies and assets remain
subject to their own license notices; the project MIT license does not
relicense those works.
