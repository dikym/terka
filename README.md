# Terka

Boilerplate konfigurasi dari `semang`, menggunakan Next.js, React, TypeScript,
Tailwind CSS, shadcn, Supabase, dan Bun dengan versi dependency yang sama.

## Persiapan

```sh
bun install --frozen-lockfile
cp .env.example .env.local
```

Isi environment dengan kredensial proyek Terka.

## Struktur

Hierarki folder `src/`, `public/`, `supabase/`, `docs/`, dan `.github/`
mengikuti proyek sumber. Folder kosong dipertahankan dengan `.gitkeep`.
Konfigurasi tema tersedia di `src/app/globals.css` dan utilitas shadcn di
`src/lib/utils.ts`.

Halaman, layout, komponen, API, logika bisnis, aset, serta migrasi database
Semang tidak disalin. Tambahkan `src/app/layout.tsx` (dengan import
`./globals.css`) dan `src/app/page.tsx` sebelum menjalankan aplikasi.

```sh
bun run dev
bun run build
bun run lint
bun run check
bun run format
```

## Layanan

- `supabase/config.toml` menggunakan project ID `terka`, dengan seed kosong.
- Jadwal cron Vercel dikosongkan; tambahkan setelah endpoint tersedia.
- Workflow Supabase hanya berjalan manual; isi secrets `SUPABASE_URL` dan
  `SUPABASE_KEY` sebelum menjalankannya.
- `.env.local`, cache, dependency terpasang, dan pengaturan IDE sumber tidak disalin.
