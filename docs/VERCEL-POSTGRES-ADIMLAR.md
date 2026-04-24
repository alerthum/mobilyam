# Vercel + Postgres geçişi (senin yapacakların)

Bu rehber, Vercel arayüzü **İngilizce** menü isimlerini kullanır. Aşağıdaki adımlar sırayla; gitmeden önce canlı sitede önemli bir değişiklik yapma.

## Ne değişti (kod tarafı)

- Kalıcı veri yalnızca **Postgres** (`app_state` tablosu, `id = main`). **Vercel Blob artık kullanılmıyor.**
- `BLOB_READ_WRITE_TOKEN` anlamsız; kaldırılmalı.
- Eski canlı veriyi JSON yedeğinden yüklemek için: `npm run migrate:state -- yedek.json`

---

## Aşama 1 — Mevcut Blob verisini yedekle (kayıp olmasın)

### Neden `https://mobilyam.vercel.app/state/app-state.json` çalışmıyor?

Bu adres **yanlış yer**. Uygulama sadece `/api/state` API’si sunuyor; Blob’daki dosya **sitenin bir sayfası değil**. Yani `mobilyam.vercel.app` altında `state/app-state.json` diye bir URL **hiç tanımlı değil** — 404 veya boş sayfa normal.

Gerçek dosya **Vercel Blob** depolamasında tutulur; indirme adresi genelde şuna benzer (örnek):

```text
https://<benzersiz-id>.public.blob.vercel-storage.com/state/app-state.json
```

Bu tam URL’yi **Vercel panelinde** Blob dosyasına tıklayınca veya dosya detayında **Open** / **Copy URL** ile görürsün; ben veya başkası senin hesabına girmeden bu linki **tahmin edemez** ve senin makinene dosyayı **ben indirip veremem**.

**Hedef:** `state/app-state.json` içeriğini (JSON) bilgisayarına `mobilya-state-backup.json` gibi kaydet.

1. **Vercel Dashboard** → sol üstten **Storage** (veya proje içindesin: **Project** → **Storage**).
2. Mobilya ile ilgili **Blob** store’u aç (ör. `yokus-mobilya-db` tipi **Blob** olan; Postgres ile karıştırma).
3. Klasör/dosya listesinde **`state/app-state.json`** satırını bul.
4. Satıra veya dosyaya tıkla; ekranda **public URL**, **Open in new tab**, **Download** vb. varsa kullan — tarayıcıda açılan sayfa genelde ham JSON’dur; **Ctrl+S** ile veya sayfa içeriğini kopyalayıp `.json` dosyası olarak kaydet.
5. Dosyayı **güvende** tut; bu senin kurtarma noktan.

> Limit aşırısı ("Limits reached") bazen **yazmayı** engeller ama **okuma/indirme** hâlâ çalışabilir; yine de panelden dene. Okuma da kapandıysa yalnızca eski yedekler veya Vercel destek.

### Aşama 1c — `BLOB_READ_WRITE_TOKEN` ile yedek (public link “blocked” olsa da)

`Your store is blocked` veya indir butonu çalışmıyorsa: betik, public `downloadUrl`’e `fetch` atmaz; **`@vercel/blob` içindeki `get("state/app-state.json", { access: "public", token })`** kullanır (Vercel’in resmi okuma yolu). Yine de Vercel mağazayı **tam askıya almışsa** (`403` tüm okumalar) bu da başarısız olur.

1. Vercel → proje **Settings** → **Environment Variables** → `BLOB_READ_WRITE_TOKEN` (gizli tut).
2. Proje kökünde **`.env.local`** (commit etme):
   ```env
   BLOB_READ_WRITE_TOKEN=buraya-yapistir
   ```
3. Terminal:
   ```bash
   npm install
   npm run export:blob
   ```
4. Başarılıysa **`mobilya-state-backup.json`** oluşur → [Aşama 4](#aşama-4--yedeği-veritabanına-yaz-tek-sefer) ile Postgres.

**Hâlâ `403` / `Failed to fetch blob`?** Token yanlış değil; **mağaza tarafı** okumayı da kapatmış olabilir. O zaman:

- **Tarayıcı kurtarma:** Aşağı “localStorage” adımları (sayfayı **fazla yenileme**; önbellek silinmesin).
- **Vercel Support:** Blob dışa aktarma / limit açma talebi.

**Tarayıcıdan yedek (Blob tam kilitliyse):** `mobilyam.vercel.app` açıkken **önce sayfayı gereksiz yenileme** (sunucu demo dönerse `localStorage` ezilebilir). **F12** → **Console**:

```js
copy(JSON.stringify(JSON.parse(localStorage.getItem("yokus-oda-remote-cache-v3") || "{}"), null, 2))
```

Çıkan metni Notepad’e yapıştır → `mobilya-state-backup.json` kaydet. **Oda** hesabıyla girişte önbellek **eksik** (filtreli) olabilir; tam yedek için üretimde **system_admin** hesabıyla giriş yapıp aynı adımı dene.

---

## Aşama 1b — "Browse Storage" menüsünde ne seçeceksin? (Create Database)

**Create Database** / **Connect Database** dediğinde açılan **Browse Storage** penceresinde:

- **Neon** satırını seç — açıklaması **"Serverless Postgres"**.  
- Alttan **Continue** → sihirbazda bölge (Region) ve isim → **Create** / **Connect** ile bu **Postgres**’i mobilya projene bağla.

**Neden Neon?** Bu proje sunucuda `@neondatabase/serverless` ile Postgres’e bağlanıyor; Vercel’in listesindeki **Neon**, bununla uyumlu standart seçenek. **Blob** veya **Edge Config** seçme; **Supabase** / **Prisma Postgres** de Postgres’tir ama akış ve env isimleri farklı olabilir — en sorunsuz yol **Neon**.

> Ekranda ayrıca "Vercel Native" altında **Blob** görürsün; yeni veri tabanı için **onu seçme** (eski soruna geri dönmezsin).

---

## Aşama 2 — Vercel’de Postgres oluştur

1. [Vercel Dashboard](https://vercel.com) → giriş yap.
2. **Projects** → mobilya projen → **Storage** (sol menü).
3. **Create Database** → **Browse Storage** açılır → **Neon** (**Serverless Postgres**) seç → **Continue**.
4. Sihirbazda ad (ör. `yokus-mobilya-pg`) → **Region** (ör. `fra1` Frankfurt) → **Create**.
5. **Connect a project** / **Install Integration** adımında açılan ekranda (örnek alan isimleri):

| Alan | Ne yap |
|------|--------|
| **Connect a project** + arama | Zaten `yokus-mobilya-oda-sistemi` seçili olabilir; doğru projedesin. |
| **Environments** — *Development* / *Preview* / *Production* | Hepsi işaretli kalabilir (önerilir); en azından **Production** açık olsun, yoksa canlı site DB göremez. |
| **Create database branch for deployment** — *Preview* / *Production* | **İkisini de boş bırak** (işaretleme). İlk kurulumda gerek yok; Neon branch’leri ileri seviye. |
| **Custom Prefix** (placeholder `STORAGE` … `_URL`) | **Boş bırak.** Dolu olursa env isimleri `STORAGE_URL` gibi olur; [api/_db.js](../api/_db.js) varsayılan `POSTGRES_URL` / `DATABASE_URL` arıyor. Boş bırakınca Vercel standart isimleri yazar. |
| **Connect** | Tıkla. **Skip** değil. |

6. Sihirbaz biterse: **Database Provisioning** / onay ekranlarını **Continue** ile tamamla.

Böylece Vercel, projeye **ortam değişkeni** enjekte eder. Genellikle şunlardan biri veya benzeri görürsün (isimler sürüme göre değişebilir):

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `DATABASE_URL` (bazen otomatik eklenir)

Kod, bu isimlerin hepsini [api/_db.js](../api/_db.js) içinde arıyor; **en az biri** dolu olsa yeter.

---

## Aşama 3 — Ortam değişkenlerini kontrol et

1. Aynı proje içinde: sol menü **Settings** → **Environment Variables**.
2. Aşağıdakileri kontrol et:
   - **Eski:** `BLOB_READ_WRITE_TOKEN` **varsa sil** (yok edene kadar deploy etme; önce yedek + migrate tamam, bkz. aşama 4–5 notu).
   - **Yeni:** `POSTGRES_URL` veya `DATABASE_URL` (Vercel’in Postgres’e bağlarken eklediği) **dolu** olmalı. Production, Preview, Development kapsamını hangi ortama deploy ediyorsan ona göre doldur (çoğu zaman en az **Production**).

3. **SESSION_SECRET** (önerilir): rastgele uzun bir string. Yoksa uygulama `DATABASE_URL`’den türetir; ama secret sabit olunca oturumlar taşınmada tutarlı olur. Yeni bir değer üret: örn. PowerShell’de `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

---

## Aşama 4 — Yedeği veritabanına yaz (tek sefer)

Bunu **Claude/ChatGPT değil, senin bilgisayarında** `npm` ile çalıştırman gerekir: veritabanı şifresi (`DATABASE_URL`) sadece sende kalmalı; bana bu URL’yi mesajda paylaşma.

Yerel bilgisayarında, repo **kök dizininde**:

1. `.env.local` dosyası oluştur (`.gitignore`’da, commit etme) ve Vercel’den kopyaladığın **Postgres connection string**’i koy. Örnek (tek satır, tırnak içinde tüm URL):
   - `POSTGRES_URL=postgres://...` veya
   - `DATABASE_URL=postgres://...`  
   (Hangi ismi kullanırsan, kod aynı URL’yi bulur.)

2. Bağımlılıklar: `npm install` (zaten yaptıysan tekrar gerekmez).

3. Yedek JSON’u içe aktar:
   ```bash
   npm run migrate:state -- ./mobilya-state-backup.json
   ```
   (Dosya yolunu kendi yedeğinle değiştir.)

4. Hata yoksa `Tamam. app_state id=main guncellendi.` mesajını görürsün.

> Alternatif: Vercel / Neon “SQL” / “Query” ekranından `app_state` tablosuna manuel ekleme — mümkün ama gerek yok; betik aynı şemayı kurup upsert ediyor.

---

## Aşama 5 — Git’e push + Vercel deploy

1. Değişiklikleri **commit** edip **Push** (GitHub/GitLab vb.) — bunu yalnızca **sen** yapabilirsin; IDE veya `git` ile hesabın.
2. Vercel **Deployments** yeni build’i alsın. Almadıysa: **Redeploy** (veya `vercel --prod`).

> Bir asistan, senin adına **Vercel’e deploy** edemez (hesabına erişim yok). 4–5’i “senin yerine birinin yapması” sadece **aynı PC’de** Cursor/terminal ile `migrate` + `git push` komutlarını **senin çalıştırman** anlamındadır; secret paylaşmadan.

**Önemli deploy sırası tercihleri:**

- **Daha güvenlisi:** Önce (aşama 2–3’te) **sadece** `DATABASE_URL` / `POSTGRES` env’i ekle, `BLOB_READ_WRITE_TOKEN` **daha kaldırma**; aşama 4’te migrate’i bitir; sonra Repoyu (Blob’u koddan kaldıran) deploy et; ardından `BLOB_READ_WRITE_TOKEN`’ı **sil** ve tekrar deploy et.  
- Ya da: Blob token’ı en baştan sil, ama o zaman aşama 4’teki migrate’i **Blob okumadan** (yalnızca yedek JSON dosyasından) yapman şart; yedek yoksa veri kaybı riski.

---

## Aşama 6 — Canlı test

1. `https://<proje-adin>.vercel.app` (veya `mobilyam.vercel.app`) aç.
2. Oda / mobilyacı girişi dene, küçük bir değişiklik yap, kaydet.
3. Farklı tarayıcı / gizli pencerede aynı veri görünüyor mu kontrol et.
4. API yanıtında `storageMode: "live"` olmalı (network tab veya uygulama davranışı).

---

## Aşama 7 — Blob’u tamamen kaldır (Vercel panel)

1. **Project** → **Storage** (sol menü).
2. Eski **Blob** store kaydını (ör. `yokus-mobilya-db` Blob, veya sadece Blob tipi olan) listele.
3. … menüsünden **Delete** / kaldırma seç (adı sürüme göre: **Delete**, **Remove**).  
4. Sadece artık **kullanmadığından** emin olduktan sonra sil (Postgres çalışıyor ve test tamam).

> Yeni açtığın **Postgres** veritabanı **silinmesin**; sadece eski **Blob** store silinir.

---

## Aşama 8 — Domain (mobilyam.vercel.app)

1. **Settings** → **Domains**.
2. Eski deploy / eski proje hâlâ domaini tutuyorsa: o projede domain’i **Remove**, bu projede **Add** ile `mobilyam.vercel.app` (veya custom domain) ekle.
3. DNS yönlendirmeleri zaten Vercel’deyse genelde tıkla–onay; değilse ekrandaki CNAME yönergeleri.

---

## Sorun giderme (kısa)

| Belirti | Ne yap |
|--------|--------|
| Uygulama demo veri gibi | `DATABASE_URL` / `POSTGRES_URL` Production’da yok veya hatalı |
| 401 / oturum | `SESSION_SECRET` değiştin mi? Eski cookie’ler geçersiz; çık–tekrar gir |
| `migrate:state` bağlantı hatası | `.env.local` URL’sini kopyalarken tırnak veya boşluk bırakma; tam satır kopyala |

---

## PowerShell hızlı referans (Windows)

```powershell
cd "C:\path\to\Yokus Mobilya Yazilimi"
$env:DATABASE_URL = "postgres://.... "   # gecici; kalici icin .env.local
npm run migrate:state -- .\mobilya-state-backup.json
```

Tüm bu adımlar tamamlandığında: veri **Postgres**’te, Blob **koddan ve panelden** kalkmış, site her yerden aynı veritabanına yazar/okur.
