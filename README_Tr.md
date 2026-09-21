# ZUI IPTV Player

LG webOS TV için IPTV oynatıcısı. Gerçek TV kabul testleri LG 55NANO81T6A
(SDK 10.3.1, firmware 33.31.61) üzerinde yapılmıştır. Eski webOS sürümleri henüz
doğrulanmış destek matrisinde değildir; webOS 4.5 siyah ekran bildirimi açıktır.

---

## Kurulum

Windows 11 için güncel, adım adım kurulum ve SSH key sorun giderme kılavuzu:
[`docs/SIDELOAD.md`](docs/SIDELOAD.md)

Dağıtımdan önce [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) ve
[`docs/SECURITY_STATUS.md`](docs/SECURITY_STATUS.md) belgelerini de inceleyin.

### Hazır IPK kuracak kullanıcı

Hazır `com.zui.player_1.0.1_all.ipk` kullanıyorsanız kaynak kodu, Git, NVM ve
proje bağımlılıkları gerekmez. Seçtiğiniz webOS CLI sürümünün desteklediği tek
bir Node sürümü yeterlidir. Güncel CLI 3.2.6 Node 24 ile test edilmiştir;
Node 16.20.2/CLI 3.2.5 ise bu proje için daha önce doğrulanmış eski paketleme
eşleşmesidir.

İsteğe bağlı Windows yardımcıları:
[`scripts/windows-setup/README.md`](scripts/windows-setup/README.md).

### Kaynak kodundan derleyecek geliştirici

### Önkoşullar

- NVM for Windows
- Node 16.20.2 (webOS CLI için) ve Node 24 (build için), ikisi de NVM ile

### İlk Kurulum (bir kerelik)

```powershell
# Node sürümlerini kur
nvm install 16.20.2
nvm install 24

# webOS CLI'yı GLOBAL olarak kur (Node 16 ile)
nvm use 16.20.2
npm install -g @webos-tools/cli@3.2.5

# Repo bağımlılıkları (build için Node 24)
nvm use 24
npm install
```

### TV Bağlantısı (bir kerelik)

1. TV'de **Developer Mode** uygulamasını aç (LG Content Store'dan kurulur)
2. Dev Mode'u aktif et, **IP adresini** not al ve **Key Server**'ı aç
3. Bilgisayarda CLI ile cihazı tanımla:

```powershell
nvm use 16.20.2
ares-setup-device
```

Etkileşimli sihirbazda:
- Device name: `tv`
- Host: TV IP'si
- Port: `9922`
- SSH user: `prisoner`
- Password: boş bırakılır; güncel Developer Mode CLI akışında bu adımda parola gerekmez

4. SSH özel anahtarını indir:

```powershell
ares-novacom --device tv --getkey
# Passphrase isteyecek (yine Dev Mode uygulamasından)
```

Anahtar CLI'nin cihaz kaydında belirttiği özel anahtar adıyla kullanıcı `.ssh`
dizinine kaydedilir. Dosya adı kurulumdan kuruluma değişebileceği için sabit bir
ada güvenmeyin.

5. Bağlantıyı doğrula:

```powershell
ares-device --system-info --device tv
```

Çıktıda TV'nin `modelName`, `productName`, `sdkVersion` gibi alanlar görünmeli.

---

## Geliştirme

```powershell
nvm use 24
npm run dev               # Tarayıcıda localhost:5173
```

---

## TV'ye Deploy

```powershell
.\scripts\deploy.ps1      # Build (Node 24) + Yükleme (Node 16) hibrit pipeline
```

PowerShell betik çalıştırma politikası engellerse makine/kullanıcı politikasını
kalıcı değiştirmek yerine yalnız bu süreç için
`powershell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1` kullanılabilir.

Ya da adım adım:

```powershell
nvm use 24
npm run build
nvm use 16.20.2
npm run package
npm run install:tv
npm run launch
```

---

## Komutlar

| Komut | Node | Açıklama |
|---|---|---|
| `npm run dev` | 24 | Vite geliştirme sunucusu (tarayıcı önizlemesi) |
| `npm run build` | 24 | Üretim build'i → `dist/` |
| `npm run package` | **16** | IPK paketi → `dist-ipk/com.zui.player_1.0.1_all.ipk` |
| `npm run install:tv` | **16** | IPK'yı TV'ye yükle |
| `npm run launch` | **16** | TV'de uygulamayı başlat |
| `npm run inspect` | **16** | Uzaktan DevTools'u aç |
| `.\scripts\deploy.ps1` | otomatik | Tüm adımları sırayla çalıştır |

---

## Sürüm Kabul Özeti

- [x] Node 24 ile TypeScript + Vite build başarılı
- [x] Node 16.20.2 ile `com.zui.player_1.0.1_all.ipk` üretildi
- [x] Temiz Windows 11 ortamında SSH key alma ve kimlik doğrulama akışı doğrulandı
- [x] Sabit aday IPK gerçek TV'ye temiz kuruldu ve `com.zui.player` olarak başlatıldı
- [x] Canlı TV, Filmler ve Diziler D-pad/BACK kabul dizileri tekrarlandı
- [x] Açık bilinen sorunlar sürüm notlarında belirtildi

---

## Simülatör Test Notları

LG webOS Simülatörü'nde kumanda test ederken:

- Sağdaki sanal uzaktan kumanda panelinde **"Touch" düğmesi aktif olmamalı** — aktifken işaretçi moduna girer ve D-pad devre dışı kalır.
- D-pad (ok tuşları) simülatörde gerçek TV'den biraz farklı zamanlama ile tetiklenir; debounce ayarları simülatörde daha kısa hissedebilir (200 ms normaldir).
- **Asıl test her zaman gerçek TV'de yapılmalı**; simülatör yedek ortamdır.

Odak sorunları için:

- `src/main.tsx`'te `visualDebug: true` yap → odağın nerede olduğu ekranda görünür.
- Tarayıcı konsolunda `keydown` olaylarını gözlemle: simülatör keycode'ları gerçek TV ile farklıysa belli olur.

> `visualDebug`'ı test bitince **`false`'a çevir** — commit edilmesin.

---

## Cloud Sync durumu (1.0.1)

Cloud Sync, güvenli eşleştirme ve kimlik bilgisi aktarımı tamamlanana kadar
**1.0.1 genel dağıtımında devre dışıdır**. Eski yöntem kısa ve deterministik bir
cihaz anahtarı kullanıyor, M3U/Xtream bilgilerini düz metin taşıyabiliyor ve QR
üretiminde üçüncü taraf bir servise veri gönderiyordu. Bu nedenle yalnız arayüz
gizlenmedi:

- Onboarding ve Ayarlar ekranlarındaki Cloud Sync girişleri kaldırıldı.
- Uygulama başlangıcındaki Supabase dinleyicisi kaldırıldı.
- İstemci ve yapılandırma katmanları sabit sürüm bayrağıyla bağlantıyı reddeder.
- Eski yerel ayarlar korunur ancak çalıştırılmaz; kullanıcı verisi silinmez.
- `.env.local` veya `VITE_SUPABASE_*` değerleri özelliği yeniden açamaz.

Anasayfadaki `M3U · Xtream · Cloud` alt yazısında kalan “Cloud” sözcüğü yalnız
kozmetik bir etikettir; özelliği etkinleştirmez.

M3U URL ve Xtream Codes doğrudan girişi çalışmaya devam eder. Gelecekteki bir
sürüm için yeni, sunucu tarafından yetkilendirilen bir eşleştirme ve kimlik
bilgisi aktarım tasarımı gerekir. Kamuya açık durum özeti
[`docs/SECURITY_STATUS.md`](docs/SECURITY_STATUS.md) belgesindedir. Cloud Sync
v2 ayrı ve onaya bağlı bir sonraki görevdir.

---

## Notlar

- Dev Mode oturumu sınırlıdır. TV'deki **Remain Session** değerini izleyin ve
  süre dolmadan **EXTEND** kullanın; sabit saat değeri varsaymayın.
- `dist-ipk/` klasörü `.gitignore`'da; IPK'lar commit edilmez.
- Bu checkout'un yeniden üretilmiş paketleme zinciri CLI 3.2.5/Node 16.20.2'dir;
  güncel CLI 3.2.6 ise Node 24 ile test edilmiştir. Build toolchain Node 24 kullanır.
