# ZUI IPTV Player — Architecture

## Overview

ZUI IPTV Player, LG webOS TV'ler için geliştirilen özel bir IPTV oynatıcısıdır. Birden fazla playlist kaynağını (M3U URL ve Xtream Codes API), entegre EPG'yi (XMLTV) destekler ve TV kumandası navigasyonu için optimize edilmiştir.

Uygulama, Vite ile build edilmiş tek sayfalık (SPA) bir React uygulamasıdır ve Developer Mode üzerinden sideload edilecek bir webOS `.ipk` paketi olarak dağıtılır.

---

## Hedef Cihaz Kısıtları

| Özellik | Değer | Pratik Sonuç |
|---|---|---|
| Doğrulanmış cihaz | LG 55NANO81T6A | Gerçek TV kabul testlerinin referansı |
| Ölçülen sürüm | SDK 10.3.1, firmware 33.31.61 | Daha eski platformlar ayrıca doğrulanmalı |
| Çözünürlük | 1920×1080 uygulama yüzeyi | `appinfo.json` ile sabit |
| Uzun listeler | Sanallaştırılmış liste/grid | TV belleği ve odak sürekliliği korunur |
| Medya | Native `<video>` → hls.js/mpegts.js fallback | Kaynağa ve codec'e göre davranış değişebilir |
| DRM | Uygulamada DRM entegrasyonu yok | DRM stream'leri kapsam dışı |
| Pointer | Magic Remote opsiyonel | D-pad + pointer ikisini de destekle |

---

## Tech Stack

| Katman | Seçim | Versiyon | Gerekçe |
|---|---|---|---|
| Build | Vite | ^5.0 | Hızlı HMR, küçük bundle |
| Dil | TypeScript | ^5.3 | Player event'leri ve API response'larında type safety |
| UI Framework | React | ^18.2 | Concurrent rendering TV perf'e yardım eder |
| Styling | Tailwind CSS + CVA | ^3.4 / ^0.7 | Token tabanlı styling + variant API; shadcn/Radix değil |
| Video (HLS) | hls.js | ^1.5 | HLS akışları için |
| Video (MPEG-TS) | mpegts.js | ^1.7 | Düz `.ts` akışları için (MSE demuxer) |
| Spatial Nav | @noriginmedia/norigin-spatial-navigation | ^1.3 | TV focus yönetimi (tek otorite, Radix yok) |
| M3U Parser | iptv-playlist-parser | ^0.13 | Web Worker içinde kullanılır |
| State | Zustand | ^4.5 | Hafif, ergonomik (tam liste değil, slice tutar) |
| EPG Storage | idb | ^8.0 | IndexedDB wrapper, XMLTV + Channel cache için |
| webOS CLI | @webos-tools/cli | 3.2.3 paketleme; 3.2.5 temiz VM | LG TV paketleme/deploy aracı |

> **shadcn/ui kasıtlı olarak yok.** Gerekçe: Radix UI primitif'leri klavye-Tab focus management kullanır, norigin spatial nav ile çatışır. Tüm interactive primitif'ler (Modal, Tabs, Select, Dropdown) Tailwind + CVA üzerinde sıfırdan, norigin `useFocusable` hook'uyla sarmalanmış olarak yazılır. Bkz. `DECISIONS.md` D-011.

---

## Folder Structure

> Aşağıdaki şema mimari bölgeleri özetleyen tarihsel bir görünüm sunar; güncel
> ve eksiksiz dosya envanteri değildir. Dosya adları için kaynak ağacı esastır.

```
ZUI_IPTV_Player/
├── appinfo.json              # webOS manifest
├── icon.png                  # 80×80 launcher icon
├── largeIcon.png             # 130×130 launcher icon
├── splash.png                # 1920×1080 boot splash (opsiyonel)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .gitignore
├── README.md
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── player/
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── OSD.tsx
│   │   │   └── ErrorOverlay.tsx
│   │   ├── channels/
│   │   │   ├── ChannelGrid.tsx
│   │   │   ├── ChannelCard.tsx
│   │   │   ├── CategorySidebar.tsx
│   │   │   └── NowNextBadge.tsx
│   │   ├── epg/
│   │   │   ├── EPGGrid.tsx
│   │   │   ├── TimeAxis.tsx
│   │   │   └── CurrentTimeIndicator.tsx
│   │   ├── settings/
│   │   │   ├── SourcesPanel.tsx
│   │   │   ├── AddSourceWizard.tsx
│   │   │   └── GeneralSettings.tsx
│   │   ├── layout/
│   │   │   ├── TopBar.tsx
│   │   │   └── TabRouter.tsx
│   │   └── common/
│   │       ├── FocusableButton.tsx
│   │       ├── Spinner.tsx
│   │       └── Modal.tsx
│   ├── hooks/
│   │   ├── useRemote.ts
│   │   ├── useFocus.ts
│   │   ├── usePlayer.ts
│   │   └── useChannelZap.ts
│   ├── services/
│   │   ├── hls.service.ts                  # Strategy resolver + dispatcher
│   │   ├── playerStrategies/
│   │   │   ├── HLSStrategy.ts              # .m3u8 → hls.js
│   │   │   ├── MpegTSStrategy.ts           # .ts → mpegts.js
│   │   │   ├── NativeStrategy.ts           # .mp4 / native HLS
│   │   │   └── PlayerStrategy.ts           # interface
│   │   ├── m3u.service.ts                  # Worker'a mesaj + IDB orkestrasyonu
│   │   ├── xtream.service.ts
│   │   ├── epg.service.ts
│   │   ├── epgCache.ts
│   │   ├── channelCache.ts                 # IndexedDB channel store
│   │   └── storage.service.ts
│   ├── workers/
│   │   ├── m3uParser.worker.ts             # Web Worker: fetch + parse → IDB
│   │   └── epgParser.worker.ts             # Web Worker: XMLTV parse → IDB
│   ├── state/
│   │   ├── playlistStore.ts
│   │   ├── playerStore.ts
│   │   └── settingsStore.ts
│   ├── types/
│   │   ├── channel.ts
│   │   ├── source.ts
│   │   └── epg.ts
│   └── styles/
│       └── globals.css
├── scripts/
│   ├── deploy-dev.sh
│   └── build-ipk.sh
└── docs/
    ├── ARCHITECTURE.md
    ├── PHASES.md
    └── DECISIONS.md
```

---

## Logical Architecture

```
┌─────────────────────────────────────────────────────┐
│                    UI Layer                          │
│   Onboarding → Channels Tab → EPG Tab → Settings Tab │
│   Player (overlay) │ OSD │ Spatial Nav Coordinator   │
├─────────────────────────────────────────────────────┤
│                  State Layer (Zustand)               │
│  playlistStore │ playerStore │ settingsStore         │
├─────────────────────────────────────────────────────┤
│                   Services Layer                     │
│   M3U │ Xtream │ EPG │ HLS │ Storage │ Cache         │
├─────────────────────────────────────────────────────┤
│                  webOS Platform                      │
│   <video> │ localStorage │ IndexedDB │ webOSDev API  │
└─────────────────────────────────────────────────────┘
```

Veri akışı: Source (M3U URL veya Xtream API) → M3U için Web Worker / Xtream
servisi → **channelCache** → IndexedDB `channels` ve `sources` store'ları →
playlist/movie/series store'ları → playerStore → **PlayerStrategy resolver** →
VideoPlayer. Native `<video>` ilk adaydır; kaynağa göre HLS ve MPEG-TS
stratejileri fallback olarak denenir.

IndexedDB adı `zui-iptv-player`, güncel şema sürümü `7`'dir. Store'lar:
`channels`, `sources`, migration için `sources-meta`, `epg-channels`,
`epg-programs`, `epg-meta`, `favorites`, `uiState` ve `logoCache`.
Zustand persist kullanan küçük UI/ayar durumları localStorage'da tutulur.
Kaynak kayıtları IPTV URL veya Xtream kimlik bilgileri içerebildiği için TV
veri yedeği ve hata raporları gizli veri olarak ele alınmalıdır.

EPG paralel olarak benzer pipeline'ı izler: epg.service URL'i Worker'a verir,
Worker XMLTV'yi parse edip IndexedDB'ye yazar; EPG bileşenleri zaman aralığı
indekslerini kullanarak okur.

---

## Design System

Pro Grid (ana) + Theater (EPG sekmesi) hibrit yaklaşım. Tek tema (koyu) — TV izleme mesafesi için optimize.

### Renkler

```typescript
// tailwind.config.js -> theme.extend.colors
const colors = {
  // Backgrounds
  bg: {
    base: '#0e0e12',       // Sayfa zemini
    surface: '#16161c',    // Kart, sidebar item
    elevated: '#1c1c24',   // Modal, dropdown
    hover: '#22222c',      // Hover state
  },
  // Text
  text: {
    primary: '#ffffff',
    secondary: '#aaaaaa',
    tertiary: '#666666',
    muted: '#444444',
  },
  // Accents
  accent: {
    DEFAULT: '#3DDC97',    // Focus ring, primary actions, brand
    dark: '#2BA876',
    text: '#032618',       // Accent zemin üzerindeki yazı
  },
  // Semantic
  live: '#E24B4A',         // Canlı yayın indicator, current time line
  warning: '#F4A261',
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    DEFAULT: 'rgba(255,255,255,0.12)',
    focus: '#3DDC97',
  },
};
```

### Tipografi

TV izleme mesafesi 2-3 metre. Web baseline'ından %25 büyük başla.

```typescript
// Font: system-ui (custom font yükleme, ekstra 100KB bundle ekler, hata olasılığı var)
const fontFamily = 'system-ui, -apple-system, "Segoe UI", sans-serif';

const fontSize = {
  display: ['48px', { lineHeight: '56px', fontWeight: '500' }],
  h1:      ['32px', { lineHeight: '40px', fontWeight: '500' }],
  h2:      ['24px', { lineHeight: '32px', fontWeight: '500' }],
  body:    ['20px', { lineHeight: '28px', fontWeight: '400' }],
  small:   ['16px', { lineHeight: '22px', fontWeight: '400' }],
  tiny:    ['14px', { lineHeight: '18px', fontWeight: '400' }], // sadece zaman damgası gibi yerlerde
};
```

### Spacing

Tailwind defaults yeterli (4, 8, 12, 16, 20, 24, 32, 48, 64, 80). TV'de "screen-safe area" için her ekranın dış padding'i en az 48px olmalı (overscan + uzaktan okunabilirlik).

### Focus States

Spatial nav focus indicator'ları **çok belirgin** olmalı — TV uzaktan kullanılıyor, focus kaybedilemez:

```css
.focus-ring {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
  border-radius: inherit;
  transition: outline-offset 120ms ease-out;
}
```

Hover kavramı TV'de yok. Tüm interactive element'lerin `focused` state'i tasarımda öncelikli.

### Layout Constants

```typescript
const layout = {
  topBarHeight: 64,
  sidebarWidth: 240,
  channelCardMinWidth: 200,
  channelCardAspect: '16/10',
  epgRowHeight: 56,
  epgHourWidth: 240,
  osdFadeMs: 3000,
};
```

---

## State Management Strategy

**Zustand** kullanılır. Üç store:

- `playlistStore`: Aktif source, kanal listesi, kategoriler, favoriler, seçili kanal.
- `playerStore`: Oynatma durumu (playing/paused/error), buffer durumu, current stream URL, OSD görünürlüğü.
- `settingsStore`: Tüm source'lar (M3U + Xtream listesi), EPG URL'leri, kullanıcı tercihleri (buffer ayarı vb.).

Store'lar `localStorage`'a persist edilir (zustand/middleware'in `persist`'i ile). EPG verisi store'a girmez — boyutu büyük, IndexedDB'de tutulur, query ile çekilir.

---

## Routing / Navigation

Single-page, tab tabanlı:
- **Kanallar** (ana, Pro Grid layout)
- **EPG** (Theater layout)
- **Ayarlar** (Settings panel)
- **Player** (overlay; herhangi bir tab'dan kanala tıklayınca açılır, BACK ile kapanır)

Tab değişimleri React state ile, history API kullanılmaz (webOS BACK tuşu davranışı için `appinfo.json` içinde `disableBackHistoryAPI: true` set edilir).

---

## Spatial Navigation

`@noriginmedia/norigin-spatial-navigation` kullanılır. Her interactive component `useFocusable()` hook'unu kullanır. Focus context'leri:

- `MAIN_NAV`: Top bar tab'ları
- `CHANNEL_GRID`: Kanal kartları
- `CATEGORY_LIST`: Sol sidebar
- `EPG_GRID`: EPG hücreleri (2D nav)
- `PLAYER_OSD`: Player kontrolleri
- `SETTINGS`: Ayar form elementleri

Modal/overlay açıldığında focus context değişir (`pause()` ve `resume()` API'leri).

---

## Player Strategy

Stream tipi farklı oynatma yollarına gider. `PlayerStrategy` interface'i üç implementation'a bağlanır:

```typescript
// src/services/playerStrategies/PlayerStrategy.ts
interface PlayerStrategy {
  readonly name: 'hls' | 'mpegts' | 'native';
  canHandle(url: string, contentType?: string): boolean;
  attach(video: HTMLVideoElement, url: string, opts?: AttachOpts): Promise<void>;
  detach(): void;
  onError(cb: (err: PlayerError) => void): void;
}

type AttachOpts = {
  userAgent?: string;    // Provider UA kontrolü için
  headers?: HeadersInit; // Auth vb.
};

type PlayerError =
  | { code: 'network'; message: string }
  | { code: 'decode'; message: string }        // MEDIA_ERR_DECODE
  | { code: 'unsupported_codec'; track: 'video' | 'audio' }
  | { code: 'fatal'; message: string };
```

Resolver mantığı (kabaca):
1. URL `.m3u8` ile bitiyorsa veya content-type `application/vnd.apple.mpegurl` → `HLSStrategy`
2. URL `.ts` ile bitiyorsa veya content-type `video/mp2t` → `MpegTSStrategy`
3. Diğer durumda → `NativeStrategy`
4. Native HLS desteği varsa (Safari/webOS bazıları) ve hls.js başarısız olursa NativeStrategy'e auto-fallback

### Audio Codec Failure Detection

webOS app sandbox'ında AC3/DTS gibi licensed codec'ler sessizce başarısız olur — video oynar, ses gelmez. `usePlayer` hook bu durumu yakalar:

- `<video>` `error` event'inde `MEDIA_ERR_DECODE` (code 3) → unsupported_codec error
- `audioTracks` API mevcut ve hiç audible track yoksa 5 saniye sonra warning
- HLS multi-audio-track varsa otomatik diğer track'e geç (`hls.audioTrack = N`)
- Hata yine devam ederse OSD'de "Bu yayının ses kodeği bu cihazda desteklenmiyor." mesajı

---

## Heavy Parsing Pipeline (M3U + XMLTV)

Büyük dosyalar (50k+ satır M3U, 24 saatlik XMLTV) Web Worker'da parse edilir. Main thread asla bloke olmaz.

### M3U Pipeline

```
[UI: "M3U ekle"] 
    ↓
[m3u.service.ts: worker.postMessage({ url, headers })]
    ↓
[m3uParser.worker.ts]
    ├─ fetch(url)
    ├─ iptv-playlist-parser.parse(text)
    ├─ normalize → Channel[]
    ├─ idb.put('channels', batch) [progress: 0-100%]
    └─ postMessage({ done: true, count })
    ↓
[UI: ChannelGrid IDB'den ilk 50 kanalı sorgular]
```

Worker → main thread progress mesajları her 500 channel'da bir gönderilir, UI'da yükleme yüzdesi gösterilir.

### Bellek Politikası

- **IndexedDB**: Tüm kanallar (kalıcı)
- **Zustand store**: Sadece `{ activeCategory, filterText, visibleIds: string[], selectedChannelId }` — yani metadata
- **DOM**: Sadece görünür `<ChannelCard>`'lar (Faz 5'te react-window ile virtualization)

50k kanallı bir source bile bu mimaride < 50 MB runtime memory tüketir.

### IndexedDB Schema

```
DB: sim-player
├── channels (object store, keyPath: 'id')
│   indexes: by-category, by-sourceId, by-tvgId
├── epg-programs (object store, keyPath: 'id')
│   indexes: by-channelId, by-startTime
└── sources-meta (key/value, source son sync zamanı vb.)
```

Channel ID = `${sourceId}::${originalId}` formatında — multi-source koleksiyonda çakışma olmaz.

---



### `appinfo.json` (root'ta olmalı, build dist'e kopyalanır)

```json
{
  "id": "com.zui.player",
  "version": "0.1.0",
  "vendor": "ZUI",
  "type": "web",
  "main": "index.html",
  "title": "ZUI IPTV Player",
  "icon": "icon.png",
  "largeIcon": "largeIcon.png",
  "iconColor": "#3DDC97",
  "resolution": "1920x1080",
  "transparent": false,
  "disableBackHistoryAPI": true,
  "uiRevision": 2
}
```

### Remote Key Codes (webOS)

| Tuş | keyCode | Eylem |
|---|---|---|
| Up/Down/Left/Right | 38/40/37/39 | Spatial navigation |
| OK / Enter | 13 | Activate |
| Back | 461 | Geri / çıkış |
| Play/Pause | 415/19 | Player toggle |
| Channel Up/Down | 33/34 | Zap |
| 0-9 | 48-57 | Numeric channel input |
| Red/Green/Yellow/Blue | 403/404/405/406 | Shortcut (TBD) |

### CORS

webOS packaged app'leri default'ta cross-origin için restrictive. `appinfo.json`'a gerekirse `accessControl` eklenir:

```json
{
  "accessControl": {
    "allowed": ["*"]
  }
}
```

Production'da daha restrictive yapılmalı (sadece kullanıcının girdiği source domain'leri).

### Dev Mode Constraints

- Session timer sınırlıdır; TV'deki güncel **Remain Session** değeri izlenir ve
  süre dolmadan Developer Mode içinden **EXTEND** kullanılır
- 10 reboot offline = oturum kaybı + IPK'lar silinir
- Permanent install: webosbrew + Homebrew Channel (Faz 5'te opsiyonel)

---

## Performance Targets (henüz tam kabul ölçümü değil)

- **Initial bundle**: < 500 KB gzipped (split chunk'lar dahil)
- **Time to first paint**: < 2 saniye TV'de
- **Channel list render**: 1000+ kanalda smooth scroll → react-window virtualization (Faz 5)
- **EPG load**: 24 saatlik EPG için < 5 saniye fetch + parse
- **Memory ceiling**: 250 MB (DevTools profiler ile kontrol)

---

## External Dependencies & Risks

| Risk | Mitigation |
|---|---|
| M3U/EPG CORS engeli | Source'a `User-Agent` override (hls.js xhrSetup) + gerekirse webOS `accessControl` whitelist |
| Provider UA kontrolü | hls.js + fetch isteklerinde özelleştirilebilir UA (AttachOpts.userAgent) |
| MPEG-TS over HTTP (HLS-olmayan) | `MpegTSStrategy` (mpegts.js, MSE demuxer) — bkz. Player Strategy bölümü |
| Audio codec failure (AC3/DTS) | `MEDIA_ERR_DECODE` yakalanır, OSD'de açık mesaj; multi-audio-track varsa otomatik geçiş |
| DRM stream'leri | Kapsam dışı (Dev Mode'da Widevine yok) — stream başarısız olursa açık mesaj |
| Büyük M3U parse main-thread freeze | Web Worker pipeline (D-012) — main thread asla bloke olmaz |
| 50k+ kanal memory şişmesi | Zustand'da sadece metadata; tüm liste IndexedDB'de; DOM virtualization (Faz 5) |
| Radix/norigin focus çatışması | shadcn/ui kullanılmıyor; tüm interactive primitif'ler norigin `useFocusable` ile sarmalı (D-011) |
| EPG verisi büyük | IndexedDB cache + zaman penceresi sorgusu (sadece görünür aralık belleğe) |
| Magic Remote pointer modu | Focus ring her iki modda da görünür; pointer'la tıklanan element odaklanır |
| Dev Mode oturum kaybı | Boss periyodik uzatma yapacak; Faz 5'te webosbrew opsiyonu sunulacak |

---

## Build & Deploy Pipeline

**Hibrit Node pipeline** (bkz. D-017): @webos-tools/cli Node 16.20.2'ye, Vite 5 Node 18+'a bağımlı. NVM ile iki sürüm arası geçiş yapılır.

```bash
# Geliştirme (Node 24 — build toolchain)
nvm use 24
npm run dev               # Vite varsayılanı localhost:5173; terminal çıktısı esastır

# Üretim build (Node 24)
npm run build             # tsc + vite build → dist/
nvm use 16.20.2
ares-package dist -o dist-ipk
ares-install -d tv dist-ipk/com.zui.player_1.0.1_all.ipk
ares-launch -d tv com.zui.player

# Tek komutla (PowerShell wrapper)
.\scripts\deploy.ps1      # Yukarıdakileri sırasıyla yürütür, NVM geçişleri dahil
```

`scripts/deploy.ps1` Faz 1'de eklenir. `npm run deploy:full` script'i kaldırılmıştır (Node geçişini npm script'i içinden yapmak güvenilir değil).

İlk kurulum (bir kerelik):

```bash
nvm install 16.20.2
nvm install 24
npm install -g @webos-tools/cli@3.2.5      # Node 16 uyumlu; GLOBAL

# TV bağlantısı
ares-setup-device                          # Interactive: device "tv", IP, port 9922, user prisoner; parola boş
ares-novacom --device tv --getkey          # Key Server açıkken passphrase ile SSH anahtarını alır
ares-device --system-info --device tv      # Bağlantı testi
```

Bkz. D-016 (CLI paket kararı) ve D-018 (novacom akışı düzeltmesi).

---

## Test Strategy

- Bu checkout'ta otomatik test script'i bulunmuyor.
- TypeScript kontrolü `npm run build` içindeki `tsc --noEmit` ile çalışır.
- Kumanda, native medya ve lifecycle davranışları gerçek TV kabul dizileriyle
  doğrulanır; tarayıcı veya simülatör sonucu gerçek TV kabulü sayılmaz.

---

Daha detaylı faz planı için bkz. `PHASES.md`. Verilen kararların gerekçeleri için bkz. `DECISIONS.md`.
