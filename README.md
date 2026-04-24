# Yokuş Mobilya Oda Sistemi

Mobilyacılar odası için hazırlanan bu web uygulaması şunları içerir:

- Oda yönetimi için kalite fiyat kataloğu ve genel kurallar
- Mobilyacı için oda bazlı ölçü girişi, kalite seçimi, hırdavat paketi ve iskonto yönetimi
- Müşteri için resmi oda fiyatı ile mağaza teklifini aynı belgede şeffaf gösteren ekran
- Türkçe, responsive ve mobil uygulama hissi veren arayüz

## Çalıştırma

```bash
npm start
```

Ardından tarayıcıda şu adresi açın:

```text
http://localhost:4173
```

## Demo kullanıcılar

- `oda / oda2026`
- `mobilyaci / mob2026`
- `musteri / misafir2026`

## Not

Bu sürüm artık Vercel Blob ile kalıcı veri saklar. Yerelde `npm start` ile açtığınızda `.env.local` içindeki anahtar sayesinde aynı `/api/state` hattı canlı veri katmanına bağlanır. Eğer Blob anahtarı yoksa sistem otomatik olarak demo veriye geri düşer.

## Vercel Yayını

Bu proje Vercel üzerinde canlı veri saklama destekli olarak çalışır.

```bash
vercel
```

Üretim yayını için:

```bash
vercel --prod
```
