# ZUI IPTV Player — Phases

> **Historical planning document:** This file records the original development
> plan and is not the current release checklist. Several phases and filenames
> below have since changed. Use `README.md`, `README_Tr.md`, `docs/SIDELOAD.md`,
> the current source tree, and the latest accepted decisions for release work.

Toplam 6 faz (0'dan 5'e). Her faz bir kapanış kriteriyle biter; bir sonraki faza geçmeden önce TV'de gerçek doğrulama yapılır. Yarım kalan iş bir sonraki faza taşınmaz, geri dönülür.

---

## Faz 0 — Setup & Hello World

**Süre tahmini**: 1 oturum

### Hedef

webOS dev pipeline'ını sıfırdan kurmak. Hiçbir iş mantığı yok; sadece "TV'de uygulama olarak görünüyor ve açılıyor mu" sorusunun cevabı.

### Kapsam

**IN**:
- Vite + React 18 + TypeScript + Tailwind iskelet
- `appinfo.json` ve webOS launcher metadata'sı (icon, name)
- ares-cli scriptleri (build / package / install / launch)
- Boş ana ekran: "ZUI IPTV Player" yazısı + version + build timestamp
- Temel klasör yapısı (gelecek fazlar için yerleri hazır)
- README (setup adımları)

**OUT**:
- Video player
- Kanal listesi
- Playlist parse
- EPG
- Settings
- Spatial navigation library entegrasyonu (Faz 2'de)

### Deliverables

- `package.json` (dependencies + ares scriptleri)
- `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`
- `appinfo.json`
- `icon.png` (80×80) + `largeIcon.png` (130×130) — geçici, accent renk üzerinde "S" harfi
- `index.html`, `src/main.tsx`, `src/App.tsx`
- `src/styles/globals.css` (Tailwind base + design tokens)
- `scripts/deploy-dev.sh`
- `.gitignore` (`node_modules`, `dist/`, `dist-ipk/`, `.DS_Store`)
- `README.md`

### Definition of Done

1. `npm install` hatasız tamamlanır
2. `npm run dev` Vite dev server'ı çalıştırır, browser'da boş ZUI IPTV Player ekranı görünür
3. `npm run build` `dist/` üretir, içinde `appinfo.json` ve icon dosyaları da var
4. `npm run package` `dist-ipk/sim-player_0.1.0_all.ipk` üretir
5. `npm run deploy` IPK'yı TV'ye yükler (TV daha önce `ares-setup-device` ile tanıtılmış olmalı)
6. TV launcher'da "ZUI IPTV Player" görünür, doğru icon'la
7. Uygulama açılır, "ZUI IPTV Player v0.1.0" yazısı ortada, hata yoktur, BACK tuşu uygulamayı kapatır

### Açık Konular

- TV IP + Passphrase Boss'tan alınacak (`ares-setup-device` interactive setup)
- Icon temporary; gerçek tasarım Faz 5'te

---

## Faz 1 — Player Core + OSD

**Süre tahmini**: 1-2 oturum

### Hedef

Hard-coded bir HLS stream URL'ini TV'de tam ekran oynatmak, OSD overlay'i ile temel oynatma kontrolünü kumandadan sağlamak.

### Kapsam

**IN**:
- **PlayerStrategy interface** ve üç implementation (HLSStrategy, MpegTSStrategy, NativeStrategy)
- Strategy resolver (URL/content-type'a göre uygun strategy seçimi)
- hls.js entegrasyonu (HLSStrategy içinde)
- mpegts.js entegrasyonu (MpegTSStrategy içinde)
- `<video>` element + tam ekran layout
- OSD overlay (kanal adı placeholder, saat, buffer indicator)
- Auto-hide OSD (3 saniye sonra fade out, herhangi bir tuşa basınca geri gelir)
- Remote key handling (Play/Pause/Stop/Back)
- Loading spinner (stream başlarken)
- Error overlay + retry butonu
- **Audio codec failure detection** (MEDIA_ERR_DECODE yakalama, açık UI mesajı)

**OUT**:
- Kanal listesi (hard-coded URL'ler kullanılacak — biri HLS, biri MPEG-TS test için)
- Spatial navigation library (basit `useRemote` hook yeterli bu fazda)
- EPG
- Channel zap

### Deliverables

- `src/services/playerStrategies/PlayerStrategy.ts` (interface + types)
- `src/services/playerStrategies/HLSStrategy.ts`
- `src/services/playerStrategies/MpegTSStrategy.ts`
- `src/services/playerStrategies/NativeStrategy.ts`
- `src/services/hls.service.ts` (resolver + dispatcher, naming ileride `playerService.ts` olabilir)
- `src/state/playerStore.ts` (Zustand)
- `src/hooks/usePlayer.ts`
- `src/hooks/useRemote.ts` (key event listener)
- `src/components/player/VideoPlayer.tsx`
- `src/components/player/OSD.tsx`
- `src/components/player/ErrorOverlay.tsx`
- `src/components/common/Spinner.tsx`
- Test stream URL'leri (en az biri HLS, biri düz `.ts`)

### Definition of Done

1. Uygulama açıldığında doğrudan player ekranına gider, hard-coded HLS URL oynar
2. URL değiştirilince (manuel test için bir hardcoded alternatif `.ts`) MpegTSStrategy çalışır ve oynar
3. Stream başlarken spinner görünür
4. Oynatma başarılı olursa video tam ekran, OSD üst kısımda kanal adı + saat
5. Herhangi bir tuşa basınca OSD görünür, 3 saniye sonra kaybolur
6. Play/Pause tuşu (415/19) videoyu duraklatır/devam ettirir
7. Stream hatası durumunda ErrorOverlay görünür, "Tekrar dene" butonu çalışır
8. **Audio codec hatası simüle edilebilir bir stream'de** (AC3'lü test stream'i varsa) açık uyarı mesajı görünür
9. BACK tuşu uygulamayı kapatır (henüz başka ekran yok)
10. TV'de 15 dakika kesintisiz çalışır, memory leak görünmez

### Açık Konular

- Test için sabit stream URL'i seçimi: iptv-org Türkiye veya başka açık bir kaynak
- Loading state UX'i (skeleton mi spinner mı)

---

## Faz 2 — M3U Source + Channel List

**Süre tahmini**: 2 oturum

### Hedef

Kullanıcı bir M3U URL'i girer, uygulama listeyi yükler, Pro Grid layout'unda kategorize edilmiş kanal listesi gösterir, D-pad ile gezilir, OK ile kanal oynatılır.

### Kapsam

**IN**:
- Onboarding ekranı (ilk açılışta M3U URL girilen ekran)
- **`m3uParser.worker.ts`** Web Worker: fetch + parse + normalize, sonucu IndexedDB'ye yazar
- **IndexedDB schema** kurulumu (idb wrapper): `channels` object store + indexes (by-category, by-sourceId)
- Worker'dan progress mesajları → UI'da yükleme yüzdesi
- Kategori (group-title) tabanlı sidebar — IDB'den unique kategoriler sorgusu
- Pro Grid layout: 3 sütunlu kanal kartları (logo + isim) — IDB'den paginated query
- Zustand store sadece filtre durumu + görünür slice tutar (tam liste TUTULMAZ)
- Spatial navigation library entegrasyonu
- Playlist source meta'sı `localStorage`'da (URL, isim, son sync tarihi)
- Player ekranı arası geçiş (OK → player, BACK → grid)
- Favoriler (heart ikonu ile ekle/çıkar, sidebar'da "Favoriler" kategorisi)
- Son izlenen 5 kanal (sidebar'da "Son İzlenen")

**OUT**:
- EPG (Faz 3)
- Xtream Codes (Faz 4)
- Multi-source switcher (Faz 4)
- Channel zap shortcut (Faz 3'le birlikte gelir)
- Search (Faz 4)
- DOM virtualization (Faz 5 — bu fazda 1000 kanala kadar smooth, ötesi Faz 5 garantisi)

### Deliverables

- `src/workers/m3uParser.worker.ts` (Web Worker)
- `src/services/m3u.service.ts` (worker orkestrasyonu + IDB write koordinasyonu)
- `src/services/channelCache.ts` (IndexedDB get/put/query: getChannelsByCategory, getCategories vb.)
- `src/services/storage.service.ts` (Zustand persist wrapper, sadece meta için)
- `src/state/playlistStore.ts`
- `src/types/channel.ts`, `src/types/source.ts`
- `src/components/channels/ChannelGrid.tsx` (paginated IDB query)
- `src/components/channels/ChannelCard.tsx`
- `src/components/channels/CategorySidebar.tsx`
- `src/components/onboarding/AddM3UScreen.tsx`
- `src/components/layout/TopBar.tsx` (sadece logo + saat, sekmeler Faz 3'te)
- `src/hooks/useFocus.ts` (spatial nav wrapper'ı)

### Definition of Done

1. İlk açılışta onboarding ekranı: "M3U URL gir" + onscreen keyboard ile yapıştırılabilir
2. URL girip onayladıktan sonra Web Worker başlar, **UI freeze olmaz**, yükleme yüzdesi gösterilir
3. Worker başarılı: Pro Grid layout'unda ilk 50 kanal IDB'den görünür, sidebar'da kategoriler listelenir
4. Worker hatası: anlaşılır error mesajı + "Tekrar dene"
5. D-pad ile sidebar ve grid arasında geçiş, grid içinde 2D nav
6. Sidebar'da kategori değişince IDB sorgusu yenilenir, grid yeni kategori kanallarını gösterir
7. OK kanalı seçer, player açılır ve stream çalmaya başlar (Strategy resolver doğru player'ı seçer)
8. BACK player'ı kapatır, son seçili kanala focus geri gelir
9. Favori eklenince ⭐ ikonu kartta görünür, sidebar'da "Favoriler" kategorisi dolar
10. Uygulama kapatılıp açılınca M3U URL'i ve favoriler hatırlanır; **kanallar yeniden parse edilmez, IDB cache'ten okunur**
11. **50k satırlık bir M3U** ile test edildiğinde: UI freeze yok, parse tamamlanma süresi `< 15 saniye`, memory `< 100 MB`

### Açık Konular

- Onboarding'de M3U URL nasıl girilir: webOS native keyboard mu, custom mu (custom Faz 4'te)
- Test M3U: `https://iptv-org.github.io/iptv/countries/tr.m3u`

---

## Faz 3 — EPG

**Süre tahmini**: 2 oturum

### Hedef

XMLTV EPG'yi çekmek, IndexedDB'ye cache'lemek, kanal kartlarında "now / next" badge'i göstermek, ayrı bir EPG tab'ında Theater layout ile tam timeline view sunmak.

### Kapsam

**IN**:
- XMLTV fetch + parse (gzip destekli)
- IndexedDB cache (idb wrapper)
- ChannelCard'da Now/Next overlay (Pro Grid'e entegre)
- TopBar'a sekme navigasyonu: Kanallar / EPG / Ayarlar
- EPG tab'ı: Theater layout, 6+ kanal × 3-4 saatlik pencere
- Time axis + Current time line (kırmızı dikey)
- EPG'de 2D nav: dikey = kanal, yatay = zaman
- OK bir program hücresinde → o kanalı oynat (eğer canlı), gelecek programlarda → kaydet (Faz 4'te detay)
- Otomatik günlük EPG yenileme
- Settings'e "EPG URL" alanı

**OUT**:
- EPG recording / reminder (Faz 4+)
- Catch-up TV (kapsam dışı)
- Xtream Codes EPG (Faz 4'te entegre olacak)

### Deliverables

- `src/services/epg.service.ts` (fetch + XMLTV parse)
- `src/services/epgCache.ts` (IndexedDB get/set/query)
- `src/types/epg.ts` (Program, EPGChannel types)
- `src/components/channels/NowNextBadge.tsx`
- `src/components/epg/EPGGrid.tsx`
- `src/components/epg/TimeAxis.tsx`
- `src/components/epg/CurrentTimeIndicator.tsx`
- `src/components/epg/EPGCell.tsx`
- `src/components/layout/TopBar.tsx` (sekme nav eklenir)
- `src/components/layout/TabRouter.tsx`

### Definition of Done

1. Settings'ten EPG URL girilince (örn. `https://iptv-org.github.io/epg/guides/tr.xml`) EPG yüklenir
2. Yükleme sırasında progress göstergesi
3. Yükleme bitince ChannelCard'lar üzerinde "Şu an: ... · Sıradaki: ..." görünür
4. Kanal listesi tab'ında M3U kanal `tvg-id` ile EPG channel ID eşleşmesi yapılır
5. Eşleşmeyen kanallarda Now/Next badge'i boş kalır (hata değil)
6. EPG tab'ı: Theater layout doğru render olur, kırmızı current-time çizgisi gerçek zamanlı kayar
7. EPG hücreleri arasında 2D D-pad nav çalışır
8. Bir EPG hücresine OK basınca, eğer şu an oynuyorsa o kanal player'da açılır
9. Cache: aynı EPG URL tekrar fetch edilmeden 6 saat boyunca IndexedDB'den kullanılır
10. EPG verisi 24 saatlik bir pencere için < 5 saniye yüklenir (cache miss durumunda)

### Açık Konular

- Channel ID eşleşmesi tam değilse fuzzy match yapılsın mı (kanal adı bazlı)?
- Türkçe EPG kaynağı kalitesi belirsiz; birden fazla EPG kaynağı merge etmek istenir mi (Faz 4)

---

## Faz 4A — Multi-Source + Xtream + Native Player [Tamamlandı ✓]

Tamamlanma tarihi: 2026-05-18

### Teslim edilenler

- Multi-source data layer (M3U + Xtream coexist, IDB v3)
- Xtream Codes API entegrasyonu (validate, categories, streams)
- Full Settings paneli (kaynak ekle/sil/toggle/yenile)
- AddSourceModal (M3U URL veya Xtream Codes formları)
- Native-first Player Strategy (D-031) — TV donanım decoder'ı primary, HLS.js/mpegts.js fallback
- Stream URL fallback chain (URL candidates × 3 strateji)
- Persistent error overlay + denenen URL ve strateji listesi
- D-pad navigasyon stabilizasyonu (5 patch sonrası)

### Real TV sonuçları

- **27/40 TR kanal (%67.5)** — paid Xtream provider, NANO81
- IDB v3 migration: 193 M3U + 1950 Xtream kanal sorunsuz
- D-pad: sidebar, grid, topbar, modal, player tam çalışıyor
- Player → BACK → ChannelList focus restore stabil (D-033)

### Bilinen sınırlar / teknik borç

- Codec gap: %32.5 kanal donanım decoder'da decode edilemez (HEVC profil / AC-3). → **D-034**
- Xtream catalog filtering eksik: yabancı kategoriler listede görünür. → **D-035** (Faz 4B)
- EPG Theater grid mouse-only. → **D-028** (Faz 3'ten devam)
- Logo loading: provider image CDN sorunları, %95+ logo yüklenmiyor. Provider-side, app değil.

### Patch tarihi

- Faz 4A initial: multi-source foundation, IDB v3, AddSourceModal
- Patch 1: startup screen + AddSourceModal focus boundary
- Patch 2: stream URL fallback chain + persistent error UI
- Patch 3: success detection refactor (video.onplaying)
- Patch 4: D-pad regression fix + lastFocusedChannelId format migration
- Patch 5: sidebar onArrowPress (index-based focusKey + isFocusBoundary)
- Patch 6: Native-first Player Strategy — D-031
- Closure: diagnostic log cleanup, PHASES.md güncelleme

---

## Faz 4B — Search + Xtream Catalog Filtering + EPG Improvements

**Süre tahmini**: 1-2 oturum

### Hedef

Kullanıcının büyük Xtream catalog'unu pratik kullanabilmesi: arama, kategori filtreleme (D-035), EPG iyileştirmeleri.

### Kapsam

**IN**:
- Search bar (TopBar veya overlay) — kanal adı filtreleme
- Xtream kategori prefix filtresi (D-035): `|TR|`, `TR:` vb. prefix'li kategorileri sidebar'da Türkçe gruba topla; yabancıları ayrı grupta veya gizle
- Xtream bouquet desteği (varsa provider'da)
- EPG Theater grid D-pad navigasyonu (D-028 kapanışı)
- "Custom User-Agent" alanı (gelişmiş ayar, Settings'te)

**OUT**:
- Xtream VOD / Series
- Multi-EPG merge
- Parental control / pin

### Açık Konular

- D-035: Filtreleme mantığı — prefix strip mi, grup eşleme mi, kullanıcı konfigürasyon mu?
- D-028: EPG grid D-pad tam implementasyonu ne kadar sürer?

---

## Faz 5 — Polish & Distribution

**Süre tahmini**: 1-2 oturum

### Hedef

Üretim kalitesine getirmek: performans, stabilite, kalıcı kurulum opsiyonu.

### Kapsam

**IN**:
- react-window ile ChannelGrid virtualization (1000+ kanal için)
- Stream watchdog: stream düşerse 3 kez auto-retry (exponential backoff), sonra error UI
- Memory profiling, leak fix'leri
- Bundle analyzer ile size audit, gerekirse split
- Production IPK build script + version bump otomasyon
- Real icon design (Boss veya Claude design'la)
- `SIDELOAD.md` (TV'ye nasıl kurulur, Dev Mode oturum uzatma)
- `PERMANENT_INSTALL.md` (webosbrew + Homebrew Channel yolu, NANO81 için exploit durumu)
- Vitest unit testleri kritik servisler için: m3u.service, epg.service, xtream.service, store reducer'ları

**OUT**:
- Auto-update mekanizması (kapsam dışı; webOS sideload'da yok)
- Cloud sync (kapsam dışı)
- Multi-language UI (sadece Türkçe, ileride i18n)

### Deliverables

- `src/components/channels/VirtualizedChannelGrid.tsx`
- `src/services/streamWatchdog.ts`
- `scripts/build-ipk.sh` (versioning + release)
- `tests/` dizini + vitest config
- `docs/SIDELOAD.md`
- `docs/PERMANENT_INSTALL.md`
- Yeni `icon.png` + `largeIcon.png` (production)

### Definition of Done

1. 1000 kanallı listede scroll FPS > 50
2. Stream koparsa kullanıcı müdahalesi olmadan 3 saniyede recover olur
3. Chrome DevTools (remote) ile 30 dakika kullanımda memory growth < 50 MB
4. Production IPK 0.2.0+ build edilir, TV'de kurulur, sorunsuz çalışır
5. SIDELOAD.md ve PERMANENT_INSTALL.md tamamlanmış, takip edilebilir adımlar
6. Vitest test coverage kritik servislerde > %60

### Açık Konular

- NANO81 firmware version'ı için webosbrew exploit durumu (kontrol edilecek)
- Faz 5 sonunda v1.0.0 olarak release etmek mi yoksa v0.x'te bırakmak mı

---

## Genel Notlar

- Her faz sonunda **TV'de gerçek test** yapılmadan bir sonraki faza geçilmez.
- Her fazın sonunda `DECISIONS.md`'e o fazda alınan yeni kararlar (varsa) eklenir.
- Bir fazda kapsam genişlemesi olursa (örn. Faz 2'de "shu da olsa iyi olur" diye eklenen şey), o "olur" Faz 6 olarak ayrı bir yere yazılır, mevcut faz şişirilmez.
- Faz aralarında refactor yapılabilir; refactor kararları `DECISIONS.md`'e işlenir.

---

## 1.0.1 Sonrası Yapılacaklar

- [ ] **Oynatıcı altyazı kontrolünü gerçek TV'de doğrula.** Altyazı butonunun
  açma/kapatma davranışı, odak göstergesi ve mevcut altyazılı/altyazısız
  içeriklerdeki durumu test edilecek. Arıza görülürse önce oynatıcı olayı,
  seçilen track ve içerik desteği ayrı ayrı ölçülecek.
  - Kod incelemesi tamamlandı: düğme kalıcı ayarı ve HTML video `textTracks`
    modunu değiştiriyor. Görsel sonuç için gerçek TV kabulü bekleniyor.
- [ ] **Filmler ve Diziler ekranlarına “Son İzlenen” girişi ekle.** Canlı TV
  ekranındaki davranış örnek alınacak; son izlenen film veya dizi/bölüm doğru
  içerik ve devam zamanıyla açılacak. BACK sonrasında önceki ekran, kategori ve
  kart odağı korunacak.
  - Kod ve üretim derlemesi tamamlandı. Her bölüm için son 10 içerik izleme
    sırasıyla saklanıyor; gerçek TV kabulü bekleniyor.
- [ ] **Ayarlar ekranının işlev envanterini çıkar.** Bütün kart ve butonlar gerçek
  TV'de tek tek denenerek `aktif`, `pasif/placeholder` veya `hatalı` olarak
  sınıflandırılacak. Sonuç raporlandıktan sonra pasif/hatalı kontroller,
  öncelik ve kullanıcı onayı sırasıyla çalışır hâle getirilecek.
  - Kaynak kod envanteri `docs/SETTINGS_FUNCTION_AUDIT.md` dosyasına yazıldı;
    bulunan D-pad odak kusurları düzeltildi. Gerçek TV kabulü bekleniyor.
