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

Logic Terka tersedia di `src/lib/terka/`: engine latihan, generator soal,
penilaian, statistik, penyimpanan IndexedDB dan backup lokal. Cara pemakaian,
perintah tes/build, dan kekurangan konten tercatat di [docs/logic.md](docs/logic.md).

```sh
bun run content:build
bun run test
bun run build:logic
```

UI desktop tersedia di `src/components/`:

- `ui`: primitif Tailwind + cva (button, badge, input, dst).
- `terka`: komponen domain — plat, kode, status kartu, fakta, pohon cakupan.
- `layout`: AppShell/sidebar, PageFrame, TwoColumn, SessionShell.
- `screens`: 23 layar statis dengan data dummy, belum terhubung ke
  `src/lib/terka`.

Route yang tersedia: `/`, `/cakupan`, `/statistik`, `/referensi`,
`/terfokus`, `/peta`, `/kartu-sulit`, `/cadangan`, `/tantangan`, `/kilat`,
dan `/sesi?screen=<key>` dengan 13 key: `tanya`, `dinilai`, `bandingkan`,
`bandingkan-dijawab`, `ringkasan`, `tanpa-petunjuk`, `sebutkan`,
`plat-utuh`, `kode-belakang`, `benar-salah`, `bukan-yang-mana`,
`fakta-kode`, `dibatalkan`.

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
