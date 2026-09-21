# ZUI IPTV Player 1.0.1

## English

### Highlights

- Fixed D-pad focus restoration across Live TV, Movies and Series screens.
- Fixed category lists skipping items during UP/DOWN navigation.
- Preserved the selected channel/category when returning from full-screen Live TV.
- Restored movie, series and episode focus after leaving the player or episode browser.
- Added remote-friendly season, episode, previous/next episode and playback controls.
- Fixed timeline and ±10-second seeking for compatible VOD sources.
- Added reusable Windows setup, TV connection and source-verification helpers.

### Security posture

Cloud Sync is unavailable in 1.0.1 while its pairing and credential-transfer
design is being replaced. Direct M3U and Xtream entry continue to work. The
word “Cloud” remains in a non-interactive Home subtitle; this is cosmetic and
does not enable the feature.

### Known limitations

- One of ten tested VOD/series samples did not retain a seek target. The issue
  appears content/container dependent; the application does not disable seek
  globally for MKV files.
- webOS 4.5 has an open black-screen report and is not in the verified release
  acceptance matrix.
- Uninstalling the application for a clean install removes its local webOS app
  data. Back up or be prepared to re-enter local playlists, favorites, history,
  continue-watching data and settings.

### Verified release candidate

- Application: `com.zui.player`
- Version: `1.0.1`
- Asset: `com.zui.player_1.0.1_all.ipk`
- SHA-256: `17BEB2254C1B984DC3C4BE098E5C024ADE11DCFF532BED78C4E5D23DBEB8F5E7`

## Türkçe

### Öne çıkanlar

- Canlı TV, Filmler ve Diziler ekranlarında D-pad odak geri yükleme düzeltildi.
- Kategori listelerinin UP/DOWN sırasında satır atlaması giderildi.
- Tam ekran Canlı TV'den dönüşte seçili kanal ve kategori korunur.
- Oynatıcıdan veya bölüm penceresinden dönüşte film, dizi ve bölüm odağı geri gelir.
- Sezon, bölüm, önceki/sonraki bölüm ve oynatma kontrolleri kumandaya uygun hâle getirildi.
- Uyumlu VOD kaynaklarında timeline ve ±10 saniye seek düzeltildi.
- Yeniden kullanılabilir Windows kurulum, TV bağlantı ve kaynak doğrulama yardımcıları eklendi.

### Güvenlik durumu

Cloud Sync, eşleştirme ve kimlik bilgisi aktarım tasarımı yenilenene kadar 1.0.1
sürümünde kullanılamaz. Doğrudan M3U ve Xtream girişi çalışmaya devam eder.
Anasayfadaki etkileşimsiz alt yazıda “Cloud” sözcüğü kozmetik olarak kalmıştır;
özelliği etkinleştirmez.

### Bilinen sınırlar

- Test edilen on VOD/dizi örneğinin birinde seek hedefi korunmadı. Sorun içerik/
  container yapısına bağlı görünür; uygulama bütün MKV dosyalarında seek'i kapatmaz.
- webOS 4.5 için açık bir siyah ekran bildirimi vardır ve bu sürüm doğrulanmış
  kabul matrisinde değildir.
- Temiz kurulum için uygulamanın kaldırılması yerel webOS uygulama verilerini
  siler. Yerel oynatma listeleri, favoriler, geçmiş, devam bilgileri ve ayarları
  yedekleyin veya yeniden girmeye hazır olun.

### Doğrulanmış yayın adayı

- Uygulama: `com.zui.player`
- Sürüm: `1.0.1`
- Dosya: `com.zui.player_1.0.1_all.ipk`
- SHA-256: `17BEB2254C1B984DC3C4BE098E5C024ADE11DCFF532BED78C4E5D23DBEB8F5E7`
