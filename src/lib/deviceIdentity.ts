// deviceIdentity — TV kimlik türetme yardımcıları.
//
// Bu modül App seviyesinde (cloudSyncRuntimeStore) ve hook seviyesinde
// (useSupabaseRealtime) aynı sonucu üretebilmek için paylaşılan
// saf fonksiyonları barındırır.
//
// TV Kimliği  = djb2(serial, 0xdeadbeef) → "XXXX-XXXX"
// Cihaz Anahtarı = djb2(serial, 0xbeefdead) → 6 base36 karakter
//
// UYARI: djb2 kriptografik bir KDF değildir. Farklı seed kullanılması bu kısa,
// deterministik değeri yüksek entropili bir kimlik doğrulama sırrına dönüştürmez.

// ─── djb2 hash (32-bit pozitif tam sayı) ─────────────────────────────────────

function djb2(s: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

// ─── Seri numarası okuma ──────────────────────────────────────────────────────
//
// Öncelik: PalmSystem.deviceInfo.serialNumber → uniqueDeviceID → deviceUUID
//          → webOS.device.id → localStorage (sadece geliştirme ortamında)

export function getStableDeviceId(): string {
  try {
    const info = (window as any).PalmSystem?.deviceInfo;
    if (typeof info === 'string' && info.length > 0) {
      const p = JSON.parse(info) as Record<string, unknown>;
      const id = String(p.serialNumber ?? p.uniqueDeviceID ?? p.deviceUUID ?? '');
      if (id) return id;
    }
  } catch { /* ignore */ }

  const wid = (window as any).webOS?.device?.id;
  if (typeof wid === 'string' && wid.length > 0) return wid;

  // ⚠️ Geliştirme ortamı — gerçek TV'de buraya düşülmez
  const stored = localStorage.getItem('zui_device_uid');
  if (stored) return stored;
  const newId =
    'dev-' +
    Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  localStorage.setItem('zui_device_uid', newId);
  return newId;
}

// ─── Kimlik türetme — senkron ─────────────────────────────────────────────────

export function resolveDeviceIdentity(): { shortId: string; key: string } {
  const raw = getStableDeviceId();

  // TV Kimliği: seed 0xdeadbeef → 8 hex karakter → "XXXX-XXXX"
  const h = djb2(raw, 0xdeadbeef).toString(16).padStart(8, '0').toUpperCase();
  const shortId = h.slice(0, 4) + '-' + h.slice(4, 8);

  // Cihaz Anahtarı: farklı seed 0xbeefdead → base36 → 6 karakter
  const key = djb2(raw, 0xbeefdead).toString(36).padStart(6, '0').slice(-6);

  return { shortId, key };
}
