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

Bu sürüm, hızlı devreye alınabilecek bir MVP olarak ön yüz odaklıdır ve verileri tarayıcı `localStorage` içinde saklar.

## Vercel Yayını

Bu proje doğrudan statik site olarak Vercel'e alınabilir.

```bash
vercel
```

Üretim yayını için:

```bash
vercel --prod
```
