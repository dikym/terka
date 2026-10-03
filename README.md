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
  `data/Terka_Special_Codes.json`, dan `data/Terka_Fun_Facts.json`.
- `src/app/`: kerangka Next.js; UI sedang ditulis ulang dari desain v2.
- `supabase/`: konfigurasi Supabase; migration belum ada.

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
