# npm güvenlik incelemesi

**İnceleme tarihi:** 2026-09-21
**Yöntem:** `npm audit` ve `npm audit --omit=dev`; otomatik düzeltme yapılmadı.

## Uygulama bağımlılıkları

Tam bağımlılık ağacında 10 bildirim vardır: 2 düşük, 3 orta, 5 yüksek, 0
kritik. Production ağacında kalan iki doğrudan paket şunlardır:

| Paket | Sürüm | Seviye | Kullanım ve pratik koşul |
|---|---:|---:|---|
| `fast-xml-parser` | 4.5.6 | orta | Uygulama yalnız `XMLParser`ı EPG worker'ında kullanır. Bildirim `XMLBuilder` yorum/CDATA üretimiyle ilgilidir; incelenen kod yolu bu API'yi çağırmaz. |
| `nanoid` | 5.1.11 | yüksek | `sourceStore` içinde sabit pozitif `nanoid(8)` kullanılır. Bildirilen negatif/sıfır boyutlu özel veya non-secure üretici koşulu bu çağrıda yoktur. |

Kalan sekiz bildirim Babel, Browserslist, brace-expansion/shx, esbuild/Vite,
PostCSS ve selector araçları gibi build/geliştirme zincirindedir. Bunlar TV'deki
uygulama runtime paketleri olarak yüklenmez. Geliştirme sunucusunu güvenilmeyen
ağlara açmamak gerekir.

Bu inceleme, açık bulunmadığı anlamına gelmez. Ancak mevcut iki production
bildiriminin uygulamadaki çağrı biçiminde tetiklendiğine dair kanıt bulunmadığı
için yalnız severity değerleri sürümü durdurmak için yeterli görülmedi. Hedefli
uyum testi olmadan büyük sürüm yükseltmesi veya `npm audit fix --force`
önerilmez.

## webOS CLI bağımlılıkları

Temiz VM'de doğrulanan CLI 3.2.5'in kendi kilitli bağımlılık ağacında 14 bildirim vardır: 2 düşük, 2 orta,
8 yüksek ve 2 kritik. `--omit=dev` ile 9 bildirim kalır: 2 düşük, 2 orta, 3
yüksek ve 2 kritik.

Production zincirinde öne çıkanlar:

- `decompress@4.2.1`: doğrudan CLI bağımlılığı, kritik, mevcut ağaçta otomatik
  düzeltme yok.
- `extract-zip@1.7.0`: doğrudan CLI bağımlılığı, yüksek, otomatik düzeltme yok.
- `tar@7.5.13`: doğrudan CLI bağımlılığı, kritik; daha yeni 7.x düzeltmesi
  vardır fakat global CLI paketinin kilit dosyası kullanıcı tarafından
  parçalı değiştirilmemelidir.
- `body-parser`, `qs`, `inquirer`, `external-editor`, `tmp`, `rimraf` ve
  `brace-expansion`: CLI çalışma zincirindeki dolaylı/doğrudan bildirimlerdir.
- `eslint`, `file-entry-cache`, `flat-cache` ve `flatted`: CLI paketinin
  geliştirme zinciridir.

Bu bulgular TV uygulamasının JavaScript bundle'ına girmez. Arşiv bulgularının
pratik tetikleyicisi güvenilmeyen veya saldırgan hazırlanmış arşiv/paketlerin
CLI tarafından açılmasıdır. Bu nedenle 3.2.5 ile yalnız güvenilen yerel `dist`
klasörünü paketleyin; kaynağı bilinmeyen IPK/arşivleri bu sürümle incelemeyin.
Kalıcı çözüm upstream CLI güncellemesidir.

Hostta yapılan güncel kontrolde Node 16.20.2 dizininde CLI **3.2.3** bulundu;
3.2.5 bulunmadığı için bu host kurulumu 3.2.5 adayı üretmekte kullanılmayacaktır.
Global pakette lock dosyası olmadığı için 3.2.3 için aynı kesin audit sayıları
iddia edilmez. Yeni CLI kurulumu ayrıca kullanıcı onayı gerektirir.

Güncel `@webos-tools/cli` 3.2.6 Node 24 ile test edilmiştir ve paket motoru Node
`>=20` ister. Bu proje için Node 16.20.2/CLI 3.2.5 çifti yalnız daha önce
doğrulanmış paketleme zincirini yeniden üretmek amacıyla sabitlenmiştir. 3.2.6'ya
geçiş ayrı build, IPK içerik ve gerçek TV kabul turuyla değerlendirilmelidir.
