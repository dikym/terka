# TERKA — Design Document (DESIGN.md)

**Versi:** 2.0 · **Status:** Draft · **Terakhir diperbarui:** 19 September 2026 · **Bahasa:** Indonesia

Terka adalah PWA satu pengguna, offline-first, untuk menghafal kode plat nomor wilayah Indonesia
(`DK` → Bali) lewat spaced repetition. Tagline: **Lihat platnya, terka asalnya.**

Dokumen ini adalah **acuan tunggal untuk seluruh keputusan desain Terka**. Isinya lengkap dan berdiri
sendiri: seluruh nilai token, spesifikasi komponen, dan teks UI yang dibutuhkan ada di dalamnya.
Tidak perlu membuka dokumen lain untuk membangun layar. Kalau ada berkas desain lain di repositori
dan isinya bertentangan dengan dokumen ini, dokumen ini yang berlaku.

---

## 0. Cara Memakai Dokumen Ini

**Untuk siapa:** siapa pun yang membangun atau mengubah antarmuka Terka, termasuk coding agent.
Baca bagian 0–5 sekali; rujuk bagian 6–8 tiap kali menyentuh layar.

**Cakupan.** Bagian 3, 4, 5, dan 8 berlaku untuk **setiap** layar, termasuk layar yang belum ada.
Bagian 7 hanya untuk layar yang sudah dispesifikasikan.

**Aturan tanpa pengecualian.** Tujuh hal berikut tidak boleh dilanggar tanpa memperbarui dokumen ini
lebih dulu:

1. Tidak ada CTA yang memancing latihan tambahan — di layar kosong maupun di akhir sesi.
2. Urutan dan warna grading **Lagi · Sulit · Bagus · Mudah** tidak pernah berubah.
3. Istilah model data (`mature`, `leech`, `activeScope`, FSRS, retrievability) tidak pernah terlihat
   di alur belajar.
4. Transisi kartu ke kartu 0ms.
5. Focus ring tidak pernah dihapus.
6. Grade dihitung sistem, tidak pernah ditanyakan ke pengguna.
7. Pengulangan yang jatuh tempo tidak pernah disaring oleh Cakupan.

**Kalau kasusmu tidak ada di sini,** pakai komponen terdekat di bagian 4 dan pola terdekat di bagian 5.
Jangan membuat token, warna, radius, atau varian baru. Kalau benar-benar tidak ada yang cocok, catat
di bagian 11 sebagai pertanyaan terbuka.

### Selesai kalau semuanya benar

Delapan butir yang harus diperiksa sebelum satu layar dinyatakan selesai:

1. Setiap warna, ukuran tipe, jarak, radius, dan durasi berasal dari token di bagian 3 — tidak ada
   hex atau px mentah untuk hal yang sudah punya token.
2. Copy-nya persis seperti bagian 7 dan 8.4, termasuk titik dan tanda `·`.
3. Tidak ada istilah model data yang terlihat.
4. Keempat keadaan layar di bagian 5.4 sudah dirancang, bukan hanya keadaan penuh.
5. Satu angka hero, satu tombol primary, maksimal dua warna latar per layar.
6. Seluruh tindakan bisa dicapai dari keyboard, dan focus ring terlihat di semuanya.
7. Target sentuh ≥ 48px; teks ≥ 4.5:1; verdict tidak dibedakan warna saja.
8. Tidak ada CTA yang memancing latihan tambahan.

### Isi

| § | Bagian | Untuk |
| --- | --- | --- |
| 1 | Ringkasan Desain | Orientasi |
| 2 | Prinsip → Keputusan Desain | Memutuskan hal yang belum tertulis |
| 3 | Fondasi Visual | Warna, tipe, jarak, bentuk, motion, state |
| 4 | Inventaris Komponen | Memilih dan membangun komponen |
| 5 | Pola Komposisi | Menyusun komponen jadi layar |
| 6 | Peta Layar | Navigasi dan kepemilikan layar |
| 7 | Spesifikasi Layar | Membangun layar tertentu |
| 8 | Pola Lintas Layar | Status, istilah, copy, keyboard, aksesibilitas |
| 9 | Yang Sengaja Tidak Ada | Menolak usulan fitur |
| 10 | Aset yang Belum Ada | Substitusi yang perlu dikonfirmasi |
| 11 | Pertanyaan Desain Terbuka | Keputusan yang ditunda |
| 12 | Riwayat Revisi | Apa yang berubah dan kapan |

---

## 1. Ringkasan Desain

Seluruh MVP berjalan di satu kolom 420px dengan chrome tetap di atas dan bawah — kecuali selama sesi
menjawab, saat chrome hilang sepenuhnya dan loop menjawab memiliki seluruh layar.

Arah visualnya: **geometri tenang, warna yang bermain.** Radius 4px, border hairline, shadow rata
`3px 3px 0`, banyak ruang putih; yang membawa keceriaan adalah triad lampu lalu lintas (kuning
bertindak, merah berhenti, hijau membenarkan) dan tujuh pastel kawasan yang berbagi satu lightness
sehingga tidak ada kawasan yang terbaca lebih penting daripada yang lain.

Tiga hal yang membedakan Terka dari aplikasi hafalan pada umumnya:

1. **Aplikasi tidak memancing latihan tambahan.** Tidak ada CTA "latihan lagi". Layar akhir sesi hanya
   punya satu jalan keluar: **Kembali ke beranda**.
2. **Sistem tidak menanyakan hal yang bisa diukur sendiri.** Tidak ada baris penilaian yang dipilih
   pengguna; grade dihitung dari benar-salah dan waktu respons. Yang tampil sesudah menjawab adalah
   *hasil*, bukan *pertanyaan*.
3. **Alur penuh bisa dijalankan dari keyboard.** Enter mengirim, Enter lanjut, Z membatalkan, L
   menurunkan level. Karena itu focus ring adalah afordans utama, bukan detail aksesibilitas.

**Nada.** Aplikasi menyatakan fakta dan konsekuensi. Ia tidak menyemangati, tidak mendorong, dan tidak
memberi selamat.

* Benar: "Antrean hari ini habis. Kembali besok."
* Benar: "Turunkan ke Level 1 — tidak memengaruhi jadwal."
* Salah: "Hebat! Lanjutkan Hari Beruntunmu."

---

## 2. Prinsip → Keputusan Desain

| Prinsip produk | Konsekuensi di UI |
| --- | --- |
| Recall aktif lebih utama daripada pengenalan | Kolom ketik adalah kontrol utama layar soal. Pilihan ganda hanya muncul di kartu Level 1 dan tidak diberi perlakuan visual istimewa |
| Konsistensi jadwal mengalahkan volume latihan | Tidak ada badge angka di bilah bawah; angka jatuh tempo hidup di satu tempat saja, yaitu beranda |
| Kode mirip adalah sumber kesalahan utama | **Bandingkan Kode** dapat layout khusus: dua kode berdampingan dengan ukuran sama, tidak ada yang disorot lebih |
| Konteks latihan menyerupai pemakaian nyata | Soal tampil sebagai plat utuh — ground putih, ink hitam, tipe condensed — meniru plat pasca-15 Juni 2022 |
| Konteks mengalahkan pengulangan kosong | Fakta Singkat selalu tampil *sesudah* verdict; tampil *sebelum* soal hanya pada kartu Sulit Dikuasai, dan wajib disertai penjelasan |
| Cakupan membatasi materi baru, bukan pengulangan | Layar Cakupan memakai model dua langkah; menelusuri tidak mengubah apa pun sampai **Pilih wilayah ini** ditekan |
| Level mengikuti kematangan kartu | Label **Tidak memengaruhi jadwal** dan **Dihitung penuh** keduanya tampil, bukan hanya yang penurunan |
| Sistem tidak menanyakan yang bisa diukur | Baris grading adalah **tampilan hasil**, bukan kontrol pilihan |
| Data lokal dan tetap dipegang pengguna | Status cadangan punya slot tetap di beranda dan Statistik, bukan disembunyikan di Setelan |

---

## 3. Fondasi Visual

Seluruh nilai di bawah adalah token. Definisikan sekali sebagai CSS custom property, lalu rujuk lewat
`var(--nama)`. Jangan pernah menulis nilai mentah untuk hal yang sudah punya token.

### 3.1 Warna

**Ink dan paper — netral dingin.** Tidak ada hitam murni, tidak ada abu-abu netral.

| Token | Nilai | Dipakai untuk |
| --- | --- | --- |
| `--ink-1000` | `oklch(0.20 0.020 260)` | Judul, border kuat, focus ring |
| `--ink-900` | `oklch(0.26 0.020 260)` | Teks body |
| `--ink-700` | `oklch(0.42 0.016 258)` | Teks sekunder |
| `--ink-500` | `oklch(0.55 0.015 258)` | Teks muted, metadata |
| `--ink-300` | `oklch(0.73 0.012 255)` | Ikon nonaktif |
| `--ink-200` | `oklch(0.87 0.008 250)` | Border hairline |
| `--ink-100` | `oklch(0.93 0.006 250)` | Track progress |
| `--paper-50` | `oklch(0.970 0.004 250)` | Surface cekung |
| `--paper-25` | `oklch(0.985 0.003 250)` | Teks di atas ink |
| `--paper-0` | `oklch(1 0 0)` | Latar aplikasi, surface card |

**Brand — lampu lalu lintas.** Kuning bertindak, merah berhenti, hijau membenarkan. Tiap warna punya
step 700 yang dipakai **setiap kali warna itu menanggung teks**, sehingga tidak ada warna terang yang
pernah jadi tipe kecil.

| Token | Nilai | Dipakai untuk |
| --- | --- | --- |
| `--caution-500` | `oklch(0.82 0.15 75)` | **Warna tindakan utama.** Fill tombol primary, wash Cakupan aktif, text selection |
| `--caution-700` | `oklch(0.50 0.13 70)` | Kuning sebagai teks kecil dan tautan |
| `--caution-300` | `oklch(0.90 0.10 80)` | Wash penanda "perhatikan ini" |
| `--caution-100` | `oklch(0.955 0.06 78)` | Tint latar kuning |
| `--stop-500` | `oklch(0.70 0.17 25)` | Verdict salah, grade Lagi |
| `--stop-700` | `oklch(0.48 0.18 25)` | Merah sebagai teks kecil |
| `--stop-300` / `--stop-100` | `oklch(0.84 0.10 28)` / `oklch(0.945 0.055 25)` | Wash dan tint merah |
| `--go-500` | `oklch(0.74 0.14 150)` | Verdict benar, grade Bagus |
| `--go-700` | `oklch(0.42 0.12 150)` | Hijau sebagai teks kecil |
| `--go-300` / `--go-100` | `oklch(0.86 0.09 152)` / `oklch(0.945 0.055 150)` | Wash dan tint hijau |

Kuning adalah warna tindakan; hijau **hanya** berarti "benar". Jangan memakai hijau sebagai fill
tombol umum, dan jangan memakai biru sama sekali — biru tidak ada di palet UI Terka.

**Aksen sekunder.** Hanya sebagai teks step 700 atau wash step 100, tidak pernah fill besar.

| Token | Nilai | Dipakai untuk |
| --- | --- | --- |
| `--tangerine-700` | `oklch(0.47 0.16 42)` | Hari Beruntun, aktivitas |
| `--grape-700` | `oklch(0.45 0.17 298)` | Sulit Dikuasai, label `legenda` |
| `--sky-700` | `oklch(0.45 0.13 240)` | Teks informatif netral |

**Tujuh hue kawasan.** Satu lightness, satu chroma, beda hue saja.

| Token | Nilai |
| --- | --- |
| `--group-sumatera` | `oklch(0.76 0.115 28)` |
| `--group-jawa` | `oklch(0.79 0.115 80)` |
| `--group-kalimantan` | `oklch(0.78 0.110 135)` |
| `--group-sulawesi` | `oklch(0.78 0.100 190)` |
| `--group-balinusra` | `oklch(0.76 0.105 240)` |
| `--group-maluku` | `oklch(0.76 0.110 295)` |
| `--group-papua` | `oklch(0.77 0.105 340)` |

**Alias semantik.**

| Token | Nilai |
| --- | --- |
| `--bg-app`, `--surface-card` | `--paper-0` |
| `--surface-sunken` | `--paper-50` |
| `--surface-invert` | `--ink-1000` |
| `--text-title` / `--text-body` / `--text-muted` / `--text-invert` | `--ink-1000` / `--ink-900` / `--ink-500` / `--paper-25` |
| `--brand-500` / `--brand-700` | `--caution-500` / `--caution-700` |
| `--text-link` / `--text-link-hover` | `--caution-700` / `--ink-1000` |
| `--border-hairline` / `--border-strong` | `--ink-200` / `--ink-1000` |
| `--focus-ring` | `--ink-1000` — bukan hijau, karena hijau berarti "benar" |

**Grading — terkunci selamanya.** Urutan dan warnanya tidak pernah berubah di layar mana pun.

| Grade | Token | Warna |
| --- | --- | --- |
| Lagi | `--grade-again` | `--stop-500` |
| Sulit | `--grade-hard` | `--caution-500` |
| Bagus | `--grade-good` | `--go-500` |
| Mudah | `--grade-easy` | `--ink-200` |

**Verdict** (dihitung dari jawaban, tidak pernah dipilih): `--verdict-wrong` = `--stop-500`,
`--verdict-near` = `--caution-500`, `--verdict-right` = `--go-500`.

**Status kartu** — dibaca sebagai teks 12px, jadi semuanya memakai step gelap: `locked` `--ink-700`,
`new` `--go-700`, `learning` `--caution-700`, `review` `--ink-700`, `relearning` `--stop-700`,
`mature` `--go-700`, `leech` `--grape-700`, `suspended` `--ink-500`.

**Label kepercayaan fakta:** `terverifikasi` `--go-700`, `diperdebatkan` `--caution-700`,
`legenda` `--grape-700`.

**Plat:** ground `--paper-0`, ink `--ink-1000` — plat kendaraan pribadi pasca-2022.

**Aturan warna yang berlaku di semua layar.** Maksimal dua warna latar per layar (paper dan putih).
Tint selalu token level 100 yang opaque, bukan alpha, supaya teks di atasnya tetap lolos 4.5:1.
Transparansi dan blur praktis tidak dipakai.

### 3.2 Tipografi

| Keluarga | Token | Dipakai untuk |
| --- | --- | --- |
| Space Grotesk | `--font-display` | Display, judul, tombol, label |
| IBM Plex Sans | `--font-body` | Body dan prosa fakta |
| IBM Plex Mono | `--font-mono` | Kode, interval, nilai ease, milidetik, persentase |
| Barlow Semi Condensed | `--font-plate` | Hanya rendering plat |

**Skala:** hero 72px · display 44px · title 30px · heading 22px · subhead 17px · body-lg 16px ·
body-md 15px · body-sm 13px · label 12px · micro 11px.

**Leading:** tight 1.02 · snug 1.18 · normal 1.5 · loose 1.65.
**Weight:** 400 · 500 · 600 · 700.
**Tracking:** hero −0.03em · title −0.02em · normal 0 · label 0.08em · plate 0.06em.

**Gaya siap pakai.**

| Token | Definisi |
| --- | --- |
| `--type-metric` | 700 72px/1.02 display — angka hero |
| `--type-screen-title` | 700 30px/1.18 display |
| `--type-card-title` | 600 17px/1.18 display |
| `--type-body` | 400 15px/1.5 body |
| `--type-prose` | 400 16px/1.65 body — prosa fakta |
| `--type-label` | 600 12px/1.2 display, tracking 0.08em, uppercase |
| `--type-code` | 500 15px/1.3 mono |
| `--type-plate` | 700 44px/1 plate |

**Aturan.** Angka hero muncul **sekali per layar**, dan selalu angka yang pengguna pertanggungjawabkan.
`--type-label` uppercase selalu metadata (`JATUH TEMPO HARI INI`, `CAKUPAN AKTIF`), tidak pernah judul
atau tombol. Apa pun yang berupa kode plat atau angka memakai mono. Angka diformat Indonesia:
`2,1 detik`, `ease 2,5`.

### 3.3 Jarak dan layout

Basis 4px dengan setengah-langkah 2px: `0 · 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80`.

| Token | Nilai |
| --- | --- |
| `--gutter-screen` | 20px |
| `--gap-stack` | 12px |
| `--gap-section` | 32px |
| `--pad-card` | 16px |
| `--pad-control-x` / `--pad-control-y` | 16px / 12px |
| `--size-control` / `--size-control-sm` | 48px / 36px |
| `--size-tap-min` | 48px |
| `--width-app` | 420px |
| `--width-prose` | 62ch |

Kelompok sibling — tombol, chip, ikon, baris kartu, tab — selalu `display: flex`/`grid` + `gap`,
tidak pernah margin per elemen.

### 3.4 Bentuk, border, shadow

Radius: `2px` · `4px` · `8px` · `12px` · pill. **4px mengerjakan sebagian besar pekerjaan**; 8px untuk
card; 12px hanya untuk frame perangkat dan dua sudut atas sheet.

Border 1px hairline `--ink-200` untuk kontainer tenang, 1px ink untuk apa pun yang interaktif, 2px ink
untuk plat.

Shadow rata dan bergeser, tidak pernah blur ambient:

| Token | Nilai |
| --- | --- |
| `--shadow-block` | `3px 3px 0 var(--ink-1000)` |
| `--shadow-block-accent` | `3px 3px 0 var(--brand-500)` |
| `--shadow-lift` | `0 1px 0 var(--ink-200)` |
| `--shadow-overlay` | `0 12px 32px -12px oklch(0.14 0.012 60 / 0.28)` — **hanya** untuk sheet |

### 3.5 Motion

Durasi: `0ms` instan · `90ms` umpan balik kontrol · `160ms` default · `260ms` progress bar menyusul.
Easing: `--ease-out` `cubic-bezier(0.22, 1, 0.36, 1)` untuk masuk · `--ease-inout`
`cubic-bezier(0.65, 0, 0.35, 1)` · `--ease-pop` `cubic-bezier(0.34, 1.56, 0.64, 1)` hanya untuk momen
perayaan yang jarang (rekor baru).

**Transisi kartu ke kartu 0ms.** Soal berikutnya muncul langsung; tidak ada fade, slide, atau delay.

### 3.6 State interaktif

| State | Perlakuan |
| --- | --- |
| Hover | Menggelapkan atau mengisi — **tidak pernah** mengangkat |
| Press | Bergeser `translate(2px, 2px)` sepanjang shadow, shadow-nya hilang. Tekanan dirasakan, bukan dianimasikan |
| Focus | Outline 2px `--ink-1000` dengan offset 2px. **Tidak pernah dihapus** — aplikasi ini keyboard-first |
| Disabled | Opacity 40% + border hairline. Dipakai untuk batas yang memang tidak boleh diubah, misalnya batas 10 kartu baru per hari |

### 3.7 Ikon

Satu set ikon stroke, grid 24×24, stroke 2px, ujung membulat. Ukuran: 16 untuk baris padat, 20 untuk
inline, 24 untuk tindakan utama. Warna default mengikuti `currentColor`.

Ikon selalu dirender lewat satu komponen pembungkus, **tidak pernah** sebagai SVG inline yang ditulis
tangan, dan tidak pernah emoji atau glyph unicode. Ikon bersifat dekoratif (`aria-hidden`) dan selalu
berdampingan dengan label teks — kecuali di kontrol ikon-saja, yang wajib punya nama aksesibel.

Dua satuan grafis lain adalah bagian brand, bukan set ikon: **rectangle plat** (border 2px ink, ground
putih, tipe condensed) dan **titik kuning** di akhir wordmark.

### 3.8 Imagery

Tidak ada foto, tekstur, atau gradien dekoratif. Imagery yang belum tersedia dirender sebagai
`repeating-linear-gradient` bergaris dengan catatan monospace yang menyebut apa yang seharusnya ada di
situ. Jangan menggambar ilustrasi SVG sendiri.

### 3.9 Wordmark

Nama diset sebagai tipe, bukan logo: `terka` dalam Space Grotesk Bold, huruf kecil, tracking −0.04em,
diakhiri titik `--caution-700`.

---

## 4. Inventaris Komponen

Enam belas komponen menutup seluruh MVP. Bangun sekali, pakai di mana-mana; jangan menulis ulang
salah satunya secara lokal.

### 4.1 Core

| Komponen | Dipakai untuk | Varian / prop penting |
| --- | --- | --- |
| **Icon** | Semua ikon | `name`; `size` 16/20/24; `color` opsional (mengubah render jadi CSS mask supaya bisa ditint) |
| **Button** | Semua tindakan | `variant`: **primary** (fill kuning, satu per layar) · **confirm** (hijau, hanya untuk konfirmasi) · **ink** (di atas surface gelap) · **secondary** (alternatif berpasangan) · **quiet** (level daftar) · **ghost** (tersier). `size` sm/md/lg · `block` (default untuk tindakan utama di ponsel) · `kbd` menampilkan chip pintasan · `iconLeft`/`iconRight` |
| **IconButton** | Kontrol ikon tanpa teks | `label` **wajib** · `size` tidak pernah di bawah 44 di dalam loop menjawab · `tone` default/invert/bare |
| **Card** | Pengelompokan konten | `accent` = bar 4px di atas untuk klasifikasi · `tint` hanya token level 100 · `title` · `meta` (label uppercase kanan atas) · `padding` |
| **Badge** | Keadaan sistem | `color` dari token state/semantic · `tint` opsional · `dot` untuk penanda ringkas |
| **Tag** | Metadata, filter, alias | `tone` default/active/mono · `onRemove` opsional |
| **StatBlock** | Angka yang dipertanggungjawabkan | `value` · `label` uppercase · `unit` mono kecil · `size` hero/md/sm · `align` |

**Badge vs Tag.** Badge menyatakan keadaan sistem yang tidak bisa diubah pengguna (Dikuasai, Sulit
Dikuasai). Tag menyatakan label atau pilihan yang bisa dilepas atau ditekan. Kalau bisa di-`onRemove`,
ia Tag; kalau tidak, ia Badge.

### 4.2 Forms

| Komponen | Spesifikasi |
| --- | --- |
| **Input** | Tinggi 48px, `size="lg"` untuk kolom jawaban sesi. `state` correct/wrong diisi **hanya setelah** jawaban dikirim — bukan validasi saat mengetik. `mono` wajib kalau jawabannya kode plat. `hint` membawa baris koreksi ejaan. `label` di atas kolom |
| **Select** | Untuk daftar tertutup pendek. **Tidak** dipakai memilih wilayah — itu pekerjaan ScopeNode |
| **Switch** | `hint` wajib kalau konsekuensi setelannya tidak jelas dari labelnya. Setelan yang tidak boleh dimatikan dirender `disabled` dengan nilainya tetap terlihat, bukan disembunyikan |

### 4.3 Feedback

| Komponen | Spesifikasi |
| --- | --- |
| **Callout** | `tone` neutral/warn/danger/success · `label` uppercase sebagai kicker (`CADANGAN`, `TIDAK DIHITUNG`) · satu sampai dua kalimat, tidak lebih |
| **ProgressBar** | `segments` untuk jumlah kartu yang bisa dihitung; track kontinu untuk persentase. `color` memakai hue kawasan. Persentase tercetak di kanan. Animasi menyusul 260ms |
| **RingGauge** | `levels` = [L1, L2, L3], cincin terluar Level 1. Warna mengikuti hue kawasan |

### 4.4 Terka

| Komponen | Spesifikasi |
| --- | --- |
| **PlateTile** | Plat utuh: `code` + `number` + `suffix`, ground putih, ink hitam, tipe condensed, border 2px. `highlight` menandai segmen yang sedang ditanya, memakai wash `--caution-300` |
| **CodeChip** | Kode depan dengan underline 3px hue kawasannya. `filled` hanya kalau kode itu subjek layar · `selected` untuk pilihan aktif · `size` sm/md/lg |
| **GradeBar** | **Tampilan hasil, bukan kontrol pilihan.** Menampilkan grade yang sudah dihitung sistem plus interval berikutnya per grade. Tidak menerima handler pemilihan. Urutan Lagi · Sulit · Bagus · Mudah terkunci |
| **CardStateBadge** | Delapan state mesin kartu, dirender dengan label Indonesia di bagian 8.1. Nama internal hanya untuk layar debug. `interval` opsional, misalnya `21h` |
| **FactCard** | `status` (`terverifikasi`/`diperdebatkan`/`legenda`) **selalu** tampil · `source` diisi kalau ada sumber primer · prosa maksimal tiga baris |
| **ScopeNode** | Baris pohon cakupan. `level` national/group/province/code (level kode dirender mono) · `depth` mengatur indent · `color` hue kawasan dipakai dot dan meter penguasaan · `mastery` 0–100 · `active` = wash `--caution-100` + border kuat · `expandable`/`expanded` |

---

## 5. Pola Komposisi

### 5.1 Anatomi Card

Surface putih, border hairline `--ink-200`, radius 8px, `--shadow-lift`, padding 16px, dan opsional bar
warna 4px di atas untuk klasifikasi.

Yang tidak boleh: latar card bertint sebagai dekorasi, border kiri berwarna sebagai aksen, dan card di
dalam card. Kalau butuh hierarki lebih dalam, pakai jarak dan label — bukan nesting. `tint` hanya
dipakai kalau tint itu **menyampaikan keadaan** (Cakupan aktif, callout terintegrasi).

### 5.2 Pola form

Tinggi kontrol 48px, 36px untuk varian kecil. Label di atas kolom, hint di bawahnya, keduanya rata
kiri. Error bukan warna saja: frame merah **plus** baris hint yang menyebut apa yang gagal dan langkah
berikutnya. Tidak ada validasi saat mengetik di kolom jawaban — pengguna sedang mengingat, bukan
mengisi formulir.

### 5.3 Chrome dan lapisan

| Lapisan | Isi | Perilaku |
| --- | --- | --- |
| Header | Wordmark `terka` + titik kuning, kontrol ikon Setelan dan `?` | Tetap, latar putih, border bawah hairline. Tidak menyusut atau berubah saat scroll |
| Konten | Kolom 420px, gutter 20px | Menggulir di antara header dan bilah bawah |
| Bilah bawah | Empat tujuan, label + ikon | Tetap. Aktif = warna penuh, sisanya abu-abu. Tanpa badge, underline, latar, atau animasi berpindah |
| Sheet / overlay | Konfirmasi, pemilihan folder cadangan | Satu-satunya tempat `--shadow-overlay` dipakai; radius 12px hanya di dua sudut atas |
| Sesi | Loop menjawab | Header dan bilah bawah **hilang sepenuhnya** |

Tidak ada lapisan lain. Tidak ada toast, snackbar, atau notifikasi melayang — pesan status hidup di
tempatnya, sebagai Callout.

### 5.4 Empat keadaan setiap layar

| Keadaan | Perlakuan |
| --- | --- |
| **Penuh** | Keadaan normal |
| **Kosong** | Satu kalimat deskriptif dari bagian 7, rata kiri, `--text-muted`. Tidak pernah ilustrasi, tidak pernah CTA yang memancing latihan tambahan |
| **Memuat** | Data lokal terbaca dalam milidetik, jadi keadaan memuat berupa **tidak ada apa-apa** — bukan skeleton berkedip. Skeleton hanya kalau pembacaan lewat 300ms |
| **Gagal** | Callout `tone="danger"` dengan pola *apa yang terjadi → apa yang bisa dilakukan*, plus tombol pemulihan kalau ada |

Offline bukan keadaan gagal: **Sedang offline. Latihan tetap dapat digunakan.** dengan
`tone="neutral"`, dan hanya tampil kalau ada sesuatu yang memang butuh jaringan (cadangan).

### 5.5 Kepadatan dan ritme

Jarak antar-bagian 32px, antar-baris dalam bagian 12px. Satu layar punya **satu** angka hero dan
**satu** tombol primary. Kalau sebuah layar terasa butuh dua tombol primary, itu tanda layarnya
mengerjakan dua tugas dan perlu dipecah.

### 5.6 Di luar 420px

Kolom 420px adalah kanon. Di layar lebih lebar, kolom **tetap 420px dan berada di tengah** di atas
`--paper-50`; tidak ada layout dua kolom dan tidak ada sidebar. Alasannya: aplikasi dipakai satu tangan
sambil melihat plat di jalan, dan loop menjawab harus terasa identik di mana pun ia dibuka.

---

## 6. Peta Layar

Bilah bawah punya empat tujuan. Layar lain dibuka dari dalam, bukan dari bilah bawah.

| Layar | Tujuan bilah bawah | Isi ringkas |
| --- | --- | --- |
| **Beranda** | Ya | Angka jatuh tempo, Cakupan aktif, tiga tindakan latihan, status cadangan |
| **Cakupan** | Ya | Pohon Nasional → Kawasan → Provinsi → Kode, model dua langkah |
| **Statistik** | Ya | Peta Penguasaan, kartu terlemah, beban 14 hari, indikator level, kartu Sulit Dikuasai, cadangan |
| **Referensi** | Ya | Penelusuran dan pencarian seluruh data tanpa penilaian |
| **Sesi** | — (fullscreen) | Loop tanya → dinilai → Bandingkan Kode → ringkasan |
| **Setelan** | — (dari header) | Batas kartu baru, penyimpanan permanen, cadangan |
| **Pintasan keyboard** | — (tombol `?`) | Daftar seluruh pintasan |

**Referensi dan Cakupan ada di bilah bawah, bukan di beranda,** karena keduanya bukan aktivitas
latihan. Tiga tombol di beranda semuanya menjadwalkan atau menilai sesuatu; Referensi tidak, dan
Cakupan hanya mengatur.

---

## 7. Spesifikasi Layar

Seluruh teks dalam **tebal** di bawah adalah teks UI final. Pakai persis, termasuk titik dan tanda `·`.

### 7.1 Beranda

Dari atas ke bawah:

1. **Angka hero** — jumlah soal yang perlu diulang hari ini, `--type-metric`, dengan label
   `JATUH TEMPO HARI INI` dalam `--type-label`.
2. **Baris materi baru** — **4 materi baru tersedia**, angkanya mono.
3. **Kartu Cakupan aktif** — nama wilayah + persentase penguasaan, wash `--caution-100`, bisa ditekan
   sebagai jalan pintas ke tab Cakupan. Labelnya **Cakupan**.
4. **Tiga tindakan** — **Mulai belajar** (primary, fill kuning, block), lalu **Tantangan Harian** dan
   **Mode Kilat** (secondary).
5. **Indikator materi baru di luar Cakupan** — satu baris teks muted, supaya kawasan yang lebih sulit
   tidak terus tertunda.
6. **Status cadangan** — Callout bernada informatif kalau cadangan terakhir lewat 14 hari.

| Situasi | Teks UI |
| --- | --- |
| Ada pengulangan | **12 soal perlu diulang** |
| Ada materi baru | **4 materi baru tersedia** |
| Tidak ada pengulangan | **Tidak ada soal yang perlu diulang hari ini.** |
| Materi baru habis | **Semua materi di wilayah ini sudah diperkenalkan.** |
| Materi baru ditahan | **Materi baru dijeda hari ini agar sesi tetap ringan.** |

Tidak ada tombol **Latihan lagi** pada keadaan kosong. Kalau antrean habis, beranda menunjukkan jadwal
hari itu sudah beres dan berhenti di situ.

### 7.2 Sesi

Header dan bilah bawah hilang. Empat keadaan:

**a. Tanya.** Stimulus di tengah — CodeChip untuk kode tunggal, PlateTile untuk plat utuh. Input dengan
placeholder **Ketik jawaban…**, hint **Enter untuk lanjut**, dan Tag kecil penanda level soal. Kartu
Sulit Dikuasai membawa Badge **Sulit Dikuasai** plus penjelasan
**Kode ini beberapa kali terlewat. Petunjuknya ditampilkan lebih dulu.**

**b. Dinilai.** Verdict dulu, lalu bukti, lalu konteks.

| Situasi | Teks UI | Warna |
| --- | --- | --- |
| Benar | **Benar** | `--verdict-right` |
| Benar dengan koreksi ejaan | **Benar · ejaan diperbaiki** | `--verdict-near` |
| Salah | **Belum tepat** lalu **Jawaban: Bengkulu** | `--verdict-wrong` |
| Batas waktu habis | **Waktu habis** | `--verdict-wrong` |
| Jawaban terakhir dibatalkan | **Jawaban dibatalkan** | netral |

Di bawahnya GradeBar menampilkan grade yang **sudah dihitung sistem**, lalu satu FactCard dengan label
statusnya. Kontrol level menampilkan konsekuensinya inline: **Tidak memengaruhi jadwal** saat
diturunkan, **Dihitung penuh** saat dinaikkan. Keduanya wajib tampil — tanpa label kenaikan, fitur
level terasa semata-mata pembatas.

Nama level boleh tampil: **Level 1 · Kenali**, **Level 2 · Ingat**, **Level 3 · Kuasai**.

**c. Bandingkan Kode.** Judul **Bandingkan Kode**, pengantar yang menyebut kedua kode secara eksplisit
(**BE dan BD sering tertukar. Bedakan keduanya.**), dua CodeChip berukuran sama. Setelah benar:
**Benar**. Pasangan selesai: **Latihan khusus untuk pasangan ini selesai.** Jangan pernah memakai
istilah seperti "pasangan kebingungan".

**d. Ringkasan.** Judul **Sesi selesai**. Lima metrik dengan label tetap: **Akurasi**,
**Rata-rata waktu respons**, **Kode yang perlu dibedakan**, **Penguasaan wilayah**, **Soal dijawab**.
Kosong: **Tidak ada kode baru yang sering tertukar.** dan
**Penguasaan wilayah belum berubah pada sesi ini.** Satu jalan keluar: **Kembali ke beranda**.

**Latihan Terfokus** memakai loop yang sama dengan tiga tambahan: judul
**Latihan Terfokus · Kawasan Maluku**, pengantar **Latihan tambahan. Jadwal tidak berubah.**, dan
penanda per soal **Soal ini juga dihitung untuk jadwal hari ini.** pada kartu yang memang jatuh tempo.
Penanda per soal wajib — tanpanya pengguna tidak bisa membedakan dua perilaku yang bercabang. Kosong:
**Belum ada materi yang bisa dilatih di wilayah ini.** Selesai: **Latihan selesai** dengan ringkasan
**12 soal dijawab · akurasi 83%**. Ringkasan ini tidak menampilkan perubahan penguasaan wilayah.

### 7.3 Cakupan

Pohon empat tingkat dirender dengan ScopeNode; tiap node membawa hue kawasannya.

**Model dua langkah.** Menelusuri hanya menyorot dan menampilkan jumlah materi baru. Cakupan baru
berubah setelah **Pilih wilayah ini** ditekan. Ini disengaja: salah satu guna pemilih adalah
membandingkan beberapa wilayah sebelum memutuskan, dan pengguna tidak boleh keluar dengan Cakupan yang
berubah tanpa pernah bermaksud mengubahnya.

| Situasi | Teks UI |
| --- | --- |
| Judul tab | **Cakupan** |
| Wilayah aktif | **Aktif sekarang** |
| Jumlah materi | **8 materi baru tersedia** |
| Terapkan pilihan | **Pilih wilayah ini** |
| Latihan tanpa mengganti pilihan | **Latih wilayah ini** |
| Tidak ada materi baru | **Tidak ada materi baru di wilayah ini.** |
| Kembali ke nasional | **Seluruh Indonesia** |

Dua tombol di kaki layar tidak boleh berlabel mirip: **Pilih wilayah ini** (primary, mengubah Cakupan)
dan **Latih wilayah ini** (secondary, memulai Latihan Terfokus tanpa mengubah apa pun).

### 7.4 Statistik

Tiga tampilan saja, supaya layar ini tidak tumbuh jadi dashboard:

1. **Peta Penguasaan** — SVG statis Indonesia, diwarnai makin pekat seiring naiknya penguasaan; `id`
   elemennya sama dengan id node cakupan. Aset belum ada (bagian 10).
2. **Kartu terlemah** — diurut menurut tingkat kesalahan; tiap baris CodeChip + CardStateBadge.
3. **Perkiraan beban 14 hari** — ProgressBar per kawasan, memakai hue kawasan.

Ditambah **Indikator Tingkat Penguasaan**: tiga RingGauge per wilayah untuk persentase kartu yang lolos
Level 1 / 2 / 3. Lingkaran Level 3 hampir selalu paling kecil, dan itulah yang paling informatif. Di
bawahnya daftar kartu **Sulit Dikuasai** dengan CTA **Tinjau kartu**, lalu status cadangan.

| Situasi | Teks UI |
| --- | --- |
| Kartu dinonaktifkan otomatis | **Kode ini dinonaktifkan sementara. Tinjau di halaman statistik.** |
| Diaktifkan kembali | **Kode ini diaktifkan kembali dan dimulai dari awal.** |
| Cadangan diperbarui | **Cadangan diperbarui** |
| Waktu cadangan | **Terakhir dicadangkan 2 hari lalu** |
| Cadangan basi | **Cadangan terakhir sudah lebih dari 14 hari.** |
| CTA | **Perbarui cadangan** |
| Izin folder hilang | **Akses ke folder cadangan terputus. Pilih folder lagi.** → **Pilih folder** |
| Peramban tidak mendukung | **Cadangan otomatis belum didukung di peramban ini. Unduh cadangan secara manual.** → **Unduh cadangan** |
| Pemulihan selesai | **Cadangan berhasil dipulihkan** |

### 7.5 Referensi

Kolom pencarian di atas (dibuka dengan `/`), lalu hierarki yang sama dengan Cakupan tapi tanpa
penilaian. Entri yang tingkat kepercayaannya kurang tetap tampil, diberi Tag dan catatan.

| Situasi | Teks UI |
| --- | --- |
| Kolom pencarian | **Cari kode atau wilayah…** |
| Tidak ada hasil | **Tidak ada hasil untuk "{query}".** |
| Entri belum cukup kuat | **Belum terverifikasi penuh** |
| Catatan | **Tersedia di Referensi, belum masuk latihan.** |

Label kepercayaan internal `high`/`medium`/`low` tidak pernah dirender mentah.

### 7.6 Tantangan Harian dan Mode Kilat

| Tantangan Harian | Teks UI |
| --- | --- |
| Sebelum mulai | **5 soal · sekali sehari** |
| Tombol | **Mulai tantangan** |
| Selesai | **Tantangan hari ini selesai** |
| Sudah dikerjakan | **Sudah selesai untuk hari ini** |
| Toleransi dipakai | **Jatah toleransi digunakan hari ini.** |
| Label rangkaian | **Hari Beruntun** |

| Mode Kilat | Teks UI |
| --- | --- |
| Pengantar | **60 detik · jawab sebanyak mungkin** |
| Tombol | **Mulai** |
| Waktu habis | **Waktu habis** |
| Skor | **24 jawaban benar** |
| Wilayah yang dimainkan | **Mode Kilat · Kawasan Maluku** |
| Rekor baru | **Rekor baru di Kawasan Maluku: 24** |
| Bukan rekor | **Rekor terbaik di Kawasan Maluku: 31** |
| Belum ada rekor | **Belum ada rekor untuk wilayah ini.** |

Nama wilayah wajib disebut di setiap tampilan rekor, karena rekor dicatat terpisah per wilayah dan
angka tanpa nama wilayah menyesatkan. Rekor baru boleh ditandai secara visual — `--ease-pop` boleh
dipakai di sini — tanpa kalimat perayaan tambahan. Kalau satu hari terlewat, jangan memakai pesan
seperti "Hari Beruntunmu rusak"; cukup sampaikan keadaan catatannya.

### 7.7 Setelan dan Pintasan

**Setelan** memuat batas kartu baru per hari, konfirmasi jawaban, penyimpanan permanen, dan cadangan
otomatis. Batas yang menurut aturan produk tidak boleh dimatikan dirender **disabled dengan nilainya
tetap terlihat** — pengguna perlu tahu batasnya ada.

**Pintasan** adalah daftar tombol keyboard, dibuka dengan `?`, dan isinya harus persis sama dengan
perilaku sebenarnya (bagian 8.5).

---

## 8. Pola Lintas Layar

### 8.1 Status kartu

Status internal **tidak pernah** dirender mentah di alur belajar.

| Internal | Label UI |
| --- | --- |
| `new` | **Belum Dipelajari** |
| `learning`, `review`, `relearning` | **Sedang Dipelajari** |
| `mature` | **Dikuasai** |
| `leech` | **Sulit Dikuasai** |
| `suspended` karena data | **Dinonaktifkan · data perlu diverifikasi** |
| `suspended` karena kegagalan | **Dinonaktifkan · perlu ditinjau** |

Status detail hanya muncul di Statistik atau pemeriksaan kartu — tidak di tiap soal, karena tidak
membantu proses menjawab.

### 8.2 Istilah UI

| Konsep | Label UI |
| --- | --- |
| Wilayah yang dipilih untuk materi baru | **Cakupan** |
| Sesi harian utama | **Mulai belajar** |
| Latihan tambahan untuk satu wilayah | **Latih wilayah ini** → **Latihan Terfokus** |
| Tingkat kedua hierarki | **Kawasan** |
| Satu node yang sedang disorot | **wilayah** |
| Navigasi bawah | **bilah bawah** |
| Drill dua kode yang sering tertukar | **Bandingkan Kode** |
| Visual penguasaan | **Peta Penguasaan** |
| Kartu `due` | **soal yang perlu diulang** |
| Kartu yang belum pernah dipelajari | **materi baru** |

Satu istilah untuk satu konsep. **Cakupan** adalah nama pengaturannya; **wilayah** adalah yang dipilih
untuk mengisi pengaturan itu. Istilah "Wilayah Belajar" dan "lingkup" tidak dipakai. `node` dan
`activeScope` tidak pernah tampil.

### 8.3 Cakupan vs Latihan Terfokus

Dua konsep ini paling gampang tertukar, jadi dibedakan secara visual di setiap kemunculannya: Cakupan
memakai wash kuning dan kata kerja **Pilih**; Latihan Terfokus tidak punya wash dan memakai kata kerja
**Latih**. Pengulangan yang jatuh tempo tidak pernah disaring cakupan, dan UI tidak boleh menyiratkan
sebaliknya.

### 8.4 Nada dan copy

1. Teks tombol 1–4 kata. Pesan status satu kalimat.
2. Sentence case untuk prosa dan tombol. Yang berkapitalisasi nama hanya nama fitur: **Tantangan
   Harian**, **Mode Kilat**, **Bandingkan Kode**, **Latihan Terfokus**, **Peta Penguasaan**,
   **Hari Beruntun**.
3. UPPERCASE hanya untuk label 12px, yang selalu metadata.
4. Hindari bahasa yang menghakimi: **Belum tepat**, bukan "Salah!". **Perlu ditinjau**, bukan kalimat
   yang menyiratkan pengguna gagal.
5. Pesan error selalu **apa yang terjadi → apa yang bisa dilakukan**. Hindari "Terjadi kesalahan".
6. Jangan memancing latihan tambahan setelah sesi selesai.
7. Angka mengalahkan kalimat panjang: **12 soal perlu diulang**, bukan versi panjangnya.
8. Status bersifat deskriptif, bukan motivasional.
9. Tanpa emoji. Ikonografi lewat set ikon saja.

**Pesan error baku.**

| Kondisi | Teks UI |
| --- | --- |
| Data belajar gagal dibaca | **Data belajar tidak dapat dibuka. Coba muat ulang aplikasi.** |
| Data referensi gagal dimuat | **Data plat tidak dapat dimuat. Coba buka kembali aplikasi.** |
| Penyimpanan permanen tidak tersedia | **Penyimpanan permanen tidak tersedia. Pastikan cadangan data tetap aktif.** |
| Gagal tetapi aman dicoba lagi | **Perubahan belum tersimpan. Coba lagi.** |
| Offline | **Sedang offline. Latihan tetap dapat digunakan.** |

### 8.5 Keyboard

| Konteks | Tombol |
| --- | --- |
| Sesi | `Enter` kirim jawaban · `Enter` kartu berikutnya · `Z` batalkan penilaian terakhir · `L` turunkan level soal · `Esc` keluar sesi |
| Di luar sesi | `S` Mulai belajar · `T` Tantangan Harian · `B` Mode Kilat · `C` ganti Cakupan · `/` cari di Referensi · `?` daftar pintasan |

Konsekuensi desain: setiap kontrol wajib punya focus state yang terlihat, urutan tab mengikuti urutan
baca, dan tidak ada tindakan yang hanya bisa dicapai dengan pointer. Kalau satu pintasan berubah,
layar Pintasan berubah di perubahan yang sama.

### 8.6 Aksesibilitas

Target sentuh minimal 48px. Teks minimal 4.5:1 terhadap latarnya — karena itu setiap warna dipakai
sebagai step 700 saat menanggung teks, dan tint memakai token level 100 yang opaque, bukan alpha.
Verdict tidak boleh dibedakan warna saja: **Benar** dan **Belum tepat** selalu berupa teks. Ikon
dekoratif dan selalu berdampingan dengan label, kecuali kontrol ikon-saja yang wajib punya nama
aksesibel. Focus ring tidak pernah dihapus.

---

## 9. Yang Sengaja Tidak Ada

- **Onboarding, login, tutorial, multi-user** — satu pengguna; aplikasi dibuka langsung ke beranda.
- **Badge angka di bilah bawah** — menduplikasi angka jatuh tempo jadi tekanan yang terus-menerus.
- **CTA sesi tambahan** di layar kosong maupun ringkasan sesi.
- **Tombol penilaian yang dipilih pengguna** — grade dihitung sistem.
- **XP, level akun, badge koleksi, misi harian bertingkat, mata uang dalam aplikasi** — menggeser fokus
  dari penguasaan materi ke pengumpulan poin.
- **Peta interaktif sebagai mode soal** — fase berikutnya. Peta MVP statis dan hanya untuk dilihat.
- **Toast, snackbar, notifikasi melayang** — pesan status hidup di tempatnya.
- **Gradien, foto, tekstur, blur** — kecuali satu shadow overlay untuk sheet.
- **Biru sebagai warna UI** — tidak ada di palet.
- **Ilustrasi SVG yang digambar sendiri** — imagery yang belum ada tampil sebagai placeholder bergaris.

---

## 10. Aset yang Belum Ada

| Hal | Keadaan sekarang | Yang dibutuhkan |
| --- | --- | --- |
| Logo | Wordmark tipografis: `terka` Space Grotesk Bold −0.04em + titik kuning | Konfirmasi, atau file logo |
| Font | Space Grotesk, IBM Plex Sans, IBM Plex Mono, Barlow Semi Condensed dari layanan font web | File lokal — PWA offline tidak boleh bergantung host remote |
| Set ikon | Satu set ikon stroke 24×24, 2px, ujung membulat | Konfirmasi set yang dipakai, atau kirim set lain |
| Peta Penguasaan | Placeholder bergaris | SVG statis Indonesia dengan `id` = id node cakupan |
| Plat | Rectangle border 2px ink, ground putih, tipe condensed | Konfirmasi proporsi terhadap plat asli pasca-2022 |

---

## 11. Pertanyaan Desain Terbuka

1. Penanda per soal di Latihan Terfokus — apakah malah mendorong Latihan Terfokus dipakai sebagai
   pengganti sesi harian? Kalau iya, penandanya diganti ringkasan di akhir sesi saja.
2. Apakah GradeBar masih terbaca sebagai kontrol pilihan meski tidak bisa ditekan? Kalau iya, bentuknya
   perlu diubah supaya tidak lagi menyerupai baris tombol.
3. Butir berlabel `legenda` — cukup jadi konteks pasif, atau layak jadi materi soal tersendiri?
   Menjadikannya soal berisiko memperkuat cerita yang justru ingin ditandai lemah.
4. Tiga RingGauge per wilayah di lebar 420px — apakah masih terbaca, atau perlu disederhanakan jadi
   satu gauge Level 3 dengan dua lainnya di detail wilayah?

---

## 12. Riwayat Revisi

| Versi | Tanggal | Perubahan |
| --- | --- | --- |
| 2.0 | 2026-09-19 | Dokumen dijadikan mandiri: seluruh nilai token, spesifikasi komponen, dan teks UI diinlinekan; seluruh rujukan ke berkas lain dihapus. Keputusan yang sebelumnya tercatat sebagai catatan kesesuaian sekarang dinyatakan langsung sebagai aturan (kuning sebagai warna tindakan, biru dipensiunkan, GradeBar sebagai tampilan hasil, wash aktif kuning, penanda plat memakai `--caution-300`) |
| 1.0 | 2026-09-19 | Dokumen awal |

**Cara memperbarui dokumen ini.** Setiap perubahan desain yang mengubah perilaku, copy, atau token
masuk ke tabel di atas dalam commit yang sama dengan perubahannya. Keputusan yang ditolak dicatat di
bagian 9; keputusan yang ditunda di bagian 11 — supaya pertanyaan yang sama tidak dibuka dua kali.
