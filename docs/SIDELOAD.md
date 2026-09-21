# ZUI IPTV Player — Windows 11 Kurulum Kılavuzu

Bu kılavuz LG Developer Mode kullanarak `com.zui.player` uygulamasını geçici
olarak TV'ye yükler. Developer Mode kurulumu kalıcı değildir. TV'deki Developer
Mode uygulamasında görünen kalan süre dolmadan **EXTEND** kullanılmalıdır.
LG güncel belgelerinde sabit bir saat değeri verilmediği için bu kılavuz 50 veya
1000 saat gibi bir süre vaat etmez.

Resmî kaynaklar:

- [LG Developer Mode uygulaması](https://webostv.developer.lge.com/develop/getting-started/developer-mode-app)
- [webOS CLI kurulumu](https://webostv.developer.lge.com/develop/tools/cli-installation)
- [webOS CLI geliştirici kılavuzu](https://webostv.developer.lge.com/develop/tools/cli-dev-guide)

## 1. Hangi kurulum yolunu kullanmalısınız?

### A. Hazır IPK dosyasını kuracak kullanıcı

Kaynak kodunu derlemeyecekseniz Git, NVM, iki ayrı Node sürümü ve proje
bağımlılıkları gerekmez. Gerekenler:

- 64-bit Windows 10 veya Windows 11
- Seçilen webOS CLI ile uyumlu tek bir Node.js sürümü
- Güncel `@webos-tools/cli` veya yeniden üretilmiş eski eşleşme
- Yayın sayfasından alınmış güvenilir `com.zui.player_1.0.1_all.ipk`
- Aynı yerel ağda PC ve LG TV

### B. Kaynak kodundan derleyecek geliştirici

İki Node sürümü gerekir:

- Node 24: TypeScript ve Vite build
- Node `16.20.2`: webOS CLI ile paketleme, TV kurulumu ve başlatma

NVM for Windows kullanılması önerilir. `scripts/deploy.ps1` bu geçişleri yapar
ve işlem sonunda Node 16.20.2 aktif kalabilir.

Windows'ta isteğe bağlı iki güvenli yardımcı akış için
[`scripts/windows-setup/README.md`](../scripts/windows-setup/README.md) belgesine
bakın. Manuel adımlar aşağıda korunmuştur.

## 2. TV ve webOS sürümünü kontrol edin

TV'de **Ayarlar → Genel → TV Bilgileri** ekranından model ve webOS TV sürümünü
not edin. Menü yolu platforma göre değişebilir.

Bu projenin doğrulanmış cihazı:

| Alan | Doğrulanan değer |
|---|---|
| Model | LG 55NANO81T6A |
| SDK | 10.3.1 |
| Firmware | 33.31.61 |

Daha eski webOS sürümleri henüz kabul matrisinden geçmedi. webOS 4.5 için siyah
ekran bildirimi açıktır; bu sürüm doğrulanmış kabul edilmemelidir.

## 3. Developer Mode'u hazırlayın

1. TV'yi ağa bağlayın.
2. LG Apps/Content Store'dan **Developer Mode** uygulamasını kurun.
3. LG Developer hesabınızla oturum açın.
4. **Dev Mode Status** seçeneğini açın. TV yeniden başlar.
5. Developer Mode uygulamasını yeniden açın.
6. Ekranda görünen TV IP adresini not edin.
7. **Key Server** seçeneğini açın.
8. Ekrandaki 6 karakterli, büyük/küçük harfe duyarlı passphrase'i yalnızca
   aşağıdaki `ares-novacom` isteminde kullanın.

Passphrase'i, SSH özel anahtarını veya IPTV hesap bilgilerini kimseyle paylaşmayın.

## 4. webOS CLI'yi Windows'a kurun

Güncel kurulum için Node 24 etkin olmalıdır:

```powershell
nvm use 24
node -v
npm install -g @webos-tools/cli@3.2.6
ares -V
```

Beklenen kontroller:

- `node -v` çıktısı güncel CLI'nin desteklediği Node sürümünü göstermeli; CLI
  3.2.6 Node 24 ile test edilmiştir ve paket motoru Node `>=20` ister.
- `ares -V` kurulu CLI sürümünü göstermeli.
- Bu projenin eski, yeniden üretilmiş paketleme eşleşmesi Node 16.20.2 ve CLI
  3.2.5'tir. Bunu kullanmanız gerekiyorsa `nvm use 16.20.2` ardından
  `npm install -g @webos-tools/cli@3.2.5` çalıştırın. Güncel ve eski zinciri
  aynı global Node ortamında karıştırmayın.

`ares` tanınmıyorsa terminali kapatıp yeniden açın ve NVM'nin aktif Node
dizininin `PATH` içinde olduğunu kontrol edin. Rastgele başka `ares-cli`
paketleri kurmayın; LG TV için paket adı `@webos-tools/cli` olmalıdır.

## 5. TV'yi CLI'ye `tv` adıyla ekleyin

```powershell
ares-setup-device
```

Etkileşimli ekranda **add** seçin ve şu değerleri kullanın:

| Alan | Değer |
|---|---|
| Device Name | `tv` |
| Device IP | Developer Mode ekranındaki güncel IP |
| Port | `9922` |
| SSH user | `prisoner` |
| Description | İsteğe bağlı |
| Default | İsteğe bağlı; komutlarda yine `-d tv` kullanılacak |

LG'nin güncel CLI akışında bu aşamada parola girilmez. Kaydı kontrol edin:

```powershell
ares-setup-device --list
```

Listede `prisoner@TV_IP:9922` ve cihaz adı `tv` görünmelidir.

## 6. SSH anahtarını alın

TV'de Developer Mode uygulaması açık ve **Key Server ON** iken:

```powershell
ares-novacom --device tv --getkey
```

`input passphrase:` isteminde TV'deki 6 karakterli kodu aynen girin. Yazdığınız
karakterlerin terminalde görünmemesi normaldir. Başarılı işlemden sonra CLI,
cihaz kaydında kullanılacak özel anahtarı Windows kullanıcı profilinizin `.ssh`
dizininde tutar. Anahtar dosyasını destek talebine eklemeyin.

Bağlantıyı doğrulayın:

```powershell
ares-device --system-info --device tv
```

Başarı halinde `modelName`, `sdkVersion`, `firmwareVersion` ve `boardType` gibi
alanlar görünür. Bu komut başarılı olmadan IPK kurulumuna geçmeyin.

## 7A. Hazır IPK'yi kurun

PowerShell'de IPK'nin bulunduğu klasöre geçin:

```powershell
ares-install -d tv .\com.zui.player_1.0.1_all.ipk
ares-launch -d tv com.zui.player
```

Kurulumu ayrıca doğrulayabilirsiniz:

```powershell
ares-install -l -d tv
```

Listede `com.zui.player` görünmeli ve uygulama TV'de açılmalıdır.

## 7B. Kaynak kodundan build, paketleme ve kurulum

Repo kökünde:

```powershell
nvm use 24
node -v
npm ci
npm run build

nvm use 16.20.2
ares-package dist -o dist-ipk
ares-install -d tv .\dist-ipk\com.zui.player_1.0.1_all.ipk
ares-launch -d tv com.zui.player
```

Beklenen çıktılar:

- Build: `dist/` içinde `index.html`, `appinfo.json`, `icon.png` ve
  `largeIcon.png` bulunur.
- Paket: `dist-ipk/com.zui.player_1.0.1_all.ipk` oluşur.
- Kurulum: `ares-install` başarı sonucu verir ve uygulama listesinde
  `com.zui.player` görünür.
- Başlatma: ZUI ana ekranı TV'de açılır.

Otomatik zincir:

```powershell
.\scripts\deploy.ps1
```

Bu betik TV'ye yazdığı için yalnız doğru `tv` cihaz kaydı kontrol edildikten ve
mevcut TV verileri için uygun yedek politikası belirlendikten sonra çalıştırılmalıdır.

## 8. Geliştirme sunucusu

```powershell
nvm use 24
npm run dev
```

Vite varsayılan olarak `http://localhost:5173` adresini kullanır. Port doluysa
Vite başka bir port seçebilir; terminalde yazan adres esastır. Tarayıcı önizlemesi
gerçek TV video ve kumanda kabulünün yerine geçmez.

## 9. SSH ve kurulum sorun giderme

### TV'ye erişilemiyor

Kontroller:

```powershell
Test-Connection TV_IP -Count 2
Test-NetConnection TV_IP -Port 9922
ares-setup-device --list
```

- PC ve TV'nin aynı yerel ağda olduğunu kontrol edin.
- TV IP'sinin Developer Mode ekranındaki güncel IP ile aynı olduğundan emin olun.
- Misafir ağı veya istemci izolasyonu PC ile TV arasındaki trafiği engelleyebilir.
- Güvenlik duvarını veya Defender'ı topluca kapatmayın; önce hangi bağlantının
  engellendiğini belirleyin.

### Key Server kapalı veya bağlantı reddediliyor

- Developer Mode uygulamasını açın.
- **Dev Mode Status ON** ve **Key Server ON** olduğunu doğrulayın.
- Portun `9922`, kullanıcının `prisoner` olduğunu kontrol edin.
- Developer Mode süresi dolmuşsa yeniden oturum açıp modu etkinleştirin.

### Passphrase kabul edilmiyor

- Kod büyük/küçük harfe duyarlıdır.
- TV ekranındaki güncel kodu kullanın; eski ekran görüntüsündeki kodu kullanmayın.
- Key Server'ı kapatıp açtıysanız kod değişmiş olabilir.
- Passphrase'i komut satırına argüman olarak veya destek mesajına yazmayın.

### SSH key alınamıyor

Önce şu üç koşulu ayrı ayrı doğrulayın:

1. `ares-setup-device --list` içindeki IP/port doğru.
2. `Test-NetConnection TV_IP -Port 9922` başarılı.
3. TV'de Key Server açık.

Ardından yeniden çalıştırın:

```powershell
ares-novacom --device tv --getkey
```

Gerçek hata mesajı olmadan anahtarı silmeyin veya cihaz kaydını sıfırlamayın.

### CLI cihazı bulamıyor

- Komutlarda cihaz adının tam olarak `tv` olduğunu kontrol edin.
- `ares-setup-device --list` ile kaydı doğrulayın.
- Yanlış kaydı körlemesine silmek yerine önce `ares-setup-device --listfull`
  çıktısında host, port, kullanıcı ve private key alanlarını kontrol edin.

### Cihaz tanımlı ama IPK kurulamıyor

```powershell
ares-device --system-info --device tv
ares-package -I .\dist-ipk\com.zui.player_1.0.1_all.ipk
ares-install -l -d tv
```

- İlk komut başarısızsa sorun paket değil, TV/SSH bağlantısıdır.
- Paket incelemesi başarısızsa IPK eksik veya bozuk olabilir.
- Developer Mode süresi dolmuşsa TV geliştirici uygulamalarını kaldırmış olabilir.
- Uygulamayı kaldırmadan önce yerel uygulama verilerinin yedeklenip geri
  yüklenebildiği doğrulanmalıdır.

## 10. Destek isterken paylaşılabilecek bilgiler

Paylaşılabilir:

- TV modeli ve webOS/SDK sürümü
- Windows ve Node sürümü
- `ares -V` çıktısı
- Gizli değerleri temizlenmiş hata mesajı
- Hatanın oluştuğu adım

Paylaşılmamalı:

- SSH özel anahtarı
- Developer Mode passphrase'i
- IPTV kullanıcı adı, parola veya tam medya URL'si
- Supabase service-role anahtarı veya başka erişim tokenları
