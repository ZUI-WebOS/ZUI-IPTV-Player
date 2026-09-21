# Bilinen Sorunlar ve Teknik Borç

## Bazı MKV dosyalarında seek geri sıçrıyor

**Durum:** Açık; genel oynatıcı hatası değil, içerik yapısına bağlı uyumluluk
sorunu olarak sınırlandırıldı.

Gerçek LG TV'de test edilen 10 film/dizi içeriğinin 9'unda timeline ve ±10 saniye
seek çalıştı. Bir içerikte `currentTime` hedefi önce kabul edildi, fakat oynatma
kısa süre sonra eski decoder konumuna döndü.

### Doğrulanmış gözlemler

- Çalışan ve çalışmayan örnek aynı sunucudan MKV olarak sunuluyor.
- İki örnek de HTTP byte range isteklerine `206` yanıtı veriyor.
- Uygulama iki örneğe de aynı seek komutunu gönderiyor.
- İki dosyada da gerçek Matroska `Cues` bölümü dosyanın sonuna yakın.
- Çalışan dosyanın başlangıç `SeekHead` bölümünde `Cues` konumunu gösteren kayıt
  var.
- Çalışmayan dosyada başlangıçta bu kayıt yok; `Cues` adresini gösteren kayıt
  yalnız dosyanın sonundaki başka bir `SeekHead` bölümünde bulunuyor.

### Henüz kanıtlanmamış hipotez

LG native medya motorunun başlangıçta erişilebilir `Cues` işaretçisi olmayan bu
dosyada rastgele erişim indeksini keşfedemediği düşünülüyor. Aynı medya yeniden
kodlanmadan remux edilip başlangıç `SeekHead` kaydı düzeltildikten sonra TV'de
seek testi yapılmadığı için nihai nedensellik henüz kapanmadı.

### Koruma kararı

- Genel oynatıcı motoru değiştirilmeyecek.
- Bütün MKV içeriklerinde seek kapatılmayacak.
- Çalışan içeriklerin timeline ve ±10 saniye davranışı korunacak.
- Medya indirme/remux ve test sunucusu kurulumu ayrıca kullanıcı onayı gerektirir.

### İlerideki remux A/B testi

1. Problemli örneğin yasal ve kontrollü bir test kopyasını alın.
2. Ses/video akışlarını yeniden kodlamadan remux edin.
3. Başlangıç `SeekHead` içindeki `Cues` referansını yapısal araçla doğrulayın.
4. Orijinal ve remux sürümü aynı HTTP sunucusundan byte-range desteğiyle sunun.
5. Gerçek TV'de aynı başlangıç zamanı ve aynı seek hedefleriyle karşılaştırın.
6. Hedefte kalma, `seeking/seeked`, ağ range istekleri ve oynatma devamlılığını
   kaydedin.

## webOS 4.5 siyah ekran bildirimi

webOS 4.5 için siyah ekran bildirimi vardır. Bu projede doğrulanmış webOS 4.5
cihaz kabul testi bulunmadığından sürüm destekleniyor olarak ilan edilmemelidir.

## Anasayfadaki eski “Cloud” alt yazısı

Anasayfadaki `M3U · Xtream · Cloud` alt yazısında “Cloud” sözcüğü görünmeye
devam eder. Bu yalnız kozmetik bir metindir. Cloud Sync 1.0.1 sürümünde sabit
release gate ile kapalıdır; bu yazı bir bağlantı, ayar veya etkinleştirme yolu
değildir. Kullanıcı bu küçük metin düzeltmesini 1.0.1 yayın kapsamının dışında
bırakmayı kabul etmiştir.
