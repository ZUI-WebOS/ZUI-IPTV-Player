# ZUI IPTV Player — Kalıcı Kurulum Hakkında

> **Desteklenmeyen ve doğrulanmamış yol:** Bu belge güncel ZUI sürüm kurulum
> kılavuzu değildir. Root erişimi, garanti/güvenlik riski ve cihaza göre değişen
> topluluk araçları içerir. 2026-09-20 sürüm hazırlığında root veya kalıcı
> kurulum gerçek cihazda doğrulanmamıştır.

ZUI'nin bu sürüm için desteklenen yükleme yöntemi LG Developer Mode üzerinden
sideload işlemidir. Güncel adımlar için [`SIDELOAD.md`](SIDELOAD.md) belgesini
kullanın.

Developer Mode oturumu sınırlıdır ve TV'deki **Remain Session** değeri üzerinden
izlenir. Sabit bir 50 veya 1000 saat değeri varsayılmamalıdır. Süre dolmadan
Developer Mode uygulamasındaki **EXTEND** seçeneğini kullanın.

webosbrew/root gibi kalıcı kurulum yöntemleri ileride değerlendirilecekse:

1. TV modelinin, firmware sürümünün ve aracın güncel uyumluluğu resmi/upstream
   kaynaklardan yeniden araştırılmalıdır.
2. Garanti, veri kaybı, brick ve güvenlik etkileri kullanıcıya açıklanmalıdır.
3. Güncel komutlar izole bir cihazda doğrulanmalıdır.
4. Açık kullanıcı onayı olmadan root, factory reset veya sistem servisi işlemi
   yapılmamalıdır.

Eski, doğrulanmamış rootmycelium ve `luna-send` komutları yanlışlıkla üretim
cihazında kullanılmasın diye bu belgeden kaldırılmıştır.
