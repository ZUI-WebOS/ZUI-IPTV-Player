# ZUI IPTV Player — Decision Log

Mimari, kütüphane, yaklaşım kararları burada zaman damgalı ve gerekçeli tutulur. Her karar bir kez yazılır, sonradan revize edildiyse yeni bir kayıt eklenir (eski silinmez, "Superseded by D-XXX" notu konur).

**Karar formatı**: ID, Tarih, Statü, Bağlam, Karar, Sonuçlar, Alternatifler.

**Statüler**: `Proposed` · `Accepted` · `Superseded` · `Rejected`

---

## D-001 — Tech Stack: Vite + React 18 + TypeScript + Tailwind

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: webOS TV için bakımı kolay, hızlı iterate edilebilir, Boss'un mevcut projeleriyle (Loomera) tutarlı bir stack gerekiyor.

**Karar**: Build tool olarak Vite, framework olarak React 18, dil olarak TypeScript, styling için Tailwind CSS kullanılacak.

**Sonuçlar**:
- (+) Boss'un Loomera frontend stack'iyle birebir uyumlu — bilgi transferi sıfır maliyetli
- (+) Vite HMR sayesinde dev experience hızlı
- (+) TypeScript hls.js event'leri, M3U/Xtream API response'ları gibi kompleks yapılarda hata yakalamayı kolaylaştırır
- (−) Framework overhead'i ~120 KB gzipped; vanilla yaklaşıma göre fazla, ama Faz 5'te code splitting ile dağıtılacak
- (−) TV'nin Chromium versiyonu eski olabilir; modern ES özelliklerinde dikkat — Vite default target'ı `esnext`, biz `es2017` yapacağız

**Alternatifler**:
- *Vanilla JS + Web Components*: Reddedildi — spatial nav, state, EPG render karmaşıklığında React'ın ergonomisi haklı çıkıyor
- *SvelteKit*: Reddedildi — webOS ekosisteminde toplulukça denenen örnekler React tarafında daha fazla
- *Solid.js*: Cazip ama TV ekosisteminde olgunluk geri planda

---

## D-002 — Spatial Navigation: @noriginmedia/norigin-spatial-navigation

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: TV uygulaması D-pad ile yönetiliyor. Focus management custom yazılırsa her ekran için tekrar tekrar uğraşılması gerekir; battle-tested bir kütüphane çok zaman kazandırır.

**Karar**: `@noriginmedia/norigin-spatial-navigation` kullanılacak.

**Sonuçlar**:
- (+) React hook tabanlı API (`useFocusable`), bizim component yapımıza temiz oturur
- (+) Context'ler (modal açıldığında pause/resume) hazır
- (+) 2D nav (EPG grid için) destekli
- (−) Bundle'a ~15 KB ekler — kabul edilebilir
- (−) Magic Remote pointer event'leri ile manuel sync gerekebilir

**Alternatifler**:
- *Custom focus manager*: Reddedildi — kapsam yutar, 2D nav (EPG için) sıfırdan yazmak risk
- *react-tv-navigation*: Eski, bakımsız
- *@bbc/tv-application-layer*: Çok büyük framework, biz sadece nav istiyoruz

---

## D-003 — Video: hls.js + Native `<video>` Fallback

**Tarih**: 2026-05-17
**Statü**: Superseded by D-013

> **Not**: Bu karar yeterince ileri gitmiyordu — düz MPEG-TS stream'leri ve audio codec hataları için strateji yetersizdi. D-013 bu kararı genişletip Player Strategy Pattern olarak yeniden kuruyor. Aşağıdaki içerik referans için duruyor.

**Bağlam**: IPTV stream'leri çoğunlukla HLS (.m3u8). webOS 6 Chromium native HLS'i kısmi destekliyor ama tutarsız.

**Karar**: hls.js primary olarak; hls.js'in `isSupported()` false dönerse native `<video>` ile dene. Bazı M3U'lar düz MPEG-TS verir, native player onları çoğunlukla çalar.

**Sonuçlar**:
- (+) hls.js geniş uyumluluk + ABR (adaptive bitrate) yönetimi
- (+) `xhrSetup` ile User-Agent override mümkün — provider UA kontrolüne karşı koz
- (+) Native fallback edge case'lerde kurtarıcı
- (−) hls.js ~120 KB gzipped; bundle'ın önemli kısmı

**Alternatifler**:
- *Shaka Player*: Daha büyük (~200 KB), DRM özellikleri bize gereksiz (Dev Mode'da Widevine yok)
- *Sadece native video*: Reddedildi — tutarsız davranış, ABR yok

---

## D-004 — M3U Parser: iptv-playlist-parser

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: M3U dosyalarında extended attribute'lar (`tvg-id`, `tvg-logo`, `group-title`) var; bunları doğru parse etmek EPG eşleşmesi ve UI için kritik.

**Karar**: `iptv-playlist-parser` (npm) kullanılacak.

**Sonuçlar**:
- (+) Tüm yaygın extended attribute'ları okur
- (+) Çok hafif (~5 KB)
- (+) Active maintenance

**Alternatifler**:
- *m3u8-parser*: HLS playlist'ler için, IPTV M3U için aşırı
- *Custom regex parser*: Reddedildi — edge case'lere yatırım yapmak istemiyoruz

---

## D-005 — Multi-Source Strategy: M3U + Xtream Codes

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: Boss "Multi-playlist + Xtream Codes preset" istedi. Xtream Codes API M3U'dan daha zengin (kategoriler, EPG, kullanıcı meta).

**Karar**: İki source tipi desteklenecek (`M3USource`, `XtreamSource`). Aynı `Channel[]` interface'ine normalize edilecek. Birden fazla source eklenebilecek, kullanıcı aktif olanı seçecek.

**Sonuçlar**:
- (+) Kullanıcı esnekliği yüksek
- (+) Xtream'in dahili EPG'si M3U + XMLTV merge'ünden daha temiz çalışabilir
- (−) Tip soyutlaması kod karmaşıklığını artırır — gerekçesi var, kabul edilebilir
- (−) Xtream şifre saklama: localStorage'da plain text yerine basit obfuscation (Faz 4) → tam çözüm Faz 5

**Alternatifler**:
- *Sadece M3U*: Reddedildi — Xtream çok yaygın, kullanıcı zorlanır
- *Sadece Xtream*: Reddedildi — açık M3U kaynaklarını da desteklemek isteniyor

---

## D-006 — EPG in MVP (Faz 3'te entegre, opsiyonel değil)

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: Boss EPG'yi "MVP'den itibaren önemli" diye işaretledi. Bu, plan üzerinde önemli bir scope kararı.

**Karar**: EPG Faz 3'te tam entegre olacak. ChannelCard'lar Now/Next badge'i gösterecek (Pro Grid layout) + ayrı bir EPG tab'ı Theater layout ile timeline view sunacak.

**Sonuçlar**:
- (+) MVP daha tatmin edici, profesyonel
- (+) Theater layout için ayrı sekme, Pro Grid'i fonksiyonel tutar
- (−) Faz 3 ağır bir faz oluyor — 2 oturum kabul edildi
- (−) XMLTV kaynak kalitesi Türkiye için belirsiz; Faz 4'te Xtream EPG ile birleştirme stratejisi gerekecek

**Alternatifler**:
- *EPG'yi Faz 5'e ertelemek*: Reddedildi — kullanıcı önceliği
- *Sadece Now/Next, EPG grid yok*: Reddedildi — Theater layout zaten tasarlandı

---

## D-007 — Design Direction: Hybrid (Pro Grid main + Theater EPG)

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: Üç design varyantı (Cinema, Pro Grid, Theater) Boss'a sunuldu. Boss hibrit tercih etti.

**Karar**: 
- Ana ekran: **Pro Grid** (kategori sidebar + 3 sütun kanal kartları + Now/Next badge'leri)
- EPG sekmesi: **Theater** (timeline grid + mini player + current time line)
- Cinema'dan bir kalıntı: ana ekranın üstünde "şu an oynayan favori kanal" için ince bir hero strip (opsiyonel, kullanıcı favori belirlemişse)
- Accent renk: `#3DDC97` (mint green) — focus ring + canlı vurgular için
- Tek tema: koyu (TV izleme mesafesi)

**Sonuçlar**:
- (+) İki farklı kullanım moduna iki ayrı sahne — UX karışmaz
- (+) Hero strip favori kullanıcılarına bir kontekst veriyor, others için yer kaplamıyor
- (−) İki layout = iki ayrı focus context implementation maliyeti
- (−) Tek tema kararı, light mode istenirse Faz 5+

**Alternatifler**: A (Cinema), B tek başına, C tek başına — bkz. mockup'lar.

---

## D-008 — Storage Strategy: localStorage + IndexedDB

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: Kanal listeleri ve ayarlar küçük, ama EPG verisi büyük (24 saatlik XMLTV onlarca MB).

**Karar**: 
- Source listesi, ayarlar, favoriler, son izlenen → **localStorage** (zustand persist middleware ile)
- EPG verisi → **IndexedDB** (`idb` wrapper ile)
- Cache TTL: EPG 6 saat, sonra arka planda refresh

**Sonuçlar**:
- (+) Doğru veri için doğru store
- (+) IndexedDB query API'si zaman aralığı sorgularına uygun (`getProgramsByTimeRange`)
- (−) İki ayrı persistence layer'ı; storage.service.ts ile kapsüllenir

**Alternatifler**: 
- *Hepsi localStorage*: Reddedildi — EPG sığmaz, 5 MB sınırı
- *Hepsi IndexedDB*: Reddedildi — basit key/value için aşırı

---

## D-009 — Tek Tema (Koyu)

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: TV izleme mesafesi + ortam ışığı genelde düşük → koyu tema TV ekosisteminde standart.

**Karar**: MVP'de sadece koyu tema. Light mode Faz 5+ olarak değerlendirilecek.

**Sonuçlar**:
- (+) Tasarım kararları sadeleşir, token sayısı yarıya iner
- (+) TV'de görsel rahatsızlık vermez (parlak beyaz ışık değil)
- (−) Light mode isteyen kullanıcı için Faz 5+

---

## D-010 — Geliştirme Aracı: Claude Code CLI

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: Boss bu projeyi Claude Code CLI ile tek başına yürütmek istedi. Loomera'da kullanılan "Claude prompt mühendisi + Antigravity executor" modelinin tek-araç versiyonu.

**Karar**: Tüm faz uygulamaları Claude Code CLI ile yapılacak. Bu workspace'teki Claude prompt'ları yazar (PROMPT_FAZ_X.md dosyaları), Boss bunları Claude Code'a verir.

**Sonuçlar**:
- (+) Tek araç → setup gürültüsü az
- (+) Faz prompt'ları versiyonlu olarak repo'da kalır, gelecek refactor'lar için referans
- (−) IDE entegrasyonu Antigravity kadar zengin değil; gerekirse Boss manuel olarak code review yapacak

**Alternatifler**:
- *Antigravity*: Boss reddetti, bu projede tek başına Claude Code yeterli görüldü
- *Cursor / Codeium*: Değerlendirilmedi

---

## D-011 — shadcn/ui Stack'ten Çıkarıldı, Custom Component'ler

**Tarih**: 2026-05-17
**Statü**: Accepted (revises D-001'in component katmanını)

**Bağlam**: shadcn/ui aslında bir generator; Radix UI primitif'lerini üretir. Radix klavye nav (Tab/Shift+Tab) ve focus trap'leri üzerine kuruludur. @noriginmedia/norigin-spatial-navigation ise arrow-key tabanlı kendi state machine'iyle çalışır. İkisi Dialog/Popover/Select/DropdownMenu/Tabs gibi interactive primitif'lerde focus yönetimini birbirinden çalar; TV'de kullanıcı focus'u kaybeder.

**Karar**: shadcn/ui tamamen stack'ten çıkarıldı. Yerine `class-variance-authority` (cva) + Tailwind kombinasyonu doğrudan kullanılacak. Tüm interactive primitif'ler (Modal, Tabs, Select, Dropdown, Tooltip) **norigin'in `useFocusable` hook'uyla sarmalanmış custom component'ler** olarak yazılır.

**Sonuçlar**:
- (+) Focus yönetiminde tek otorite var (norigin) — Radix ile çatışma yok
- (+) Bundle daha küçük: Radix dependencies (~50 KB) gitti, cva ~2 KB
- (+) TV-spesifik etkileşim tasarımlarını rahatça eklenebilir (örn. modal'da focus context değişimi)
- (−) Custom Modal/Tabs/Select kodunu kendimiz yazıyoruz (Faz 4'te toplam ~300-400 satır)
- (−) ARIA/erişilebilirlik elle ekleniyor — TV uygulamasında öncelik düşük, ama yine de iyi pratik

**Alternatifler**:
- *shadcn'in sadece "aptal" component'lerini kopyalama*: Reddedildi — sınır belirsiz, ileride geliştirici "Dialog'u şununla yaptım" diye Radix'i sızdırabilir
- *Headless UI (Tailwind Labs)*: Aynı sorun — kendi focus management'ı var, norigin ile çatışır
- *Sıfırdan unstyled component*: Seçilen yol, cva ile

---

## D-012 — M3U Parse Web Worker + IndexedDB

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: IPTV M3U dosyaları 10k-50k satır olabilir (kanal + VOD + dizi). iptv-playlist-parser senkron çalışır. TV'nin ARM CPU'sunda 50k satırlık M3U parse'ı main thread'de 5-7 saniye dondurur. webOS watchdog uygulamayı crash edebilir. Ayrıca parse sonrası 50k channel object'i Zustand store'da tutmak runtime memory'yi şişirir.

**Karar**: 
1. M3U fetch + parse işlemi **Web Worker** içinde çalışacak (`src/workers/m3uParser.worker.ts`)
2. Worker parse'ı bitince sonucu doğrudan **IndexedDB**'ye yazar (`channels` object store)
3. Zustand store'da sadece **aktif kategori filtresi**, **görünür kanal slice'ı**, **seçili kanal** tutulur — tam liste değil
4. ChannelGrid IndexedDB'den paginated query ile okur (`getChannelsByCategory(category, offset, limit)`)
5. UI thread süresince freeze yok; "Yükleniyor... %X" progress gösterilir (worker'dan post message'larla)

**Sonuçlar**:
- (+) Parse sırasında UI tamamen responsive
- (+) Bellekte sadece görünür kanallar — 50k+ list'i sorunsuz destekler
- (+) IndexedDB sayesinde sonraki açılışta parse gereksiz (cache hit kontrolü)
- (−) Worker postMessage transferi büyük JSON için ek serialize maliyeti (~200ms 50k channel için — kabul edilebilir)
- (−) Mimari biraz daha karmaşık: Web Worker + IDB + filtered slicing

**Alternatifler**:
- *Sadece Web Worker, store'da tüm liste*: Reddedildi — memory sorununu çözmüyor, sadece freeze'i çözüyor
- *Yerel backend (Docker microservice) + REST API*: Bkz. D-014 — ertelendi
- *Streaming parser*: M3U format'ı line-based, streaming yapılabilir ama mevcut kütüphane desteklemiyor, custom yazmak risk

---

## D-013 — Player Strategy Pattern + mpegts.js

**Tarih**: 2026-05-17
**Statü**: Accepted (supersedes D-003)

**Bağlam**: D-003 sadece hls.js + native fallback öngörüyordu. Gerçekte üç farklı stream tipi karşımıza çıkıyor: HLS (.m3u8), düz MPEG-TS over HTTP (.ts, çok yaygın Türk provider'lar arasında), ve nadiren MP4. hls.js düz MPEG-TS yemiyor; native `<video>` MPEG-TS'i tutarsız çalıyor (codec ve container desteğine bağlı). Ayrıca webOS app sandbox'ında AC3/DTS audio codec'leri lisans nedeniyle sessizce başarısız oluyor — video oynar, ses gelmez.

**Karar**: `PlayerStrategy` interface'i tanımlanır:

```typescript
interface PlayerStrategy {
  name: string;
  canHandle(url: string, contentType?: string): boolean;
  attach(video: HTMLVideoElement, url: string, opts?: AttachOpts): Promise<void>;
  detach(): void;
  onError(cb: (err: PlayerError) => void): void;
}
```

Üç implementation:
- `HLSStrategy` — `.m3u8` veya HLS content-type için hls.js
- `MpegTSStrategy` — `.ts` URL veya MPEG-TS content-type için **mpegts.js** (MSE üzerinden demuxing)
- `NativeStrategy` — `.mp4` veya hls.js native HLS desteklediği durumda fallback

Resolver fonksiyonu URL/content-type'a bakıp uygun strategy'i döndürür. `usePlayer` hook bu interface üzerinden çalışır, somut player kütüphanelerini bilmez.

Ek olarak: `<video>` element'inin `error` event'inde `MEDIA_ERR_DECODE` yakalanırsa veya audio track 5 saniye boyunca progress yapmazsa "ses kodeği desteklenmiyor olabilir" overlay'i gösterilir. HLS multi-audio-track varsa otomatik diğerine geçer.

**Sonuçlar**:
- (+) Düz MPEG-TS stream'leri (Türk IPTV'lerde yaygın) artık oynar
- (+) Audio codec başarısızlığı kullanıcıya görünür — sessiz hata yok
- (+) Yeni stream tipi gelse (DASH vb.) yeni bir Strategy yazmak kolay
- (−) Bundle'a mpegts.js ekleniyor (~50 KB gzipped)
- (−) Toplam player kütüphanesi yaklaşık ~170 KB — kabul edilebilir

**Alternatifler**:
- *flv.js*: FLV/RTMP için, IPTV'de neredeyse hiç görülmez — eklenmeyecek
- *Shaka Player*: DRM + DASH için, kapsam dışı
- *Sadece hls.js + native*: Yukarıda anlatıldı, eksik

---

## D-014 — Yerel Backend (Microservice) Ertelendi

**Tarih**: 2026-05-17
**Statü**: Rejected (MVP scope) · Deferred (post-v1.0 değerlendirilebilir)

**Bağlam**: Forum tartışmaları sırasında "M3U parse'ı TV'ye değil, evdeki Docker'da çalışan FastAPI/Node microservice'e yaptırıp TV'ye paginated JSON beslemek" önerildi. Boss'un Loomera ekosisteminde FastAPI+Postgres altyapısı zaten var, mantıklı bir uzantı olabilir.

**Karar**: MVP (Faz 0-5) için reddedildi. Web Worker + IndexedDB (D-012) freeze ve memory sorunlarını çözüyor, backend ek sorunu çözmüyor. Backend çözümü v1.0 sonrasında "Sim Player Hub" gibi opsiyonel bir uzantı olarak değerlendirilebilir.

**Sonuçlar**:
- (+) MVP scope korunur, single-artifact app olarak kalır
- (+) Network/sunucu yönetimi gerektirmez, taşınabilir
- (+) Demo/misafir senaryolarında TV tek başına çalışır
- (−) Çok büyük listelerde (>100k satır) Web Worker bile yorulabilir — o zaman tekrar değerlendirilir

**Alternatifler**:
- *MVP'ye dahil etmek*: Reddedildi (yukarıda gerekçelendi)
- *Backend opsiyonel mode*: Mimari hazırlığı yapılmıyor; gerekirse v2'de eklenir

---

## D-015 — Bundle Hedef: ES2019, polyfill yok

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: webOS 6 Chromium ~79 tabanlı; ES2017-2018 tam destekli, ES2019 büyük çoğunlukla destekli (Array.flat, Object.fromEntries, optional catch binding). Modern ES özellikleri (top-level await, private fields) tehlikeli olabilir. Polyfill eklemek bundle'ı şişirir.

**Karar**: Vite/TS build target = `ES2019`. Core-js veya benzeri polyfill eklenmeyecek. Yeni özellik kullanılırken caniuse + webOS 6 Chromium version cross-check yapılır.

**Sonuçlar**:
- (+) Bundle yalın, gereksiz polyfill yok
- (−) Geliştirici yeni özellik eklerken dikkat etmeli — ESLint kuralıyla zorlanabilir (Faz 5'te)

---

## D-016 — webOS CLI Paketi: @webos-tools/cli (global)

**Tarih**: 2026-05-17
**Statü**: Accepted (corrects original PROMPT_FAZ_0.md recommendation)

**Bağlam**: PROMPT_FAZ_0.md'de `@webosose/ares-cli` (open-source webOS OSE için) önerilmişti — yanlış paket. LG TV'leri için resmi araç **`@webos-tools/cli`**. İkisi farklı ekosistemler: @webosose webOS OSE (gömülü cihazlar, otomotiv) için; @webos-tools LG'nin TV SDK'sı için. @webos-tools/cli `ares-novacom` binary'sini de doğru expose ediyor — SSH key indirme adımı (`--getkey`) ancak bu pakette çalışıyor.

**Karar**: `@webos-tools/cli` global olarak kurulur (`npm install -g @webos-tools/cli`), proje devDependency'sinden çıkarılır. SSH bağlantısı için passphrase + key iki adımlı akışı kullanılır:
1. `ares-setup-device` — device meta (IP, port, user `prisoner`, passphrase)
2. `ares-novacom --device tv --getkey` — passphrase ile SSH özel anahtarını indirir (`~/.ssh/tv_webos`)
3. ares-install / ares-launch SSH key auth ile çalışır

**Sonuçlar**:
- (+) Doğru LG TV ekosistemine bağlı
- (+) Auth akışı LG'nin amaçladığı şekilde çalışıyor (passphrase = key indirme yetkisi, key = operasyon kimliği)
- (−) Global install gerekiyor, repo cloneda projenin "self-contained" olmaması — README'de net talimat şart
- (−) İlk kurulum adımı manuel (geliştirici kendi makinesinde ares-novacom çalıştırmalı)

**Alternatifler**:
- *@webosose/ares-cli*: Yanlış ekosistem, novacom binary'si tutarsız expose ediliyor
- *Manuel SSH key kurulumu*: Mümkün ama daha kırılgan, ares-novacom doğru yol

---

## D-017 — Hibrit Node Pipeline: Build Node 24, CLI Node 16

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: İki yön çatışıyor:
- `@webos-tools/cli` (LG'nin TV CLI'sı) eski Node API'lerine bağımlı (örn. `util.isDate` Node 17'de kaldırıldı). Stabil çalıştığı en yüksek Node: **v16.20.2**.
- **Vite 5** modern Node API'lerini gerektiriyor — özellikle `crypto.getRandomValues` globali, Node 18+ ile geliyor. Node 16'da `TypeError: crypto$2.getRandomValues is not a function` ile build patlar.

Aynı Node sürümünde ikisi de çalışmıyor. "Altı sakal, üstü bıyık" durumu.

**Karar**: NVM ile iki Node sürümü kurulu tutulur, pipeline iki aşamaya ayrılır:

1. **Build & Package** (Node 24): `npm run build` (tsc + vite) ve `npm run package` (ares-package — bu komut Node version'a duyarsız, sadece dosya kopyalar ve tarball üretir)
2. **Install & Launch** (Node 16.20.2): `ares-install` ve `ares-launch` — TV ile SSH üzerinden konuşan adımlar

`package.json`'da `deploy:full` script'i kaldırılır (otomatik tek tıkla çalışmaz). Yerine `scripts/deploy.ps1` PowerShell wrapper'ı (Windows için) ve `scripts/deploy.sh` (Linux/Mac için Faz 5'te) NVM komutlarını sırasıyla yürütür.

**Sonuçlar**:
- (+) Her iki toolchain kendi optimum sürümünde çalışır — kimseyi geriye çekmeye gerek yok
- (+) Vite 4'e downgrade veya CLI fork etmek gibi büyük taviz yok
- (+) Faz değişimlerinde stabil — Vite ve @webos-tools/cli ayrı evrim hatlarında
- (−) Geliştirici makinesinde NVM zorunlu
- (−) `deploy:full` gibi tek komut workflow'u biraz zarif kayıp; wrapper script ile telafi
- (−) CI/CD ileride kurulursa iki Node container'lı pipeline gerekir

**Alternatifler**:
- *Vite 4'e downgrade*: Reddedildi — geçici çözüm, sonraki Vite migration'ında aynı sorun başka şekilde döner
- *@webos-tools/cli'nin Node 18+ uyumluluğu için monkey-patch*: Çok kırılgan, LG güncellemesinde patlar
- *Docker'da CLI çalıştırmak*: Lokal geliştirme için overkill, ileride opsiyonel
- *LG'nin SSH key + ssh komutu ile manuel deploy*: Mümkün ama CLI'nin sağladığı IPK validation, install log streaming gibi şeylerden mahrum

---

## D-018 — `ares-novacom --getkey` PROMPT_FAZ_0'da Yanlış Çıkarılmıştı

**Tarih**: 2026-05-17
**Statü**: Accepted (correction)

**Bağlam**: PROMPT_FAZ_0.md README adımları sadece `ares-setup-device`'tan bahsediyordu. Doğrusu iki adım: önce cihaz metasını parolasız kaydetmek, sonra TV'de Key Server açıkken `ares-novacom --device tv --getkey` ile passphrase girerek SSH anahtarını indirmek. @webos-tools/cli bu olmadan TV ile konuşamıyor.

**Karar**: README adımları güncellenir:
1. TV'de Dev Mode app: passphrase'i not et
2. `npm install -g @webos-tools/cli`
3. `ares-setup-device` (interactive) — device meta; parola boş
4. **`ares-novacom --device tv --getkey`** — anahtarı indirir
5. `ares-device --system-info --device tv` ile bağlantı doğrulama
6. Deploy

Bu adım PROMPT_FAZ_1.md'de README revizyonu olarak yansıyacak.

**Sonuçlar**:
- (+) Doğru kurulum akışı dökümante
- (−) Geriye dönüp Faz 0 README'sini güncellemek gerekiyor (Faz 1 prompt'unda yapılacak)



---

## D-019 — Ürün Adı: ZUI IPTV Player, Bundle ID: com.zui.player

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: İlk isim "Sim Player" iki problemi taşıyordu: (1) LG Content Store'da "Sim" terimi geniş bir küme — Simulation, Simon, Similar gibi yüzlerce app ile çakışır, kullanıcı kumandayla "Sim" yazdığında doğru app'i bulması zor. (2) Boss'un mevcut markası ZUI (zuiofficial.com, Instagram @zuiturkey, ikas mağazası, ZUI AI Agency, Loomera ailesinin parçası) ile bağ kurmuyordu — pazarlama kaldıracı boş kalıyordu.

**Karar**: 
- Ürün adı: **ZUI IPTV Player**
- Bundle ID: **com.zui.player** (reverse-DNS, kısa ve net)
- Vendor: **ZUI**
- npm package adı: **zui-iptv-player**
- Görsel kimlik: ZUI marka renklerini ileride entegre etmek seçeneği açık (şimdilik accent #3DDC97 korunuyor)

**Sonuçlar**:
- (+) LG Content Store search'te neredeyse hiç çakışma yok ("ZUI" üç harf, eşsiz)
- (+) ZUI ekosisteminin parçası — site, sosyal medya, mağaza arasında çapraz tanıtım potansiyeli
- (+) Kumandayla yazılabilir — Boss'un ilk gereksinimi (üç harf, hızlı klavye dolaşımı)
- (+) Bundle ID kısa (`com.zui.player`) — log'larda, dosya adlarında temiz duruyor
- (−) **Faz 5 dikkat noktası**: LG Content Store geçmişte "IPTV" anahtar kelimesini başlıkta gören uygulamalara rezerve davranmış (korsan içerik filtresi). Submission red gelirse Content Store başlığı "ZUI Player" veya "ZUI TV" olarak değiştirilir; bundle ID ve repo aynı kalır.
- (−) Eski TV'deki `com.simplayer.tv` app'i manuel kaldırılmalı (`ares-install --device tv --remove com.simplayer.tv`) yoksa launcher'da iki app yan yana durur

**Alternatifler**:
- *com.zuiofficial.iptv / com.zuiofficial.player*: zuiofficial.com domain'ine birebir uyum, ama daha uzun. Reddedildi — `com.zui.player` daha temiz, marka tanınırlığı zaten "ZUI"
- *com.zui.iptv*: "iptv" terimini bundle ID'de tutmamak Content Store risk azaltır — kabul edildi (player, iptv'den daha generic)

---

## D-020 — Global Remote Router + Exit Confirmation Modal

**Tarih**: 2026-05-17
**Statü**: Accepted (Faz 2 hotfix sırasında ortaya çıktı)

**Bağlam**: Faz 2'de BACK tuşu davranışı her ekranda farklı (ChannelList → exit, Player → ChannelList, Modal → İptal). Her ekranın kendi `useRemote` hook'unda BACK handle etmesi çakışma yaratıyor; norigin spatial-nav ile mount sıralaması belirsizleştiğinde tuş yutuluyor veya yanlış handler tetikleniyor. Faz 3'te sekme navigasyonu (Kanallar/EPG/Ayarlar) gelince bu sorun katlanacak.

**Karar**: App seviyesinde tek bir `RemoteRouter` component'i kurulur. Tüm global remote key'leri (BACK, CH+/CH-, OK için global default) burada dinlenir, `useUIStore.currentScreen` ve `useUIStore.modalOpen` state'lerine göre dispatch eder. Bireysel component'lerin `useRemote` hook'u sadece "lokal" tuşlar için (örn. OSD'yi toggle etmek) kalır.

Exit confirmation: `ConfirmModal` component'i — CVA ile stillenmiş, focus context `'MODAL'`. Modal açıkken norigin `pause()` ile alttaki context durur, kapanınca `resume()`. Modal default focus: "İptal" düğmesi (safer default, kazara Enter basanlardan korur).

**Sonuçlar**:
- (+) BACK davranışı tek yerden tanımlı, debug kolay
- (+) Yeni ekran eklemek = RemoteRouter switch'ine bir case eklemek
- (+) Modal pattern Faz 4 Settings için de hazır (Add Source modal'ı, vb.)
- (−) RemoteRouter component App.tsx'te en üst seviyede mount olmalı — başka pattern (örn. her ekran kendi handler'ı) ile karıştırılırsa çift dispatch riski
- (−) İlk implementation'ı doğru yapmak şart; sonradan refactor maliyetli

**Alternatifler**:
- *Her ekran kendi BACK handler'ı*: Mevcut durum, çakışmalara yol açıyor (Faz 2'de görüldü). Reddedildi
- *Native browser history API + popstate*: appinfo.json `disableBackHistoryAPI: true` olduğu için kapalı (D-001'in webOS özelliklerinden)
- *Context provider tabanlı dispatch*: Overengineering, basit useEffect + window.addEventListener yeterli

---

## D-021 — Initial Focus & Focus Restore Pattern

**Tarih**: 2026-05-17
**Statü**: Accepted (Faz 2 hotfix sırasında ortaya çıktı)

**Bağlam**: @noriginmedia/norigin-spatial-navigation auto-focus yapmıyor. Bir ekran mount olduğunda kullanıcı manuel olarak ya mouse ile tıklamalı ya da `setFocus(key)` çağrılmalı. Faz 2'de bu eksikti — D-pad ölü, kullanıcı magic remote pointer'ına geçmek zorunda kalıyor.

**Karar**: 
1. Her screen component'i mount olduğunda `useEffect` içinde uygun bir element'e `setFocus(focusKey)` çağırır
2. `playlistStore`'a `lastFocusedChannelId: string | null` eklenir; Player'a geçerken set, ChannelList mount'ta restore
3. Modal açıldığında default focus "güvenli" element'e (İptal, Kapat vb.) — kazara Enter koruması
4. Focus key'leri pattern: `<scope>-<id>` (örn. `channel-trt1::0`, `sidebar-favorites`, `modal-cancel`) — globally unique

**Sonuçlar**:
- (+) Kullanıcı kumandayı her açışında D-pad çalışır, mouse'a geçmesi gerekmez
- (+) Ekran geçişlerinde son focus pozisyonu hatırlanır — "izlediğim kanaldan geri döndüm, listede aynı yerdeyim"
- (−) Her yeni ekran/modal için setFocus boilerplate'i — useFocusRestore custom hook'a soyutlanabilir

**Alternatifler**:
- *Norigin'in `init({ autoFocus: true })` ayarı*: Yok, kütüphane bunu sağlamıyor
- *Bir global "FocusBoundary" component'i*: Daha kompleks, basit setFocus yeterli

---

## D-022 — Modal Focus Pattern: isFocusBoundary + FocusContext, pause/resume DEĞİL

**Tarih**: 2026-05-17
**Statü**: Accepted (corrects D-020 implementation guidance)

**Bağlam**: D-020'de modal açıldığında alttaki focus context'i durdurmak için norigin'in `pause()` API'sini önermiştim. Faz 2 Hotfix TV testinde sorun çıktı: `pause()` spatial navigation state machine'ini **global** olarak durduruyor — modal içindeki D-pad geçişleri de ölüyor. Kullanıcı "Evet/İptal" arasında geçemiyor.

Norigin'in doğru izole etme yolu: **`isFocusBoundary: true`** + **`FocusContext.Provider`**. Modal wrapper boundary işaretlenir, içindeki focusable'lar için yeni bir context tanımlanır. Focus modal'ın içinde kilitlenir — alttaki context "donmuş" gibi davranır çünkü focus oraya geçemez, ama state machine çalışmaya devam eder ve modal içinde D-pad sorunsuz işler.

**Karar**: `ConfirmModal` (ve gelecek tüm modal/overlay'ler) şu pattern'i kullanır:

```typescript
function ConfirmModal({ /* props */ }: Props) {
  const { ref, focusKey } = useFocusable({
    isFocusBoundary: true,    // Focus dışarı çıkamaz
    focusable: false,          // Wrapper'ın kendisi focusable değil
    saveLastFocusedChild: false,
  });
  
  useEffect(() => {
    setFocus('modal-cancel');
    // pause/resume YOK
  }, []);
  
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref}>
        {/* İçerik + FocusableButton'lar */}
      </div>
    </FocusContext.Provider>
  );
}
```

`pause()` / `resume()` çağrıları **tamamen kaldırılır**. Modal unmount olduğunda focus boundary doğal olarak kalkar ve alttaki context'e focus geri döner.

**Sonuçlar**:
- (+) Modal içinde D-pad sorunsuz çalışır
- (+) Modal kapanınca alt katmandaki focus state (örn. ChannelList'teki seçili kanal) bozulmaz
- (+) `FocusContext.Provider` Faz 3'te EPG grid içi sub-context'ler için de aynı pattern'le kullanılabilir
- (−) `pause()` API'sini ileride başka kullanım senaryosunda gerçekten gerekli görürsek (örn. fullscreen video player'da spatial nav'ı tamamen kapatmak — ki orada zaten focusable element yok, gerekmez) ayrı değerlendirilir

**Alternatifler**:
- *`pause()` + manual handling*: Reddedildi — modal içinde manuel D-pad handler yazmak gerekirdi, norigin'i kullanmamak demek
- *Modal'ı React Portal ile DOM tree dışına çıkarmak*: Norigin DOM tree'sini değil kendi state machine'ini kullandığı için Portal yardımcı olmuyor; `isFocusBoundary` zaten doğru çözüm

---

## D-023 — Scroll-into-View Pattern (Custom Hook)

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: Norigin focus değişiminde DOM `.focus()` çağırır ama `scrollIntoView` çağırmaz. Bu kütüphane tasarımı: her uygulama kendi scroll davranışını tanımlamalı. Faz 2'de bu eklenmediği için ChannelGrid'de focus alta kayınca container scroll etmiyor; CategorySidebar'da uzun listede aynı sorun.

**Karar**: 
1. Her ChannelCard, CategorySidebar item'ı vb. scroll-edilebilir container içindeki focusable'lar, `onFocus` callback'inde `scrollIntoView` çağırır
2. Boilerplate'i azaltmak için `useFocusableScroll<T>` custom hook yazılır — `useFocusable`'ın üstüne ince bir sarmal
3. Scroll opts: `{ behavior: 'auto', block: 'nearest', inline: 'nearest' }`
   - `auto`: webOS Chromium'da `smooth` jank yapabilir
   - `nearest`: focus her değişiminde container'ı ortalamak (`center`) TV'de göz yorucu titreşim yapar; `nearest` sadece gerektiğinde minimum kayma yapar
4. Container'lar mutlaka `overflow-y: auto` (sidebar) veya `overflow-auto` (channel grid) sahibi olmalı

**Sonuçlar**:
- (+) Kullanıcı D-pad'le aşağı/yukarı gittiğinde focus ekran dışına çıkarsa container otomatik takip eder
- (+) Aynı pattern Faz 3'te EPG grid'in dikey scroll'una, Faz 4'te Settings paneline aynen uygulanır
- (−) `useFocusable` yerine `useFocusableScroll` tercih etmek yeni bir geliştirici alışkanlığı — bir kez öğrenince mekanik

**Alternatifler**:
- *Norigin'i scroll yapan bir fork'la değiştirmek*: Reddedildi — kütüphaneye custom code eklemek upgrade'i kırar
- *CSS scroll-snap*: Sadece sayfa-snap için, item-snap için karmaşık ve TV'de tutarsız
- *`block: 'center'` opsiyonu*: Reddedildi (yukarıda gerekçeli)

---

## D-024 — Tab Navigation Pattern: lastMainScreen for Player Return

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: Faz 2'de tek bir "ana ekran" vardı (`channelList`). Player'dan BACK basıldığında her zaman ChannelList'e dönülüyordu. Faz 3 ile birlikte EPG ayrı bir ana ekran olarak geliyor (sekme navigasyonu üzerinden). Sorun: kullanıcı EPG sekmesinde bir programa tıklayıp player'a girerse, BACK basınca nereye dönmeli? ChannelList'e dönmek bağlam kaybı; doğrusu son geldiği ana ekrana dönmek.

**Karar**: `uiStore`'a `lastMainScreen: 'channelList' | 'epg'` field'ı eklenir. Navigate fonksiyonu, `channelList` veya `epg`'ye geçişte bu değeri günceller; `player`'a geçişte güncellenmez (player ana ekran değil, overlay). RemoteRouter'da Player'da BACK basıldığında `lastMainScreen`'e navigate yapılır.

```typescript
type UIStore = {
  currentScreen: Screen;
  lastMainScreen: 'channelList' | 'epg';   // Persist edilir
  modalOpen: 'exit' | null;
  
  navigate: (s: Screen) => void;
  // navigate() içinde: if (s === 'channelList' || s === 'epg') set({ lastMainScreen: s });
};
```

`lastMainScreen` localStorage'a persist edilir — uygulama kapatılıp açıldığında kullanıcı son ana sekmesinde başlar (Faz 2'deki "ChannelList her zaman default" davranışını genişletir).

**Sonuçlar**:
- (+) Player'dan dönüş sezgisel: kullanıcı geldiği yere döner
- (+) Sonraki açılışlarda son sekme hatırlanır
- (+) Faz 4'te `'settings'` ekranı gelse de `lastMainScreen` tipinde değişiklik gerekmez (Settings ana ekran değil, modal benzeri tek seferlik bir ekran olarak konumlanır)
- (−) Navigate function'ı her çağrıda type-guard yapmak gerekir (`s === 'channelList' || s === 'epg'`)

**Alternatifler**:
- *History stack*: Tüm navigasyonu stack'te tutup BACK her seferinde bir önceki ekrana dönmek. Reddedildi — bu webOS'un native history davranışıyla karışır; ayrıca `disableBackHistoryAPI: true` (D-001) zaten history API'sini kapatmış durumda
- *Her ana sekmenin kendi player session'ı olması*: Reddedildi — multiple player instance memory israfı + TV'de overkill
- *BACK her zaman ChannelList'e*: Reddedildi — EPG kullanıcı deneyimini kötüleştirir

---

## D-025 — XMLTV Parser: fast-xml-parser

**Tarih**: 2026-05-17
**Statü**: Accepted

**Bağlam**: EPG verisi XMLTV formatında dağıtılıyor (XML-based standard). Worker içinde parse edilecek (D-012 pattern). Worker'da DOMParser yok, dolayısıyla browser-native XML parsing kullanılamaz. Adanmış XMLTV parser'ı `node-xmltv` Node-target, browser'da çalışmaz. Generic XML parser gerekiyor.

**Karar**: `fast-xml-parser` kullanılır. Aktif maintenance, küçük bundle, Worker uyumlu, async parse desteği var.

**Sonuçlar**:
- (+) XMLTV'nin tüm element'lerini (channel, programme, title, desc, category vb.) parse eder
- (+) ~30 KB minified — kabul edilebilir worker overhead
- (+) Stream-friendly: 24 saatlik EPG (10-50 MB XML) için yeterli hız
- (−) XMLTV-specific schema validation yok; bizim normalize layer'ımız format kontrolü yapmalı
- (−) Tarih parsing manuel — XMLTV `start="20260517210000 +0300"` formatı normalize edilmeli

**Alternatifler**:
- *node-xmltv*: Browser uyumsuz. Reddedildi
- *Custom regex parser*: Reddedildi — XML edge case'leri (CDATA, entity'ler) güvensiz
- *xml2js*: fast-xml-parser'dan büyük + daha yavaş

---

## D-026 — Focus-Driven Sidebar + TV-Native Tab Activation

**Tarih**: 2026-05-17
**Statü**: Partially Superseded by D-027

> **Not**: TopBar tab davranışı için verdiğim "down arrow = navigate + setFocus" tavsiyesi konvansiyona aykırıydı ve race condition kaynağı oldu. D-027 bu kısmı düzeltir. Sidebar için karar (1. madde, onFocus auto-filter + 200ms debounce) doğru çalıştı, korunur.

**Bağlam**: Faz 3 TV testinde "uygulama PC gibi davranıyor" geri bildirimi alındı. Kullanıcı sidebar'da bir kategoriye odaklanınca grid otomatik filtrelenmiyor — Enter basmak gerekiyor. TopBar tab'ında da aynı durum. Bu TV native app'lerinin (LG webOS native menüler, Netflix, YouTube TV) konvansiyonel davranışından sapıyor.

TV native ergonomide odak (focus) "seçim eşdeğeri"dir — kullanıcı odaklandığı yer için cevap bekler. Web/PC'deki "hover ≠ click" ayrımı TV'de geçerli değil, çünkü kumandayla iki ayrı aşama yapmak yorucu.

**Karar**: 
1. **CategorySidebar item'ları**: `onFocus` callback'inde `setActiveCategory(category.name)` çağrılır. Filtre anında uygulanır. Enter / OK ise focus'u grid'e taşır (`setFocus(firstChannel)`).
2. **TopBar tab'ları**: Focus = highlight (mevcut). Enter ve Down arrow = navigate + setFocus(content). Yani kullanıcı tab'a sağ/sol ile gelirse sadece highlight olur (bağlamı kaybetmemek için), ama down basarsa o tab'a switch + içeriğe iner — bu Netflix/YouTube TV pattern'i.
3. **Channel cards ve EPG cells**: Davranış aynı kalır — focus = preview, Enter = action. (Bu mantıklı çünkü "preview" otomatik kanal değişimi anlamına gelirdi ki bu çok agresif.)
4. **Spam-rate koruma**: Sidebar onFocus filter'ı çok hızlı D-pad scroll'da spam yapabilir. `setActiveCategory` çağrısı 200ms debounce ile sarmalanır.

**Sonuçlar**:
- (+) TV native ergonomiye uyum, "PC hissi" gider
- (+) Tek tıklama yerine tek odaklanma — daha az kumanda eylemi
- (+) Pattern Faz 4'te Settings paneline (radyo buton, toggle item'ları) de uygulanır
- (−) Debounce gerekiyor, yoksa hızlı scroll'da gereksiz query patlaması
- (−) "Yanlışlıkla odaklanma" senaryosu: kullanıcı bir kategoriden geçerken kısa süre filtrelenmiş içerik görür — kabul edilebilir, çünkü filtre cancellation hızlı

**Alternatifler**:
- *Hepsi Enter-driven kalsın*: Reddedildi (mevcut PC hissi)
- *Hepsi focus-driven olsun (TopBar tab'ı dahil)*: Reddedildi — TopBar'da sağ/sol ile gezerken her tab'a switch yapmak tüm screen'i değiştirir, kullanıcı keşif yapamaz hale gelir
- *Custom "long-focus" davranışı (500ms odaklanma → activate)*: Aşırı karmaşık, standart pattern yeterli

---

## D-027 — TopBar Tab Activation: Konvansiyonel Enter-Only Pattern

**Tarih**: 2026-05-17
**Statü**: Accepted (revises D-026 madde 2)

**Bağlam**: D-026'da TopBar tab'ları için "down = navigate + setFocus(content)" önerilmişti. Faz 3 patch sonrası TV testinde tüm arrow ve Enter tuşları TopBar focus'undayken cevapsız kaldı, kullanıcı sadece mouse pointer ile çıkabildi.

İki ayrı sorun var:
1. **Konvansiyon hatası**: Netflix, YouTube TV, Disney+, LG webOS native apps tab navigasyonunda "down arrow ile screen switch" yapmaz. Standard pattern: sağ/sol highlight, **Enter** aktivasyon, **down** ise *şu anki aktif* tab'ın içeriğine iniş (highlighted ama henüz aktif olmayan tab'ın içeriğine değil). Bu mantıklı çünkü kullanıcı tab'ları keşfederken yanlışlıkla screen'i değiştirmek istemez.
2. **Race condition**: `onArrowPress` içinde `onPress()` (navigate) ve hemen ardından `setFocus()` çağrılması, yeni screen henüz mount olmadan setFocus tetikliyor. Norigin'in odak ağacı bu sırada bozuk durumda kalıyor — sonraki tüm arrow basışları yutuluyor. Bu, "TopBar'a girdikten sonra hiçbir tuş çalışmıyor" bug'ının kök sebebi.

**Karar**: TopBar tab'larında **`onArrowPress` callback'i tamamen kaldırılır**. Norigin'in default spatial heuristic'i bu pattern için zaten optimize:

```typescript
function TabButton({ focusKey, label, active, onPress }: Props) {
  const { ref, focused } = useFocusableScroll({
    focusKey,
    onEnterPress: onPress,   // Tek aktivasyon yolu: Enter / OK
    // onArrowPress YOK — norigin default'una bırak
  });
  return <button ref={ref} ...>{label}</button>;
}
```

Beklenen davranış:
- Sağ/sol: norigin default → tab'lar arası highlight değişir, screen değişmez
- Down: norigin default → mevcut screen'in içeriğindeki en yakın focusable'a iner (sidebar / grid hücresi)
- Up at top: norigin default → odaklanılabilir element bulamaz, etkisiz kalır
- Enter / OK: `onEnterPress` tetiklenir → `navigate(screenId)` çağrılır → yeni screen mount → yeni screen'in `useEffect`'i kendi initial focus'unu set eder (D-021 pattern)

**Sonuçlar**:
- (+) Konvansiyona uyum sağlandı (Netflix/YouTube TV pattern'i)
- (+) Race condition kaynağı ortadan kalktı — `setFocus` artık dışarıdan zorlanmıyor, screen kendi mount cycle'ında ayarlıyor
- (+) Kod çok daha az — TabButton sade, sadece `onEnterPress`
- (+) Norigin'in default heuristic'i zaten doğru çalışıyor, override etmek hata kaynağıydı
- (−) "Tab'a inerken otomatik switch" feedback'i yok — ama bu zaten istenmeyen behavior'dı

**Alternatifler**:
- *D-026'yı korumak (down = navigate + setFocus)*: Reddedildi (konvansiyona aykırı + bug üretti)
- *Manuel window.addEventListener('keydown') ile bypass*: Reddedildi — norigin pattern'i zaten yeterli, raw event handler ekstra karmaşıklık
- *setTimeout(0) ile setFocus'u defer etmek*: Yarım çözüm — race condition'ı azaltır ama tam çözmez, ayrıca konvansiyon hatası yine ortada kalır

---

## D-028 — EPG Theater Grid: Mouse-Only Navigation (Time-Boxed Closure)

**Tarih**: 2026-05-17
**Statü**: Accepted (technical debt, kasıtlı kabul)

**Bağlam**: Faz 3 EPG sekmesi (Theater layout: 2D channel × time grid) implement edildi ama focus initialization sorunu çözülemedi. İki sprint (~10 saat) boyunca debug edildi:

- Robust `'epg-current-cell'` atama (live program yoksa fallback'le)
- Diagnostic logging (`useDebugFocus`)
- Norigin context, isFocusBoundary, FocusContext.Provider permutations
- setTimeout defer'leri

Hiçbiri kalıcı D-pad navigasyonunu garanti edemedi. Kök sebep büyük ihtimalle norigin'in spatial nav'ının 2D grid (channel × time) topology'sinde, özellikle sticky-left channel label + horizontal cell stream'in birleştiği layout'ta, focusable bounding box'ları doğru yorumlayamaması. Daha derin debug için norigin source code'una inmek veya custom 2D nav engine yazmak gerekirdi — ROI dengeleri Faz 3'ün diğer kazanımlarıyla karşılaştırıldığında pozitif değildi.

**Karar**: 
1. **EPG sekmesi mouse-only olarak ship edilir.** Magic Remote pointer ile gezinme + tıklama çalışır. D-pad ile gezinme çalışmaz.
2. **Açık görsel uyarı**: EPGScreen'in üst kısmına bilgilendirici şerit eklenir: *"Bu ekranda Magic Remote pointer kullanın · D-pad henüz desteklenmiyor"*. Bu sınırlamayı sessiz bug'dan açık bir design choice'a çevirir.
3. **Diagnostic kod (`useDebugFocus`, `console.log`'lar) kaldırılır** — sürekli console aktivitesi TV CPU'sunu titretiyor.
4. **EPG'nin iş değeri Pro Grid'deki Now/Next badge'leri üzerinden teslim ediliyor** — Theater grid ikincil. Bu değişiklik core EPG değerini etkilemez.
5. **Gelecek değerlendirme**: v1.0 sonrasında ya (a) norigin'i custom 2D nav engine'iyle değiştirmek, ya (b) Theater grid'i tek-eksen list view'ına simplifiye etmek, ya da (c) mouse-only kalıcılaştırmak — kullanıcı feedback'ine göre karar.

**Sonuçlar**:
- (+) Faz 3 kapanır, Faz 4'e (Xtream Codes + Multi-Source) geçilir
- (+) 10+ saatlik debug budget'i daha yüksek değerli işlere kayar
- (+) Kullanıcı sınırlamayı görür, "bozulmuş" hissi azalır
- (−) EPG sekmesi tam fonksiyonel değil — mouse mode gerektirir
- (−) Bu, eninde sonunda tekrar açılacak bir teknik borç (v1.x'te)

**Alternatifler**:
- *Daha derin debug*: Reddedildi (ROI düşük, ek zaman tahmini bilinmez)
- *Theater grid'i simple list'e indirgemek (1D nav)*: Faz 4'te zaman müsaitse opsiyon, şimdi değil
- *EPG sekmesini tamamen kaldırmak*: Reddedildi — Pro Grid'deki badge yetiyor ama dedicated EPG view'ın bilgi yoğunluğu farklı, mouse'la bile değerli
- *FocusContext.Provider + nested context ile yeniden yapı*: Denendi, sonuç değişmedi

**Öğrenilen ders**: Norigin gibi spatial nav library'leri 1D ve basit 2D senaryolarda yetkin; sticky/horizontal scroll + dinamik genişlikli grid kombinasyonunda kütüphanenin assumption'ları çökebilir. Faz 4+'da yeni 2D layout düşünülürse önce minimum prototip ile feasibility test edilmeli, sonra commit edilmeli.

---

## D-029 — Çoklu Aktif Kaynak (Multi-Active Sources)

**Tarih**: 2026-05-17
**Statü**: Accepted (Faz 4A öncesi)

**Bağlam**: Faz 4 ile birlikte M3U + Xtream Codes paralel kullanım mimarisi geliyor. Mimari soru: aynı anda **tek** bir kaynak mı aktif (Settings'ten geçiş), yoksa **birden fazla** kaynak aynı anda mı aktif (unified channel list)?

Tek-aktif daha basit ama yorucu UX — kullanıcı kaynak değiştirmek için Settings'e gitmek zorunda. Çoklu-aktif daha karmaşık ama natural — kullanıcı paid provider'ı + ücretsiz iptv-org TR'i aynı anda tek listede görür, ihtiyaç varsa sidebar'da kaynak filtresiyle daraltır.

Boss'un kullanım senaryosu: paid Xtream provider (asıl) + iptv-org TR (yedek/ek). Çoklu-aktif bu pattern'e doğal uyar.

**Karar**: 
1. **Çoklu aktif kaynak desteklenir.** Her kaynak `enabled: boolean` field'ı taşır; etkin olan tüm kaynakların kanalları unified bir listede merge edilir.
2. **Sidebar'da yeni filter dimension**: Mevcut kategori sidebar'ının altına "Kaynak" filtresi eklenir (Tümü / Source A / Source B). Aktif kaynak filtresi + kategori filtresi AND ile uygulanır.
3. **Source toggle UX'i Settings panelinde**: Her kaynağın yanında bir on/off toggle. Kapatılan kaynağın kanalları listede görünmez ama config saklanır (silmek için ayrı "Sil" butonu).
4. **Default'tan etkin**: Yeni eklenen kaynak default'ta `enabled: true`.

**Sonuçlar**:
- (+) Boss'un gerçek kullanım pattern'ine doğal uyar
- (+) Kullanıcı kaynak değiştirmek için extra navigation yapmaz
- (+) Source attribution gerekirse channel card'a küçük badge ile eklenebilir (Faz 4B/5'te polish)
- (−) Channel store implementation biraz daha kompleks — `visibleChannels` artık tüm aktif kaynakların unified projection'ı
- (−) Duplicate kanal riski: aynı channel'ın iki kaynakta da olması durumunda iki kez listelenir (Faz 5+'da dedupe; v1'de kabul)

**Alternatifler**:
- *Tek aktif kaynak (Settings'ten switch)*: Reddedildi (yorucu UX)
- *Otomatik dedupe by name*: Reddedildi (false positive riski, kanal isimleri stable değil)
- *Manual merge (user designates "primary")*: Reddedildi (v1 için fazla karmaşık)

---

## D-030 — Çoklu-Kaynak Kanal ID Şeması

**Tarih**: 2026-05-17
**Statü**: Accepted (Faz 4A öncesi)

**Bağlam**: Tek kaynak varsayımında kanal ID'leri `${index}` veya `${url-hash}` ile generate ediliyordu. Multi-source mimarisinde aynı index iki kaynakta da olur — ID çakışır. Persistent state'te (lastFocusedChannelId, lastWatchedChannelId, IDB indexler) bu çakışma kararsızlık yaratır.

**Karar**: Channel ID şeması `{sourceType}:{sourceId}:{sourceLocalId}` formatına dönüştürülür:
- M3U kanalları: `m3u:{sourceId}:{indexInSource}` (örn. `m3u:default-m3u-1:42`)
- Xtream kanalları: `xtream:{sourceId}:{streamId}` (örn. `xtream:provider-x-1:1023`)

`sourceId`: kullanıcı kaynak eklediğinde otomatik üretilir (`{type}-{uuid-short}` veya `{type}-{timestamp}`). Stabil tek kaynak için sürekli aynı, yeni eklenen kaynaklar için yeni ID. `sourceLocalId`: kaynağın kendi referansı (M3U'da array index'i, Xtream'de API'nin `stream_id`'si).

**IDB v2 → v3 Migration**: Mevcut kullanıcı verisi korunur:
1. `sources-meta`'dan eski M3U URL'i okunur
2. Yeni `sources` store'unda `id: 'default-m3u-1'`, `type: 'm3u'`, `config: { url: <eski URL> }`, `enabled: true`, `name: 'M3U Listesi'` ile bir Source kaydı oluşturulur
3. Mevcut `channels` store'undaki tüm kanalların ID'si yeni şemaya migrate edilir (`{sourceLocalIndex}` → `m3u:default-m3u-1:{sourceLocalIndex}`)
4. `lastFocusedChannelId` localStorage değeri varsa migrate edilir (eski ID'yi yeni şemaya çevir)

**Sonuçlar**:
- (+) Multi-source'ta ID çakışması yok
- (+) ID'den kaynağı parse edebilir (debug/log için)
- (+) Migration smooth — kullanıcı yeniden sync yapmak zorunda kalmaz
- (−) ID'ler daha uzun, IDB key size biraz artar (kabul edilebilir)
- (−) Eski log'larda görünen kısa ID'ler artık geçerli değil — debug'ta yenisini bilmek gerekir

**Alternatifler**:
- *Sadece source-prefix (örn. `m3u-{index}`)*: Yeni kaynak eklendiğinde aynı tip iki kaynak arası çakışma kalır. Reddedildi
- *UUID per channel (kaynak bilgisini ID'den ayırmak)*: Çakışma yok ama log/debug zor, source identification için ek lookup gerek. Reddedildi
- *Migration yapmayıp v3'te channels store'u sıfırlamak*: Reddedildi — kullanıcı kaybı, EPG cache eşleşmesi bozulur

---

## D-031 — Native-First Player Strategy (D-013 revize)

**Tarih**: 2026-05-18
**Statü**: Accepted (revises D-013 strategy ordering)

**Bağlam**: D-013'te Player Strategy Pattern tasarlanırken sıralama: `.m3u8` → HLS.js, `.ts` → mpegts.js, hiçbiri tutmazsa native `<video>` fallback. Bu sıralama browser-first düşüncesinin ürünüydü; webOS context'inde tam tersi optimal.

Faz 4A TV testlerinde gözlemlendi: paid Xtream provider'dan gelen pek çok kanal HLS.js MSE pipeline'ında `manifestParsingError` veya `Format not supported` ile reddediliyor. Aynı kanallar TiviMate'in webOS sürümünde (aynı Chromium sandbox'ı) sorunsuz oynuyor. Fark: TiviMate native `<video>` element'ini kullanıyor olmalı — webOS bu element'i TV donanım decoder'ına direkt bağlar (H.264, H.265/HEVC, AC-3, E-AC3, AAC dahil), manifest tolerance da donanım player'ın internal logic'ine bırakılır.

HLS.js + MSE pipeline'ı bu native path'ten daha kısıtlı:
- Tarayıcının kendi codec set'iyle sınırlı (H.265 sıklıkla yok, AC-3 yok)
- Manifest'in spec'e uygun olması bekleniyor (gevşek manifest'ler `manifestParsingError` veriyor)
- MSE segment buffering custom logic'i fragile

**Karar**: Player Strategy Pattern sıralaması revize edilir. Native `<video>` element artık **ilk** strateji:

1. **Native `<video>` (ilk)**: URL doğrudan `video.src`'e atanır. Browser/TV native HLS desteği varsa (`canPlayType('application/vnd.apple.mpegurl') !== ''`) HLS de bu yolla. `.ts` için TV donanım decoder'ı raw MPEG-TS de işliyorsa yine bu yolla.
2. **HLS.js (fallback, sadece `.m3u8`)**: Native başarısızsa HLS-spesifik manifest parsing devreye girer.
3. **mpegts.js (fallback, sadece `.ts`)**: Native raw MPEG-TS'yi handle edemezse devreye girer.

8 saniye playback timeout her stratejide korunur. Strateji bazlı timeout: hızlı hata (404, network) ≤1s'de gelir; sadece "decode edemiyorum" durumunda timeout'a kadar bekler. URL fallback chain (Patch 2'den) ile birleştiğinde maks 4 URL × 3 strateji = 12 kombinasyon; pratikte ilk URL'in ilk stratejisi tutar veya hızlı fail eder.

**Sonuçlar**:
- (+) Native decoder'ın codec yelpazesi tarayıcı MSE'sinden çok geniş — H.265/AC-3 vb. kanallar çalışmaya başlar
- (+) Manifest tolerance donanıma devredilir — gevşek/bozuk manifest'leri yutar
- (+) MSE buffering custom logic'i devre dışı → daha az failure mode
- (+) D-pad navigation pipeline'a dokunmaz (mevcut focus mimarisi korunur)
- (−) Native başarısızsa fallback'e geçmek için 8 saniye timeout maliyeti; ama bu sadece "decode edilemiyor" durumlarında, %1-5 vaka
- (−) HLS.js'in advanced features (adaptive bitrate switching, custom subtitle, manifest variant selection) native'de yok; ileride EME/DRM gerekirse HLS.js'e geri dönmek gerekebilir (v2)

**Alternatifler**:
- *webOS Luna Media Service (`luna://com.webos.media`) direkt çağrı*: Daha düşük seviye, "discouraged" ama mümkün. Daha karmaşık implementation, gerçek kazancı belirsiz. v1.x'te düşünülebilir
- *Sadece HLS.js'in HLS.js v2 latest features ile config tuning*: Native'in codec yelpazesini sağlayamaz
- *Shaka Player'a geçiş*: HLS.js'ten daha lenient ama hâlâ browser MSE'sine bağlı, codec gap'i kapatmaz

---

## D-032 — Focus State Tek Kaynaktan Yönetim Prensibi

**Tarih**: 2026-05-18
**Statü**: Accepted (Faz 4A patch zincirinden öğrenildi)

**Bağlam**: Faz 4A boyunca 5 patch sürdü, çoğu focus management cascade'leriyle uğraştı. Patch 4 mount-time focus initialization eklendi; Patch 5 sidebar onArrowPress eklendi; iki katman birbirine müdahale etti çünkü Patch 4'ün useEffect'i `visibleChannels` değişiminde tekrar tetiklenip sidebar focus'unu force-overrode ediyordu.

Kök öğrenme: **focus state'in birden fazla kaynaktan kontrol edildiği yerde "kim ne zaman setFocus eder" politikası net olmalı**.

**Karar**: ZUI IPTV Player'da setFocus çağrı yetkisi şu üç kaynağa sınırlıdır:

1. **Mount-time initialization** (bir kez, `useEffect(..., [])` veya equivalent guard'lı): Her major screen mount'unda kendi initial focus'unu set eder. Re-trigger etmez.
2. **User interaction** (norigin doğal flow): Kullanıcı D-pad veya mouse ile focus hareket ettirir. setFocus explicit çağrılmaz, norigin'in onArrowPress callback'i içinde target değiştirilir.
3. **Programmatic transitions** (screen değişimi, modal kapanış): Yeni mount eden component kendi initial focus'unu set eder; çağıran component dışarıdan setFocus etmez.

**Yasak pattern'ler**:
- Reactive useEffect'in dependency'ye bağlı setFocus çağırması (visibleChannels gibi sık değişen state)
- Birden fazla component'in aynı focus target için yarışması
- Sidebar `onFocus` gibi callback'lerin focus state'i değil sadece data state'i değiştirmesi (focus norigin'e bırakılır)

**Sonuçlar**:
- (+) Focus cascade'leri kaynaktan engellenir
- (+) Debug çok kolaylaşır — focus değişiminin tek aktörü vardır
- (+) Norigin'in default heuristic'i ile barışık çalışır
- (−) "Bu durumda hemen şu element'e focus'lansın" tarzı reactive senaryolar için açık iletişim gerek

Bu prensip Faz 4B'den itibaren geriye dönük tüm focus kodu için referans alınır.

---

## D-033 — ChannelList Initial Focus: `initialFocusDone` Ref Pattern

**Tarih**: 2026-05-18
**Statü**: Accepted (Faz 4A closure)

**Bağlam**: D-021'de "initial focus + lastFocusedChannelId restore" pattern'i tanımlanmıştı. Faz 4A patch zincirinde bu pattern'in `useEffect` dependency'leri (channelsLength, firstChannelId, lastFocusedChannelId) yüzünden tekrar tetiklendiğini ve sidebar onFocus cascade'inin bunu suistimal ettiğini gördük (D-032 referans).

Boss tarafından geliştirilen kalıcı çözüm: `useRef(false)` ile bir "initialFocusDone" kilidi. useEffect bağımlılıkları aynı kalır ama callback başında `if (initialFocusDone.current) return` guard'ı tek bir başarılı initial focus'a izin verir. Component unmount + remount (Player'dan dönüş) ref'i sıfırlar, yeni mount'ta tekrar çalışır — istenen davranış.

**Karar**: ChannelList ve benzeri "primary mount focus" gereken her screen şu pattern'i kullanır:

```typescript
const initialFocusDone = useRef(false);

useEffect(() => {
  if (initialFocusDone.current) return;
  
  const timeoutId = setTimeout(() => {
    // Öncelik sırası:
    // 1. lastFocusedChannelId (Player'dan dönüş için, D-021)
    // 2. firstChannelId (default başlangıç)
    // 3. sidebar-all (channels yoksa son çare)
    
    const candidates: string[] = [];
    if (lastFocusedChannelId?.includes(':') && exists) candidates.push(`channel-${lastFocusedChannelId}`);
    if (firstChannelId) candidates.push(`channel-${firstChannelId}`);
    candidates.push('sidebar-all');
    
    setFocus(candidates[0]);
    initialFocusDone.current = true;
  }, 150);
  
  return () => clearTimeout(timeoutId);
}, [channelsLength, firstChannelId, lastFocusedChannelId]);
```

**Sonuçlar**:
- (+) D-032 prensibi korunur (reactive setFocus cascade'i engellendi)
- (+) Mount-remount akışı doğru çalışır (Player→BACK→ChannelList son kanala dönüş)
- (+) Pattern Faz 4B'de Search screen, Faz 5'te yeni screen'lerde tekrar edilir
- (−) Boilerplate var; ileride higher-order hook (`useInitialFocus`) içine alınabilir

---

## D-034 — Faz 4A Codec Gap: Kabul Edilen Teknik Borç

**Tarih**: 2026-05-18
**Statü**: Accepted (technical debt, kasıtlı kabul)

**Bağlam**: Faz 4A test sonuçları (40 TR kanalı, paid Xtream provider, LG NANO81 webOS 6.x):
- 27/40 (%67.5) kanal native HTML5 `<video>` ile çalıştı (D-031 patch)
- 13/40 (%32.5) tüm fallback chain'i (native + hls.js + mpegts.js × 4 URL pattern = 12 deneme) tüketip `SRC_NOT_SUPPORTED(4)` veya `manifestParsingError` ile başarısız oldu

Başarısız kanallar büyük ihtimalle HEVC/H.265 (NANO81 destekler ama belirli profil/bit-depth kombinasyonlarında sorun olabilir) veya AC-3/E-AC3 audio kullanıyor. webOS browser context bu codec'lere `<video>` üzerinden ulaşamayabilir.

**Karar**: %67.5 success rate v1 için kabul edilebilir; %32.5 codec gap'i resmen teknik borç olarak kaydedilir.

İleride değerlendirilecek opsiyonlar (v1.x veya v2):
- **webOS Luna Media Service (`luna://com.webos.media`) direkt entegrasyon**: Native `<video>`'dan daha düşük seviye, codec hint'leri ve donanım decoder seçimi explicit. Tahminim: gap'in %5-10 daha kapanır.
- **AVPlay API (eski webOS'larda)**: NANO81 webOS 6.x'te mevcut olabilir; benzer seviye Luna alternatifi.
- **Provider-side codec downgrade isteği**: Bazı provider'lar API'de `&output=ts` veya `&codec=h264` parametresi destekler. v1.x'te araştırılır.

Şimdilik gap kullanıcıya error overlay ile şeffaf gösteriliyor (Patch 2 + 6).

---

## D-035 — Xtream Catalog Filtering: Faz 4B'ye Devredildi

**Tarih**: 2026-05-18
**Statü**: Deferred (Faz 4B'de ele alınacak)

**Bağlam**: Xtream API `get_live_streams` provider catalog'unun tamamını döner; kullanıcının abonelik paketi catalog'ta hangi kanallara erişebileceğini metadata olarak veriyor olabilir ama biz şu an okumuyoruz. TiviMate aynı provider + aynı Xtream credentials ile sadece kullanıcının paketindeki kanalları gösteriyor — başka bir filtre mekanizması kullanıyor.

**Karar**: Faz 4B'de üç olası filtre yaklaşımı araştırılır:
1. **`user_info.bouquets` field'ı**: Provider response'da bouquet (kanal grubu) erişim listesi varsa kullanılır
2. **Category prefix filter**: Kullanıcı Settings'te "Sadece TR* kategoriler" toggle'ı seçer; manuel ama deterministik
3. **Stream probe (background)**: Her stream HEAD/OPTIONS request ile test edilir, 401/403 dönenler filtrelenir; pahalı

İlk denenecek olan #1; provider destekliyorsa sıfır maliyet. Aksi durumda #2 fallback. #3 sadece kullanıcı opt-in ile.

Faz 4A'da workaround: kullanıcı manuel olarak yabancı kanallara tıklamamayı bilmesi.

---

## D-036 — Cloud Sync: Supabase RLS Threat Model + Playlists Policy Join Fix

**Tarih**: 2026-05-23
**Statü**: Accepted

> **2026-09-20 yeniden değerlendirme:** Aşağıdaki v1.0 risk kabulü güncel sürüm
> kararı değildir. Kısa deterministik cihaz anahtarı, üçüncü taraf QR servisine
> credential taşıyan URL ve bulutta düz metin Xtream bilgileri nedeniyle risk
> yeniden açılmıştır. Kamuya açık güncel durum: `docs/SECURITY_STATUS.md`.

**Bağlam**: Repo public olduktan sonra Claude Opus 4.7 güvenlik analizi yapıldı. Üç madde tespit edildi; biri kritik (history'de key), biri design hatası (policy), biri kabul edilebilir risk (key derivation). Kararlar burada belgeleniyor.

---

### 1. Git History — Hardcoded Credential (Kapatıldı)

`git log -S <key> --oneline` ile kontrol edildi. Supabase anon key veya secret hiçbir commit'e girmemiş. `.gitignore`'daki `.env.local` ve `.env` kuralları bu riski başından önlemişti. **Aksiyon gerekmez.**

---

### 2. Device Key Derivation — Deterministik Hash Riski (Kabul Edildi, v1.1'e Ertelendi)

**Mevcut durum**: `deviceIdentity.ts`'de `key = djb2(serialNumber, 0xbeefdead)` kullanılıyor. Algoritma public repo'da görünür. Serial numarasını bilen biri `shortId` + `key` çiftini hesaplayabilir.

**Saldırı zinciri**: serial → hesaplanan key → Supabase'e doğru header → `playlists` tablosunda `xtream_username` / `xtream_password` okunabilir.

**Neden kabul edilebilir (self-host model)**:
- Supabase instance kullanıcının kendi kontrolünde — free-tier kotası haricinde veri dışarı sızmaz
- Saldırganın hem serial numarasını (fiziksel erişim/sticker) hem Supabase URL+anon key'i bilmesi gerekir
- Anon key zaten "public-by-design" — ama URL+key+serial üçlüsünü aynı anda bilmek pratik değil

**v1.1 Fix Planı**: `resolveDeviceIdentity()` içinde serial-hash'e ek olarak `crypto.getRandomValues` ile üretilmiş 16-byte salt localStorage'a persist edilecek. Key = `djb2(serial + salt, seed)`. Saf deterministik bağımlılık kırılacak.

---

### 3. Playlists RLS Policy — device_key Column vs JOIN (Düzeltildi)

**Sorun**: `playlists.device_key` kolonu her satıra INSERT sırasında echo'lanıyordu ve SELECT/UPDATE/DELETE policy'leri bu stored değeri kullanıyordu. TV'nin key'i rotate etmesi halinde (serial değişimi, yeniden kurulum) `devices.device_key` güncellenir ama eski `playlists.device_key` değerleri değişmez → SELECT policy eşleşmez → satırlar "kaybolur".

**Karar**: Tüm playlists policy'leri `EXISTS (SELECT 1 FROM devices WHERE device_id = ... AND device_key = ...)` JOIN yaklaşımına geçirildi. `playlists.device_key` kolonu nullable yapıldı (geriye dönük uyumluluk için tutuldu, auth'ta kullanılmıyor).

**Sonuç**: Key rotation → `devices.device_key` UPDATE → tüm eski playlist satırları otomatik erişilebilir kalır.

**Migration**: `docs/cloud-sync/migration_v1.1.sql` (v1.0 schema'sı çalıştırılmış installs için).

---

### Threat Model Özeti (v1.0)

| Vektör | Gereksinim | Etki | Değerlendirme |
|--------|-----------|------|---------------|
| Anon key leak | Public repo'da key | Kota tükenmesi (RLS veri vermez) | **Düşük** — anon key by-design public |
| Serial + anon key | Fiziksel erişim + key | Xtream credentials okunabilir | **Orta** — v1.1'de fix |
| Policy bypass | — | İmkânsız | **Yok** — RLS server-side enforce |
| History leak | Commit geçmişi | — | **Yok** — history temiz |

---

## D-037 — İçeriğe Bağlı MKV Seek Uyumluluğu

**Tarih**: 2026-09-20
**Statü**: Accepted technical debt; remux A/B testi açık

**Bağlam**: Gerçek TV'de test edilen 10 VOD/seri içeriğinin 9'unda timeline ve
±10 saniye seek çalıştı. Tek başarısız örnekte uygulamanın `currentTime` komutu
önce kabul edildi, ardından oynatma eski decoder konumuna döndü. Çalışan ve
çalışmayan örnekler aynı sunucuda MKV ve HTTP 206 byte-range desteğine sahipti.

Container incelemesinde çalışan dosyanın başlangıç `SeekHead` bölümünde `Cues`
işaretçisi bulundu. Başarısız dosyada `Cues` mevcut olmasına rağmen işaretçisi
yalnız dosyanın sonundaki `SeekHead` bölümündeydi.

**Karar**:

- Genel player/seek motoru korunur.
- MKV uzantısına bakılarak seek global olarak kapatılmaz.
- Başlangıç `SeekHead` yerleşimi kök neden için güçlü hipotezdir, fakat aynı
  dosyanın remux A/B testi tamamlanmadan kesin neden olarak sunulmaz.
- Büyük medya transferi, remux veya test sunucusu ayrıca onay gerektirir.
- Kullanıcıya açık sınırlar `docs/KNOWN_ISSUES.md` içinde tutulur.

---

## D-038 — Temiz Kurulumda webOS CLI 3.2.5 Sabitlemesi

**Tarih**: 2026-09-20
**Statü**: Accepted

**Bağlam**: LG'nin güncel kurulum sayfası Node.js `14.15.1–16.20.2` aralığını
önerirken pinsiz NPM kurulumu `@webos-tools/cli@3.2.6` sürümünü çekti. NPM
metadata'sında `3.2.6` için `engines.node >=20.0.0` tanımlı olduğundan temiz
Windows 11 VM'de Node 16.20.2 ile `EBADENGINE` oluştu. CLI komutlarının dosya
olarak kurulması bu kombinasyonu desteklenen hale getirmedi.

NPM metadata karşılaştırması:

- `3.2.3`, `3.2.4`, `3.2.5`: Node `>=14.15.1`
- `3.2.6`: Node `>=20.0.0`

**Karar**:

- Hazır IPK son kullanıcı akışı Node `16.20.2` ve CLI `3.2.5`e sabitlenir.
- Kurulumdan önce NPM `dist.integrity` ve `engines.node` alanları doğrulanır.
- `EBADENGINE` görülen kurulum kabul edilmez.
- Kaynak build için Node 24 / paketleme için Node 16 ayrımı korunur.
