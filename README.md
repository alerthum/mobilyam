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

## Kalıcı veri (Postgres)

Canlı ortamda uygulama durumu **Vercel Postgres (Neon)** üzerinde `app_state` tablosunda saklanır. Yerel çalıştırmada `DATABASE_URL` yoksa sistem [data/default-state.json](data/default-state.json) demo verisine düşer.

İsteğe bağlı: proje kökünde `.env.local` tanımlayıp `DATABASE_URL` (ve üretimdeki oturum tutarlılığı için `SESSION_SECRET`) vererek lokal API’yi aynı bulut veritabanına bağlayabilirsiniz. Örnek anahtarlar: [.env.example](.env.example).

Vercel Blob’da hâlâ `BLOB_READ_WRITE_TOKEN` varken yedek almak: `.env.local` içine bu token, sonra `npm run export:blob` → `mobilya-state-backup.json`. Detay: [docs/VERCEL-POSTGRES-ADIMLAR.md](docs/VERCEL-POSTGRES-ADIMLAR.md). Postgres’e yüklemek: `npm run migrate:state -- <dosya.json>`.

## Vercel yayını

Vercel’e bağlama ve menü adımları: [docs/VERCEL-POSTGRES-ADIMLAR.md](docs/VERCEL-POSTGRES-ADIMLAR.md).

```bash
vercel
```

Üretim:

```bash
vercel --prod
```
