# Windows kurulum yardımcıları

Bu klasörde iki ayrı kullanıcı senaryosu vardır. Betikler TV'deki mevcut ZUI
uygulamasını kaldırmaz ve kullanıcı verilerini silmez.

## 1. Hazır IPK kuracak kullanıcı

`stage1-tv-connection.cmd`, daha önce kurulmuş Node.js ve webOS CLI ile TV
bağlantısını hazırlar. Git, NVM, Node 24 veya kaynak kod gerekmez.

Betik:

- TV IP adresini ve cihaz takma adını kullanıcıdan ister;
- ICMP sonucu ile TCP `9922` erişimini ayrı raporlar;
- eşleşen CLI cihaz kaydını değiştirmeden kullanır, yoksa yeni kayıt ekler;
- mevcut SSH anahtarını yeniden üretmez; anahtar yoksa `ares-novacom --getkey`
  istemini açar;
- `ares-device --system-info` ile kimlik doğrulamayı sınar;
- IPK kurmaz ve kurulum yetkisini `NOT_TESTED` olarak raporlar.

Çıktı `stage1-tv-connection-report.txt` dosyasına yazılır. Rapor özel anahtar
içeriğini ve passphrase değerini kaydetmez. Yine de paylaşmadan önce gözden
geçirin; TV IP adresi raporda bulunur.

Hazır IPK kurulumu için sonraki manuel adımlar `docs/SIDELOAD.md` içindedir.

## 2. Kaynak koddan derleyecek geliştirici

`stage2-developer-setup.cmd` yönetici olarak çalıştırılır. Betik şu sabitlenmiş
araçları kullanır:

- Git for Windows `2.55.0.windows.5`
- NVM for Windows `1.2.2`
- Node.js `24.18.0` (build)
- Node.js `16.20.2` (test edilmiş eski CLI paketleme zinciri)
- `@webos-tools/cli@3.2.5`

İndirilen arşiv/kurucuların beklenen hash'leri doğrulanır; Git ve NVM çalıştırma
dosyalarının Windows dijital imzası kontrol edilir. Uygun araç zaten varsa
yeniden kurulmaz.

Betik kaynak tag, branch veya commit değerini sorar. Boş bırakılırsa `main`
kullanılır ve raporda bunun geliştirme varsayılanı olduğu açıkça belirtilir.
Yayın build'i için yayımlanmış tag veya tam commit SHA kullanın. Seçilen ref,
klonlandıktan sonra tam commit'e çözülür ve detached checkout ile sabitlenir.

Kaynak ve indirmeler varsayılan olarak
`%USERPROFILE%\Documents\ZUI-IPTV-Setup` altına yazılır. Build sonunda `dist/`,
`dist-ipk/` ve bir doğrulama raporu oluşur. TV'ye kurulum yapılmaz.

Mevcut MSI tabanlı Node kurulumu NVM ile çakışıyorsa otomatik kaldırılmaz. CMD
başlatıcı açıkça izin sorar; izin verilmezse işlem durur. Birden fazla Node MSI
kaydı varsa güvenli inceleme için yine durur.

## Yetkiler ve ExecutionPolicy

Aşama 1 normal kullanıcı hesabıyla çalışır. Aşama 2 araç kurabildiği ve kullanıcı
PATH değerini güncelleyebildiği için yönetici ister. CMD dosyalarındaki
`ExecutionPolicy Bypass` yalnızca açılan PowerShell süreci için geçerlidir;
makine veya kullanıcı politikasını kalıcı olarak değiştirmez.

Betikler hata aldığında sıfır dışı çıkış kodu üretir. Loglarda parola, Developer
Mode passphrase'i, SSH özel anahtarı veya IPTV kimlik bilgisi bulunmamalıdır.

## Güncel kaynak aktarım paketi doğrulaması

Yayın hazırlığında oluşturulan kontrollü kaynak ZIP'i VM'de ayrı bir klasöre
çıkarıldıktan sonra `verify-current-source.cmd` çalıştırılabilir. Araç önce
`SOURCE_BUNDLE_MANIFEST.sha256` içindeki bütün dosyaları doğrular, sonra mevcut
Aşama 2 ortamıyla `npm ci`, production build, IPK paketleme ve IPK incelemesi
yapar. TV'ye kurulum yapmaz. Sonuç
`verify-current-source-report.txt` dosyasına yazılır.
