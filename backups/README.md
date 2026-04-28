# Veritabanı yedekleri

Bu klasördeki dosyalar, `npm run backup:state` ile PostgreSQL `app_state` tablosundan alınan **tam snapshot** dizisidir (`payload` dahil).

## Geri yükleme (acil durumda)

PostgreSQL bağlantınız aktifken, Node ile:

```bash
node -e "require('fs'); require('dotenv').config({ path: '.env.local' });"
```

ve aşağıdaki scripti çalıştırın:

```bash
node scripts/restore-app-state.js backups/APPSTATE_DOSYA_ADINIZ.json
```

Dosya yapısı: `{ exportedAt, source, row: { id, payload, updated_at } }` — doğrudan `row.payload` yazılır.

**Uyarı:** Yedekler kişisel / ticari içerik taşıyabilir; public repoya işlemeyin.
