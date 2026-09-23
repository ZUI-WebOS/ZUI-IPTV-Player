# Ayarlar İşlev Denetimi

Bu envanter, 1.0.1 sonrası kaynak kod incelemesine dayanır. `Kod durumu`, ilgili
kartın gerçek bir store/işleme bağlı olup olmadığını; `TV kabulü` ise gerçek LG
TV'de D-pad ve sonuç doğrulamasını gösterir.

| Kart / kontrol | Kod durumu | TV kabulü | Not |
| --- | --- | --- | --- |
| Ebeveyn Kontrolü | Aktif | Bekliyor | PIN oluşturma, doğrulama, değiştirme, kaldırma ve kategori koruma akışları bağlı. Ayrıntı düğmeleri TV odağına eklendi. |
| Dil | Aktif | Bekliyor | Türkçe, İngilizce, Almanca, Fransızca ve İspanyolca seçimi kalıcı ayara bağlı. |
| Altyazı Ayarları | Aktif | Bekliyor | Aç/kapat ve küçük/orta/büyük ayarları kalıcı. Son boyuttan `DOWN` ile Kapat odağı düzeltildi. Görsel altyazı sonucu ayrıca içerik track desteğine bağlı. |
| Canlı TV kategorilerini gizle | Aktif | Bekliyor | Kategori seçimleri kalıcı store/IndexedDB akışına bağlı. |
| Film kategorilerini gizle | Aktif | Bekliyor | Yalnız gerçek film kategorileri listelenir; özel listeler gizleme ekranına girmez. |
| Dizi kategorilerini gizle | Aktif | Bekliyor | Yalnız gerçek dizi kategorileri listelenir; özel listeler gizleme ekranına girmez. |
| Kanal geçmişini temizle | Aktif | Bekliyor | Son izlenen kanal kimliklerini temizler. |
| Film geçmişini temizle | Aktif | Bekliyor | İlerleme ve Son İzlenen film listesini temizler; boş özel filtrede kalmaz. |
| Dizi geçmişini temizle | Aktif | Bekliyor | İlerleme, bölüm ve Son İzlenen dizi listesini temizler; boş özel filtrede kalmaz. |
| Zaman Biçimi | Aktif | Bekliyor | 24 saat / 12 saat arasında geçiş yapar ve kalıcıdır. |
| Otomatik Yenileme | Pasif / placeholder | Beklemiyor | Henüz yenileme zamanlayıcısına bağlı değildir. Yanlış `Açık` göstergesi kaldırıldı; kart artık pasif olduğunu açıkça gösterir. Davranış ve yenileme aralığı kararlaştırılmadan etkinleştirilmeyecek. |

## Gerçek TV kabul sırası

1. Her karta D-pad ile tek tek ulaş ve odak çerçevesini doğrula.
2. Aktif kartlarda `OK`, modal içi yön tuşları, `BACK/Kapat` ve karta odak dönüşünü doğrula.
3. Dil, altyazı, zaman biçimi ve gizli kategori tercihlerinin uygulama yeniden
   başlatıldıktan sonra korunduğunu doğrula.
4. Üç geçmiş temizleme kartını yalnız test verisiyle dene; gerçek kullanıcı
   geçmişini silmeden önce ayrıca onay al.
5. Otomatik Yenileme kartının yalnız pasif bilgilendirme mesajı verdiğini doğrula.
