# Terka

Lihat pelatnya, terka asalnya. PWA untuk menghafal kode depan pelat kendaraan
Indonesia. Spesifikasi lengkap ada di `docs/` (PRD, SRD, TRD, ERD, Microcopy,
Tests, Facts, Kode Khusus).

## Persiapan

```sh
bun install --frozen-lockfile
cp .env.example .env.local
```

## Struktur

- `src/core/`: konten dan aturan inti (pemeriksaan jawaban, penilaian,
  penjadwalan FSRS, soal, batas hari) sebagai fungsi murni.
- `src/rules.ts`: seluruh angka aturan.
- `src/data/plates.json`: konten hasil build dari `data/plate-curation.json`,
  `data/special-codes.json`, dan `data/fun-facts.json`.
- `public/map.svg`: peta 38 provinsi, `id` tiap provinsi sama dengan `id` cakupan dan
  kawasan ditandai `data-group` (`papua` dan `maluku` dipakai kawasan sekaligus provinsi).
  Dibuat ulang dengan `bun run map:build` dari geoBoundaries `gbHumanitarian` IDN ADM1/ADM2
  (OCHA ROAP, CC BY 3.0 IGO); enam provinsi Papua disusun dari kabupatennya. Atribusi ini
  wajib tampil di halaman Tentang.
- `src/app/`: kerangka Next.js; UI sedang ditulis ulang dari desain v2.
- `src/core/reference/`: pencarian Referensi (kode, pelat lengkap, CD, RI/CC/CH, nama daerah dan pemegang).
- `src/lib/app/`: pembukaan aplikasi (`openApp`), store (`createAppStore`), dan sambungan sinkronisasi (`startSync`).
- `src/lib/db/`: penyimpanan lokal Dexie, ekspor dan impor.
- `supabase/migrations/`: skema server; `supabase/tests/`: tes pgTAP; `supabase/checks/`: tes
  yang membandingkan skema dengan kode dan dokumen.

## Perintah

```sh
bun run content:build   # bangun ulang plates.json
bun run content:check   # pemeriksaan konten mode rilis
bun run test
bun run dev
bun run build           # build rilis: content:check, next build, postbuild
bun run build:local     # build lokal dari plates.json yang sudah ada
bun run e2e             # build:local lalu Playwright (Chromium dan WebKit)
bun run map:build       # bangun ulang public/map.svg
bun run lint
bun run check
bun run format
```

## Database lokal

Stack Supabase lokal berjalan di Docker. Dengan Colima:

```sh
colima start
export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock
bun run db:start   # Postgres, Auth, REST; layanan lain dimatikan
bun run db:test    # terapkan ulang migration, pgTAP, tes skema
```

## Login

Login memakai Google atau kode 6 digit dari email; tanpa login aplikasi tetap
berjalan penuh. Kode ada di `src/lib/auth/`, konfigurasi stack lokal di
`supabase/config.toml` dan template email di `supabase/templates/`.

Penyiapan proyek sungguhan (tidak diotomasi):

1. Proyek Supabase produksi dan staging dengan Postgres 15 atau lebih baru.
   Jalankan `supabase db push`; uji migration `jobs` (`pg_cron`) di staging dulu.
2. OAuth client Google: redirect URI ke callback Supabase Auth, layar
   persetujuan berisi nama Terka dan tautan kebijakan privasi, domain
   `terka.my.id` diverifikasi di Google Search Console.
3. SMTP Resend dengan SPF, DKIM, dan DMARC; batas email per jam 80; template
   email dari `supabase/templates/magic_link.html`.
4. Turnstile: site key di aplikasi, secret di pengaturan CAPTCHA Supabase Auth.
   Stack lokal tidak memakai CAPTCHA, karena verifikasinya memerlukan internet.
5. Site URL `https://terka.my.id`; Redirect URL hanya
   `https://terka.my.id/auth/callback` dan `http://localhost:3000/auth/callback`.
6. `.env.local` berisi URL proyek dan publishable key.

Pemeriksaan manual sebelum login dibuka: login Google di Chrome Android dan
Safari iOS (termasuk PWA), email yang sama lewat Google dan kode email berakhir
di satu akun, kode kedaluwarsa setelah satu jam, permintaan tanpa token
Turnstile ditolak, email ke-81 dalam satu jam ditolak, serta SPF/DKIM/DMARC.

## Build dan rilis

`next build` menghasilkan static export di `out/`. Setelah itu `scripts/postbuild.ts`
menyalin `plates.json` dan WebAssembly optimizer, memeriksa halaman utama dan fitur
yang memerlukan server, membundel worker optimizer ke `out/optimizer/worker.js`, lalu
membuat service worker `out/sw.js` dengan Workbox. Build gagal jika halaman utama,
`plates.json`, `map.svg`, atau berkas optimizer tidak masuk precache.

Worker optimizer dibundel sendiri, bukan oleh Turbopack: worker Turbopack membaca
daftar chunk dari fragmen URL, dan fragmen itu hilang saat skrip worker dilayani
service worker, sehingga worker tidak bisa jalan di halaman yang sudah terpasang.

Playwright memerlukan browser sekali pasang: `bunx playwright install chromium webkit`.

Penyiapan pemilik proyek (tidak diotomasi):

1. Vercel: pasang `terka.my.id` sebagai domain produksi dan alihkan
   `terka.vercel.app` ke sana (308) di pengaturan domain, sebelum ada pengguna.
2. Pemantau uptime untuk server sinkronisasi (TRD 6).
3. Cadangan mingguan (`.github/workflows/backup.yml`): buat kunci dengan
   `age-keygen -o terka-backup.key` dan simpan berkas itu di luar CI. Isi variable
   `BACKUP_AGE_RECIPIENT` dengan kunci publiknya (`age1…`) dan secret
   `BACKUP_DATABASE_URL` dengan connection string Postgres (session pooler).
   Hasilnya artifact Actions terenkripsi dengan retensi 28 hari. Pemulihan:
   `age -d -i terka-backup.key terka-YYYY-MM-DD.dump.age > terka.dump`, lalu
   `pg_restore --no-owner --dbname "$DATABASE_URL" terka.dump` ke proyek kosong,
   lalu periksa Auth, RLS, grant, dan migration (TRD 6).
4. Alarm ukuran database (`.github/workflows/db-size.yml`): buat role baca-saja,
   lalu isi secret `DB_SIZE_DATABASE_URL` dengan login role itu.

    ```sql
    create role terka_size_monitor login password '<kata sandi acak>';
    grant connect on database postgres to terka_size_monitor;
    ```

5. CI (`.github/workflows/ci.yml`) menjalankan Tests §3 langkah 1–6, termasuk
   `bun run ci:names` (nama tes dan komentar tanpa ID katalog atau rujukan dokumen) dan
   `bun run ci:coverage` (cakupan baris `src/core` minimal 90%). Langkah 7 (migration
   produksi dan deploy) belum dipasang.
6. DNS email (`.github/workflows/dns.yml`): Resend butuh SPF `include:amazonses.com`
   dan MX di `send.terka.my.id`. Per 2026-10-24 keduanya belum ada; DKIM dan DMARC sudah.
7. Header keamanan ada di `vercel.json` (CSP, `nosniff`, `Referrer-Policy`,
   `Permissions-Policy`). Domain Supabase atau CAPTCHA baru harus ditambahkan ke CSP.
8. Teks `/privasi` adalah draf dari dokumen teknis. Tinjau secara hukum sebelum login
   dibuka untuk publik, lalu naikkan `PRIVACY_POLICY_VERSION` dan katalog
   `privacy_policy_versions` bila isinya berubah material.
