# TERKA — Technical Requirements Document (TRD)

**Status:** Draf · **Bahasa:** Indonesia
**Acuan:** Dokumen Kode Plat Nomor Kendaraan Indonesia (sumber data)
**Dokumen terkait:** PRD (produk dan alur pengguna) · SRD (aturan perilaku sistem) · ERD (`Terka_ERD.puml`, `Terka_ERD.md`) · Special Codes (`Terka_Special_Codes.md`, `../data/special-codes.json`) · Fun Facts (`Terka_Fun_Facts.md`, `../data/fun-facts.json`) · Microcopy (`Terka_Microcopy.md`) · Tests (`Terka_Tests.md`)

> **Slogan:** Lihat pelatnya, terka asalnya.
> **Fokus dokumen ini:** arsitektur local-first, integrasi Supabase, model data, sinkronisasi, keamanan, dan pipeline build.

---

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menetapkan arsitektur, model data, sinkronisasi, keamanan, cadangan, dan pipeline build Terka. Isinya menjawab dengan apa sistemnya dibangun dan bagaimana datanya disimpan dan disinkronkan. Tes teknisnya ada di `Terka_Tests.md` bagian 6.

Aturan perilaku — penjadwalan, penilaian jawaban, status kartu, konsistensi antarperangkat — ada di SRD. Konteks produk dan alur pengguna ada di PRD; teks antarmuka ada di Microcopy.

---

## 2. Gambaran Arsitektur

Antarmuka Next.js membaca keadaan aplikasi dari mesin penjadwalan. Mesin tersebut menghitung riwayat yang disimpan di IndexedDB melalui Dexie. Konten berasal dari `plates.json` yang tersedia bersama aplikasi. Saat pengguna masuk akun, antrean kirim mengirim perubahan ke Supabase dan mengambil riwayat dari perangkat lain; latihan tetap menggunakan penyimpanan lokal.

**Latihan tetap berjalan sepenuhnya tanpa jaringan.** Jalur menjawab soal tidak pernah menunggu request ke server. Jawaban ditulis ke IndexedDB, mesin penjadwalan memperbarui keadaan aplikasi secara lokal, lalu event yang sama masuk antrean kirim untuk dikirim belakangan. Supabase bukan syarat untuk berlatih; ia tempat salinan di luar perangkat dan jembatan antarperangkat.

**Mengapa ada backend.** Tiga kebutuhan tidak bisa dipenuhi penyimpanan lokal saja:

1. Pemakaian nyata terbagi dua: ponsel saat melihat pelat di jalan, laptop saat sesi harian. Tanpa sinkronisasi, dua perangkat berarti dua riwayat yang saling tidak tahu, dan jadwal FSRS di keduanya salah.
2. Cadangan ke folder cloud lewat `showDirectoryPicker` dari File System Access API hanya tersedia di browser berbasis Chromium desktop. Di Safari iOS jalur itu tidak ada — tepat di perangkat yang paling sering dipakai.
3. Optimasi parameter FSRS (SRD bagian 4.12) memerlukan riwayat lengkap yang tidak hilang saat data browser dibersihkan.

**Log event jadi data acuan.** Setiap tindakan yang memengaruhi jadwal disimpan sebagai event immutable dengan `id` UUID yang dibuat klien. Status kartu, pasangan tertukar, Hari Beruntun, rekor Mode Kilat, dan status leech semuanya turunan, dihitung ulang dari log. Dengan cara ini, sinkronisasi hampir bebas konflik: menggabungkan dua riwayat cukup dengan mengambil gabungan event dan membuang duplikat `id`. Data jawaban mentah (SRD bagian 4.5) adalah satu-satunya sumber.

**Konten tetap di bundle, bukan di Supabase.** `plates.json` dibangun dari data kurasi di `data/`, dikunci versinya di repositori, di-precache service worker, dan diuji saat build. Memindahkannya ke database hanya menambah satu hal yang bisa gagal saat offline. Supabase menyimpan data pengguna saja.

**Tanpa server aplikasi terpisah.** Tidak ada Edge Function. Logika jadwal dan penilaian berjalan di klien. Postgres menyimpan data, menegakkan kepemilikan, persetujuan, validasi struktur, LWW, kuota, dan penghapusan akun lewat RLS, constraint, trigger, serta fungsi terbatas yang dijelaskan di bagian 9. Fungsi database ini tidak menghitung jadwal belajar.

Konsekuensinya, server tidak memeriksa apakah jawaban benar atau jadwal valid. Terka publik, dan keputusan ini tetap aman dengan satu alasan: tidak ada data satu pengguna yang memengaruhi pengguna lain. Tidak ada papan peringkat, tidak ada skor bersama. Pengguna yang memalsukan riwayatnya sendiri hanya merusak jadwalnya sendiri. Yang perlu dijaga adalah perlindungan terhadap penyalahgunaan infrastruktur — pendaftaran massal dan kiriman data dalam jumlah besar — yang dibahas di bagian 9. Jika fitur kompetitif ditambahkan (PRD bagian 11, Fase 4), validasi di sisi server wajib ada lebih dulu.

**Pengguna tanpa akun tidak menyentuh Supabase.** Seluruh latihan, termasuk optimasi parameter, rotasi fakta, dan tes penempatan, berjalan dari log lokal. Supabase baru dihubungi saat pengguna memilih login. Konsekuensinya bagus untuk biaya dan privasi: ribuan pengunjung anonim tidak menambah satu baris pun di database, dan hanya memakai hosting statis serta analitik kunjungan yang dijelaskan di bagian 3.

---

## 3. Teknologi yang Digunakan

- **Frontend:** Next.js (App Router) + TypeScript, Tailwind CSS. Dibangun sebagai static export (`output: 'export'`) ke folder `out/`, tanpa server Next.js saat runtime. Batasan static export dan penanganannya ada di bagian 7
- **Keadaan aplikasi management:** Zustand
- **Penyimpanan lokal:** IndexedDB via Dexie; `navigator.storage.persist()` dipanggil saat pertama kali dibuka
- **Auth dan sinkronisasi:** `@supabase/supabase-js` v2 dengan `flowType: 'pkce'`; Supabase Auth dengan provider Google dan email (magic link plus kode OTP); Postgres dengan RLS; Data API dengan grant eksplisit (bagian 9)
- **Scheduler:** ts-fsrs dengan FSRS-6. Versinya dikunci persis, tanpa `^` atau `~`, karena hasil replay bergantung pada rumus library (bagian 4.4)
- **Optimizer:** `@open-spaced-repetition/binding` (fsrs-rs yang dikompilasi ke WebAssembly), jalan di Web Worker tanpa threading supaya tidak memerlukan header COOP/COEP. Paketnya masih public beta, jadi versinya juga dikunci persis dan kegagalannya tidak pernah menghentikan aplikasi
- **Data:** `plates.json` statis, dihasilkan saat build dari `../data/plate-curation.json`, `../data/special-codes.json`, dan `../data/fun-facts.json`; hierarki cakupan dibentuk dari properti `group` dan `province`
- **PWA:** service worker dibuat setelah `next build` dengan `workbox-build` (`injectManifest`) atas isi folder `out/`, memakai strategi precache penuh. Cara ini tidak bergantung pada bundler Next.js yang dipakai Versi baru tidak memakai `skipWaiting` saat install; ia menunggu agar sesi yang berjalan tidak berganti aset di tengah jalan. Klien memeriksa versi baru saat aplikasi kembali terlihat atau online (paling cepat tiap 60 detik). Versi yang menunggu dipasang diam-diam lewat `SKIP_WAITING` dan reload begitu tidak ada sesi (`/sesi`) dan tidak ada kolom yang sedang diketik. Tidak ada toast atau pesan; selama sesi berjalan versi baru menunggu sampai pengguna keluar dari sesi.
- **Peta:** SVG statis wilayah Indonesia, diwarnai lewat CSS variable. Elemen provinsi memakai `id` yang sama persis dengan `id` cakupan provinsi, kawasan ditandai `data-group` dengan `id` kawasannya, dan elemen akar ber-`id` `indonesia`. Kawasan tidak memakai `id` karena `papua` dan `maluku` adalah `id` kawasan sekaligus provinsi, sedangkan `id` elemen wajib unik
- **Deployment:** Vercel, situs statis tanpa server function. Environment variable `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable key `sb_publishable_…`, pengganti anon key lama) bersifat publik; keamanannya ada di RLS, bukan di kerahasiaan key. Paket Hobby hanya boleh untuk pemakaian pribadi non-komersial; Terka gratis tanpa iklan masih masuk batas itu, dan menambahkan iklan atau pembayaran berarti harus pindah ke Pro
- **Region Supabase:** Singapura, wilayah terdekat untuk pengguna di Indonesia
- **Domain:** `terka.my.id`, dipasang di Vercel sebagai domain produksi. `terka.vercel.app` tetap ada dan dialihkan permanen (308) ke `terka.my.id`. Preview deployment tetap memakai subdomain `vercel.app` dengan proyek Supabase staging. IndexedDB terikat ke origin, jadi progres tanpa akun di `terka.vercel.app` tidak terbaca di `terka.my.id`. Karena itu rilis publik langsung memakai `terka.my.id`, dan pengalihan dipasang sebelum ada pengguna di alamat lama
- **DNS:** dikelola di Cloudflare paket gratis. Record untuk Vercel memakai mode DNS only, tanpa proxy Cloudflare, supaya sertifikat dan routing tetap diurus Vercel
- **Email login:** Resend paket gratis sebagai SMTP Supabase Auth, pengirim `no-reply@terka.my.id`. Alamat ini hanya untuk mengirim dan tidak menerima balasan. Domain diverifikasi dengan SPF, DKIM, dan DMARC. Layanan email bawaan Supabase tidak dipakai karena hanya mengirim ke anggota tim proyek
- **Email masuk:** Cloudflare Email Routing meneruskan `contact@terka.my.id` ke email pribadi pemilik proyek. Tidak ada kotak surat berbayar
- **CAPTCHA:** Cloudflare Turnstile di endpoint login email lewat fitur CAPTCHA Supabase Auth
- **Biaya:** perpanjangan domain `terka.my.id` per tahun. Vercel Hobby, Supabase Free, Google Cloud OAuth, Resend Free, Turnstile, dan Cloudflare DNS serta Email Routing semuanya gratis. Biaya lain baru muncul jika pemicu di bagian 6 tercapai
- **Google Cloud:** satu OAuth client bertipe Web application, dengan layar persetujuan OAuth berstatus produksi
- **Analitik kunjungan:** Vercel Web Analytics lewat `@vercel/analytics`. Tanpa cookie; pengunjung dikenali lewat hash dari request, dan data disimpan teranonimkan. Hanya page view yang dipakai, karena paket Hobby tidak mendukung custom event. Jatahnya 50.000 event per bulan; jika habis, pengumpulan berhenti sementara tanpa biaya dan tanpa memengaruhi aplikasi. Setiap layar utama memiliki path sendiri — `/`, `/sesi`, `/cakupan`, `/statistik`, `/referensi`, `/tentang` — dan soal di dalam sesi tidak mengubah path, supaya satu jawaban tidak menghabiskan satu event
- **Paket Supabase:** Free saat rilis, dengan pemicu pindah ke Pro di bagian 6
- **Pengujian:** `bun test` (API `bun:test`), fast-check, fake-indexeddb, Supabase CLI (stack lokal dan pgTAP), Playwright (`Terka_Tests.md`)

---

## 4. Model Data dan Data Acuan

### 4.1 Konten: `plates.json`

Seluruh konten berasal dari satu file JSON yang dihasilkan dari `../data/plate-curation.json` (kode, kab/kota, dan kawasan hasil kurasi dokumen referensi), `../data/special-codes.json`, dan `../data/fun-facts.json`, lalu dikunci saat build. Build hanya membaca JSON; dokumen Markdown tidak dibaca. Contoh berikut adalah potongan skema, bukan dataset lengkap yang memenuhi jumlah tier atau cakupan nasional. Progres pengguna terhubung ke konten lewat `id` stabil, jadi pembaruan data tidak menghapus riwayat belajar.

```json
{
  "version": "2026.10.01",
  "contentRev": 12,
  "groups": [{ "id": "bali-nusa-tenggara", "name": "Bali & Nusa Tenggara" }],
  "regions": [
    {
      "id": "dk",
      "code": "DK",
      "region": "Bali",
      "group": "bali-nusa-tenggara",
      "province": "bali",
      "spans": [],
      "placementTier": "common",
      "confidence": "high",
      "aliases": ["Pulau Bali"],
      "facts": ["fact-bali-lombok-dk"],
      "areas": [
        { "areaId": "kota-denpasar", "confidence": "high" },
        { "areaId": "kab-badung", "confidence": "high" }
      ]
    }
  ],
  "areas": [
    {
      "id": "kota-denpasar",
      "type": "kota",
      "name": "Denpasar",
      "province": "bali",
      "aliases": [],
      "variants": []
    }
  ],
  "facts": [
    {
      "id": "fact-bali-lombok-dk",
      "historyLabel": "terverifikasi",
      "text": "...",
      "publicationStatus": "ready",
      "source": ["conam-ned-indie", "perpol-7-2021"],
      "sourceCheckedAt": "2026-10-01"
    }
  ],
  "sources": [
    {
      "id": "perpol-7-2021-lampiran",
      "title": "Lampiran Peraturan Kepolisian Negara RI Nomor 7 Tahun 2021 tentang Registrasi dan Identifikasi Kendaraan Bermotor",
      "publisher": "Polri; salinan JDIH BPK",
      "type": "peraturan",
      "date": "2021-05-05",
      "url": "https://peraturan.bpk.go.id/Details/225016/perpol-no-7-tahun-2021",
      "originalUrl": "https://peraturan.bpk.go.id/Download/219644/...",
      "locator": "Lampiran huruf B (kode registrasi), huruf D angka 4 (kode negara CD, hlm. 99–102), huruf F (TNKB khusus RI, hlm. 103–104)",
      "checkedAt": "2026-09-24"
    }
  ],
  "specials": [
    {
      "id": "cd-49-jepang",
      "series": "CD",
      "number": "49",
      "holder": "Jepang",
      "holderType": "country",
      "aliases": ["Japan"],
      "sourceName": "Jepang",
      "confidence": "high",
      "needsReview": false,
      "sources": ["perpol-7-2021-lampiran"],
      "validFrom": "2021-05-05",
      "reviewBy": "2027-03-24"
    }
  ]
}
```

**Versi konten.** `version` adalah tanggal rilis yang dibaca manusia. `contentRev` adalah bilangan bulat yang naik satu setiap kali `plates.json` berubah, termasuk perubahan `specials[]`; nilai inilah yang disimpan di `review_logs.content_version` karena dua byte cukup. `contentHistory` memetakan setiap `contentRev` lama ke `version`-nya. Build gagal jika `contentRev` tidak naik saat isi berubah, atau jika entri lama di `contentHistory` diubah.

`regions[].province` adalah provinsi utama pengelompokan kartu; `spans` mencatat provinsi lain yang menggunakan kode tersebut. `placementTier` berisi `common`, `medium`, atau `rare`. ID kode dan daerah harus tetap stabil. `regions[].group` wajib terdaftar di daftar kawasan `groups` pada `data/plate-curation.json`. Daftar itu ikut ke `plates.json` sebagai `groups[]` berisi `id` dan nama tampilan kawasan, misalnya "Bali & Nusa Tenggara", karena nama itu tidak bisa diturunkan dari `id`. Nama provinsi diturunkan dari `id` provinsi.

**Satu mode, satu kartu.** Identitas kartu selalu berbentuk `contentId::mode`. Kode wilayah memakai `regions[].id` dengan tiga mode: `code2region`, `region2code`, dan `setrecall`. Bentuk Tebak berwaktu adalah soal Level 3 dari kartu `code2region` atau `region2code`, bukan mode kartu. Kode khusus memakai `specials[].id` dengan dua mode: `special2holder` dan `holder2special`. Kombinasi lain ditolak. Identitas ini tetap sama ketika bentuk soal atau tingkat kesulitan berubah. Kartu dibentuk dari `plates.json`; status dan jadwalnya dihitung dari riwayat. Tidak ada tabel tersendiri untuk menyimpan daftar kartu.

**Publikasi fakta.** `facts[]` memuat `historyLabel`, `publicationStatus`, `source`, dan `sourceCheckedAt`. `source` berisi daftar `id` dari `sources[]`; `id` pertama tampil sebagai sumber di layar akhir. `historyLabel` berisi label sejarah — `terverifikasi`, `diperdebatkan`, atau `mitos` — dan menggantikan nama properti lama `status`, yang terlalu umum dan mudah tertukar dengan `publicationStatus`. Label sejarah tidak membuktikan sumber telah diperiksa. Butir `ready` wajib memiliki sumber yang dapat ditelusuri dan tanggal pemeriksaan; penetapan ready dilakukan editor setelah pemeriksaan, bukan otomatis. Butir draf tidak dipilih aplikasi. Jika tidak ada fakta siap terbit, layar akhir menghilangkan blok fakta dan tidak menulis `fact_views`. Prosedur editorial dan aturan build fakta ada di `Terka_Fun_Facts.md` bagian 2 dan 3. `sources[]` di `plates.json` menggabungkan sumber dari `../data/special-codes.json` dan `../data/fun-facts.json`; `id` yang sama di kedua berkas wajib berisi data yang sama.

**Kode khusus: `specials[]`, `referencePlates[]`, dan `sources[]`.** Data lengkap dan alasan label setiap entri ada di `Terka_Special_Codes.md`. Data yang dibaca build ada di `../data/special-codes.json`, yang menjadi sumber `specials[]`, `referencePlates[]`, dan `sources[]`. Build hanya membaca JSON; Markdown tidak dibaca build. `riPairs[]` di JSON itu hanya bahan Fun Facts dan tidak disalin ke `plates.json`. `specials[]` hanya berisi kode negara CD dan menjadi satu-satunya sumber kartu kode khusus. Properti per entri:

| Properti                | Isi                                                                             |
|-------------------------|---------------------------------------------------------------------------------|
| `id`                    | `cd-{nomor}-{slug}`; slug diambil dari pemegang, maksimal 32 karakter total     |
| `series`                | Selalu `CD`; nilai lain ditolak build                                           |
| `number`                | Kode negara sebagai teks angka tanpa nol di depan                               |
| `holder`                | Nama baku yang ditampilkan dan diterima sebagai jawaban                         |
| `holderType`            | `country` atau `organization`; UI menampilkannya sebagai negara atau organisasi |
| `aliases`               | Nama lain yang diterima; wajib ada walau kosong                                 |
| `sourceName`            | Ejaan persis di sumber, termasuk salah ketik, untuk penelusuran                 |
| `confidence`            | `high`, `medium`, atau `low` menurut `Terka_Special_Codes.md` bagian 3          |
| `needsReview`           | `true` jika makna entri perlu dikonfirmasi; entri ini tidak membentuk kartu     |
| `sources`               | Daftar `id` dari `sources[]`, minimal satu                                      |
| `validFrom`, `reviewBy` | Tanggal mulai berlaku menurut sumber dan batas pemeriksaan ulang                |

Aturan build untuk kode khusus:

- `specials[].id` unik dan tidak boleh sama dengan `regions[].id` mana pun, karena keduanya berbagi kolom `content_id` di database.
- Pasangan `number` dan `holder` berlabel `high` harus unik: satu nomor tidak boleh punya dua pemegang `high`, dan satu pemegang tidak boleh punya dua nomor `high`.
- `holder` dan `aliases` satu entri, setelah normalisasi SRD 5.3, tidak boleh sama dengan `holder` atau `aliases` entri lain di `specials[]`.
- Entri `high` wajib merujuk minimal satu sumber dengan `checkedAt`. Sumber berjenis `media-mengutip-instansi` tanpa `originalUrl` menghasilkan peringatan build, dan menjadi kegagalan pada build rilis publik.
- `reviewBy` yang sudah lewat menghasilkan peringatan build; entri tetap dipakai sampai editor memperbarui atau menurunkan labelnya.
- `id` yang pernah dipakai tidak didaur ulang. Jika pemegang satu nomor berubah, entri lama dihapus atau diturunkan labelnya dan pemegang baru memakai `id` baru.

**Data Referensi: `referencePlates[]`.** Pelat RI, CC, dan CH hanya tampil di Referensi, masing-masing sebagai satu entri format. `note` pada entri RI wajib tampil dan menyatakan tidak ada sumber valid untuk daftar lengkap serta alokasi dapat berubah sewaktu-waktu. Build gagal jika `referencePlates[]` memuat entri RI dengan `number` terisi. Datanya disimpan di `referencePlates[]` dengan properti `id` (berawalan `ref-`), `series`, `number` (boleh null untuk entri format), `label`, `example` (contoh pelat dari lampiran, tampil di Referensi), `confidence`, `sources`, `note`, dan `reviewBy`. Entri ini tidak memiliki `aliases` atau `holderType`, tidak masuk kamus jawaban SRD 5.3, dan tidak pernah dibaca generator kartu. Build gagal jika `id` berawalan `ref-` muncul di `specials[]` atau sebagai `content_id` kartu. Aturan sumber, `checkedAt`, `originalUrl`, dan `reviewBy` sama dengan `specials[]`.

**Properti `sources[]`.** Setiap sumber, dari `../data/special-codes.json` maupun `../data/fun-facts.json`, memuat `id`, `title`, `publisher`, `type`, `date`, `url`, `originalUrl`, `locator`, dan `checkedAt`. `date` boleh null hanya untuk halaman ensiklopedia atau wiki yang terus diperbarui; `originalUrl` boleh null.

**Properti `aliases` dan `variants` wajib ada** di setiap kab/kota, meski isinya array kosong. Langkah 3 dan 4 di SRD bagian 5.1 bergantung pada keduanya.

**Aturan data kab/kota, dicek saat build:**

- Setiap kab/kota memiliki minimal satu kode di `regions[].areas`, dan setiap `areaId` di sana harus ada di `areas`.
- `aliases` dan `variants` satu kab/kota, setelah normalisasi dan bentuk tanpa spasi, tidak boleh sama dengan nama, alias, atau varian kab/kota lain. Varian yang bentrok akan membuat jawaban salah dihitung benar.
- Nama yang sama untuk kota dan kabupaten, seperti Bogor, dicatat sebagai laporan build, bukan kegagalan. Aturan penilaiannya ada di SRD bagian 2.8.
- Sifat "kode mencakup seluruh provinsi secara eksklusif" dihitung dari data: semua kab/kota di provinsi itu memakai kode tersebut dan tidak memakai kode lain. Tidak ada properti yang ditulis manual untuk ini.
- `placementTier` wajib ada di setiap kode, dan tiap tier harus berisi cukup kode untuk tahap tes penempatannya (8, 10, dan 10).
- Setiap `id` kab/kota stabil, dengan aturan tidak didaur ulang yang sama seperti `id` kode.

**Prosedur pembaruan data.** Tidak ada keadaan aplikasi tersimpan yang diubah; kelima aturan berikut dijalankan sebagai bagian dari replay (bagian 4.4) terhadap `plates.json` versi yang sedang terpasang:

1. Kode yang `id`-nya masih ada → riwayat kartu dipakai utuh, meski nama wilayah, provinsi, atau kawasannya berubah.
2. Kode yang `id`-nya hilang dari data → kartunya dihitung `suspended`. Event-nya tetap ada di log, jadi riwayatnya pulih sendiri jika `id`-nya kembali.
3. Kode baru → muncul sebagai kartu `new` dan otomatis terdaftar ke kawasannya.
4. Entri yang `confidence`-nya turun dari `high` → kartunya dihitung `suspended`, dan layar penutup sesi berikutnya memberi tahu pengguna. Penanda "sudah diberi tahu" disimpan lokal per perangkat, karena ini urusan tampilan, bukan data belajar.
5. Fakta yang labelnya berubah dan tetap siap terbit → tampil dengan label terbaru; jika menjadi draf atau dihapus, berhenti dipilih.

Aturan 1–4 berlaku juga untuk `specials[]`. Entri yang `needsReview`-nya berubah menjadi `true` diperlakukan seperti entri yang turun dari `high`.

`id` yang pernah dipakai tidak boleh dipakai ulang untuk wilayah lain. Kasus BP yang pindah dari Belitung ke Kepulauan Riau menunjukkan satu kode bisa berpindah wilayah sepenuhnya; jika `id` lama dipakai ulang, riwayat wilayah lama terhubung ke wilayah baru tanpa terlihat. Aturan ini dicek saat build terhadap daftar `id` yang tidak digunakan lagi di repositori.

**Aturan `confidence` (final).** Aturan ini berlaku untuk kode wilayah dan hubungan kab/kota; kode khusus memakai aturan turunan di `Terka_Special_Codes.md` bagian 3. Entri berlabel `high` hanya jika memenuhi ketiganya: (1) dikonfirmasi minimal dua sumber independen; (2) salah satunya sumber resmi — Korlantas, Polda, Bapenda, atau Samsat provinsi terkait; (3) tidak ada kontradiksi antar sumber pada wilayah maupun tanggal. Jika satu syarat gagal, entri turun ke `medium`; jika hanya bersumber dari agregator daring tanpa konfirmasi resmi, `low`.

Hanya entri `high` yang masuk sistem hafalan. Untuk kab/kota, aturan ini berlaku pada hubungan kab/kota dengan kode (`regions[].areas[].confidence`). Kab/kota dengan keanggotaan `medium` tidak dipakai sebagai pengecoh, tidak dihitung di ambang "sebutkan sebanyak mungkin", dan jawaban yang cocok dengannya tidak dinilai (SRD bagian 5.1). Sisanya tetap tampil di halaman Referensi dengan penanda yang sesuai. Dokumen referensi Terka pernah memuat dua tanggal berbeda untuk DP dan DW dari dua sumber yang sama-sama tampak resmi. Menghafal informasi yang salah lebih mahal daripada belum menghafalnya.

### 4.2 Tabel Data Pengguna

Tabel aplikasi ada di schema `public`. Tabel milik pengguna memiliki `user_id` yang merujuk `auth.users(id)` dengan `on delete cascade`; `privacy_policy_versions` adalah katalog global tanpa `user_id`. Kunci utama tabel event ber-ID berbentuk `(user_id, id)`, dan setiap foreign key antartabel pengguna ikut membawa `user_id`, supaya baris satu pengguna tidak bisa menunjuk baris pengguna lain. Id dibuat klien sebagai UUID versi 7. Rincian kunci, indeks, `CHECK`, domain, trigger, dan grant ada di `Terka_ERD.md`; bagian ini menjelaskan arti kolomnya. Setelah migration pertama ada, SQL migration menjadi acuan skema fisik, dan tabel di bagian ini hanya menjelaskan arti kolom (ERD, bagian pembuka).

Tabel dibagi dua kelompok menurut cara mengubahnya.

**Insert-only** — baris tidak pernah diubah atau dihapus oleh klien: `review_logs`, `review_voids`, `card_events`, `sightings`, `fsrs_params`, `fact_views`, `privacy_consents`.

**Bisa diubah** — `user_settings` dan `card_notes` memakai last-write-wins; `devices.last_seen_at` memakai nilai terbesar; `practice_runs` hanya boleh ditutup sekali. Aturan tiap kelompok ada di bagian 5.2.

Tabel event ber-ID (`review_logs`, `review_voids`, `card_events`, `sightings`, `fsrs_params`, `fact_views`) memiliki `received_at timestamptz default now()` dan `server_seq bigint generated always as identity`, keduanya diisi server. `practice_runs` juga memiliki keduanya, tetapi `server_seq`-nya diisi trigger dengan `nextval()` dari sequence biasa saat insert dan diganti nomor baru saat sesi ditutup (lihat `practice_runs`). `server_seq` tidak diberi unique constraint; sequence sudah menjamin nilainya unik. `privacy_consents` adalah pengecualian insert-only: kuncinya `(user_id, policy_version)`, hanya memiliki `received_at`, tanpa `id` dan tanpa `server_seq`.

| Tabel tanpa kunci `(user_id, id)` | Kunci utama                           |
| --------------------------------- | ------------------------------------- |
| `privacy_consents`                | `(user_id, policy_version)`           |
| `user_settings`, `usage_totals`   | `user_id`                             |
| `card_notes`                      | `(user_id, content_id)`               |
| `usage_daily`                     | `(user_id, received_day, table_name)` |
| `privacy_policy_versions`         | `version`                             |

`privacy_policy_versions` dan `privacy_consents` mengikuti ERD bagian 3; keduanya ditarik utuh, tanpa cursor sequence. Persetujuan baru harus dapat disisipkan sebelum izin menulis log latihan diberikan; policy `privacy_consents` memeriksa kepemilikan dan versi valid, bukan `has_current_consent()`.

#### `devices`

| Kolom          | Tipe                              | Aturan                                                                                                                               |
| -------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `id`           | uuid, PK gabungan `(user_id, id)` | Dibuat klien saat instalasi pertama, disimpan lokal                                                                                  |
| `user_id`      | uuid, FK                          | —                                                                                                                                    |
| `label`        | text                              | Maks. 40 karakter, misalnya "iPhone" atau "MacBook"                                                                                  |
| `platform`     | text                              | Diambil dari user agent, maks. 200 karakter, hanya untuk penelusuran masalah                                                         |
| `created_at`   | timestamptz                       | —                                                                                                                                    |
| `last_seen_at` | timestamptz                       | Diisi server dengan `now()` saat insert dan setiap update; nilai dari klien diabaikan |
| `removed_at`   | timestamptz                       | Kosong untuk perangkat yang masih terdaftar. Diisi klien saat pengguna menghapus perangkat dari daftar, dikosongkan lagi oleh update sentuhan dari perangkat yang masih dipakai. Satu-satunya kolom lain yang boleh diubah |

Jumlah perangkat aktif per akun dibatasi. Angka batas dan jendela waktunya ada di bagian 9; cara penegakannya di ERD bagian 2. Perangkat lama tidak dihapus, hanya berhenti terhitung aktif; perangkat yang dihapus pengguna dari daftar ditandai lewat `removed_at` dan juga tidak terhitung.

#### `user_settings`

| Kolom                | Tipe               | Aturan                                        |
| -------------------- | ------------------ | --------------------------------------------- |
| `user_id`            | uuid, PK dan FK    | Satu baris per pengguna                       |
| `active_scope_level` | text               | `national`, `group`, atau `province`          |
| `active_scope_id`    | text, null         | Null jika level `national`                    |
| `special_enabled`    | boolean            | Latihan Kode Khusus aktif; bawaan `false`     |
| `updated_at`         | timestamptz        | Waktu klien saat pengaturan diubah; dasar LWW |
| `updated_by_device`  | uuid, FK `devices` | Pemecah seri jika `updated_at` sama           |
| `received_at`        | timestamptz        | Diisi server, tidak boleh dikirim klien       |

Persetujuan privasi tidak disimpan di sini, melainkan di `privacy_consents`, satu baris per versi kebijakan yang disetujui. Versi yang wajib disetujui diambil dari `privacy_policy_versions` (ERD bagian 3).

Target retensi sengaja tidak ada di sini. Nilainya tetap 0,90 (SRD bagian 4.3) dan terikat ke target durasi harian, jadi bukan pengaturan pengguna.

#### `practice_runs`

Satu baris per sesi atau putaran latihan. Dipakai untuk Hari Beruntun, Rekor Terbaik, dan ringkasan sesi.

| Kolom                     | Tipe                  | Aturan                                                                                                           |
| ------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`                      | uuid, PK              | —                                                                                                                |
| `user_id`, `device_id`    | uuid, FK              | —                                                                                                                |
| `kind`                    | text                  | `daily`, `focused`, `challenge`, `kilat`, `placement`, `setrecall`, `special`, `recheck`                         |
| `scope_level`, `scope_id` | text; `scope_id` null | Wilayah sesi; `scope_id` null hanya untuk `national`                                                             |
| `started_at`              | timestamptz           | Waktu klien                                                                                                      |
| `local_day`               | date                  | Hari lokal menurut batas 00.00 (SRD bagian 4.9)                                                                  |
| `ended_at`                | timestamptz, null     | Diisi sekali saat selesai                                                                                        |
| `answered`, `correct`     | int, null             | Diisi sekali saat selesai                                                                                        |
| `active_ms`               | int, null             | Durasi sesi saat terlihat dan tidak dijeda, termasuk umpan balik dan upaya yang di-undo; diisi saat sesi ditutup |
| `score`                   | int, null             | Hanya untuk `kilat`                                                                                              |
| `estimated_ms`            | int, null             | Estimasi durasi di pratinjau (SRD bagian 4.14)                                                                   |
| `planned_count`           | int, null             | Jumlah soal di pratinjau                                                                                         |
| `placement_level`         | text, null            | Hanya untuk `placement`: `pemula`, `menengah`, `mahir`, atau `ahli`. Diisi bersama kolom penutup                 |
| `server_seq`              | bigint                | Diisi server saat insert, lalu diganti `nextval()` baru oleh trigger saat sesi ditutup                           |

Trigger `before update` menolak perubahan apa pun kecuali pengisian `ended_at`, `answered`, `correct`, `score`, `placement_level`, dan `active_ms` saat `ended_at` masih null. Keenam kolom penutup dikirim bersama dalam satu operasi atomik; sesi selesai wajib memiliki ended_at, answered, correct, dan active_ms. Score wajib hanya untuk kilat (selain itu null), placement_level wajib hanya untuk placement (selain itu null). Sesi baru harus dimasukkan terbuka; insert dengan kolom penutup terisi ditolak. Ended_at ≥ started_at; 0 ≤ correct ≤ answered dan active_ms ≥0. Putaran yang tidak pernah ditutup (aplikasi ditutup paksa) tetap null dan tidak dihitung untuk rekor.

Nomor `server_seq` baru saat penutupan membuat perangkat lain menerima penutupan sesi lewat pull berbasis cursor biasa (bagian 5.3), tanpa menarik seluruh `practice_runs` setiap kali. Klien menerapkan baris hasil pull sebagai upsert pada `(user_id, id)`.

#### `review_logs`

Satu baris per jawaban. Ini tabel terpenting di seluruh sistem.

| Kolom                          | Tipe                           | Aturan                                                                                                                                                                  |
| ------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                           | uuid, PK                       | Dibuat klien                                                                                                                                                            |
| `user_id`, `device_id`         | uuid, FK                       | —                                                                                                                                                                       |
| `run_id`                       | uuid, FK `practice_runs`, null | FK `(user_id, run_id)` dengan `on delete set null (run_id)`                                                                                                             |
| `content_id`                   | text                           | `regions[].id` atau `specials[].id`; domain `content_ref`. Mode wajib cocok dengan jenis konten (bagian 4.1)                                                            |
| `mode`                         | text                           | Salah satu mode kartu di bagian 4.1; domain `card_mode`                                                                                                                 |
| `context`                      | text                           | `intro`, `daily`, `drill`, `focused`, `challenge`, `kilat`, `placement`, `setrecall`, `special`, `recheck`                                                              |
| `level`                        | smallint                       | 1–3                                                                                                                                                                     |
| `level_source`                 | text                           | `auto`, `manual_up`, `manual_down`                                                                                                                                      |
| `correct`                      | boolean, null                  | Hasil jawaban. Null jika tidak dinilai: `match_type = 'unverified'` atau `question_type = 'intro_read'`; dijaga `CHECK`. Tidak ada nilai penanda                        |
| `timed_out`                    | boolean                        | —                                                                                                                                                                       |
| `ms_to_first_key`              | int, null                      | ≥ 0; latensi input/pilihan pertama. Null jika timeout tanpa input, Tidak tahu tanpa input, `intro_read`, atau himpunan berakhir tanpa butir                             |
| `ms_total`                     | int                            | ≥ 0                                                                                                                                                                     |
| `ms_typing`                    | int, null                      | Dari input pertama sampai Enter                                                                                                                                         |
| `key_gaps_ms`                  | smallint[], null               | Jeda antarinput setelah input pertama dalam milidetik, maks. 120 nilai; jeda di atas 30.000 ms disimpan sebagai 30.000. Hanya jeda, bukan tombol yang ditekan           |
| `deleted_chars`                | smallint                       | Jumlah karakter yang dihapus sebelum Enter                                                                                                                              |
| `option_changes`               | smallint                       | Perpindahan pilihan Level 1 sebelum dikunci                                                                                                                             |
| `option_count`                 | smallint, null                 | Jumlah pilihan di soal Level 1                                                                                                                                          |
| `input_mode`                   | text                           | `keyboard` atau `touch`, dibaca dari jenis pointer dan event input saat soal tampil                                                                                     |
| `interrupted`                  | boolean                        | Aplikasi tidak terlihat selama soal tampil                                                                                                                              |
| `raw_answer`                   | text, null                     | Jawaban tunggal persis seperti diketik, maks. 120 karakter; null untuk jawaban himpunan                                                                                 |
| `match_type`                   | text                           | `exact`, `variant`, `typo`, `unverified`, atau `none`                                                                                                                   |
| `typo_cost`                    | numeric(3,1)                   | 0 kecuali `typo`                                                                                                                                                        |
| `accepted_area_id`             | text, null                     | Kab/kota yang membuat jawaban diterima                                                                                                                                  |
| `prompt_area_id`               | text, null                     | Kab/kota yang ditampilkan di soal daerah → kode                                                                                                                         |
| `answer_rules_version`         | smallint                       | Versi aturan SRD bagian 5.1 saat menjawab                                                                                                                               |
| `unknown`                      | boolean                        | Tombol **Tidak tahu** di tes penempatan                                                                                                                                 |
| `confused_with`                | text, null                     | `regions[].id` wilayah lain, atau `id` entri CD lain, yang cocok dengan jawaban salah                                                                                   |
| `drill_pair_with`              | text, null                     | Diisi untuk `context = drill`: kode pasangan yang ditampilkan                                                                                                           |
| `set_correct`, `set_threshold` | smallint, null                 | Hanya untuk jawaban himpunan `setrecall`; Perkenalan tetap jawaban tunggal                                                                                              |
| `set_items`                    | jsonb, null                    | Array tuple butir jawaban himpunan, maksimal 64 dan maksimal 32 KB; kontrak di bawah                                                                                    |
| `question_type`                | text                           | `intro_read`, `choice`, `truefalse`, `oddoneout`, `typed`, `setrecall`; bentuk yang benar-benar ditampilkan. Tebak berwaktu tercatat sebagai `typed` dengan `level = 3` |
| `content_version`              | smallint                       | `contentRev` dari `plates.json` saat menjawab (bagian 4.1)                                                                                                              |
| `engine_version`               | smallint                       | Nilai `ENGINE_VERSION` saat menjawab, untuk penelusuran masalah                                                                                                         |
| `client_ts`                    | timestamptz                    | Waktu jawaban masuk, menurut jam perangkat                                                                                                                              |
| `local_day`                    | date                           | Dihitung saat menjawab, tidak pernah dihitung ulang                                                                                                                     |
| `tz`                           | text                           | Nama zona waktu IANA perangkat saat menjawab; FK ke katalog `timezones` (ERD bagian 3)                                                                                  |

Nilai penjadwalan tidak disimpan di tabel ini maupun di mana pun. Nilai penjadwalan selalu diturunkan dari kolom-kolom di atas (SRD bagian 4.5).

**Finalisasi jawaban.** Saat jawaban dikirim, satu transaksi Dexie menyimpan event immutable dan item antrean kirim sebelum UI menyatakan jawaban tersimpan. `ms_total` mengukur waktu soal tampil sampai jawaban dikirim; waktu umpan balik sesudahnya bukan bagian event jawaban. `active_ms` pada sesi mengukur durasi sesi saat halaman terlihat dan tidak dijeda, termasuk umpan balik, lalu dibekukan saat sesi ditutup. Ini menjaga jalur sinkronisasi per jawaban tetap langsung tanpa perlu mengubah log.

**Jawaban himpunan.** Satu soal `setrecall` menghasilkan tepat satu event final. `set_items` berisi urutan tuple `[raw_answer, accepted_area_id, match_type, typo_cost, confused_with]`, bukan objek berkunci, supaya nama kunci tidak disimpan ulang di setiap butir. `accepted_area_id` dan `confused_with` boleh null. Panjang teks tiap butir maksimal 120 karakter. `correct` butir tidak disimpan karena sepenuhnya ditentukan `match_type`: `exact`, `variant`, dan `typo` berarti benar, `none` berarti salah, dan `unverified` berarti tidak dinilai. Hasil kecocokan dibekukan saat butir dikirim. Duplikat `accepted_area_id` hanya menambah `set_correct` sekali. Pasangan tertukar yang sama dihitung paling banyak sekali per soal; pasangan berbeda semuanya dihitung. `raw_answer`, `accepted_area_id`, dan `confused_with` pada induk null; `match_type = 'none'`, `typo_cost = 0`, `correct = (set_correct >= set_threshold)`. Nilai penjadwalan mengikuti SRD 5.2, termasuk nilai penjadwalan 2 untuk hasil positif di bawah ambang; aturan salah → nilai penjadwalan 1 untuk jawaban tunggal tidak menimpanya. `set_items`, `set_correct`, dan `set_threshold` terisi bersamaan, hanya saat `mode = 'setrecall' AND context <> 'intro'`; di luar itu null. Undo membatalkan seluruh soal beserta seluruh pasangannya. Constraint memeriksa struktur, ukuran, dan konsistensi internal; server tidak menilai ulang kebenaran geografis.

#### `review_voids`

Undo jawaban terakhir (SRD bagian 4.10). Barisnya membatalkan satu `review_logs` tanpa menghapusnya.

| Kolom                  | Tipe                   | Aturan                                                                                                                  |
| ---------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`                   | uuid, PK               | —                                                                                                                       |
| `user_id`, `device_id` | uuid, FK               | —                                                                                                                       |
| `review_id`            | uuid, FK `review_logs` | Unik bersama `user_id`: satu jawaban hanya bisa dibatalkan sekali. FK `(user_id, review_id)` dengan `on delete cascade` |
| `client_ts`            | timestamptz            | —                                                                                                                       |

#### `card_events`

Tindakan manual pada kartu. Status yang muncul otomatis — leech, suspended karena `lapses` 8, karena `confidence` turun, atau karena `id` hilang — tidak disimpan di sini, karena bisa diturunkan dari log dan konten.

| Kolom                  | Tipe        | Aturan                        |
| ---------------------- | ----------- | ----------------------------- |
| `id`                   | uuid, PK    | —                             |
| `user_id`, `device_id` | uuid, FK    | —                             |
| `content_id`, `mode`   | text        | Sama seperti di `review_logs` |
| `kind`                 | text        | `suspend` atau `unsuspend`    |
| `client_ts`            | timestamptz | —                             |
| `local_day`            | date        | —                             |

`unsuspend` pada kartu yang di-suspend karena `lapses` 8 sekaligus mereset D dan S ke nilai kartu baru (SRD bagian 6.4). Reset itu hasil replay, bukan event tersendiri.

#### `sightings`

Catatan pencarian kode wilayah di Referensi untuk frekuensi Pelat Terlihat (SRD 4.11, PRD 6.10). Tidak memiliki relasi ke jawaban latihan.

| Kolom                  | Tipe        | Aturan                                 |
| ---------------------- | ----------- | -------------------------------------- |
| `id`                   | uuid, PK    | —                                      |
| `user_id`, `device_id` | uuid, FK    | —                                      |
| `region_id`            | text        | Kode depan wilayah yang dicari         |
| `client_ts`            | timestamptz | Waktu pencarian yang lolos deduplikasi |
| `local_day`            | date        | —                                      |

`received_at` dan `server_seq` mengikuti aturan catatan ber-ID. Tidak ada `review_id`, jawaban mentah, angka pelat, atau hasil penilaian. Aturan deduplikasi per perangkat dijalankan transaksional sebelum event dibuat, bukan lewat jendela waktu server.

**Tanpa data format lama.** Rilis ini hanya menerima lima mode kartu dalam bagian 4.1 dan kolom pencarian yang tercantum di tabel ini. Data dari versi Terka sebelumnya tidak dimigrasikan (bagian 6).

#### `fact_views`

Riwayat Fun Facts yang sudah tampil di layar akhir, untuk rotasi di SRD bagian 4.15. Satu baris per layar akhir yang benar-benar menampilkan fakta siap terbit; tanpa kandidat tidak ada baris baru.

| Kolom                  | Tipe                           | Aturan                      |
| ---------------------- | ------------------------------ | --------------------------- |
| `id`                   | uuid, PK                       | —                           |
| `user_id`, `device_id` | uuid, FK                       | —                           |
| `fact_id`              | text                           | `id` fakta di `plates.json` |
| `run_id`               | uuid, FK `practice_runs`, null | —                           |
| `client_ts`            | timestamptz                    | —                           |
| `local_day`            | date                           | —                           |

#### `card_notes`

Catatan pengingat per kode (SRD bagian 6.4).

| Kolom               | Tipe               | Aturan                                                               |
| ------------------- | ------------------ | -------------------------------------------------------------------- |
| `user_id`           | uuid, PK dan FK    | PK gabungan dengan `content_id`                                      |
| `content_id`        | text, PK           | `regions[].id` atau `specials[].id`; satu catatan pengingat per kode |
| `body`              | text               | Maks. 280 karakter. String kosong berarti catatan pengingat dihapus  |
| `updated_at`        | timestamptz        | Dasar LWW                                                            |
| `updated_by_device` | uuid, FK `devices` | —                                                                    |
| `received_at`       | timestamptz        | Diisi server, tanpa grant insert/update klien                        |

Menghapus catatan pengingat tidak menghapus baris. Jika baris dihapus, perangkat lain yang belum tahu soal penghapusan itu bisa mengirim ulang versi lamanya dan catatan pengingat muncul lagi. Isi kosong berlaku sebagai tanda hapus yang ikut aturan LWW.

#### `fsrs_params`

Riwayat parameter FSRS hasil optimasi (SRD bagian 4.12).

| Kolom                               | Tipe              | Aturan                                                                                                                                                      |
| ----------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                | uuid, PK          | —                                                                                                                                                           |
| `user_id`, `device_id`              | uuid, FK          | —                                                                                                                                                           |
| `algorithm`                         | text              | `fsrs-6`                                                                                                                                                    |
| `library_version`                   | text              | Versi optimizer yang menghasilkan parameter                                                                                                                 |
| `weights`                           | float8[]          | Tepat 21 nilai                                                                                                                                              |
| `status`                            | text              | `active` atau `rejected`                                                                                                                                    |
| `activated_at`                      | timestamptz, null | Wajib diisi jika `status = active`                                                                                                                          |
| `trained_review_count`              | int               | Jumlah jawaban terhitung di data latih, sesuai keputusan optimasi; lebih dari 0                                                                             |
| `trained_through_seq`               | bigint, null      | Maksimum `server_seq` data latih yang sudah tersinkron; null bila ada data latih tanpa sequence. Metadata penelusuran masalah, bukan identitas dataset      |
| `training_set_hash`                 | bytea             | SHA-256 atas ID jawaban terhitung yang dipakai, diurut leksikografis dan digabung 16 byte per ID; tepat 32 byte. Identitas dataset, lokal maupun tersinkron |
| `created_at`                        | timestamptz       | Waktu hasil optimasi atau rollback dibuat di klien                                                                                                          |
| `logloss`, `rmse`                   | float8            | Hasil evaluasi parameter baru                                                                                                                               |
| `baseline_logloss`, `baseline_rmse` | float8            | Hasil evaluasi parameter yang sedang dipakai, pada potongan data yang sama                                                                                  |

Tidak ada kolom "parameter aktif" yang bisa diubah. Parameter yang berlaku untuk satu jawaban adalah baris `active` dengan `activated_at` terbaru yang tidak lebih lambat dari waktu jawaban itu. Jika activated_at sama, pilih device_id lalu id terbesar secara leksikografis. Untuk parameter yang sudah diterima server, waktu aktivasi efektif dibatasi maksimum received_at, sama seperti waktu dasar event; aturan ini juga berlaku di setiap replay. Sebelum ada baris seperti itu, yang berlaku parameter default FSRS-6. Rollback berarti menyisipkan baris `active` baru yang menyalin bobot lama.

**Daftar ID data latih hanya lokal.** Daftar lengkap `training_event_ids` tidak dikirim ke server, karena ukurannya tumbuh bersama riwayat — sekitar 430 KB per baris untuk pengguna rajin setelah tiga tahun — sedangkan kuota menghitung baris, bukan byte. Salinan lokal `fsrs_params` di perangkat yang menjalankan optimasi menyimpan daftar itu sebagai kolom lokal, dan daftar itu ikut ekspor. Perangkat lain hanya menerima hash dan jumlahnya. Replay tidak membutuhkan daftar ID; daftar itu hanya untuk menelusuri keputusan optimasi.

### 4.3 Penyimpanan Lokal

Dexie menyimpan salinan seluruh tabel di atas, ditambah store yang hanya ada di perangkat. Salinan lokal `fsrs_params` punya satu kolom yang tidak ada di server, `training_event_ids` (bagian 4.2).

| Store               | Isi                                                                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `outbox`            | Antrean perubahan yang belum terkirim, berurutan menurut nomor lokal yang terus naik                                                                                                                                            |
| `outbox_quarantine` | Perubahan yang ditolak server dengan kesalahan yang tidak bisa diulang                                                                                                                                                          |
| `sync_meta`         | `owner_user_id`, cursor per tabel, riwayat pull per tabel (waktu mulai dan cursor, bagian 5.3), `last_pull_started_at`, `last_push_at`, `last_export_at`                                                                        |
| `derived`           | Cache keadaan aplikasi kartu, pasangan tertukar, dan persentil waktu jawab untuk tampilan cepat, beserta kunci pengurutan event terakhir yang sudah diterapkan dan `ENGINE_VERSION` serta versi `plates.json` saat cache dibuat |
| `ui_flags`          | Penanda tampilan lokal, misalnya perubahan `confidence` yang sudah diberitahukan                                                                                                                                                |

`owner_user_id` bernilai null selama aplikasi dipakai tanpa akun. Nilai ini yang mencegah data satu akun terkirim ke akun lain (bagian 5.1).

### 4.4 Pengurutan dan Penghitungan Ulang Riwayat

**Kunci pengurutan.** Event belajar ber-ID diurutkan dengan kunci `(effective_ts, device_id, id)`. Waktu dasarnya `client_ts` untuk log jawaban, pembatalan jawaban, tindakan kartu, Pelat Terlihat, dan tampilan fakta; `started_at` untuk sesi; `created_at` untuk hasil optimasi. `privacy_consents`, pengaturan, dan catatan bukan event penjadwalan dan mengikuti aturan tabelnya sendiri. `effective_ts` sama dengan waktu dasar tersebut, kecuali untuk event yang sudah sampai di server dengan waktu dasar lebih lambat dari `received_at`. Untuk event seperti itu, `effective_ts = received_at`. Aturan ini menjinakkan perangkat yang jamnya terlalu maju: event dari masa depan tidak bisa melompati event yang sebenarnya lebih baru. Jam yang terlalu mundur tidak bisa dideteksi dengan cara yang sama, jadi `local_day` disimpan eksplisit supaya logika per hari tidak ikut rusak.

**Penghitungan ulang riwayat (replay) adalah fungsi murni.** Input: seluruh event terurut, `plates.json` terpasang, linimasa `fsrs_params`, dan versi mesin penjadwalan. Output: keadaan aplikasi setiap kartu, pasangan tertukar, persentil waktu jawab per level, Hari Beruntun, dan Rekor Terbaik. Input yang sama wajib menghasilkan output yang sama persis, di perangkat mana pun.

Tiga hal yang biasanya merusak determinisme sudah ditutup:

- **Fuzz dan pemerataan jadwal** (SRD bagian 4.6) memakai PRNG yang di-seed dari hash `id` jawaban, bukan `Math.random()`.
- **Waktu sekarang** tidak pernah dibaca di dalam replay. Semua perhitungan waktu memakai `effective_ts` dan `local_day` event.
- **Versi library** dikunci. Konstanta `ENGINE_VERSION` naik setiap kali ts-fsrs, `GRADE_RULES_VERSION`, atau aturan antrean berubah. Perangkat yang menemukan `ENGINE_VERSION` baru membuang cache `derived` dan menjalankan replay penuh.

**Dua jalur penerapan event.** Mesin penjadwalan hanya punya dua cara menerapkan event:

1. **Tambah di ujung.** Event lokal yang baru dijawab, atau satu batch hasil pull yang seluruh isinya memiliki kunci pengurutan lebih besar dari event terakhir yang sudah diterapkan, langsung diterapkan pada keadaan aplikasi saat ini. Batch diurutkan dulu sebelum diterapkan.
2. **Replay penuh.** Semua kasus lain memicu replay penuh dari awal log: batch pull yang berisi minimal satu event dengan kunci lebih kecil dari event terakhir, `review_voids`, penutupan atau penggantian sesi tes penempatan, `fsrs_params` baru yang posisi aktivasi efektifnya mendahului event terakhir, `plates.json` versi baru, dan `ENGINE_VERSION` baru. Satu batch pull menghasilkan paling banyak satu replay penuh, bukan satu replay per event.

Hasil kedua jalur wajib identik dengan replay penuh atas log yang sama; ini diuji terus-menerus di Tests bagian 6 (TR-40 sampai TR-44, TR-191, dan TR-192). Keadaan aplikasi terakhir disimpan di cache `derived` supaya aplikasi tidak perlu replay setiap kali dibuka. Cache yang rusak, atau yang versi mesin maupun kontennya berbeda dari yang terpasang, dibuang lalu diganti hasil replay penuh.

**Mengapa tanpa titik pemulihan.** Pengguna rajin menghasilkan sekitar 9.000 event per tahun. Prototipe inti penjadwalan menyelesaikan replay penuh 20.000 event dalam sekitar 80 ms di mesin desktop, jadi target TR-75 (di bawah 2 detik dengan CPU throttling 4×) masih punya ruang untuk logika antrean, pasangan tertukar, dan Hari Beruntun. Titik pemulihan menambah aturan pemilihan posisi untuk setiap jenis event yang menyentuh masa lalu, dan setiap aturan itu bisa salah. Titik pemulihan baru ditambahkan jika TR-75 gagal di data nyata. Jika ditambahkan, kontraknya tetap sama: hasilnya wajib identik dengan replay penuh.

---

## 5. Autentikasi dan Sinkronisasi

### 5.1 Autentikasi

- **Metode:** Google OAuth sebagai cara utama; email sebagai cara kedua, lewat magic link atau kode OTP 6 digit di email yang sama. Tanpa password.
- **Persetujuan:** redirect ke Google atau pengiriman email login hanya terjadi setelah pengguna menyetujui kebijakan privasi. Persetujuan disimpan sebagai baris `privacy_consents` untuk versi kebijakan yang berlaku.
- **Batas pengiriman email:** satu permintaan per email per 60 detik (bawaan Supabase). Batas email per jam di pengaturan Rate Limits disetel 80, di bawah batas harian Resend Free 100 email, supaya lonjakan sejam tidak menghabiskan jatah sehari.
- **CAPTCHA:** token Turnstile dikirim bersama permintaan magic link. Mode tanpa interaksi dipakai, jadi kebanyakan pengguna tidak melihat tantangan apa pun.
- **Tanpa akun tetap bisa dipakai.** Aplikasi yang baru dipasang langsung bisa dipakai berlatih. Semua event tersimpan lokal dengan `owner_user_id` null. Login hanya menambahkan sinkronisasi.
- **Login pertama di perangkat yang sudah memiliki data:** event lokal yang pemiliknya null diklaim oleh akun yang login, lalu dikirim. Jika akun itu juga sudah memiliki data di server, keduanya digabung. Penggabungan aman karena hanya menambah event yang belum ada; tidak ada yang tertimpa.
- **Akun berbeda di perangkat yang sama:** jika `owner_user_id` lokal adalah akun A lalu yang login akun B, tidak ada data yang dikirim. Pengguna memilih antara kembali ke akun A atau menghapus data lokal milik A.
- **Google OAuth.**
  - **Alur:** `signInWithOAuth({ provider: 'google' })` dengan PKCE dan redirect penuh, bukan popup. Popup sering diblokir di ponsel, dan Google One Tap memerlukan skrip pihak ketiga tambahan serta muncul tanpa diminta — bertentangan dengan Microcopy bagian 2.
  - **Scope:** hanya `openid`, `email`, dan `profile` bawaan. Terka tidak meminta akses ke data Google lain. Nama dan foto dari Google tetap tersimpan di `auth.users.raw_user_meta_data` oleh Supabase Auth, tetapi tidak dibaca aplikasi dan tidak disalin ke tabel Terka. Kebijakan privasi menyebutnya.
  - **Redirect:** kembali ke `/auth/callback`, yang menukar code dengan session lalu menjalankan klaim data lokal. Site URL di Supabase adalah `https://terka.my.id`. Daftar Redirect URL hanya berisi `terka.my.id` dan `localhost`. URL preview Vercel tidak dimasukkan dengan wildcard; preview memakai proyek Supabase staging tersendiri.
  - **Konfigurasi Google Cloud:** redirect URI yang diizinkan adalah endpoint callback Supabase Auth proyek. Layar persetujuan diisi nama Terka, email dukungan (Google hanya menerima email akun pemilik atau Google Group yang dikelolanya, jadi `contact@terka.my.id` tidak bisa dipilih di kolom ini), kontak developer `contact@terka.my.id`, halaman utama, dan tautan kebijakan privasi. Authorized domain di layar persetujuan adalah `terka.my.id`, diverifikasi lewat Google Search Console dengan record TXT di DNS. Halaman utama `https://terka.my.id` dan kebijakan privasi `https://terka.my.id/privasi` harus bisa dibuka tanpa login. Verifikasi brand bersifat opsional; jika diajukan, logo Terka bisa tampil di layar persetujuan. Status publikasi wajib diubah dari Testing ke In production sebelum rilis, karena status Testing hanya mengizinkan pengguna uji yang didaftarkan. Scope dasar tidak memerlukan verifikasi Google, tetapi menampilkan logo di layar persetujuan memerlukan verifikasi brand. Persyaratan ini dicek ulang saat setup, karena kebijakan Google bisa berubah.
- **PWA di iOS.** Di PWA yang dipasang di layar utama iPhone, redirect OAuth bisa selesai di Safari, bukan di PWA. Jalur cadangan utamanya kode OTP email, yang diketik langsung di PWA. Google Identity Services dengan `signInWithIdToken` hanya ditambahkan jika uji di iPhone nyata (E2E-105 di `Terka_Tests.md`) menunjukkan kode OTP pun tidak cukup.
- **Kode OTP email.** Template email memuat tautan dan kode 6 digit sekaligus. Kode diverifikasi dengan `verifyOtp` langsung di halaman Terka yang sedang terbuka. Karena Resend dipakai sebagai SMTP sendiri, template email bisa diubah bebas dan ditulis dalam bahasa Indonesia.
- **Browser di dalam aplikasi lain.** Google memblokir login OAuth dari embedded webview dengan kesalahan `disallowed_useragent`. Klien mendeteksi user agent Instagram, Facebook, Messenger, TikTok, dan LINE, lalu menyembunyikan tombol Google. Daftarnya disimpan sebagai konfigurasi, bukan logika bercabang di banyak tempat, supaya mudah ditambah. Deteksi ini tidak sempurna; jika lolos, kesalahan dari Google ditangkap di callback dan pengguna diarahkan ke jalur email.
- **Penautan identitas.** Supabase Auth otomatis menautkan identitas dengan email yang sama ke satu pengguna, dan hanya untuk email yang sudah terverifikasi. Email dari Google selalu terverifikasi, jadi pengguna yang masuk dengan email lalu dengan Google berakhir di satu `user_id`. Penautan manual untuk email berbeda (fitur beta) tidak diaktifkan.
- **Persetujuan dan OAuth.** Dialog persetujuan kebijakan privasi tampil sebelum redirect ke Google. Waktu dan versinya disimpan di penyimpanan lokal, lalu ditulis ke `privacy_consents` segera setelah session terbentuk di callback. Jika penulisan itu gagal, sinkronisasi tertahan oleh policy persetujuan (bagian 9) sampai berhasil.
- **Session:** disimpan supabase-js di perangkat. Access token diperbarui otomatis saat online. Saat offline, token kedaluwarsa tidak menghentikan latihan; antrean kirim terus bertambah. Jika refresh token sudah tidak berlaku saat kembali online, status berubah jadi sesi berakhir dan pengguna diminta login lagi. Outbox tidak disentuh sampai akun yang sama login kembali.
- **Logout:** jika antrean kirim tidak kosong, pengguna diperingatkan dulu. Logout menghapus seluruh data pengguna dari IndexedDB perangkat itu, karena salinan lengkapnya ada di server dan data lokal tanpa pemilik jelas justru jadi sumber kebingungan.
- **Hapus akun:** memanggil `delete_user()` (bagian 9). Seluruh baris milik pengguna ikut terhapus lewat `on delete cascade`. Data di perangkat yang sedang dipakai tetap ada sampai pengguna menghapusnya.

### 5.2 Pengiriman Data

- **Pemicu:** 5 detik setelah jawaban terakhir (debounce), saat aplikasi kembali terlihat, saat event `online` masuk, dan tiap 5 menit selama aplikasi terbuka.
- **Urutan:** antrean kirim mempertahankan FIFO di tiap kelompok dependensi; dependensi FK didahulukan daripada urutan lintas tabel. Dalam satu putaran, urutan insert mengikuti foreign key: `devices` → `privacy_consents` → `practice_runs` → `review_logs` → `review_voids`, `sightings`, `card_events`, `fact_views` → `fsrs_params`. Update penutupan sesi serta LWW pengaturan/catatan dikirim setelah insert dependensinya. Sesi offline yang sudah selesai tetap dikirim sebagai insert terbuka lalu update penutup, tidak digabung menjadi insert tertutup.
- **Ukuran batch:** maksimal 200 baris per request.
- **Idempotensi event ber-ID:** insert dengan `on conflict (user_id, id) do nothing`. `privacy_consents` memakai `on conflict (user_id, policy_version) do nothing`. Pada duplikat, klien membaca baris kanonis bila respons insert kosong sebelum menghapus item antrean kirim; metadata server tetap dipulihkan.
- **Kontrak mutasi per tabel:** `user_settings` upsert pada `user_id`; `card_notes` pada `(user_id, content_id)`; keduanya memakai LWW di bawah. `devices` insert pada `(user_id, id)`, lalu update sentuhan `last_seen_at` paling sering sekali per jam; server selalu mengisi `now()`, jadi nilai kiriman klien tidak berpengaruh. `practice_runs` insert identitas sesi, lalu update atomik kolom penutup, yang sekaligus memberi sesi itu `server_seq` baru; retry payload penutupan yang identik dianggap sukses tanpa update tambahan. Payload penutupan berbeda untuk sesi yang sudah ditutup ditolak dan direkonsiliasi ke baris kanonis, tanpa menimpa hasil.
- **LWW pengaturan dan catatan:** dikirim sebagai upsert. Trigger `before update` mempertahankan baris lama jika `updated_at` baru lebih kecil, atau jika sama dan `updated_by_device` baru lebih kecil secara leksikografis. Dengan begitu perangkat yang terlambat sinkron tidak bisa menimpa perubahan yang lebih baru.
- **Setelah berhasil:** baris keluar dari antrean kirim, dan metadata server yang memang dimiliki tabel (`received_at`, serta `server_seq` untuk event ber-ID dan `practice_runs`) disimpan ke salinan lokal.
- **Kolom yang tidak dikirim:** `received_at`, `server_seq`, dan `devices.last_seen_at`. `card_id` tidak ada di server; klien membentuknya dari `content_id` dan `mode` dan menyimpannya lokal untuk query. Jika `received_at` mengubah `effective_ts` satu event (bagian 4.4), replay penuh dijalankan.

**Penanganan kesalahan push:**

| Respons                                                                       | Tindakan                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gagal jaringan, 5xx, atau 521                                                 | Coba lagi dengan exponential backoff dari 1 detik sampai 5 menit, dengan jitter. Tidak ada baris yang dibuang                                                                                                    |
| 429                                                                           | Tunggu sesuai `Retry-After`, lalu coba lagi                                                                                                                                                                      |
| 401                                                                           | Refresh session sekali. Jika gagal, status jadi sesi berakhir dan push berhenti                                                                                                                                  |
| Batas pemakaian harian terlampaui (kode kesalahan khusus dari trigger)        | Push tabel itu berhenti sampai hari server (UTC) berganti. Baris tetap di antrean kirim, tidak dikarantina                                                                                                       |
| Persetujuan terbaru belum tersimpan                                           | Hentikan push log; kirim persetujuan lebih dulu atau tampilkan dialog. Bukan karantina                                                                                                                           |
| Batas perangkat aktif tercapai (kode kesalahan khusus dari trigger `devices`) | Seluruh push berhenti, karena semua log merujuk perangkat ini. Tidak ada karantina. Pendaftaran dicoba lagi sekali sehari; begitu salah satu perangkat lama melewati 90 hari tanpa aktivitas, push berjalan lagi |
| Batas total baris per akun tercapai (bagian 9)                                | Hentikan push baru, pertahankan antrean kirim, tawarkan ekspor; menunggu hari baru tidak membuka batas total                                                                                                     |
| 4xx lain (constraint, FK)                                                     | Baris dipindah ke `outbox_quarantine`. Baris lain di antrean kirim yang merujuk baris itu lewat FK ikut dikarantina. Sisanya tetap dikirim                                                                       |

Baris yang dikarantina tidak pernah hilang diam-diam. Jumlahnya tampil di status sinkronisasi, dan isinya ikut dalam ekspor JSON supaya bisa diperiksa.

### 5.3 Pengambilan Data

- **Tabel ber-`server_seq`:** event insert-only ber-ID dan `practice_runs` diambil dengan `server_seq` lebih besar dari cursor tabel itu, urut naik, 1.000 baris per halaman. Baris `practice_runs` yang sudah ada di lokal diperbarui lewat upsert pada `(user_id, id)`, karena penutupan sesi datang sebagai baris yang sama dengan `server_seq` baru.
- **Overlap lewat riwayat cursor:** nilai `server_seq` dibagikan saat insert, tetapi transaksi bisa commit tidak berurutan. Baris ber-`server_seq` kecil yang commit belakangan akan terlewat jika cursor sudah melewatinya. Karena itu klien menyimpan riwayat pull per tabel: waktu mulai tiap pull dan cursor yang dicapainya. Setiap pull dimulai dari cursor milik pull terakhir yang dimulai paling lambat 5 menit sebelum `last_pull_started_at`, bukan dari cursor terbaru. Riwayat yang lebih tua dari itu boleh dibuang. Duplikat hasil overlap dibuang lewat `id`.
- **Mengapa bukan `received_at`.** Cara lama menarik ulang baris dengan `received_at` sejak 5 menit sebelum pull terakhir. Cara itu butuh indeks `(user_id, received_at)` tambahan di tabel terbesar, dan membandingkan jam perangkat dengan jam server. Riwayat cursor memberi jaminan yang sama — transaksi yang berjalan kurang dari 5 menit tidak terlewat — hanya dengan indeks `(user_id, server_seq)`, dan hanya membandingkan waktu di perangkat yang sama. Jika riwayat pull hilang atau jam perangkat mundur, overlap memakai cursor tertua yang masih tersimpan, atau 0 jika tidak ada.
- **Tabel yang ditarik utuh:** pengaturan, catatan, perangkat, persetujuan, dan katalog `privacy_policy_versions`. Semuanya kecil per pengguna dan tidak memiliki `server_seq`.
- **Penerapan:** event hasil pull masuk Dexie, lalu mesin penjadwalan menambahkannya di ujung atau menjalankan satu replay penuh untuk batch itu, menurut bagian 4.4.

### 5.4 Sinkronisasi Pertama di Perangkat Baru

Perangkat baru menarik seluruh data akun, lalu menjalankan replay penuh. Targetnya 20.000 event selesai di bawah 2 detik di ponsel kelas menengah (TR-75). Selama replay, beranda menampilkan indikator memuat; soal belum bisa dimulai sebelum replay selesai, supaya jawaban pertama tidak dinilai terhadap keadaan aplikasi yang belum lengkap.

---

## 6. Penyimpanan, Pencadangan, dan Pemulihan

**Penyimpanan kerja.** IndexedDB lewat Dexie, dengan `navigator.storage.persist()` dipanggil saat aplikasi pertama kali dibuka.

**Salinan di luar perangkat.** Supabase. Begitu login, setiap jawaban sampai ke server dalam hitungan detik saat online.

**Batasan paket Free yang memengaruhi desain:**

- Proyek Free dijeda jika aktivitas database dalam seminggu terlalu sedikit. Dengan pengguna publik, risiko ini kecil. Jika tetap terjadi, sinkronisasi gagal seperti server tidak terjangkau: latihan tetap berjalan, antrean kirim menumpuk, dan setelah 3 hari gagal berturut-turut status sinkronisasi menyebut server tidak terjangkau. Yang memulihkan proyek adalah pemilik proyek, bukan pengguna. Karena itu pemilik proyek memasang pemantau uptime yang memberi tahu begitu server sinkronisasi tidak menjawab.
- Cadangan harian otomatis hanya tersedia di paket berbayar. Dengan data orang lain di dalamnya, ekspor manual per pengguna tidak lagi cukup. Sampai pindah ke Pro, GitHub Actions menjalankan `pg_dump` mingguan, mengenkripsi hasilnya dengan kunci publik sebelum keluar dari runner, lalu menyimpannya di penyimpanan privat dengan retensi 4 minggu. Kunci privatnya tidak disimpan di CI.

**Pemicu pindah ke paket Pro.** Salah satu terpenuhi:

| Pemicu                                                  | Alasan                                                                                                                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ukuran database melewati 300 MB                         | Paket Free mengunci database jadi hanya-baca di 500 MB; 300 MB memberi waktu migrasi. Alarm di 150 MB (bagian 9) memberi peringatan lebih awal                       |
| Lebih dari 500 pengguna login aktif per bulan           | Data sebanyak itu layak mendapat cadangan harian dan jaminan tidak dijeda                                                                                            |
| Rencana promosi terbuka                                 | Lonjakan pendaftaran memerlukan batas yang lebih longgar dan pemantauan                                                                                              |
| Email login rata-rata di atas 80 per hari selama 7 hari | Resend Free dibatasi 100 email per hari. Langkah pertama pindah ke penyedia dengan jatah gratis lebih besar, seperti Brevo; berbayar hanya jika itu juga tidak cukup |

**Ekspor JSON.** Format `terka-export` memakai `formatVersion` 4. Versi 4 menyimpan `set_items` sebagai tuple dan `content_version`/`engine_version` sebagai angka, sama seperti skema server. Berkas memuat riwayat, pengaturan, catatan pengingat, catatan penolakan yang sudah dibersihkan, dan `training_event_ids` untuk parameter yang daftarnya tersimpan di perangkat itu. Berkas tidak memuat input pencarian lengkap. Pengingat ekspor muncul setelah 30 hari. Impor menggabungkan catatan berdasarkan ID; mengimpor berkas yang sama dua kali tidak menggandakan data.

**Impor.** Importer hanya menerima `formatVersion` 4. Berkas dengan versi lain, lebih lama maupun lebih baru, atau berkas yang bukan ekspor Terka ditolak sebelum data lokal berubah. Data dari versi Terka sebelumnya tidak dimigrasikan; rilis ini memulai riwayat baru. Setelah impor, cache `derived` dibuang dan replay penuh dijalankan.

**Database lokal.** Rilis ini memakai database Dexie baru dan tidak membaca database mesin penjadwalan sebelumnya. Perubahan skema Dexie berikutnya memakai upgrade versi Dexie tanpa membuang riwayat. Migrasi server memerlukan cadangan terlebih dahulu dan dilakukan bertahap sesuai bagian 7.

**Skenario pemulihan:**

| Kehilangan                                           | Pemulihan                                                                                                                                                                                            |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Perangkat hilang atau data browser dibersihkan       | Login di perangkat baru; seluruh riwayat ditarik dari server                                                                                                                                         |
| Proyek Supabase terhapus atau datanya rusak          | Pemilik memulihkan cadangan `pg_dump` terenkripsi terakhir ke proyek kosong, memeriksa Auth, RLS, grant, dan migration; perangkat mengirim ulang event lokal yang belum ada lewat sinkronisasi penuh |
| Server dan perangkat sama-sama hilang                | Pulihkan cadangan database terakhir; event yang lebih baru hanya pulih bila ada ekspor atau perangkat lain. Tanpa cadangan yang dapat dipakai, pemulihan per akun memakai ekspor terakhir            |
| Satu akun perlu dipulihkan tanpa memulihkan database | Impor ekspor pengguna ke akun tujuan sesuai aturan kepemilikan; pemulihan satu akun dari `pg_dump` tetap di luar cakupan                                                                             |

**Ukuran data.** Ukuran `review_logs` diukur di PostgreSQL 16 dengan 90.000 baris sintetis dari 25 pengguna yang disisipkan berselang-seling, termasuk 5% jawaban himpunan dan kedua indeksnya. Dengan tata letak kolom di ERD bagian 4, satu jawaban memakan sekitar 435 byte, turun dari 540 byte pada rancangan sebelumnya. Daftar ID data latih tidak disimpan di server (bagian 4.2), jadi tidak ada kolom yang ukurannya mengikuti umur akun.

Dengan 500 byte per jawaban sebagai angka aman, ditambah 20% untuk tabel lain, pengguna rajin (25 jawaban per hari) memakai sekitar 5,5 MB per tahun. Untuk campuran 20% pengguna rajin, 50% sedang (10 jawaban per hari), dan 30% ringan (4 jawaban per hari), pemicu 300 MB tercapai sekitar 27 bulan setelah ada 50 pengguna aktif ber-akun, 13 bulan dengan 100 pengguna, dan 5 bulan dengan 250 pengguna. Karena itu ukuran database dipantau dengan alarm di bagian 9, dan pengguna tanpa akun sengaja tidak menyentuh database.

---

## 7. Pembuatan dan Penerbitan Aplikasi

Yang dikerjakan saat build:

- `plates.json` dihasilkan dari `../data/plate-curation.json`, `../data/special-codes.json`, dan `../data/fun-facts.json`, lalu dikunci dengan nomor versi bertanggal.
- Hierarki cakupan dibentuk dari properti `group` dan `province`, bukan ditulis sebagai struktur terpisah.
- Jumlah pilihan di tiap tingkat cakupan dihitung dari data (SRD bagian 2.1).
- Tes konten memastikan setiap kode memiliki minimal satu soal Level 3 yang sah (SRD AC-1), setiap region memiliki `aliases`, dan tidak ada `id` yang tidak digunakan lagi yang dipakai ulang. Build gagal jika ada yang tidak lolos.
- `next build` menghasilkan static export di `out/`. Setiap layar utama (`/`, `/sesi`, `/cakupan`, `/statistik`, `/referensi`, `/tentang`, `/auth/callback`) dan halaman kebijakan privasi `/privasi` menjadi halaman HTML sendiri dengan `trailingSlash: false`. Manifest PWA (`manifest.webmanifest`) dibuat dari `src/app/manifest.ts`, termasuk pintasan ke Referensi.
- Setelah `next build`, `scripts/postbuild.ts` menyalin `plates.json` dan berkas WebAssembly optimizer ke `out/`, memeriksa halaman utama dan fitur yang memerlukan server, membundel worker optimizer ke `out/optimizer/worker.js`, lalu membuat service worker dari `out/` dengan `workbox-build` (`injectManifest`) ke `out/sw.js`. Build gagal jika ada halaman utama, `plates.json`, `map.svg`, manifest, worker, atau berkas WebAssembly optimizer yang tidak masuk precache manifest.
- SVG peta dipasang dengan `id` provinsi dan penanda `data-group` kawasan seperti di bagian 3; build gagal jika ada cakupan tanpa elemen peta.
- Aturan data kab/kota di bagian 4.1 dicek. Build gagal jika ada varian yang bentrok atau relasi kode ↔ kab/kota yang tidak dua arah.
- Kamus nasional untuk SRD bagian 5.1 tidak disimpan di `plates.json`. Aplikasi membangunnya sekali saat konten dimuat, dalam bentuk ternormalisasi dan bentuk tanpa spasi, supaya pencocokan tidak perlu menormalisasi ratusan nama setiap kali menjawab. Membangunnya hanya sekitar 1 ms, jadi menyimpannya di bundle hanya menggandakan data.

**Batasan static export Next.js.** Karena tidak ada server Next.js saat runtime, fitur berikut tidak dipakai: Route Handler, Server Action, Middleware, ISR, dan optimasi gambar `next/image` (dipasang `images.unoptimized: true`). Pengalihan `terka.vercel.app` ke `terka.my.id` diatur di pengaturan domain Vercel, bukan `redirects` di `next.config`, karena `redirects` tidak berlaku di static export. Semua komponen yang membaca Dexie, Supabase, atau mesin penjadwalan ditandai `'use client'` dan baru membaca data setelah mount; HTML hasil prerender hanya berisi kerangka layar. Web Worker optimizer dibundel sendiri oleh `scripts/postbuild.ts` ke `/optimizer/worker.js` dan dibuat dengan `new Worker('/optimizer/worker.js', { type: 'module' })`; berkas WebAssembly-nya (`binding-wasm32-wasip1`, tanpa threading) dimuat dari `/optimizer/fsrs.wasm`. Keduanya ikut precache. Worker bawaan Turbopack tidak dipakai karena bootstrap-nya membaca daftar chunk dari fragmen URL, dan fragmen itu hilang saat skrip worker dilayani service worker.

**Header situs statis.** `vercel.json` memasang Content-Security-Policy untuk semua path: aset dari origin sendiri, `'unsafe-inline'` untuk skrip dan gaya inline Next.js, `'wasm-unsafe-eval'` untuk optimizer, `https://*.supabase.co` untuk sinkronisasi, dan `https://challenges.cloudflare.com` untuk Turnstile, dengan `frame-ancestors 'none'` dan `object-src 'none'`. Header lain: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` yang mematikan kamera, mikrofon, dan lokasi, serta `Cache-Control: no-cache` untuk `/sw.js`. Server uji E2E memasang header yang sama, jadi seluruh tes Playwright berjalan di bawah CSP ini.

**Migration database.** Disimpan di `supabase/migrations` dalam repositori yang sama. CI menjalankan seluruh tes (Tests bagian 3), termasuk tes RLS terhadap database lokal, sebelum menerapkan migration ke produksi lewat Supabase CLI.

**Migrasi bertahap.** Migration pertama langsung membuat skema akhir di ERD, karena belum ada data server sebelumnya. Perubahan skema setelah rilis dilakukan bertahap: kolom baru wajib memiliki nilai bawaan atau boleh kosong, klien lama tetap berjalan selama masa kompatibilitas, lalu diminta memperbarui aplikasi sebelum sinkronisasi; data lokalnya tetap dapat diekspor. Kolom yang tidak lagi dipakai baru dihapus setelah cadangan dan pemeriksaan selesai.

**Kompatibilitas maju.** Rilis bertahap membuat satu akun bisa dipakai di perangkat dengan versi aplikasi berbeda. Perangkat versi lama bisa menarik event yang dibuat versi baru, misalnya jawaban `setrecall` sebelum perangkat itu mengenal mode tersebut. Event seperti itu tidak boleh dilewati, karena hasil replay perangkat lama akan berbeda dari perangkat baru. Aturannya:

1. Setiap event jawaban membawa `engine_version`.
2. Klien yang menarik event dengan `engine_version` lebih besar dari miliknya, atau berisi nilai `mode`, `context`, `question_type`, maupun `match_type` yang tidak dikenalnya, tetap menyimpan event itu di Dexie, tetapi tidak menjalankan replay.
3. Klien menampilkan pesan pembaruan dari `Terka_Microcopy.md` dan meminta service worker memeriksa versi baru. Selama menunggu, latihan tetap berjalan dari keadaan aplikasi terakhir, dan jawaban baru tetap masuk antrean kirim.
4. Setelah versi baru aktif, replay penuh berjalan sekali.

**Penerbitan antarmuka.** Situs diterbitkan sebagai aplikasi statis. Pengembalian versi hanya boleh menuju versi yang mendukung skema aktif. Setelah penghapusan kolom lama, gunakan rilis perbaikan yang kompatibel; jangan mengembalikan klien yang mengharapkan skema lama.

**Perubahan engine.** Setiap perubahan yang menaikkan `ENGINE_VERSION` wajib disertai pembaruan uji hasil acuan (TR-43). Di perangkat pengguna, versi baru memicu replay penuh saat aplikasi dibuka.

---

## 8. Penanganan Kegagalan

Sistem memperlakukan kegagalan sebagai keadaan yang harus dijelaskan, bukan dibiarkan senyap. Teks lengkapnya ada di `Terka_Microcopy.md`.

| Kondisi                                                              | Perilaku sistem                                                                                                                                                                              |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IndexedDB gagal dibaca                                               | Sesi tidak dimulai; pengguna diminta memuat ulang. Tidak ada penulisan baru sebelum data terbaca, supaya keadaan aplikasi yang rusak tidak tertimpa                                          |
| IndexedDB penuh (`QuotaExceededError`)                               | Jawaban yang gagal ditulis tidak dianggap tersimpan. Sesi berhenti dan pengguna diminta mengosongkan ruang atau mengekspor data                                                              |
| `plates.json` gagal dimuat                                           | Aplikasi berhenti di layar pesan, bukan berjalan dengan data kosong yang bisa membuat seluruh kartu dihitung `suspended`                                                                     |
| `navigator.storage.persist()` ditolak                                | Aplikasi tetap berjalan. Jika belum login, ajakan login untuk sinkronisasi ditonjolkan karena risiko kehilangan data naik                                                                    |
| Tidak ada koneksi                                                    | Bukan kegagalan. Latihan tetap berjalan dari precache; antrean kirim dikirim saat online                                                                                                     |
| Server Supabase tidak terjangkau atau proyek dijeda                  | Diperlakukan sama dengan offline. Setelah 3 hari gagal berturut-turut, status sinkronisasi menampilkan pesan server tidak terjangkau dari `Terka_Microcopy.md`, tanpa menyebut proyek dijeda |
| Sesi login berakhir                                                  | Latihan tetap berjalan; push berhenti; pengguna diminta login lagi                                                                                                                           |
| Login Google dibatalkan pengguna                                     | Callback menerima kesalahan `access_denied`; kembali ke layar masuk tanpa pesan; data lokal utuh                                                                                             |
| Login Google gagal karena `disallowed_useragent` atau kesalahan lain | Pesan gagal dengan tawaran masuk lewat email                                                                                                                                                 |
| Email tautan masuk tidak sampai                                      | Setelah 60 detik, tombol kirim ulang aktif dan teks bantuan menyebut folder spam                                                                                                             |
| CAPTCHA gagal atau tidak termuat                                     | Email tidak dikirim; pengguna diminta mencoba lagi atau memakai Google. Latihan tanpa akun tidak terpengaruh                                                                                 |
| Jatah harian Resend habis                                            | Supabase Auth gagal mengirim; pengguna diarahkan ke login Google. Pemilik proyek diberi tahu lewat pemantau                                                                                  |
| Callback OAuth dibuka tanpa `code` atau dengan code kedaluwarsa      | Tidak ada session; kembali ke layar masuk dengan pesan gagal                                                                                                                                 |
| Batas perangkat aktif tercapai     saat mendaftarkan perangkat baru  | Latihan tetap berjalan; push dari perangkat ini berhenti tanpa karantina dan dicoba lagi sekali sehari (bagian 5.2). Pesan di `Terka_Microcopy.md`                                           |
| Batas baris harian per akun tercapai                                 | Event tetap di antrean kirim dan dikirim setelah batas direset; tidak ada data yang hilang                                                                                                   |
| Versi kebijakan privasi baru belum disetujui                         | Sinkronisasi berhenti sampai pengguna menyetujui; latihan tetap berjalan                                                                                                                     |
| Event ditolak server                                                 | Masuk karantina, jumlahnya tampil di status sinkronisasi, ikut dalam ekspor                                                                                                                  |
| Akun yang login beda dengan pemilik data lokal                       | Tidak ada push; pengguna memilih kembali ke akun sebelumnya atau menghapus data lokal                                                                                                        |
| Jam perangkat lebih maju dari server                                 | Ditangani otomatis lewat `effective_ts` (bagian 4.4); tidak ada pesan ke pengguna                                                                                                            |
| Optimizer gagal dimuat atau crash                                    | Parameter yang sedang dipakai tetap berlaku. Kegagalan dicatat di layar diagnostik, tidak ditampilkan di alur belajar                                                                        |
| Replay gagal karena event tidak valid                                | Event itu dilewati dan dicatat di layar diagnostik. Satu event rusak tidak boleh menghentikan seluruh aplikasi                                                                               |

---

## 9. Keamanan dan Privasi

**Row Level Security aktif di semua tabel.** Setiap policy memakai bentuk `user_id = (select auth.uid())`. Bentuk `select` di dalam kurung dipakai supaya Postgres menghitung `auth.uid()` sekali per query, bukan sekali per baris. Kolom `user_id` memiliki default `auth.uid()` dan policy insert memakai `with check` yang sama, jadi klien tidak bisa menulis baris atas nama pengguna lain.

**Tabel insert-only tidak memiliki policy update maupun delete.** Tanpa policy, operasi itu otomatis ditolak RLS. Riwayat jawaban tidak bisa diubah dari klien, bahkan oleh pemiliknya sendiri. Undo memakai `review_voids`, bukan menghapus baris.

**Grant eksplisit.** Supabase sedang mengubah default-nya: tabel baru di schema `public` tidak lagi otomatis terbuka lewat Data API, dan grant Postgres eksplisit wajib ada. Setiap migration yang membuat tabel wajib menyertakan:

- `revoke all` dari role `anon` untuk seluruh tabel Terka.
- `grant select` dan `grant insert` per kolom ke role `authenticated` untuk tabel insert-only. Kolom `received_at` dan `server_seq` tidak termasuk, jadi klien tidak bisa mengisinya.
- `grant update` hanya untuk kolom yang memang boleh diubah di tabel yang bisa diubah.
- Tidak ada grant untuk `usage_daily`, `usage_totals`, dan `timezones`; hanya trigger `security definer` yang menulis ke tabel penghitung, dan katalog zona waktu diisi migration.
- Grant insert tidak pernah menyertakan kolom yang diisi server (`received_at`, `server_seq`, `devices.last_seen_at`).

Tes keamanan yang masih aktif pada rentang TR-52 sampai TR-59 di `Terka_Tests.md` memastikan tidak ada tabel yang terlewat.

**Fungsi `security definer`.** Tiga kategori: delete_user(), has_current_consent(), dan trigger pengaman pemakaian — penghitung baris tingkat statement serta batas perangkat aktif. Semuanya memakai `set search_path = ''`.

**Hapus akun tidak boleh terhalang foreign key.** Semua foreign key di dalam data pengguna memakai `cascade`, `no action`, atau `set null` dengan daftar kolom; tidak ada `restrict`. Foreign key `(user_id, run_id)` wajib memakai `on delete set null (run_id)`, karena `set null` tanpa daftar kolom ikut mengosongkan `user_id` yang `NOT NULL` dan menggagalkan cascade. Tabel aksi lengkapnya ada di ERD bagian 8.

**Fungsi `delete_user()`.** Isinya hanya menghapus baris `auth.users` dengan `id = auth.uid()`, memakai `set search_path = ''` supaya tidak bisa dibajak lewat schema lain. Hanya role `authenticated` yang boleh memanggilnya.

**Sinyal mengetik.** `key_gaps_ms` hanya berisi jeda waktu antarinput, tanpa tombol apa yang ditekan. Dari data itu, isi jawaban tidak bisa direkonstruksi; isi jawaban memang sudah tersimpan terpisah di `raw_answer`. Tidak ada sinyal yang direkam di luar kolom jawaban Terka.

**Data yang disimpan:** email untuk login, data belajar, label perangkat. Tidak ada nomor pelat kendaraan orang lain dan tidak ada lokasi. Di luar database, Vercel Web Analytics menghitung page view tanpa cookie; tidak ada data latihan yang ikut terkirim ke sana.

**Pengaman untuk layanan publik.** RLS menjamin satu pengguna tidak bisa membaca data pengguna lain, tetapi tidak mencegah satu akun mengirim data sebanyak-banyaknya. Batas baris ditegakkan trigger `after insert` tingkat statement yang menaikkan tabel penghitung `usage_daily` dan `usage_totals` secara atomik, sekali per batch. Batas perangkat ditegakkan trigger `before insert` di `devices`. Keduanya dijelaskan di ERD bagian 2 dan 6:

| Tabel                                                                                                                               | Batas per akun                             | Alasan angkanya                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `review_logs`                                                                                                                       | 1.000 baris per hari server (UTC)          | Sesi harian normal sekitar 60 jawaban; Mode Kilat berulang tetap jauh di bawahnya. Klaim riwayat lokal yang besar saat login pertama dikirim bertahap selama beberapa hari |
| `sightings`, `fact_views`                                                                                                           | 1.000 baris per hari server (UTC)          | Jauh di atas pemakaian wajar: satu Pelat Terlihat per pencarian, satu fakta per sesi                                                                                       |
| `card_notes`                                                                                                                        | 1 baris per kode, maks. 280 karakter       | Sudah dijaga constraint                                                                                                                                                    |
| `devices`                                                                                                                           | 20 perangkat aktif (dipakai dalam 90 hari) | Lebih dari itu hampir pasti bukan pemakaian wajar. Jendela 90 hari mencegah pengguna Safari terkunci karena storage-nya dihapus berkala                                    |
| Seluruh tabel log pengguna: `practice_runs`, `review_logs`, `review_voids`, `card_events`, `sightings`, `fact_views`, `fsrs_params` | 50.000 baris                               | Lebih dari 5 tahun pemakaian rajin, sekitar 25 MB per akun. Dinaikkan dengan migration jika pengguna wajar mendekatinya                                                    |

Batas dihitung per hari server, bukan per `local_day`, karena `local_day` datang dari klien dan bisa dipalsukan untuk menyebar kiriman ke tanggal lama.

**Batas per akun belum cukup untuk seluruh layanan.** Batas di atas mencegah satu akun merusak datanya sendiri, tapi akun baru mudah dibuat, terutama lewat Google. Dengan batas total 50.000 baris, satu akun paling banyak memakai sekitar 25 MB, jadi perlu sekitar sebelas akun untuk mencapai pemicu 300 MB. Dua pengaman tambahan berlaku untuk seluruh layanan:

- **Alarm ukuran database.** Workflow GitHub Actions terjadwal harian, terpisah dari pencadangan mingguan (bagian 6), menjalankan `select pg_database_size(current_database())` lewat role Postgres baca-saja yang connection string-nya disimpan sebagai secret CI. Jika hasilnya melewati 150 MB, workflow gagal dan GitHub mengirim notifikasi ke pemilik proyek. Ambang ini setengah dari pemicu Pro, jadi masih ada waktu untuk menyelidiki lonjakan.
- **Saklar pendaftaran.** Tabel satu baris `service_flags` (ERD bagian 6) berisi `signups_open`. Jika bernilai `false`, trigger `before insert` di `devices` menolak perangkat dari akun yang belum punya perangkat sama sekali, dengan kode kesalahan khusus. Akun yang sudah pernah sinkron tidak terpengaruh, dan latihan tanpa akun tetap berjalan. Saklar diubah pemilik proyek lewat SQL editor Supabase; klien tidak punya grant ke tabel ini.

Policy insert di tabel log latihan, `practice_runs`, dan `fsrs_params` juga memanggil `has_current_consent()`; `privacy_consents` sendiri dikecualikan agar persetujuan pertama maupun pembaruan dapat ditulis. Fungsi itu memeriksa baris `privacy_consents` untuk versi wajib, sehingga persetujuan tidak hanya dijaga UI.

**Ukuran per baris juga dibatasi**, supaya batas jumlah baris mencerminkan ukuran data: teks, array, dan `set_items` memiliki batas atas, dan tidak ada kolom yang tumbuh bersama umur akun (ERD bagian 6).

Kiriman yang ditolak batas harian tetap di antrean kirim dan dikirim ulang setelah hari server berganti. Batas total tidak direset harian; ekspor tetap tersedia dan kenaikan batas perlu perubahan kebijakan kapasitas oleh pemilik proyek (bagian 5.2), jadi tidak ada data yang hilang. Batas dipantau lewat KPI di PRD bagian 9; pengguna wajar tidak boleh pernah menyentuhnya.

**Kewajiban data pribadi.** Terka menyimpan email dan riwayat latihan orang lain, dan pengguna di Indonesia dilindungi UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi. Yang sudah dipenuhi desain: data seminimal mungkin, tujuan tunggal (sinkronisasi), persetujuan eksplisit, ekspor penuh, dan hapus akun beserta seluruh datanya. Yang perlu dipastikan sebelum login dibuka: isi kebijakan privasi, penyebutan bahwa server berada di Singapura, dan prosedur jika terjadi kebocoran data. Bagian ini sebaiknya ditinjau orang yang paham hukum; dokumen teknis tidak bisa menggantikannya.

**Key.** Hanya publishable key yang ada di bundle; request dengannya berjalan sebagai role `anon` sampai pengguna login. Service role key tidak pernah dipakai di klien. Token akses Supabase CLI untuk migration disimpan sebagai secret di CI.

---

## 10. Pertanyaan yang Masih Terbuka

1. Apakah Supabase Auth perlu domain kustom seperti `auth.terka.my.id`, supaya alamat callback di layar persetujuan Google juga memakai domain Terka? Fitur ini berbayar, jadi keputusannya digabung dengan pemicu pindah ke paket Pro di bagian 6.
2. Apakah logout sebaiknya tetap menyimpan data lokal dalam mode baca-saja, alih-alih menghapusnya? Menghapus lebih aman terhadap kebingungan pemilik data, tetapi merepotkan jika pengguna logout tanpa sengaja.
3. `@open-spaced-repetition/binding` masih public beta. Jika API-nya berubah besar sebelum stabil, apakah optimizer dipindah ke skrip Python terpisah yang dijalankan manual? Pemicunya: dua rilis berturut-turut yang merusak uji hasil acuan optimizer.
4. Apakah deteksi `input_mode` cukup andal di tablet dengan keyboard fisik? Jika salah deteksi, jawaban keyboard fisik masuk kelompok `touch` dan terlihat terlalu cepat.
5. Apakah cadangan mingguan cukup sampai pemicu Pro tercapai? Kehilangan data seminggu terasa kecil untuk satu orang, tetapi tidak untuk ratusan pengguna. Alternatifnya menjalankan `pg_dump` harian, dengan biaya penyimpanan yang tetap kecil.
6. Apakah DMARC langsung memakai kebijakan `p=quarantine`, atau mulai dari `p=none` sambil memantau laporan? Mulai dari `none` lebih aman untuk minggu pertama, tetapi memberi perlindungan spoofing yang lebih lemah.
7. **Terjawab.** Kolom `region_id` di `review_logs` dan `card_notes` diganti `content_id` sebelum rilis publik, dan `card_events` memakai pasangan `content_id` + `mode`; `card_id` tidak disimpan di server dan dibentuk klien (ERD bagian 7). `sightings.region_id` tetap, karena isinya hanya kode wilayah.
8. **Wajib dijawab sebelum login publik dibuka.** Dari mana biaya paket Pro Supabase dibayar saat pemicu di bagian 6 tercapai? Dengan 250 pengguna aktif ber-akun, pemicu 300 MB tercapai dalam sekitar lima bulan. Jika belum ada sumber biaya, saklar pendaftaran (bagian 9) dipakai untuk menahan jumlah akun.
