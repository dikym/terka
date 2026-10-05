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
- `src/app/`: kerangka Next.js; UI sedang ditulis ulang dari desain v2.
- `src/lib/db/`: penyimpanan lokal Dexie, ekspor dan impor.
- `supabase/migrations/`: skema server; `supabase/tests/`: tes pgTAP; `supabase/checks/`: tes
  yang membandingkan skema dengan kode dan dokumen.

## Perintah

```sh
bun run content:build   # bangun ulang plates.json
bun run content:check   # pemeriksaan konten mode rilis
bun run test
bun run dev
bun run build
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
