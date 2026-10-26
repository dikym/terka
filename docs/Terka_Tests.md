# TERKA — Katalog Pengujian

**Status:** Draf · **Bahasa:** Indonesia
**Dokumen terkait:** PRD (produk dan alur pengguna) · Microcopy (teks UI) · SRD (aturan perilaku) · TRD (arsitektur dan sinkronisasi) · ERD (skema database) · Special Codes (`Terka_Special_Codes.md`) · Fun Facts (`Terka_Fun_Facts.md`)

> **Slogan:** Lihat pelatnya, terka asalnya.
> **Fokus dokumen ini:** seluruh katalog tes — perilaku, teknis, dan E2E — beserta alat, CI, dan data uji yang dipakai.

---

## 1. Tujuan dan Ketentuan Penulisan

Dokumen ini satu-satunya tempat katalog tes Terka. Aturan yang diuji tetap ditulis di dokumen asalnya; tes di sini merujuk ke sana.

| Katalog      | Prefiks | Menguji aturan di                                     | Letak    |
| ------------ | ------- | ----------------------------------------------------- | -------- |
| Tes perilaku | `SR-`   | SRD                                                   | Bagian 5 |
| Tes teknis   | `TR-`   | TRD dan ERD                                           | Bagian 6 |
| Tes E2E      | `E2E-`  | Alur di PRD bagian 7 dan teks di `Terka_Microcopy.md` | Bagian 7 |

**Kategori:** `normal` untuk alur normal, `batas` untuk kondisi batas, `negatif` untuk input atau keadaan yang harus ditolak.

**Angka di tes** adalah data uji konkret. Nilainya mengikuti pemilik angka yang berlaku (PRD, bagian pemilik angka); setelah kode ada, tes mengambilnya dari `src/rules.ts`. Tes E2E memeriksa teks UI hasil render, bukan template Microcopy, kecuali disebut lain.

**Kolom Aturan** di tes perilaku berisi nomor bagian SRD (misalnya `SRD 4.10`), kriteria penerimaan SRD bagian 9 (misalnya `AC-9`), atau bagian PRD (misalnya `PRD 6.7`).

ID berikut sudah tidak digunakan: SR-211, SR-223–SR-229, SR-298, TR-58, TR-80, TR-155, TR-159, TR-160, TR-163, TR-164, TR-204, TR-206, E2E-73, dan E2E-85. Nomornya tidak dipakai ulang. TR-126 dan SR-296 tetap berstatus Tidak aktif.

**ID stabil.** Satu ID untuk satu skenario. ID yang ditandai Tidak aktif disimpan sebagai catatan tetapi dikecualikan dari eksekusi dan hitungan cakupan; ID itu tidak boleh digunakan ulang. Jika aturannya berubah, isi tes diperbarui dengan ID yang sama. ID yang pernah dipakai tidak dipakai ulang untuk skenario lain.

**Waktu dan acak dikendalikan.** Tes tidak pernah membaca jam sistem atau `Math.random()` langsung. Mesin penjadwalan menerima `clock` dan `seed` sebagai dependensi, sehingga skenario seperti batas 00.00 atau pindah zona waktu bisa diuji tanpa menunggu.

---

## 2. Lapisan dan Alat Pengujian

| Lapisan           | Alat                                            | Yang diuji                                                                                              |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Unit              | `bun test`                                      | Fungsi murni mesin penjadwalan: nilai penjadwalan, normalisasi jawaban, antrean, replay, batas hari     |
| Property-based    | fast-check                                      | Invarian replay: urutan kedatangan tidak memengaruhi hasil, idempotensi, replay bertahap = replay penuh |
| Integrasi lokal   | `bun test` + fake-indexeddb                     | Dexie, antrean kirim, cache `derived`, impor dan ekspor                                                 |
| Integrasi server  | Supabase CLI (`supabase start`)                 | Push, pull, trigger LWW, constraint, FK                                                                 |
| Keamanan database | pgTAP lewat `supabase test db`                  | RLS, grant, fungsi `delete_user()`                                                                      |
| E2E               | Playwright                                      | Alur pengguna, offline, dua perangkat lewat dua browser context, zona waktu lewat `timezoneId`          |
| Konten            | `bun test` saat build                           | Validitas `plates.json`, AC-1, alias, ID yang tidak digunakan lagi, SVG                                 |
| Performa          | Skrip benchmark `bun` + Playwright dengan CPU throttling | Replay, pembuatan antrean, sinkronisasi pertama                                                         |

---

## 3. Tahapan Pemeriksaan di CI

Urutan di GitHub Actions untuk setiap push ke branch utama:

1. Lint dan type check, termasuk pemeriksaan bahwa nama tes dan komentar kode tidak memuat ID katalog atau rujukan dokumen. Karena itu katalog ini tidak dilacak lewat ID di kode tes; setiap tes menjelaskan perilakunya sendiri.
2. Tes konten. Gagal → build dihentikan.
3. Unit dan property-based. Cakupan baris mesin penjadwalan (`src/core`) minimal 90%.
4. Integrasi lokal dan integrasi server terhadap stack Supabase lokal.
5. pgTAP untuk RLS dan grant.
6. Playwright E2E di Chromium dan WebKit. WebKit wajib, karena perangkat utama pengguna memakai Safari iOS.
7. Jika semua lolos: migration diterapkan ke produksi, lalu frontend di-deploy.

Satu tes otomatis gagal di langkah mana pun menghentikan migration dan deploy. E2E-105 dan pemeriksaan kotak masuk nyata E2E-108 adalah checklist rilis manual; CI memeriksa bukti checklist untuk rilis publik, bukan berpura-pura menjalankannya di emulator. Katalog ini adalah spesifikasi tes, bukan bukti bahwa implementasinya sudah ada atau lolos.

---

## 4. Data Uji

- **Golden logs:** beberapa log event nyata yang sudah dianonimkan, disimpan bersama keadaan aplikasi hasil replay-nya. Setiap perubahan mesin penjadwalan yang menggeser hasil wajib memperbarui berkas hasil acuan secara sadar di commit yang sama.
- **Pengguna sintetis:** generator yang mensimulasikan pengguna dengan kurva lupa yang diketahui. Dipakai untuk menguji apakah optimizer bisa menemukan kembali parameter yang dipakai untuk membangkitkan data.
- **Konten mini:** `plates.json` kecil berisi 8 kode yang mewakili semua kasus khusus — kode lintas provinsi, kode dengan alias, entri `medium`, dan kode yang pernah pindah wilayah — beserta kab/kotanya. Data uji kab/kota wajib memuat: nama kota dan kabupaten yang sama, kab/kota yang dipakai dua kode, nama 4 huruf, nama berawalan "Kota" sebagai bagian nama, varian terdaftar, keanggotaan `medium`.

**Data uji penempatan dan fakta.** Tes penempatan memakai data uji khusus minimal 28 kode (8 common, 10 medium, 10 rare), bukan data uji mini 8 kode. Tes rotasi memakai 43 fakta siap terbit bersumber sintetis untuk pengujian; data ini terpisah dari 41 fakta produksi di `../data/fun-facts.json`. Semua sumber sintetis hanya ada di data uji dan tidak boleh masuk konten produksi.

**Data uji bawaan.** Kecuali disebut lain, tes perilaku memakai konten mini di atas beserta kab/kota, alias, dan varian penulisan. Tingkat pengguna Menengah: batas 10 materi baru per hari dan ambang penahanan 40. Zona waktu-nya `Asia/Makassar`, dan `local_day` awalnya Senin 21 September 2026.

---

## 5. Pengujian Perilaku (SR-)

Setiap aturan di SRD memiliki minimal satu tes. Hampir semua tes di bagian ini berupa unit test terhadap fungsi murni mesin penjadwalan, memakai jam dan seed yang dikendalikan (bagian 2). Tes yang memerlukan dua perangkat dijalankan sebagai tes integrasi dengan dua instance mesin penjadwalan yang saling bertukar event.

### 5.1 Cakupan dan Pemilihan Materi

| ID     | Skenario                                                                             | Hasil yang diharapkan                                                                                 | Kategori | Aturan  |
| ------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | -------- | ------- |
| SR-001 | Cakupan kawasan Maluku, ada materi baru di semua kawasan                             | Materi baru yang diperkenalkan hanya DE dan DG                                                        | normal   | SRD 2.4 |
| SR-002 | Cakupan Maluku, kartu BE dari Sumatera waktunya diulang                              | BE tetap masuk sesi harian                                                                            | normal   | AC-3    |
| SR-003 | 10 Perkenalan hari ini, lalu Cakupan diganti ke Jawa                                 | Tidak ada materi baru lagi hari ini                                                                   | batas    | AC-4    |
| SR-004 | Cakupan diganti lima kali dalam satu hari                                            | Total Perkenalan hari itu tetap maksimal 10                                                           | batas    | AC-4    |
| SR-005 | Cakupan provinsi Maluku Utara, semua kartunya sudah diperkenalkan                    | Beranda menyatakan semua materi di wilayah ini sudah diperkenalkan; antrean hanya berisi pengulangan  | batas    | SRD 2.4 |
| SR-006 | Kode B dengan spans Jawa Barat dan Banten                                            | Kartu tingkat kode B hanya dihitung di DKI Jakarta; hubungan lintas provinsi tidak menggandakan kartu | batas    | SRD 2.3 |
| SR-007 | Cakupan berisi 10 kartu terhitung, 4 `mature`, 6 `new`                               | Persentase penguasaan 40%                                                                             | normal   | SRD 2.5 |
| SR-349 | Satu kartu `review` berinterval 7 hari, dua kartu `new`                              | Persentase penguasaan 11%                                                                             | normal   | SRD 2.5 |
| SR-350 | Satu kartu `review` berinterval 40 hari tanpa lulus Level 3                          | Persentase penguasaan 95%, belum dikuasai                                                             | batas    | SRD 2.5 |
| SR-351 | Semua kartu `mature` kecuali satu `review` berinterval 20 hari                       | Persentase penguasaan 99%, bukan 100%                                                                 | batas    | SRD 2.5 |
| SR-367 | Semua kode provinsi Sumatera Utara sudah diperkenalkan | Beranda menawarkan **Lanjut ke Sumatera Barat** | normal | SRD 2.6 |
| SR-368 | Provinsi terakhir sebuah kawasan sudah habis | Tawaran ke provinsi pertama yang masih punya materi baru di kawasan berikutnya | batas | SRD 2.6 |
| SR-369 | Cakupan kawasan habis, kawasan berikutnya juga habis | Tawaran melompat ke kawasan berikutnya yang masih punya materi baru, berputar ke awal | batas | SRD 2.6 |
| SR-370 | Cakupan nasional, atau tidak ada materi baru di mana pun, atau Cakupan masih punya materi baru | Tidak ada tawaran | batas | SRD 2.6 |
| SR-371 | Cakupan menunjuk provinsi atau kawasan yang tidak ada di data | Tidak ada tawaran | batas | SRD 2.6 |
| SR-008 | Semua kartu satu kawasan `mature`, masih ada pasangan tertukar aktif di dalamnya     | Kawasan belum dikuasai                                                                                | batas    | SRD 2.5 |
| SR-009 | Pasangan BE ↔ DE aktif, kartu Sumatera dan Maluku semua `mature`                     | Sumatera dan Maluku sama-sama belum dikuasai                                                          | batas    | SRD 2.5 |
| SR-010 | Satu dari 10 kartu cakupan `suspended` karena `confidence` turun, 9 lainnya `mature` | Persentase 100%; cakupan bisa dikuasai                                                                | batas    | AC-24   |
| SR-011 | Kartu `region2code` masih `locked`                                                   | Tidak menurunkan persentase penguasaan                                                                | batas    | AC-24   |
| SR-012 | Provinsi yang semua entrinya `medium`                                                | Tidak ada persentase; tidak bisa dinyatakan dikuasai; jumlah materi baru 0                            | batas    | SRD 2.5 |
| SR-013 | Pelat Terlihat 90 hari terakhir: DR 5, EA 2, ED 0, Cakupan Bali & Nusa Tenggara      | Urutan materi baru DR, EA, lalu kode lain menurut urutan data                                         | normal   | AC-23   |
| SR-014 | DR memiliki 6 Pelat Terlihat, semuanya 91 hari lalu                                  | DR tidak didahulukan                                                                                  | batas    | SRD 2.7 |
| SR-015 | Dua kode dengan jumlah Pelat Terlihat sama                                           | Urutan menurut kemunculan di `plates.json`                                                            | batas    | SRD 2.7 |
| SR-016 | Semua kode yang pernah terlihat sudah diperkenalkan                                  | Kode yang belum pernah terlihat tetap diperkenalkan menurut urutan data                               | batas    | SRD 2.7 |
| SR-017 | Kode baru ditambahkan ke `plates.json`                                               | Kode masuk kawasannya sebagai materi baru tanpa perubahan kode program                                | normal   | SRD 2.1 |

### 5.2 Tingkat Kesulitan

| ID     | Skenario                                                                     | Hasil yang diharapkan                                                                                                                                    | Kategori | Aturan           |
| ------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------- |
| SR-018 | Level otomatis tiap fase, mode, dan ambang penguasaan                        | Mengikuti prioritas SRD 3.2: intro 1; `setrecall` non-intro 3; review biasa <21 hari 2; review ≥ 21 hari tanpa kelulusan Level 3 mendapat uji otomatis 3 | normal   | SRD 3.2          |
| SR-019 | Level dinaikkan manual dari 2 ke 3, jawaban benar                            | Jadwal diperbarui seperti biasa                                                                                                                          | normal   | SRD 3.3          |
| SR-020 | Level diturunkan manual dari 3 ke 1, jawaban benar                           | D, S, dan interval tidak berubah; akurasi tercatat; tidak masuk persentil                                                                                | batas    | AC-6             |
| SR-021 | Level diturunkan manual, jawaban salah dengan wilayah valid lain             | `lapses` tidak bertambah; pasangan tertukar tercatat                                                                                                     | batas    | AC-6             |
| SR-022 | Pengecoh Level 1 di Cakupan kawasan                                          | Semua pengecoh kab/kota dari kawasan itu, dari provinsi lain jika tersedia                                                                               | normal   | SRD 3.1          |
| SR-023 | Kartu review interval 25 hari, belum pernah benar di Level 3                 | Tetap review; tayangan terjadwal berikutnya otomatis Level 3 pada `card_id` yang sama                                                                    | batas    | AC-2             |
| SR-024 | Benar di Level 3 saat interval 12 hari, interval mencapai 21 hari belakangan | Kartu jadi `mature` begitu interval mencapai 21 hari                                                                                                     | batas    | AC-2             |
| SR-025 | Satu-satunya jawaban benar Level 3 didapat lewat kenaikan level manual       | Memenuhi syarat Level 3                                                                                                                                  | batas    | SRD 3.3, SRD 3.4 |
| SR-026 | Kode DG tanpa pasangan tertukar                                              | `code2region` memiliki bentuk Level 3 Tebak berwaktu dan dapat dikuasai lewat jalur otomatis tanpa kelulusan kartu lain atau pasangan tertukar           | batas    | AC-1             |
| SR-027 | Mode Kilat dimulai dengan kartu `mature`                                     | Soal tetap Level 1; jadwal tidak berubah                                                                                                                 | normal   | SRD 3.5          |
| SR-028 | Latihan Bandingkan Kode pada kartu berstatus `learning`                      | Disajikan Level 3                                                                                                                                        | batas    | SRD 3.5          |

### 5.3 Penilaian Otomatis

| ID     | Skenario                                                                                        | Hasil yang diharapkan                                                                                                                    | Kategori | Aturan  |
| ------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| SR-029 | Jawaban salah                                                                                   | Nilai penjadwalan 1                                                                                                                      | normal   | SRD 4.4 |
| SR-030 | Soal jawaban tunggal tanpa bantuan Level 3 tanpa input sampai 8 detik                           | Nilai penjadwalan 1; timeout; latensi null                                                                                               | batas    | SRD 4.4 |
| SR-031 | Tebak berwaktu, ketukan pertama di detik 7,9, Enter di detik 11                                 | Tidak dianggap waktu habis; dinilai menurut jawabannya                                                                                   | batas    | SRD 4.4 |
| SR-338 | Soal Level 2 dan Level 3 di semua mode, termasuk Kode diplomat                                  | Tidak ada huruf pertama, digit pertama, tipe pemegang, atau sebagian jawaban yang tampil sebelum menjawab; kolom ketik kosong            | negatif  | SRD 3.1 |
| SR-339 | Level 2 Tebak daerah, ketukan pertama di detik 20                                               | Tidak dianggap waktu habis; Level 2 tidak punya batas waktu                                                                              | batas    | SRD 3.1 |
| SR-340 | Kartu `code2region` berstatus `review` dengan interval ≥ 21 hari dan belum pernah lulus Level 3 | Soal tampil sebagai Tebak berwaktu (`question_type = typed`, `level = 3`); tidak ada kartu `blindrecall` yang dibuat untuk kode mana pun | normal   | SRD 3.2 |
| SR-032 | Benar, latensi di bawah P20, tanpa penalti                                                      | Skor +2; nilai penjadwalan 4                                                                                                             | normal   | AC-29   |
| SR-033 | Benar, latensi di bawah P20, kecocokan `typo`                                                   | Skor +1; nilai penjadwalan 3                                                                                                             | batas    | AC-29   |
| SR-034 | Benar, latensi di antara P20 dan P80, tanpa penalti                                             | Skor 0; nilai penjadwalan 3                                                                                                              | normal   | SRD 4.4 |
| SR-035 | Benar, latensi di atas P80                                                                      | Skor −2; nilai penjadwalan 2                                                                                                             | normal   | SRD 4.4 |
| SR-036 | Latensi tepat di P20, dan tepat di P80                                                          | Komponen latensi 0 untuk keduanya                                                                                                        | batas    | SRD 4.4 |
| SR-037 | Latensi normal, milidetik per karakter di atas P80                                              | Skor −1; nilai penjadwalan 2                                                                                                             | batas    | SRD 4.4 |
| SR-038 | Jeda terpanjang 1.500 ms dan di atas P90 kelompok                                               | Penalti −1                                                                                                                               | batas    | SRD 4.4 |
| SR-039 | Jeda terpanjang di atas P90 kelompok tetapi hanya 900 ms                                        | Tanpa penalti                                                                                                                            | batas    | SRD 4.4 |
| SR-040 | Jawaban akhir 8 huruf dengan 3 huruf dihapus, dan dengan 2 huruf dihapus                        | Penalti −1 untuk 3 huruf (37,5%); tanpa penalti untuk 2 huruf (25%)                                                                      | batas    | SRD 4.4 |
| SR-041 | Level 1 dengan keyboard, pilihan berpindah sekali sebelum Enter                                 | Penalti −1                                                                                                                               | batas    | SRD 4.4 |
| SR-042 | Kelompok memiliki 29 data, kelompok lebar memiliki 30                                           | Persentil memakai kelompok lebar                                                                                                         | batas    | AC-30   |
| SR-043 | Kelompok dan kelompok lebar sama-sama di bawah 30 data, jawaban cepat dan bersih                | Komponen persentil 0; nilai penjadwalan 3, tidak pernah 4                                                                                | batas    | SRD 4.4 |
| SR-044 | Aplikasi tidak terlihat selama soal tampil, lalu dijawab benar                                  | Nilai penjadwalan 3; tidak masuk persentil                                                                                               | batas    | AC-29   |
| SR-045 | Benar dengan latensi 75 detik                                                                   | Dianggap gangguan; nilai penjadwalan 3; tidak masuk persentil                                                                            | batas    | SRD 4.4 |
| SR-046 | `GRADE_RULES_VERSION` naik dengan bobot baru                                                    | Replay menghitung ulang seluruh nilai penjadwalan; benar/salah lama tidak berubah                                                        | batas    | AC-11   |

### 5.4 Penjadwalan dan Jarak Pengulangan

| ID     | Skenario                                                                                        | Hasil yang diharapkan                                                                                                               | Kategori | Aturan            |
| ------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------- |
| SR-047 | Materi baru dari Perkenalan sampai jadwal FSRS                                                  | Intro, lalu satu langkah di sesi yang sama setelah 4 soal lain; setelah langkah itu kartu `review` dan tidak jatuh tempo lagi hari itu, lalu mengikuti FSRS | normal   | SRD 4.6, SRD 4.14 |
| SR-357 | Kartu `review` dijawab salah di sesi harian | Kartu ditanyakan sekali lagi di akhir sesi yang sama | normal | SRD 4.6 |
| SR-358 | Jawaban Perkenalan dibatalkan lewat undo | Soal ulang yang disisipkannya ikut hilang dari sesi | batas | SRD 4.6 |
| SR-359 | Tantangan Harian, Mode Kilat, atau tes penempatan | Tidak ada soal ulang yang disisipkan | batas | SRD 4.6 |
| SR-360 | Sesi harian ditinggalkan sebelum soal ulang dijawab | Kartu tetap waktunya dikerjakan dan muncul di sesi berikutnya | batas | SRD 4.6 |
| SR-048 | Kartu `review` dijawab salah                                                                    | Status `relearning`, langsung waktunya diulang, `lapses` bertambah 1                                                           | normal   | SRD 4.6           |
| SR-049 | Kartu `mature` dijawab salah                                                                    | Status `relearning`; label Dikuasai hilang                                                                                          | normal   | SRD 7             |
| SR-337 | Dua jawaban `daily` untuk kartu `review` yang sama di satu perangkat pada `local_day` yang sama | Hanya jawaban pertama memperbarui jadwal; jawaban kedua tercatat tanpa mengubah `due`, stabilitas, atau kesulitan                   | batas    | AC-8              |
| SR-050 | Kartu belajar ulang dijawab benar                                                               | Interval berikutnya dari FSRS tanpa pemotongan 50% tambahan; review atau mature sesuai syarat                                       | normal   | SRD 4.6, SRD 7    |
| SR-051 | Langkah belajar baru dijawab keesokan harinya                                                   | Tetap dinilai sebagai langkah belajar awal, lalu kartu menjadi `review`                                                              | batas    | SRD 4.6           |
| SR-052 | Interval hasil hitungan 40 hari                                                                 | Tanggal `due` jatuh di rentang 38–42 hari, di hari dengan beban paling kecil                                                        | normal   | SRD 4.6           |
| SR-053 | Beberapa hari kandidat memiliki beban sama                                                      | Hari terpilih sama di setiap replay untuk `id` jawaban yang sama                                                                    | batas    | AC-17             |
| SR-054 | Interval hasil hitungan 2 hari                                                                  | Tidak digeser                                                                                                                       | batas    | SRD 4.6           |
| SR-055 | Property: jawaban benar pada R rendah vs R tinggi, kartu lain identik                           | Kenaikan S pada R rendah lebih besar                                                                                                | normal   | SRD 4.2           |
| SR-056 | Target retensi                                                                                  | Selalu 0,90; tidak ada jalur untuk mengubahnya dari UI                                                                              | batas    | SRD 4.3           |
| SR-057 | Kartu dengan `due` tepat di `local_day` hari ini, dibuka pukul 00.00                            | Kartu masuk antrean hari ini                                                                                                        | batas    | SRD 4.9           |

### 5.5 Antrean Harian

| ID     | Skenario                                                                                   | Hasil yang diharapkan                                                                                             | Kategori | Aturan  |
| ------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| SR-058 | Ada kartu di keempat prioritas                                                             | Urutan: belajar awal/belajar ulang, drill, pengulangan, materi baru                                               | normal   | SRD 4.7 |
| SR-059 | Prioritas 1–3 berisi 41 kartu                                                              | Materi baru ditahan; beranda menampilkan pesan jeda                                                               | batas    | AC-5    |
| SR-060 | Prioritas 1–3 berisi tepat 40 kartu                                                        | Materi baru tetap diperkenalkan                                                                                   | batas    | AC-5    |
| SR-061 | Pengulangan dengan R 0,62, 0,85, dan 0,71                                                  | Disajikan urut 0,62, 0,71, 0,85                                                                                   | normal   | AC-16   |
| SR-062 | Kartu interval 30 hari terlambat 20 hari vs kartu interval 3 hari terlambat 1 hari         | Kartu pertama didahulukan jika R-nya lebih rendah, walaupun intervalnya lebih panjang                             | batas    | SRD 4.7 |
| SR-063 | `dk::code2region` (R 0,70) dan `dk::region2code` (R 0,80) waktunya diulang bersamaan       | Hanya `code2region` disajikan; `due` kartu lain tidak berubah                                                     | normal   | AC-14   |
| SR-064 | Satu kartu terkait dilewati dua hari berturut-turut                                        | Hari ketiga kartu itu disajikan walaupun R-nya lebih tinggi                                                       | batas    | AC-15   |
| SR-065 | Tiga kartu terkait waktunya diulang bersamaan selama tiga hari                             | Ketiganya tersaji dalam tiga hari; tidak ada yang dilewati lebih dari dua hari                                    | batas    | AC-15   |
| SR-066 | Langkah belajar awal `dk::code2region` dan pengulangan `dk::region2code` di hari yang sama | Keduanya boleh tersaji; langkah belajar awal tidak dihitung dalam aturan kartu terkait                            | batas    | SRD 4.8 |
| SR-067 | Dua kartu DK sama-sama `new`                                                               | Hanya satu Perkenalan DK hari ini                                                                                 | batas    | SRD 4.8 |
| SR-068 | Urutan materi baru dalam satu kode                                                         | Hanya `code2region` masuk sebagai materi baru; `region2code` dan `setrecall` mengikuti prasyarat pembukaan        | normal   | SRD 2.7 |
| SR-069 | Tidak ada kartu yang perlu diulang dan tidak ada materi baru                               | Antrean kosong; beranda menyatakan tidak ada soal yang perlu diulang                                              | batas    | SRD 4.7 |
| SR-070 | Konstanta perhitungan durasi tiap tingkat                                                  | Perkiraan waktu aktif dua tayangan Golongan A dan pengulangan ≤ 600 detik; bukan estimasi sesi atau waktu tunggu | normal   | SRD 4.7 |
| SR-352 | 45 pengulangan jatuh tempo | Antrean berisi 30 pengulangan dengan peluang ingat terendah | batas | SRD 4.7 |
| SR-353 | 25 pengulangan terjadwal sudah dijawab hari ini, 45 jatuh tempo | Antrean berisi 5 pengulangan | batas | SRD 4.7 |
| SR-354 | Batas harian habis; ada langkah belajar dan pasangan aktif | Langkah belajar dan Bandingkan Kode tetap masuk antrean | batas | SRD 4.7 |
| SR-355 | Jawaban Bandingkan Kode, `setrecall`, dan kode khusus | Tidak mengurangi batas pengulangan harian | batas | SRD 4.7 |
| SR-356 | Tunggakan 45 pengulangan, ambang penahanan 40 | Materi baru tetap dijeda walau antrean hanya memuat 30 pengulangan | batas | SRD 4.7 |
| SR-361 | Hari aktif terakhir 7 hari lalu, 45 pengulangan jatuh tempo | Cek Ingatan ditawarkan | normal | SRD 4.7 |
| SR-362 | Hari aktif terakhir 6 hari lalu, atau tepat 30 jatuh tempo, atau sudah menjawab hari ini | Cek Ingatan tidak ditawarkan | batas | SRD 4.7 |
| SR-363 | Cek Ingatan dengan 20, 20, dan 3 kartu jatuh tempo di tiga kawasan | Soal dibagi 9, 8, dan 3 | batas | SRD 4.7 |
| SR-364 | Jawaban Cek Ingatan pada kartu jatuh tempo | Jadwal FSRS berubah sama seperti jawaban sesi harian | normal | SRD 4.7 |
| SR-365 | Setelah Cek Ingatan, tunggakan masih di atas 30 | Pengulangan kawasan dengan skor terendah didahulukan | normal | SRD 4.7 |
| SR-366 | Setelah Cek Ingatan, tunggakan tidak lagi melebihi 30 | Urutan kembali mengikuti peluang ingat | batas | SRD 4.7 |
| SR-372 | Semua jawaban Cek Ingatan di satu kawasan dibatalkan lewat undo | Kawasan itu tidak tampil di hasil | batas | SRD 4.7 |
| SR-373 | Kode di Cek Ingatan dijawab salah lalu benar pada soal ulang | Hasil memakai jawaban pertama | batas | SRD 4.7 |
| SR-374 | Cek Ingatan melewati tengah malam | Hasil memuat jawaban sebelum dan sesudah tengah malam | batas | SRD 4.7 |
| SR-375 | Ada jeda 7 hari tanpa aktivitas setelah Cek Ingatan, lalu tunggakan di atas 30 | Hasil Cek lama tidak lagi mengurutkan tunggakan | batas | SRD 4.7 |
| SR-376 | Cek Ingatan dibuka lagi setelah dikerjakan hari ini | **Cek ingatan hari ini sudah dikerjakan.** dan **Lanjutkan dengan sesi harian.** | batas | SRD 4.7 |
| SR-377 | Cek Ingatan dibuka tanpa libur panjang | **Cek ingatan ditawarkan setelah libur panjang.** | batas | SRD 4.7 |
| SR-378 | Tes penempatan selesai setelah ada jawaban Cek Ingatan | Tingkat tidak berubah | batas | SRD 4.13 |
| SR-379 | Pasangan sudah dilatih hari ini | Tidak dihitung dalam ambang penahanan materi baru | batas | SRD 4.7 |
| SR-380 | Pasangan ditandai ke dua arah dengan hitungan 4 dan 1 | Beranda menampilkan satu pasangan dengan **1/5** | batas | SRD 6.2 |
| SR-381 | Tooltip provinsi Jawa Barat, 4 dari 5 kode semua kartunya `mature` | **4 dari 5 kode dikuasai**; dihitung per kode, bukan per kartu | normal | SRD 2.5 |

### 5.6 Perkenalan

| ID     | Skenario                                                        | Hasil yang diharapkan                                                                                          | Kategori | Aturan   |
| ------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| SR-071 | Tebakan Perkenalan benar                                        | Tidak ada nilai penjadwalan; S belum terbentuk; belajar awal yang ditanyakan ulang di sesi yang sama | normal   | AC-13    |
| SR-072 | Tebakan Perkenalan salah dengan nama wilayah valid lain         | Tidak ada pasangan tertukar tercatat                                                                           | batas    | AC-13    |
| SR-073 | Perkenalan ke-11 dalam satu hari                                | Tidak tersedia; kuota sudah habis                                                                              | batas    | AC-13    |
| SR-074 | Undo tepat setelah Perkenalan                                   | Kartu kembali `new`; kuota kembali 1                                                                           | batas    | SRD 4.10 |
| SR-075 | Aplikasi ditutup setelah Perkenalan, dibuka lagi 2 jam kemudian | Langkah belajar muncul di prioritas 1                                                                          | batas    | SRD 4.6  |
| SR-076 | Waktu tebakan Perkenalan                                        | Tidak masuk hitungan persentil Level 1                                                                         | batas    | SRD 4.4  |

### 5.7 Pembukaan Kartu Terkait

| ID     | Skenario                                                                              | Hasil yang diharapkan                                        | Kategori | Aturan  |
| ------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------- | ------- |
| SR-077 | Interval `code2region` 6 hari, lalu 7 hari                                            | `region2code` `locked`, lalu `new`                           | batas    | SRD 4.8 |
| SR-078 | `region2code` sudah terbuka, lalu `code2region` lapse dan intervalnya turun ke 1 hari | `region2code` tetap terbuka                                  | batas    | SRD 4.8 |
| SR-079 | Interval `code2region` mencapai 14 hari pada kode dengan 12 wilayah                   | `setrecall` terbuka                                          | normal   | SRD 4.8 |
| SR-080 | Interval `code2region` mencapai 14 hari pada kode dengan 2 wilayah                    | `setrecall` tidak pernah dibuat                              | batas    | SRD 5.2 |
| SR-081 | `region2code` DK terbuka saat Cakupan sudah pindah ke Sumatera                        | `region2code` DK tetap boleh diperkenalkan dan memakai kuota | batas    | SRD 4.8 |

### 5.8 Pemeriksaan Jawaban Tunggal

| ID     | Skenario                                                                  | Hasil yang diharapkan                                                                                                  | Kategori | Aturan  |
| ------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| SR-082 | "Kab. Deli Serdang" untuk BK                                              | Benar, `exact`                                                                                                         | normal   | SRD 5.1 |
| SR-083 | "  MEDAN!! " untuk BK                                                     | Benar, `exact`                                                                                                         | normal   | SRD 5.1 |
| SR-084 | "Jogja" untuk AB                                                          | Benar, `exact` lewat alias                                                                                             | normal   | SRD 5.1 |
| SR-085 | "Bandar Lampung" untuk BD                                                 | Salah; pasangan (BD, BE) tercatat                                                                                      | batas    | SRD 5.1 |
| SR-086 | "Bukit Tinggi" untuk BA                                                   | Benar, `exact` lewat bentuk tanpa spasi; UI menampilkan penulisan baku                                                 | normal   | AC-28   |
| SR-087 | "Pematang Siantar" dan "Pematangsiantar" untuk BK                         | Keduanya `exact`                                                                                                       | batas    | SRD 5.1 |
| SR-088 | "Djember" untuk P, "Tjilatjap" untuk R                                    | Benar, `variant` lewat ejaan lama                                                                                      | batas    | SRD 5.1 |
| SR-089 | "Binjay", terdaftar di `variants` Binjai                                  | Benar, `variant` tanpa penalti                                                                                         | batas    | SRD 5.1 |
| SR-090 | "Pekanbru" untuk BM (nama 9 huruf, satu huruf hilang, biaya 1)            | Benar, `typo`                                                                                                          | normal   | SRD 5.1 |
| SR-091 | "Pekanbaur" untuk BM (tukar huruf bersebelahan, biaya 0,5)                | Benar, `typo`                                                                                                          | batas    | SRD 5.1 |
| SR-092 | "Mdean" untuk BK (nama 5 huruf, biaya 0,5)                                | Benar, `typo`                                                                                                          | batas    | SRD 5.1 |
| SR-093 | "Bim" untuk Bima (nama 4 huruf)                                           | Salah; tidak ada toleransi                                                                                             | batas    | SRD 5.1 |
| SR-094 | "Vengkulu" untuk BD                                                       | Salah; huruf pertama berbeda                                                                                           | batas    | SRD 5.1 |
| SR-095 | Jawaban salah ketik yang sama dekatnya ke dua nama di kamus               | Salah; tidak ada pasangan tercatat                                                                                     | batas    | SRD 5.1 |
| SR-096 | "Kotamobagu" untuk DB                                                     | Awalan "kota" tidak dibuang; benar                                                                                     | batas    | SRD 5.1 |
| SR-097 | Tangerang untuk A dan B; Kabupaten Tangerang sebagai prompt daerah → kode | Nama diterima sesuai keanggotaan high; prompt Kabupaten Tangerang menerima A maupun B tanpa mencatat pasangan tertukar | batas    | SRD 2.8 |

### 5.9 Pemeriksaan Jawaban Beberapa Daerah

| ID     | Skenario                                     | Hasil yang diharapkan                                | Kategori | Aturan  |
| ------ | -------------------------------------------- | ---------------------------------------------------- | -------- | ------- |
| SR-098 | Kode 12 wilayah, 5 benar                     | Bagus (ambang 5)                                     | normal   | SRD 5.2 |
| SR-099 | Kode 12 wilayah, 7 benar / 4 benar / 0 benar | Mudah / Sulit / Lagi                                 | normal   | SRD 5.2 |
| SR-100 | Kode 3 wilayah                               | Ambang 2                                             | batas    | SRD 5.2 |
| SR-101 | Wilayah yang sama diketik dua kali           | Dihitung satu                                        | batas    | SRD 5.2 |
| SR-102 | Nama baku lalu aliasnya diketik              | Dihitung satu                                        | batas    | SRD 5.2 |
| SR-103 | Salah satu butir berupa wilayah kode lain    | Pasangan tertukar tercatat                           | normal   | SRD 5.2 |
| SR-104 | Berhenti tanpa satu jawaban pun              | Lagi                                                 | batas    | SRD 5.2 |
| SR-105 | Butir dengan salah ketik ringan              | Diterima lewat toleransi yang sama dengan bagian 5.1 | batas    | SRD 5.2 |

### 5.10 Deteksi Kode Tertukar

| ID     | Skenario                                                  | Hasil yang diharapkan                              | Kategori | Aturan            |
| ------ | --------------------------------------------------------- | -------------------------------------------------- | -------- | ----------------- |
| SR-106 | Pasangan (BE, BD) muncul 3 kali dalam 30 hari             | Ditandai; drill masuk prioritas 2                  | normal   | SRD 6.2           |
| SR-107 | Pasangan yang sama muncul 3 kali dalam rentang 31 hari    | Belum ditandai                                     | batas    | SRD 6.2           |
| SR-108 | Pasangan ditandai, lalu drill pertama benar di 5 hari berbeda berturut-turut | Tanda dihapus                                      | normal   | SRD 6.2           |
| SR-109 | Drill pertama benar di 4 hari, lalu salah di hari berikutnya                         | Hitungan kembali ke 0                              | batas    | SRD 6.2           |
| SR-110 | Pasangan yang tandanya sudah dihapus tertukar lagi 2 kali | Ditandai lagi                                      | batas    | SRD 6.2           |
| SR-111 | Pasangan BE ↔ DE aktif, Cakupan hanya Sumatera            | Drill tetap muncul                                 | normal   | SRD 6.2           |
| SR-112 | Drill pada kartu yang belum waktunya diulang              | Dicatat untuk hitungan drill; jadwal tidak berubah | batas    | SRD 4.11, AC-8    |
| SR-113 | Drill pada kartu yang sudah waktunya diulang              | Dihitung untuk jadwal                              | batas    | SRD 4.11, AC-8    |
| SR-114 | Dua kejadian di ponsel dan satu di laptop dalam 30 hari   | Ditandai setelah sinkron                           | batas    | SRD 6.2           |
| SR-115 | Referensi dibuka untuk kode yang sudah dipelajari         | Tidak menghasilkan jawaban atau pasangan tertukar  | batas    | SRD 4.11, SRD 6.2 |
| SR-116 | Jawaban salah yang kemudian dibatalkan                    | Tidak dihitung dalam pasangan                      | batas    | SRD 6.2           |
| SR-117 | Salah satu kode dalam pasangan `suspended`                | Drill tidak muncul sampai kode itu aktif lagi      | batas    | SRD 6.2           |
| SR-341 | Dua drill benar pada hari yang sama untuk satu pasangan   | Hanya drill pertama hari itu yang dihitung         | batas    | SRD 6.2           |
| SR-342 | Drill benar pada hari 0, 1, dan 5                         | Hitungan 3; hari tanpa drill tidak memutus hitungan | batas    | SRD 6.2           |
| SR-343 | Pasangan sudah dilatih hari ini, antrean harian disusun   | Drill pasangan itu tidak masuk antrean lagi hari ini | batas    | SRD 6.2           |
| SR-344 | Pasangan ditandai dengan 3 hari drill benar, buka Beranda | Pasangan tampil dengan penghitung **3/5**          | normal   | SRD 6.2, Microcopy 3.7 |

### 5.11 Kartu Sulit Dikuasai dan Catatan Pengingat

| ID     | Skenario                                        | Hasil yang diharapkan                                                         | Kategori | Aturan  |
| ------ | ----------------------------------------------- | ----------------------------------------------------------------------------- | -------- | ------- |
| SR-118 | `lapses` mencapai 4                             | Tawaran catatan pengingat muncul setelah jawaban                              | normal   | SRD 6.4 |
| SR-119 | Tawaran catatan pengingat ditolak di `lapses` 4 | Tidak muncul lagi di `lapses` 5; muncul lagi di `lapses` 6                    | batas    | SRD 6.4 |
| SR-120 | `lapses` mencapai 6                             | Status leech; daftar kab/kota dan catatan pengingat tampil sebelum pertanyaan | normal   | AC-12   |
| SR-121 | `lapses` mencapai 8                             | Kartu `suspended` otomatis; pemberitahuan tampil                              | normal   | AC-12   |
| SR-122 | Kartu dari `lapses` 8 diaktifkan kembali        | D dan S kembali ke nilai kartu baru; `lapses` 0                               | batas    | SRD 6.4 |
| SR-123 | Catatan pengingat 280 karakter / 281 karakter   | Tersimpan / ditolak                                                           | batas    | SRD 6.4 |
| SR-124 | Catatan pengingat diubah jadi kosong            | Dianggap dihapus; tidak tampil di mana pun                                    | batas    | SRD 6.4 |
| SR-125 | Catatan pengingat DK                            | Tampil setelah jawaban di semua kartu DK                                      | normal   | SRD 6.4 |
| SR-126 | Kartu bukan leech dengan catatan pengingat      | Catatan pengingat tidak tampil sebelum pertanyaan                             | batas    | SRD 6.4 |

### 5.12 Status Kartu

| ID     | Skenario                                                                       | Hasil yang diharapkan                                                         | Kategori | Aturan |
| ------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | -------- | ------ |
| SR-127 | Setiap transisi di tabel bagian 7                                              | Status berikutnya sesuai tabel                                                | normal   | SRD 7  |
| SR-128 | Kartu `mature` salah, lalu interval kembali 21 hari tanpa jawaban Level 3 baru | Kembali `mature`                                                              | batas    | SRD 7  |
| SR-129 | Suspend manual lalu aktifkan kembali                                           | D, S, dan `due` kembali ke sebelum suspend; kartu bisa langsung perlu diulang | batas    | SRD 7  |
| SR-130 | Suspend manual kartu `learning`                                                | Langkah belajar awal tidak dijadwalkan sampai aktif lagi                      | batas    | SRD 7  |
| SR-131 | `confidence` turun, lalu naik lagi ke `high` di versi data berikutnya          | Kartu aktif sendiri dengan riwayat utuh                                       | batas    | SRD 7  |
| SR-132 | `id` hilang dari data lalu kembali                                             | Kartu aktif sendiri dengan riwayat utuh                                       | batas    | SRD 7  |

### 5.13 Batas Hari dan Zona Waktu

| ID     | Skenario                                                   | Hasil yang diharapkan                                                | Kategori | Aturan  |
| ------ | ---------------------------------------------------------- | -------------------------------------------------------------------- | -------- | ------- |
| SR-133 | Jawaban pukul 23.59 dan pukul 00.00 WITA                   | `local_day` hari sebelumnya dan hari berikutnya                      | batas    | AC-10   |
| SR-134 | 10 Perkenalan pukul 23.00, lalu sesi pukul 01.00           | Tidak ada materi baru; masih hari yang sama                          | batas    | SRD 4.9 |
| SR-135 | Pindah dari WITA ke WIB pukul 20.00 WITA                   | Tidak ada kuota materi baru kedua di hari nyata yang sama            | batas    | SRD 4.9 |
| SR-136 | Pindah dari WIB ke WIT                                     | Tidak ada kartu yang jadi waktunya diulang lebih awal dari jadwalnya | batas    | AC-10   |
| SR-137 | Zona waktu perangkat berubah setelah jawaban tercatat      | `local_day` jawaban lama tidak berubah                               | batas    | SRD 4.9 |
| SR-138 | Zona waktu `Europe/Berlin` saat pergantian daylight saving | Tetap satu batas hari per tanggal                                    | batas    | SRD 4.9 |
| SR-139 | Tantangan Harian pukul 03.30, lalu pukul 04.30             | Dua hari berbeda untuk Hari Beruntun                                 | batas    | SRD 4.9 |

### 5.14 Pembatalan Jawaban

| ID     | Skenario                                          | Hasil yang diharapkan                                                       | Kategori | Aturan   |
| ------ | ------------------------------------------------- | --------------------------------------------------------------------------- | -------- | -------- |
| SR-140 | Undo jawaban terakhir                             | Keadaan aplikasi kartu identik dengan sebelum jawaban itu                   | normal   | AC-9     |
| SR-141 | Z ditekan dua kali                                | Tekanan kedua tidak berpengaruh                                             | batas    | SRD 4.10 |
| SR-142 | Jawaban A sudah disusul jawaban B, lalu Z         | Hanya B yang dapat dibatalkan; A tidak lagi dapat dibatalkan                | batas    | SRD 4.10 |
| SR-143 | Z setelah kembali ke beranda                      | Tidak berpengaruh                                                           | batas    | SRD 4.10 |
| SR-144 | Undo jawaban yang sudah terkirim ke server        | Perangkat lain kembali ke keadaan aplikasi sebelum jawaban itu setelah pull | batas    | SRD 8.5  |
| SR-145 | Undo jawaban yang membuat `lapses` mencapai 8     | Kartu kembali aktif; pemberitahuan suspend ditarik                          | batas    | AC-9     |
| SR-146 | Undo jawaban yang menandai pasangan tertukar ke-3 | Tanda pasangan hilang lagi                                                  | batas    | AC-9     |
| SR-147 | Z di Mode Kilat                                   | Tidak berpengaruh                                                           | negatif  | SRD 4.10 |

### 5.15 Mode Khusus

| ID     | Skenario                                                         | Hasil yang diharapkan                                                    | Kategori | Aturan         |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------ | -------- | -------------- |
| SR-148 | Tantangan Harian                                                 | 5 soal dari kartu yang pernah dipelajari; jadwal tidak berubah           | normal   | SRD 4.11, AC-8 |
| SR-149 | Baru 3 kartu yang pernah dipelajari                              | Tantangan berisi 3 soal                                                  | batas    | SRD 4.11       |
| SR-150 | Belum ada kartu yang pernah dipelajari                           | Tantangan tidak tersedia                                                 | batas    | SRD 4.11       |
| SR-151 | Tantangan kedua di hari yang sama                                | Tidak tersedia; dinyatakan sudah selesai                                 | batas    | PRD 6.7        |
| SR-152 | Satu hari terlewat dalam 30 hari bergulir                        | Hari Beruntun berlanjut; jatah toleransi terpakai                        | batas    | PRD 8          |
| SR-153 | Hari kedua terlewat dalam 30 hari bergulir yang sama             | Hari Beruntun kembali ke 0                                               | batas    | PRD 8          |
| SR-154 | Hari terlewat tanggal 31 Agustus lalu 1 September                | Dihitung dalam satu periode 30 hari bergulir; Hari Beruntun kembali ke 0 | batas    | PRD 8          |
| SR-155 | Mode Kilat di Kawasan Maluku skor 24, rekor nasional 31          | Rekor Maluku 24; rekor nasional tetap 31                                 | normal   | PRD 6.7        |
| SR-156 | Mode Kilat ditutup paksa di detik 40                             | Skor tidak dihitung untuk rekor                                          | batas    | SRD 8.8        |
| SR-157 | Latihan Terfokus pada kartu yang belum waktunya diulang          | Jadwal tidak berubah                                                     | normal   | SRD 4.11, AC-8 |
| SR-158 | Latihan Terfokus pada kartu yang sudah waktunya diulang          | Dihitung untuk jadwal; kartu tidak muncul lagi di sesi harian hari itu   | batas    | SRD 4.11, AC-8 |
| SR-159 | Latihan Terfokus pada wilayah tanpa kartu yang pernah dipelajari | Latihan tidak dimulai                                                    | batas    | SRD 4.11       |

### 5.16 Pelat Terlihat

| ID     | Skenario                                                                                      | Hasil yang diharapkan                                                                                        | Kategori | Aturan   |
| ------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- | -------- |
| SR-160 | DK dicari saat kartu yang perlu diulang                                                       | Data langsung tampil; Pelat Terlihat tercatat; kartu tetap waktunya diulang dan tidak ada `review_logs` baru | normal   | AC-22    |
| SR-161 | DK dicari saat kartu belum waktunya diulang                                                   | Data langsung tampil; frekuensi tercatat; jadwal tidak berubah dan tidak ada penilaian                       | normal   | AC-22    |
| SR-162 | Kode yang kartunya new dicari                                                                 | Kartu tetap new; kuota, persentil, dan pasangan tidak berubah; hanya frekuensi bertambah                     | batas    | AC-22    |
| SR-163 | Hasil kode di Referensi dibuka                                                                | Data langsung tampil tanpa tindakan menjawab; Pelat Terlihat tidak memiliki `review_id`                      | batas    | SRD 4.11 |
| SR-164 | Pencarian dengan nama wilayah, bukan kode                                                     | Tidak ada tebakan; tidak ada Pelat Terlihat                                                                  | batas    | SRD 4.11 |
| SR-165 | Kode entri `medium` dicari                                                                    | Tidak ada tebakan; Pelat Terlihat tercatat untuk frekuensi                                                   | batas    | SRD 4.11 |
| SR-166 | Kode khusus RI dicari                                                                         | Tidak ada tebakan; tidak ada Pelat Terlihat                                                                  | batas    | SRD 4.11 |
| SR-167 | "DK 1234 ABC" diketik                                                                         | Hanya identitas kode DK tercatat; bagian lain dari input tidak disimpan atau dikirim                         | batas    | SRD 4.11 |
| SR-168 | Kode sama dicari sebelum 10 menit dan tepat 10 menit sejak catatan terakhir di perangkat sama | Hasil selalu langsung tampil; sebelum 10 menit tidak ada catatan baru; tepat 10 menit boleh catatan baru     | batas    | SRD 4.11 |
| SR-169 | Kartu sudah terhitung di sesi harian lalu dicari di Referensi                                 | Tidak ada jawaban tambahan, perubahan jadwal, atau pasangan tertukar                                         | batas    | AC-22    |

### 5.17 Optimasi Parameter

| ID     | Skenario                                                   | Hasil yang diharapkan                                                               | Kategori | Aturan   |
| ------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------- | -------- |
| SR-170 | 1.000 jawaban tercatat, 40 di antaranya tebakan Perkenalan | Belum memenuhi syarat                                                               | batas    | SRD 4.12 |
| SR-171 | 1.000 jawaban terhitung, 150 kartu berbeda                 | Belum memenuhi syarat                                                               | batas    | SRD 4.12 |
| SR-172 | Log loss turun 1,2%, RMSE sama                             | Diterima                                                                            | batas    | AC-18    |
| SR-173 | Log loss turun 0,8%                                        | Ditolak                                                                             | batas    | AC-18    |
| SR-174 | Log loss turun 2%, RMSE naik                               | Ditolak                                                                             | batas    | AC-18    |
| SR-175 | Parameter baru aktif                                       | `due` yang sudah terbentuk tidak berubah; jawaban berikutnya memakai parameter baru | batas    | SRD 4.12 |
| SR-176 | 300 jawaban setelah aktivasi, retensi aktual 0,83          | Parameter sebelumnya diaktifkan kembali otomatis                                    | batas    | AC-19    |
| SR-177 | 300 jawaban setelah aktivasi, retensi aktual 0,86          | Tidak ada rollback                                                                  | batas    | AC-19    |
| SR-178 | 299 jawaban setelah aktivasi, retensi aktual 0,80          | Belum dievaluasi                                                                    | batas    | AC-19    |
| SR-179 | Tambahan 500 jawaban dalam 20 hari                         | Optimasi menunggu sampai 30 hari                                                    | batas    | SRD 4.12 |

### 5.18 Konsistensi Antarperangkat

| ID     | Skenario                                                                                         | Hasil yang diharapkan                                                                           | Kategori | Aturan   |
| ------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | -------- | -------- |
| SR-180 | Dua perangkat menerima event yang sama dalam urutan berbeda                                      | Keadaan aplikasi identik                                                                        | normal   | SRD 8.1  |
| SR-181 | Kartu waktunya diulang dijawab di ponsel pukul 07.10 dan di laptop pukul 20.00, keduanya offline | Hanya jawaban 07.10 yang dihitung; jawaban 20.00 tetap tercatat                                 | batas    | AC-20    |
| SR-182 | Kelebihan kuota 4 karena dua perangkat offline                                                   | Kuota besok 6                                                                                   | batas    | AC-21    |
| SR-183 | Kelebihan kuota 15                                                                               | Kuota besok 0, lusa kembali 10                                                                  | batas    | AC-21    |
| SR-184 | Suspend di laptop pukul 09.00, jawaban di ponsel offline pukul 10.00                             | Jawaban tercatat, tidak dihitung untuk jadwal                                                   | batas    | SRD 8.6  |
| SR-185 | Jawaban di ponsel pukul 08.00, suspend di laptop pukul 09.00                                     | Jawaban dihitung, lalu kartu di-suspend                                                         | batas    | SRD 8.6  |
| SR-186 | Cakupan diubah di dua perangkat                                                                  | Nilai dengan `updated_at` terbaru yang berlaku di keduanya                                      | batas    | SRD 8.7  |
| SR-187 | Tantangan Harian selesai di dua perangkat pada hari yang sama                                    | Hari Beruntun bertambah satu                                                                    | batas    | SRD 8.8  |
| SR-345 | Sesi harian ditutup setelah semua kartu yang direncanakan terjawab                               | Hari itu masuk Hari Beruntun                                                                    | normal   | SRD 8.8  |
| SR-346 | Sesi harian `planned_count` 3 ditutup dengan dua kartu berbeda dan satu soal ulang               | Hari itu tidak masuk Hari Beruntun                                                              | batas    | SRD 8.8  |
| SR-347 | Sesi harian tidak pernah ditutup                                                                 | Hari itu tidak masuk Hari Beruntun                                                              | batas    | SRD 8.8  |
| SR-348 | Jawaban terakhir sesi harian dibatalkan lewat undo                                               | Kartu itu tidak dihitung terjawab untuk Hari Beruntun                                           | batas    | SRD 8.8  |
| SR-188 | Rekor Kilat Maluku 24 di ponsel dan 28 di laptop                                                 | Rekor Maluku 28 di keduanya                                                                     | batas    | SRD 8.8  |
| SR-189 | Lapses 5 lalu tiga lapse terhitung lagi diterima dari laptop                                     | Setelah sinkron suspended; pemberitahuan di layar penutup sesi berikutnya pada setiap perangkat | batas    | SRD 8.11 |
| SR-190 | Ponsel di WITA dan laptop di WIB menjawab pada detik yang sama                                   | Tiap jawaban memakai `local_day` perangkatnya                                                   | batas    | SRD 8.2  |

### 5.19 Sinyal Penilaian

| ID     | Skenario                                                                                              | Hasil yang diharapkan                                               | Kategori | Aturan  |
| ------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------- | ------- |
| SR-191 | Latensi 2,5 detik dari keyboard layar, P50 di kelompok `touch` tetapi di atas P80 kelompok `keyboard` | Dibandingkan dengan kelompok `touch`; nilai penjadwalan 3           | batas    | AC-30   |
| SR-192 | Input pertama Shift, lalu huruf                                                                       | Latensi dihitung dari huruf                                         | batas    | SRD 4.4 |
| SR-193 | Input pertama berupa paste                                                                            | Latensi = waktu paste; komponen kelancaran mengetik tanpa penalti   | batas    | SRD 4.4 |
| SR-194 | Level 1 dijawab dengan klik                                                                           | Latensi = waktu klik; ganti pilihan 0                               | normal   | SRD 4.4 |
| SR-195 | Jawaban di level manual lebih rendah                                                                  | Tidak masuk persentil                                               | batas    | SRD 4.4 |
| SR-196 | Jawaban yang dibatalkan                                                                               | Tidak masuk persentil                                               | batas    | SRD 4.4 |
| SR-197 | "Bukit Tinggi" dijawab cepat dan bersih                                                               | Nilai penjadwalan 4; variasi spasi tanpa penalti                    | batas    | SRD 4.4 |
| SR-198 | Dua jawaban dengan sinyal identik pada kartu dengan R 0,95 dan R 0,60                                 | Nilai penjadwalan sama                                              | batas    | SRD 4.4 |
| SR-199 | Jawaban dengan lebih dari 120 jeda antarinput                                                         | Hanya 120 jeda pertama tersimpan; nilai penjadwalan tetap terhitung | batas    | SRD 4.4 |
| SR-200 | Tebakan Perkenalan dan jawaban tes penempatan                                                         | Tidak masuk persentil                                               | batas    | SRD 4.4 |

### 5.20 Jawaban Daerah dan Toleransi Penulisan

| ID     | Skenario                                                                               | Hasil yang diharapkan                                        | Kategori | Aturan   |
| ------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------- | -------- |
| SR-201 | "BD" untuk soal daerah → kode dengan jawaban BE                                        | Salah; pasangan tercatat                                     | normal   | AC-7     |
| SR-202 | "be" dan "B E" untuk BE                                                                | Benar                                                        | batas    | SRD 5.1  |
| SR-203 | "BX"                                                                                   | Salah; tidak ada pasangan                                    | negatif  | SRD 5.1  |
| SR-204 | Enter di kolom kosong                                                                  | Diabaikan                                                    | negatif  | SRD 4.10 |
| SR-205 | Input ke-121 karakter                                                                  | Tidak diterima                                               | negatif  | SRD 5.1  |
| SR-206 | "Tanjung-Pinang", "Tanjung Pinang", dan "Tanjungpinang" untuk BP                       | Ketiganya `exact`                                            | batas    | SRD 5.1  |
| SR-207 | Jawaban cocok dengan kab/kota yang keanggotaannya di kode itu `medium`                 | Tidak dinilai; jadwal tidak berubah; pasangan tidak tercatat | batas    | SRD 5.1  |
| SR-208 | "Sumatera Utara" untuk BK                                                              | Salah; provinsi itu juga memakai BB; tidak ada pasangan      | batas    | AC-27    |
| SR-209 | "Bali" untuk DK                                                                        | Benar                                                        | normal   | AC-27    |
| SR-210 | "Kepulauan Riau" untuk BM                                                              | Salah; pasangan (BM, BP) tercatat                            | batas    | SRD 5.1  |
| SR-212 | "Medsn" untuk BK (tombol bersebelahan, biaya 0,5)                                      | Benar, `typo`                                                | batas    | SRD 5.1  |
| SR-213 | "Tebingtingi" untuk BK (huruf kembar kurang satu, biaya 0,5)                           | Benar, `typo`                                                | batas    | SRD 5.1  |
| SR-214 | Jawaban benar untuk soal kode → daerah BK                                              | UI menampilkan paling banyak tiga kab/kota BK lainnya        | normal   | SRD 5.1  |
| SR-215 | Jawaban salah ketik yang terdekat ke nama benar, tetapi nama lain hanya 0,5 lebih jauh | Salah; selisih kurang dari 1                                 | batas    | SRD 5.1  |

### 5.21 Cakupan dan Bentuk Soal

| ID     | Skenario                                                                            | Hasil yang diharapkan                                                                                                                             | Kategori | Aturan  |
| ------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| SR-216 | Pohon Cakupan                                                                       | Hanya tiga tingkat: Nasional, Kawasan, Provinsi                                                                                                   | normal   | AC-25   |
| SR-217 | Cakupan Sumatera, soal Level 1 untuk BK                                             | Empat pilihan, semuanya kab/kota di Sumatera; tidak ada nama provinsi                                                                             | normal   | AC-26   |
| SR-218 | Pengecoh soal BK                                                                    | Tidak ada pengecoh yang juga anggota BK                                                                                                           | batas    | AC-26   |
| SR-219 | Cakupan Sumatera, kartu DK waktunya diulang                                         | Pengecoh diambil dari Bali & Nusa Tenggara                                                                                                        | batas    | SRD 2.8 |
| SR-220 | Cakupan Nasional                                                                    | Pengecoh boleh dari seluruh Indonesia                                                                                                             | normal   | SRD 2.8 |
| SR-221 | `region2code` B tampil lima kali, dan kode data uji yang hanya memiliki satu daerah | Jika beberapa daerah tersedia, tidak berulang berurutan; jika hanya satu, daerah itu boleh berulang; seed/reps yang sama menghasilkan urutan sama | batas    | SRD 2.8 |
| SR-222 | Soal daerah → kode untuk Kabupaten Tangerang                                        | Ditampilkan dengan awalan "Kabupaten"                                                                                                             | batas    | SRD 2.8 |

### 5.22 Tes Penempatan

| ID     | Skenario                                                                         | Hasil yang diharapkan                                                                                                 | Kategori | Aturan   |
| ------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| SR-230 | Tahap 1: 2 dari 8 benar                                                          | Tes berhenti; tingkat Pemula                                                                                          | batas    | SRD 4.13 |
| SR-231 | Tahap 1: 3 dari 8 benar                                                          | Lanjut ke tahap 2                                                                                                     | batas    | SRD 4.13 |
| SR-232 | Tahap 2: 5 dari 10 benar                                                         | Tes berhenti; tingkat Menengah                                                                                        | batas    | SRD 4.13 |
| SR-233 | Tahap 3: 7 dari 10 benar, dan 6 dari 10 benar                                    | Ahli (70%), dan Mahir (60%)                                                                                           | batas    | SRD 4.13 |
| SR-234 | Benar, `exact`, latensi 2,4 detik                                                | `code2region` jadi `review` dengan nilai penjadwalan 4 sebagai review pertama; tanpa Perkenalan; kuota tidak terpakai | normal   | AC-32    |
| SR-235 | Benar, latensi 4 detik                                                           | Nilai penjadwalan 3 sebagai review pertama                                                                            | batas    | SRD 4.13 |
| SR-236 | Benar dengan `typo`, latensi 2 detik                                             | Nilai penjadwalan 3                                                                                                   | batas    | SRD 4.13 |
| SR-237 | Jawaban tes salah, Tidak tahu, timeout, atau benar dengan gangguan               | Kartu tetap new; jawaban benar dengan gangguan tidak memulai jadwal                                                   | normal   | SRD 4.13 |
| SR-238 | Kode yang tidak ditanyakan                                                       | Tetap `new`                                                                                                           | batas    | AC-32    |
| SR-239 | Jawaban salah yang cocok dengan kode lain                                        | Satu kejadian pasangan tertukar                                                                                       | batas    | SRD 4.13 |
| SR-240 | Kartu hasil tes, interval 25 hari, belum pernah benar di Level 3                 | Tidak `mature`                                                                                                        | batas    | SRD 4.13 |
| SR-241 | Tes diulang sebelum jawaban terjadwal pertama                                    | Hanya sesi terbaru yang dipakai; kartu dan pasangan dari sesi lama diabaikan                                          | batas    | AC-32    |
| SR-242 | Sudah ada satu jawaban terjadwal di luar tes                                     | Tes tidak bisa diulang                                                                                                | batas    | SRD 4.13 |
| SR-243 | Tes ditutup di soal ke-12                                                        | Sesi diabaikan seluruhnya                                                                                             | batas    | SRD 4.13 |
| SR-244 | Tes selesai di dua perangkat sebelum sinkron                                     | Sesi dengan kunci pengurutan terbaru yang berlaku                                                                     | batas    | SRD 8.9  |
| SR-245 | Tes selesai                                                                      | Tidak menambah Hari Beruntun; tidak masuk syarat optimasi                                                             | batas    | SRD 4.13 |
| SR-382 | Hasil tes Ahli | Saran Cakupan **Seluruh Indonesia** | normal | SRD 4.13 |
| SR-383 | Hasil tes Menengah atau Mahir | Saran kawasan dengan materi baru tersisa terbanyak; seri ke kawasan yang lebih dulu di data | normal | SRD 4.13 |
| SR-246 | Rekomendasi Cakupan untuk Pemula, dan untuk Mahir yang paling lemah di Papua     | Bali & Nusa Tenggara, dan Papua                                                                                       | normal   | SRD 4.13 |
| SR-247 | Pemilihan kode tahap 2                                                           | Minimal satu kode dari tiap kawasan yang memiliki kode `medium`; sama untuk seed yang sama                            | batas    | SRD 4.13 |
| SR-248 | Perkiraan persentase kode dikenal untuk Pemula yang benar 2 dari 8 kode `common` | Hanya kode `common` yang dihitung; tier lain 0%                                                                       | batas    | SRD 4.13 |

### 5.23 Pratinjau Sesi

| ID     | Skenario                                                                                 | Hasil yang diharapkan                                                                                                                  | Kategori | Aturan   |
| ------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| SR-249 | Pratinjau sesi harian tetap dan hasil jawabannya membuat belajar awal/belajar ulang baru | Soal sesi sama dengan salinan antrean, ditambah satu soal ulang untuk tiap kode yang baru diperkenalkan atau baru salah; langkah yang belum dijawab tetap jatuh tempo di sesi berikutnya, dan yang sudah dijawab tidak jatuh tempo lagi hari itu | normal   | AC-33    |
| SR-250 | Tanpa riwayat: salinan antrean 4 Perkenalan dan 10 pengulangan Level 2                   | E = 4×15 + 4×10 + 10×6 = 160 detik, termasuk satu soal ulang untuk tiap Perkenalan; rentang 2–3 menit waktu aktif | batas    | SRD 4.14 |
| SR-251 | Kelompok memiliki 30 sampel valid atau lebih                                             | d memakai median `ms_total` pribadi ditambah perkiraan waktu membaca hasil jawaban f; bukan nilai nominal penuh                        | normal   | SRD 4.14 |
| SR-252 | E = 45 detik                                                                             | Tampil "kurang dari 1 menit"                                                                                                           | batas    | SRD 4.14 |
| SR-253 | Enam butir info berlaku sekaligus                                                        | Hanya tiga butir teratas menurut prioritas yang tampil                                                                                 | batas    | SRD 4.14 |
| SR-254 | Sesi keenam                                                                              | Butir pintasan keyboard tidak tampil lagi                                                                                              | batas    | SRD 4.14 |
| SR-255 | Pratinjau dibuka 11 menit sebelum **Mulai**                                              | Antrean disusun ulang; langkah belajar awal yang belum dijawab ikut masuk                                                           | batas    | AC-33    |
| SR-256 | Pratinjau dibuka pukul 03.55, **Mulai** pukul 04.02                                      | Antrean disusun ulang untuk hari baru                                                                                                  | batas    | SRD 4.14 |
| SR-257 | Pratinjau Mode Kilat                                                                     | Durasi 60 detik; rekor untuk wilayah itu                                                                                               | normal   | SRD 4.14 |
| SR-258 | Sesi dengan antrean tetap selesai                                                        | `estimated_ms`, `active_ms`, dan waktu mulai/selesai tersimpan; KPI membandingkan E dengan `active_ms`, bukan waktu kalender           | normal   | SRD 4.14 |
| SR-259 | Antrean kosong                                                                           | Pratinjau tidak ditampilkan                                                                                                            | batas    | SRD 4.14 |

### 5.24 Fun Facts pada Akhir Sesi

| ID     | Skenario                                                            | Hasil yang diharapkan                                                                       | Kategori | Aturan   |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------- | -------- |
| SR-260 | Layar akhir semua enam kind sesi dengan kandidat fakta siap terbit  | Satu fakta siap terbit tampil dengan label dan sumber; semua mode memakai aturan yang sama  | normal   | SRD 4.15 |
| SR-261 | Data uji 43 fakta siap terbit dan 25 layar akhir berurutan          | Tidak ada pengulangan dalam 20 tampilan berikutnya saat masih ada kandidat setelah filter   | batas    | AC-34    |
| SR-262 | Data uji berisi 10 fakta siap terbit dan 33 draft                   | N = 5; fakta draft tidak dihitung dan tidak dipilih                                         | batas    | SRD 4.15 |
| SR-263 | Sesi menjawab DA dan DK, ada fakta terkait keduanya di kandidat     | Fakta yang dipilih salah satu fakta terkait                                                 | normal   | SRD 4.15 |
| SR-264 | Tidak ada fakta terkait yang tersisa                                | Dipilih dari sisa kandidat lain                                                             | batas    | SRD 4.15 |
| SR-265 | Semua kandidat habis karena langkah 2–3                             | Dipilih fakta yang paling lama tidak tampil                                                 | batas    | SRD 4.15 |
| SR-266 | Salah satu dari dua fakta layar akhir sebelumnya berlabel `mitos`   | Fakta `mitos` tidak dipilih                                                                 | batas    | SRD 4.15 |
| SR-267 | Sesi ID, konten `ready`, dan riwayat `fact_views` sebelumnya sama   | Pilihan fakta identik; sesi ID saja tidak menjamin hasil sama bila kandidat/riwayat berbeda | batas    | SRD 4.15 |
| SR-268 | Fakta tampil di ponsel, lalu layar akhir di laptop setelah sinkron  | Fakta itu tidak dipilih di laptop                                                           | batas    | SRD 8.10 |
| SR-269 | Fakta dihapus dari data                                             | Tidak pernah tampil lagi                                                                    | batas    | SRD 4.15 |
| SR-270 | Status fakta berubah dari `terverifikasi` ke `diperdebatkan`        | Tampil dengan label baru                                                                    | batas    | SRD 4.15 |

### 5.25 Penggunaan Tanpa Akun

| ID     | Skenario                                                                                     | Hasil yang diharapkan                                                                     | Kategori | Aturan   |
| ------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------- | -------- |
| SR-271 | Log lokal tanpa akun mencapai 1.000 jawaban terhitung dan 200 kartu                          | Optimasi parameter berjalan dan hasilnya berlaku lokal                                    | normal   | SRD 8.12 |
| SR-272 | Rotasi fakta tanpa akun                                                                      | Aturan `N` fakta terakhir memakai `fact_views` lokal                                      | normal   | SRD 8.12 |
| SR-273 | Pengguna anonim login ke akun yang sudah berisi riwayat dari perangkat lain                  | Keadaan aplikasi setelah gabung sama dengan replay gabungan kedua log                     | batas    | SRD 8.12 |
| SR-274 | Kartu yang sama dijawab hari ini sebagai anonim dan di perangkat lain milik akun, lalu login | Hanya jawaban paling awal yang dihitung untuk jadwal                                      | batas    | SRD 8.3  |
| SR-275 | Dua pengguna dengan riwayat berbeda                                                          | Persentil, nilai penjadwalan, dan parameter masing-masing tidak dipengaruhi pengguna lain | negatif  | SRD 1    |

### 5.26 Pembatalan melalui Layar Sentuh dan Pintasan Keyboard

| ID     | Skenario                                                             | Hasil yang diharapkan                                                | Kategori | Aturan   |
| ------ | -------------------------------------------------------------------- | -------------------------------------------------------------------- | -------- | -------- |
| SR-276 | Tombol **Batalkan jawaban** dan tombol Z pada jawaban yang sama      | Hasilnya identik; pembatalan kedua lewat cara lain tidak berpengaruh | batas    | SRD 4.10 |
| SR-277 | Butir info pintasan keyboard saat metode input soal terakhir `touch` | Tidak dimasukkan ke daftar info                                      | batas    | SRD 4.14 |

### 5.27 Batas Harian Menurut Tingkat

| ID     | Skenario                                                                            | Hasil yang diharapkan                                                           | Kategori | Aturan |
| ------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------- | ------ |
| SR-278 | Tingkat Pemula                                                                      | Paling banyak 8 Perkenalan per hari; materi baru ditahan di atas 40 pengulangan | normal   | AC-35  |
| SR-279 | Tingkat Ahli, antrean pengulangan 28 kartu, lalu 29 kartu                           | Materi baru tetap diperkenalkan di 28; ditahan di 29                            | batas    | AC-35  |
| SR-280 | Tes penempatan dilewati                                                             | Batas 10 dan ambang 40 (Menengah)                                               | batas    | AC-35  |
| SR-281 | Tes diulang sebelum ada jawaban terhitung di luar tes, hasil Menengah menjadi Mahir | Batas 12 dan ambang 32 berlaku                                                  | batas    | AC-35  |
| SR-282 | Tingkat Mahir, kelebihan kuota 15 karena dua perangkat offline                      | Kuota besok 0, lusa kembali 12                                                  | batas    | AC-21  |
| SR-283 | Tes selesai di ponsel dengan hasil Ahli, lalu laptop sinkron                        | Laptop memakai batas 13 dan ambang 28                                           | batas    | AC-35  |

### 5.28 Penyesuaian Tingkat Otomatis

| ID     | Skenario                                                                                    | Hasil yang diharapkan                                                                                           | Kategori | Aturan   |
| ------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| SR-284 | Menengah, 30 hari terakhir 250 jawaban pengulangan, akurasi 92%, materi baru ditahan 2 hari | Naik ke Mahir di awal `local_day` berikutnya                                                                    | normal   | AC-36    |
| SR-285 | Mahir, akurasi 78% dari 220 jawaban pengulangan                                             | Turun ke Menengah                                                                                               | normal   | AC-36    |
| SR-286 | Menengah, 250 jawaban pengulangan dalam 30 hari, akurasi 85%, materi baru ditahan 12 hari   | Turun ke Pemula                                                                                                 | batas    | AC-36    |
| SR-287 | Akurasi 95% tetapi hanya 199 jawaban pengulangan                                            | Tidak dievaluasi                                                                                                | batas    | SRD 4.16 |
| SR-288 | Syarat naik terpenuhi 10 hari setelah perubahan tingkat sebelumnya                          | Belum berubah; dievaluasi lagi di hari ke-14                                                                    | batas    | AC-36    |
| SR-289 | Ahli, 250 jawaban pengulangan dalam 30 hari, akurasi 97%                                    | Tetap Ahli                                                                                                      | batas    | SRD 4.16 |
| SR-290 | Pemula, 250 jawaban pengulangan dalam 30 hari, akurasi 70%                                  | Tetap Pemula                                                                                                    | batas    | SRD 4.16 |
| SR-291 | Jawaban Perkenalan, langkah belajar awal, dan tes penempatan di periode 30 hari             | Tidak dihitung dalam akurasi maupun syarat 200 jawaban                                                          | batas    | SRD 4.16 |
| SR-292 | Log yang sama direplay di dua perangkat                                                     | Tingkat dan hari perubahannya sama                                                                              | batas    | AC-36    |
| SR-293 | Tingkat naik ke Mahir hari ini                                                              | Batas 12 dan ambang 32 berlaku hari ini; pratinjau menampilkan info perubahan tingkat                           | normal   | SRD 4.16 |
| SR-294 | Tes diulang sebelum ada jawaban terhitung di luar tes                                       | Tingkat awal memakai tes terbaru; evaluasi otomatis hanya setelah 30 hari penuh sejak jawaban terhitung pertama | batas    | SRD 4.16 |

---

### 5.29 Pemeriksaan Konsistensi

| ID     | Skenario                                                               | Hasil yang diharapkan                                                                                             | Kategori | Aturan                    |
| ------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- | ------------------------- |
| SR-295 | `code2region` interval ≥ 21 hari tanpa kelulusan Level 3               | Otomatis Level 3 tanpa bantuan; benar dengan interval hasil ≥ 21 menjadi mature pada kartu itu                    | normal   | SRD 3.2, SRD 3.3, SRD 3.4 |
| SR-296 | Tidak aktif: `blindrecall` dilebur ke `code2region`                    | Tidak dijalankan; ID tidak dipakai ulang. Pemeriksaan penggantinya SR-340                                         | batas    | SRD 3.2                   |
| SR-297 | Cakupan Bali untuk Perkenalan DK                                       | Tiga pengecoh sah dicari di kawasan lalu nasional; materi baru tetap DK                                           | batas    | SRD 2.8                   |
| SR-299 | Data uji terlalu kecil untuk tiga pengecoh nasional                    | Perkenalan informasi tanpa tebakan/nilai penjadwalan; tetap intro dan memakai kuota                               | batas    | SRD 2.8                   |
| SR-300 | Benar/salah kilat di sesi harian lewat 5 detik                         | Timeout; nilai penjadwalan 1 jika berwenang menjadwal; di Kilat tidak mengubah jadwal                             | batas    | SRD 4.4                   |
| SR-301 | Pratinjau baru 1 menit tetapi pull mengubah keadaan aplikasi           | Pratinjau diperbarui sebelum Mulai; tidak memakai salinan antrean lama diam-diam                                  | batas    | SRD 4.14                  |
| SR-302 | Satu-satunya jawaban terhitung di luar tes dibatalkan                  | Tawaran mengulang tes tersedia lagi; jawaban Perkenalan saja tidak menutup tawaran                                | batas    | SRD 4.13                  |
| SR-303 | Satu soal himpunan memuat dua pasangan salah dan satu pasangan diulang | Kedua pasangan berbeda tercatat, masing-masing paling banyak sekali; undo membatalkan keduanya                    | batas    | SRD 5.2                   |
| SR-304 | Himpunan memiliki 1 benar dari ambang 5                                | correct false tetapi nilai penjadwalan 2 menurut pemetaan himpunan; tidak meluluskan Level 3                      | batas    | SRD 5.2                   |
| SR-305 | Himpunan memiliki 5 benar dari ambang 5 dan gangguan                   | Nilai penjadwalan 3; lulus Level 3 bila tanpa bantuan leech; tidak masuk persentil                                | batas    | SRD 5.2                   |
| SR-306 | Kartu `setrecall` waktunya diulang saat Cakupan berpindah              | Tetap terlihat pada sesi himpunan terpisah; tidak masuk daily/challenge/kilat                                     | batas    | SRD 5.2                   |
| SR-307 | Seluruh fakta berstatus publikasi `draft`                              | Tidak memilih fakta atau menulis `fact_views`; sesi selesai normal                                                | batas    | SRD 4.15                  |
| SR-308 | Optimasi anonim tanpa `server_seq`                                     | `training_set_hash` dan `training_event_ids` lokal terisi, `trained_through_seq` null; hasil aktif dapat direplay | normal   | SRD 4.12                  |
| SR-309 | Akurasi dan 200 review terpenuhi sebelum 30 hari penuh                 | Tingkat belum berubah otomatis                                                                                    | batas    | SRD 4.16                  |
| SR-310 | Leech menjawab benar pada soal dengan jawaban dibocorkan di konteks    | Jadwal mengikuti fase FSRS; tidak meluluskan Level 3                                                              | batas    | SRD 3.2, SRD 6.4          |

---

### 5.30 Pembatasan Materi

| ID     | Skenario                                                               | Hasil yang diharapkan                                                                                                                                                   | Kategori | Aturan |
| ------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| SR-311 | Bentuk kartu dari seluruh konten dan semua tingkat Cakupan             | Kode wilayah hanya membentuk `code2region`, `region2code`, dan `setrecall`; kode khusus hanya `special2holder` dan `holder2special`; jumlah paling banyak 3 × N + 2 × S | normal   | AC-37  |
| SR-312 | Pindah dari kawasan ke provinsi setelah interval kartu mencapai 3 hari | Jenis kartu tetap sama; kartu terkunci hanya dibuka menurut syarat `region2code` dan `setrecall`                                                                        | batas    | AC-37  |
| SR-313 | Cari pelat lengkap dua kali dengan kode depan sama dalam 10 menit      | Pencarian hanya menambah satu catatan kode depan dan tidak memengaruhi jadwal                                                                                           | batas    | AC-38  |

### 5.31 Latihan Kode Khusus

| ID     | Skenario                                                                              | Hasil yang diharapkan                                                                                                  | Kategori | Aturan           |
| ------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- | ---------------- |
| SR-314 | Pengguna baru tanpa mengubah pengaturan                                               | `special_enabled = false`; tidak ada kartu kode khusus di antrean mana pun; Beranda tanpa tombol Kode Khusus           | normal   | AC-40            |
| SR-315 | Seri CD diaktifkan, 200 kartu wilayah perlu diulang                                   | Materi baru CD tetap diperkenalkan sampai 5; antrean harian wilayah tidak berubah                                      | batas    | AC-41            |
| SR-316 | Sesi Kode Khusus dengan 26 kartu kode khusus perlu diulang                            | Materi baru kode khusus ditahan hari itu; tepat 25 kartu masih mengizinkan materi baru                                 | batas    | AC-41, SRD 2.9   |
| SR-317 | Sesi harian, Tantangan Harian, Mode Kilat, dan tes penempatan dengan jalur aktif      | Tidak satu pun menarik kartu `special2holder` atau `holder2special`                                                    | normal   | AC-40            |
| SR-318 | Interval `special2holder` CD 49 mencapai 6 lalu 7 hari                                | `holder2special` tetap `locked` di 6 hari, terbuka di 7 hari                                                           | batas    | AC-39            |
| SR-319 | `special2holder` dan `holder2special` entri yang sama perlu diulang di hari yang sama | Hanya satu yang disajikan dan dihitung untuk jadwal, sesuai SRD 4.8                                                    | normal   | AC-14            |
| SR-320 | Entri CD 92 dengan `needsReview = true`                                               | Tidak membentuk kartu; tampil di Referensi                                                                             | batas    | AC-39            |
| SR-321 | Seluruh entri `referencePlates[]` (format RI, CC, CH)                                 | Tidak membentuk kartu, tidak menjadi pengecoh, dan tidak masuk kamus jawaban; tampil di Referensi dengan keterangannya | negatif  | AC-39            |
| SR-322 | Level 1 `holder2special` untuk CD 49                                                  | Empat pilihan kode CD; salah satu pengecoh CD 48 atau CD 50                                                            | normal   | SRD 2.9          |
| SR-323 | Level 1 `special2holder` untuk CD 17 (Vatikan)                                        | Empat pemegang dari entri CD `high`; tidak ada pengecoh yang juga alias Takhta Suci                                    | normal   | SRD 2.9          |
| SR-324 | Soal dan pilihan seluruh kartu kode khusus pada seed revisi ini                       | Tidak ada nomor urut registrasi atau nama pejabat perwakilan                                                           | normal   | AC-42            |
| SR-325 | Jawaban "Japan", "jepang", dan "Kedubes Jepang" untuk CD 49                           | Ketiganya `exact`                                                                                                      | normal   | AC-43            |
| SR-326 | Jawaban "Irak" untuk soal CD 45 (Iran)                                                | Salah; `confused_with = cd-20-irak`; tanpa toleransi salah ketik                                                       | batas    | AC-43            |
| SR-327 | Jawaban "Jepnag" untuk CD 49                                                          | `typo` dengan biaya 0,5                                                                                                | normal   | AC-43            |
| SR-328 | Jawaban "UNDF" untuk CD 58 (UNDP)                                                     | Salah; singkatan huruf kapital tanpa toleransi                                                                         | negatif  | AC-43            |
| SR-329 | Jawaban "49", "CD 49", "cd49", dan "049" untuk soal kode Jepang                       | Keempatnya benar                                                                                                       | normal   | AC-43            |
| SR-330 | Jawaban "CD 49 07" dan "CC 49" untuk soal kode Jepang                                 | Keduanya salah; "CC 49" tanpa pasangan                                                                                 | negatif  | AC-43            |
| SR-331 | Jawaban "48" untuk soal kode Jepang                                                   | Salah; `confused_with = cd-48-turki`                                                                                   | normal   | AC-43            |
| SR-332 | Seri CD dimatikan setelah 20 kartu CD dipelajari                                      | Materi baru CD berhenti; kartu CD yang perlu diulang tetap muncul di sesi Kode Khusus                                  | batas    | SRD 2.9          |
| SR-333 | Versi data baru memindahkan CD 39 ke pemegang lain dengan `id` baru                   | Kartu lama `suspended`; pemegang baru muncul sebagai materi baru tanpa mewarisi riwayat                                | batas    | SRD 2.9, TRD 4.1 |
| SR-334 | Semua kartu CD `mature`, kawasan Jawa belum dikuasai                                  | Penguasaan CD 100%; penguasaan wilayah dan Uji Penguasaan Kawasan tidak berubah                                        | normal   | AC-40            |
| SR-335 | Pencarian "CD 49 07" di Referensi                                                     | Menampilkan CD 49; tidak membuat `sightings`; input lengkap tidak disimpan                                             | batas    | AC-38, SRD 4.11  |
| SR-336 | Dua perangkat offline masing-masing memperkenalkan 5 kartu CD di hari yang sama       | Kelebihan 5 dipotong dari kuota kode khusus hari berikutnya, bukan dari kuota wilayah                                  | batas    | SRD 2.9, 8.4     |

## 6. Pengujian Teknis (TR-)

### 6.1 Pembuatan Aplikasi dan Konten

| ID     | Skenario                                                                               | Hasil yang diharapkan                                                                                                                | Kategori |
| ------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| TR-01  | Build dengan `plates.json` valid                                                       | Build lolos; versi bertanggal dan `contentRev` tertanam di bundle                                                                    | normal   |
| TR-193 | `next build` dengan `output: 'export'`                                                 | Folder `out/` berisi semua halaman utama sebagai HTML; tidak ada Route Handler, Server Action, atau Middleware; build gagal jika ada | negatif  |
| TR-194 | Service worker dibuat dari `out/` dengan `workbox-build`                               | Semua halaman utama, `plates.json`, `map.svg`, manifest PWA, worker optimizer, dan berkas WebAssembly optimizer ada di precache manifest | normal   |
| TR-195 | `plates.json` berubah tanpa `contentRev` naik, atau entri lama `contentHistory` diubah | Build gagal                                                                                                                          | negatif  |
| TR-02  | Satu region tanpa properti `aliases`                                                   | Build gagal dengan pesan yang menyebut `id` region-nya                                                                               | negatif  |
| TR-03  | `aliases` berisi array kosong                                                          | Build lolos                                                                                                                          | batas    |
| TR-04  | Kartu yang dapat dibuat tidak memiliki bentuk Level 3 sah                              | Build gagal (AC-1); pengujian berlaku per `card_id`/mode                                                                             | negatif  |
| TR-05  | Region baru memakai `id` yang ada di daftar pensiun                                    | Build gagal                                                                                                                          | negatif  |
| TR-06  | Dua region memakai `id` yang sama                                                      | Build gagal                                                                                                                          | negatif  |
| TR-07  | Region dengan `group` yang tidak dikenal                                               | Build gagal; kode itu tidak boleh diam-diam hilang dari hierarki                                                                     | negatif  |
| TR-08  | Cakupan tanpa elemen peta: provinsi tanpa `id` yang sama, atau kawasan tanpa `data-group` yang sama | Build gagal                                                                                                                          | negatif  |
| TR-09  | Kode lintas provinsi dengan `spans` berisi dua provinsi                                | Kode hanya muncul sekali di hierarki, di bawah `province` primer                                                                     | batas    |
| TR-10  | Jumlah pilihan per tingkat cakupan                                                     | Sama dengan hitungan dari data, tidak ada angka tertulis manual                                                                      | normal   |

### 6.2 Penyimpanan Lokal

| ID    | Skenario                                                            | Hasil yang diharapkan                                                                                                        | Kategori |
| ----- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------- |
| TR-11 | Jawaban ditulis lalu aplikasi dimuat ulang                          | Jawaban dan keadaan aplikasi kartu utuh                                                                                      | normal   |
| TR-12 | Aplikasi ditutup paksa di tengah transaksi penulisan jawaban        | `review_logs` dan antrean kirim tersimpan atomik atau keduanya tidak tersimpan; tidak ada pengakuan tersimpan sebelum commit | batas    |
| TR-13 | `QuotaExceededError` saat menulis                                   | Jawaban tidak ditandai tersimpan; pesan penyimpanan penuh tampil                                                             | negatif  |
| TR-14 | `persist()` ditolak                                                 | Aplikasi jalan; ajakan login ditonjolkan                                                                                     | batas    |
| TR-15 | Cache `derived` disimpan setelah replay, lalu aplikasi dibuka ulang | Keadaan aplikasi dari cache sama dengan replay penuh; event berikutnya ditambahkan di ujung                                  | normal   |
| TR-16 | Cache `derived` rusak                                               | Cache dibuang, replay penuh dijalankan, tidak ada kesalahan ke pengguna                                                      | batas    |

### 6.3 Autentikasi

| ID    | Skenario                                                                           | Hasil yang diharapkan                                                                                  | Kategori |
| ----- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------- |
| TR-17 | Login pertama di perangkat tanpa data                                              | Session tersimpan; `owner_user_id` terisi; pull berjalan                                               | normal   |
| TR-18 | Login pertama di perangkat dengan data tanpa pemilik, server kosong                | Seluruh event lokal diklaim dan terkirim                                                               | normal   |
| TR-19 | Login pertama dengan data lokal tanpa pemilik, server sudah berisi                 | Hasil akhir = gabungan keduanya, tanpa duplikat                                                        | batas    |
| TR-20 | Data lokal milik akun A, login sebagai akun B                                      | Tidak ada push; pilihan kembali ke A atau hapus data lokal tampil                                      | negatif  |
| TR-21 | Access token kedaluwarsa saat offline                                              | Latihan jalan; antrean kirim bertambah; tidak ada kesalahan                                            | batas    |
| TR-22 | Refresh token tidak berlaku saat kembali online                                    | Status sesi berakhir; antrean kirim utuh; setelah login ulang dengan akun sama, antrean kirim terkirim | batas    |
| TR-23 | Logout dengan antrean kirim kosong                                                 | Session dan data lokal terhapus                                                                        | normal   |
| TR-24 | Logout dengan antrean kirim berisi                                                 | Peringatan tampil lebih dulu; tanpa konfirmasi, tidak ada yang dihapus                                 | batas    |
| TR-25 | Magic link email dibuka di browser lain tanpa verifier pada alur PKCE yang dipilih | Tidak membuat session; tawarkan permintaan login baru atau kode OTP yang diketik pada browser tujuan   | batas    |

### 6.4 Pengiriman Data

| ID    | Skenario                                                                                              | Hasil yang diharapkan                                                                   | Kategori |
| ----- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| TR-26 | Event yang sama dikirim dua kali                                                                      | Server hanya menyimpan satu baris; push kedua dianggap berhasil                         | batas    |
| TR-27 | Outbox berisi `practice_runs` dan `review_logs` yang merujuknya                                       | Sesi terkirim lebih dulu; tidak ada kesalahan FK                                        | normal   |
| TR-28 | Outbox berisi 1.250 baris                                                                             | Terkirim dalam 7 batch berurutan                                                        | batas    |
| TR-29 | Server mengembalikan 503 di batch ketiga                                                              | Batch 1–2 keluar dari antrean kirim; batch 3 diulang dengan backoff; urutan tetap       | batas    |
| TR-30 | Server mengembalikan 429 dengan `Retry-After: 30`                                                     | Push berikutnya tidak dicoba sebelum 30 detik                                           | batas    |
| TR-31 | Satu `review_logs` melanggar constraint `level`                                                       | Baris itu dan `review_voids` yang merujuknya masuk karantina; baris lain tetap terkirim | negatif  |
| TR-32 | Dua perangkat mengubah `user_settings`, perangkat dengan `updated_at` lebih lama sinkron belakangan   | Nilai yang lebih baru bertahan                                                          | batas    |
| TR-33 | Dua perubahan `user_settings` dengan `updated_at` sama persis                                         | Pemenang ditentukan `updated_by_device`, sama di semua perangkat                        | batas    |
| TR-34 | Catatan pengingat dihapus di perangkat A, versi lama dikirim ulang dari perangkat B yang lebih lambat | Catatan pengingat tetap terhapus                                                        | batas    |
| TR-35 | Klien versi lama mengirim event tanpa kolom yang ditambahkan migration terbaru                        | Diterima, karena kolom baru nullable atau memiliki default                              | batas    |

### 6.5 Pengambilan dan Penggabungan Data

| ID    | Skenario                                                                                     | Hasil yang diharapkan                                                                                             | Kategori |
| ----- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| TR-36 | Pull berurutan tanpa event baru                                                              | Tidak ada perubahan keadaan aplikasi; cursor tidak mundur                                                         | normal   |
| TR-37 | Transaksi dengan `server_seq` kecil commit setelah transaksi dengan `server_seq` lebih besar | Baris itu tetap terambil lewat overlap riwayat cursor (TRD 5.3), tanpa query `received_at`                        | batas    |
| TR-38 | Overlap menghasilkan baris yang sudah ada                                                    | Duplikat dibuang lewat `id`; replay tidak berjalan ulang tanpa perlu                                              | batas    |
| TR-39 | Pull 3.500 baris                                                                             | Terambil dalam 4 halaman; cursor tersimpan per halaman, jadi gangguan di halaman ketiga tidak mengulang dari awal | batas    |

### 6.6 Kepastian Hasil Penghitungan Ulang

| ID     | Skenario                                                                                     | Hasil yang diharapkan                                                                  | Kategori |
| ------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| TR-40  | Property: kumpulan event yang sama diterima dalam urutan kedatangan acak                     | Keadaan aplikasi akhir identik untuk semua urutan                                      | batas    |
| TR-41  | Property: event yang sama diterapkan dua kali                                                | Keadaan aplikasi sama dengan diterapkan sekali                                         | batas    |
| TR-42  | Property: replay bertahap vs replay penuh                                                    | Identik untuk semua log hasil generator                                                | batas    |
| TR-43  | Golden logs dijalankan ulang                                                                 | Keadaan aplikasi sama persis dengan berkas hasil acuan                                 | normal   |
| TR-44  | Event datang terlambat dengan kunci pengurutan di tengah riwayat                             | Replay penuh berjalan; hasil sama dengan replay penuh atas log akhir                   | batas    |
| TR-45  | Dua jawaban dengan `effective_ts` dan `device_id` sama                                       | Diurut dengan `id`; hasil stabil                                                       | batas    |
| TR-46  | Event dengan `client_ts` 2 jam di depan `received_at`                                        | `effective_ts` memakai `received_at`                                                   | batas    |
| TR-47  | Replay dijalankan dua kali dengan jam sistem berbeda                                         | Hasil identik; replay tidak membaca jam sistem                                         | batas    |
| TR-48  | `ENGINE_VERSION` naik                                                                        | Cache `derived` dibuang dan replay penuh berjalan sekali saat dibuka                   | normal   |
| TR-49  | Satu event berisi `card_id` yang formatnya rusak                                             | Event dilewati, dicatat di layar diagnostik; event lain diterapkan                     | negatif  |
| TR-50  | `plates.json` versi baru menghapus satu `id`                                                 | Kartunya dihitung `suspended`; log tidak berubah                                       | batas    |
| TR-51  | `plates.json` berikutnya mengembalikan `id` itu                                              | Riwayat kartu kembali utuh                                                             | batas    |
| TR-191 | Batch pull berisi 50 event, satu di antaranya memiliki kunci lebih kecil dari event terakhir | Tepat satu replay penuh untuk batch itu; hasil sama dengan replay penuh atas log akhir | batas    |
| TR-192 | Batch pull yang seluruh kuncinya lebih besar dari event terakhir                             | Diurutkan lalu ditambahkan di ujung tanpa replay penuh; hasil sama dengan replay penuh | normal   |

### 6.7 Keamanan

| ID    | Skenario                                                                                     | Hasil yang diharapkan                                                                                                            | Kategori |
| ----- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TR-52 | Pengguna A membaca `review_logs`                                                             | Hanya baris milik A yang kembali                                                                                                 | normal   |
| TR-53 | Pengguna A menyisipkan baris dengan `user_id` milik B                                        | Ditolak                                                                                                                          | negatif  |
| TR-54 | Pengguna A mengubah atau menghapus baris `review_logs` miliknya sendiri                      | Ditolak                                                                                                                          | negatif  |
| TR-55 | Request dengan publishable key tanpa login ke semua tabel                                           | Ditolak untuk semua operasi                                                                                                      | negatif  |
| TR-56 | Setiap tabel di schema `public`                                                              | Punya RLS aktif dan grant sesuai kelompoknya; tabel tanpa grant gagal tes                                                        | negatif  |
| TR-57 | Update sesi yang `ended_at` sudah terisi; retry penutupan identik; payload penutupan berbeda | Update ditolak trigger; klien menganggap retry identik sukses setelah membaca baris kanonis; payload berbeda tidak menimpa hasil | negatif  |
| TR-59 | `delete_user()` dipanggil pengguna A                                                         | Hanya akun A dan seluruh barisnya yang terhapus; data B utuh                                                                     | normal   |

### 6.8 Impor dan Ekspor

| ID    | Skenario                                                                              | Hasil yang diharapkan                                                                                                                  | Kategori |
| ----- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TR-60 | Ekspor formatVersion 4 lalu impor ke akun kosong | Keadaan setelah replay identik dengan sebelum ekspor | normal   |
| TR-61 | File ekspor yang sama diimpor dua kali                                                | Impor kedua tidak menambah apa pun                                                                                                     | batas    |
| TR-62 | File impor rusak atau bukan format `terka-export`                                     | Ditolak utuh; tidak ada data yang masuk sebagian                                                                                       | negatif  |
| TR-63 | File ekspor berisi baris karantina                                                    | Baris karantina ikut, ditandai terpisah, tidak otomatis dikirim ulang                                                                  | batas    |

### 6.9 Penggunaan Tanpa Koneksi dan PWA

| ID    | Skenario                                                | Hasil yang diharapkan                                                          | Kategori |
| ----- | ------------------------------------------------------- | ------------------------------------------------------------------------------ | -------- |
| TR-64 | Kunjungan kedua tanpa koneksi                           | Aplikasi terbuka dan sesi bisa dimulai                                         | normal   |
| TR-65 | Kunjungan pertama tanpa koneksi setelah instalasi gagal | Pesan jelas bahwa unduhan pertama memerlukan koneksi                           | negatif  |
| TR-66 | Satu sesi penuh offline, lalu online                    | Seluruh jawaban terkirim; keadaan aplikasi di perangkat lain sama setelah pull | normal   |
| TR-67 | Versi service worker baru tersedia di tengah sesi       | Sesi tidak terputus; versi baru dipakai setelah muat ulang berikutnya          | batas    |

### 6.10 Optimasi Parameter

| ID    | Skenario                                                           | Hasil yang diharapkan                                                                  | Kategori |
| ----- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | -------- |
| TR-68 | Log berisi 999 jawaban yang dihitung untuk jadwal                  | Optimizer tidak berjalan                                                               | batas    |
| TR-69 | Log mencapai 1.000 jawaban dan 200 kartu berbeda                   | Optimizer berjalan di Web Worker; UI tetap responsif                                   | normal   |
| TR-70 | Parameter baru lebih baik sesuai aturan SRD bagian 4.12            | Baris `active` baru tersimpan; jawaban setelah `activated_at` memakai parameter baru   | normal   |
| TR-71 | Parameter baru tidak lebih baik                                    | Baris `rejected` tersimpan; parameter lama tetap berlaku                               | batas    |
| TR-72 | WASM gagal dimuat                                                  | Parameter lama tetap berlaku; tidak ada pesan di alur belajar                          | negatif  |
| TR-73 | Dua perangkat mengaktifkan parameter pada `activated_at` yang sama | Pemecah seri `device_id` lalu id menentukan baris yang sama di keduanya                | batas    |
| TR-74 | Data pengguna sintetis dengan parameter yang diketahui             | Parameter hasil optimasi menghasilkan log loss lebih rendah dari default pada data uji | normal   |

### 6.11 Kinerja

| ID    | Skenario                                                                  | Hasil yang diharapkan                          | Kategori |
| ----- | ------------------------------------------------------------------------- | ---------------------------------------------- | -------- |
| TR-75 | Replay penuh 20.000 event, CPU throttling 4×                              | Di bawah 2 detik                               | batas    |
| TR-76 | Replay bertahap satu jawaban                                              | Di bawah 16 ms, jadi tidak menjatuhkan frame   | normal   |
| TR-77 | Menyusun antrean harian dari 1.000 kartu dari kumpulan uji berskala besar | Di bawah 50 ms                                 | normal   |
| TR-78 | Jawaban diketik lalu Enter saat push sedang berjalan                      | Soal berikutnya tampil tanpa menunggu jaringan | batas    |

### 6.12 Konten Daerah dan Pencocokan Jawaban

| ID    | Skenario                                                                       | Hasil yang diharapkan                                  | Kategori |
| ----- | ------------------------------------------------------------------------------ | ------------------------------------------------------ | -------- |
| TR-79 | `regions[].areas` merujuk `areaId` yang tidak ada                              | Build gagal                                            | negatif  |
| TR-81 | Varian satu kab/kota sama dengan nama kab/kota lain setelah bentuk tanpa spasi | Build gagal dengan pesan yang menyebut kedua `id`      | negatif  |
| TR-82 | Kota Bogor dan Kabupaten Bogor                                                 | Build lolos; muncul di laporan nama ganda              | batas    |
| TR-83 | Kode yang semua kab/kota provinsinya eksklusif memakai kode itu                | Ditandai mencakup seluruh provinsi oleh build          | normal   |
| TR-84 | Tier `placementTier` berisi kurang dari 8 kode `common`                        | Build gagal                                            | negatif  |
| TR-85 | Pencocokan satu jawaban terhadap kamus nasional lengkap                        | Di bawah 5 ms di ponsel kelas menengah                 | batas    |
| TR-86 | Kamus yang dibangun saat konten dimuat dipakai untuk seluruh nama, alias, dan varian | Setiap nama, alias, dan varian kab/kota cocok dengan kab/kota-nya sendiri | batas    |

### 6.13 Pencatatan Sinyal Penilaian

| ID     | Skenario                                                          | Hasil yang diharapkan                                                      | Kategori |
| ------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | -------- |
| TR-87  | Playwright mengetik "medan" dengan jeda 150, 200, 900, dan 120 ms | `key_gaps_ms` berisi empat jeda itu dengan toleransi ±20 ms                | normal   |
| TR-88  | Mengetik "mdan", Backspace dua kali, lalu "edan"                  | `deleted_chars` 2                                                          | batas    |
| TR-89  | Tab lain dibuka selama soal tampil                                | `interrupted` true                                                         | batas    |
| TR-90  | Emulasi perangkat sentuh dengan keyboard layar                    | `input_mode` `touch`                                                       | batas    |
| TR-91  | Jawaban dengan 200 input                                          | `key_gaps_ms` terpotong di 120 nilai; baris tetap lolos constraint         | batas    |
| TR-202 | Jawaban dengan satu jeda 45.000 ms                                | Nilai itu disimpan sebagai 30.000 di `key_gaps_ms`; baris lolos constraint | batas    |

### 6.14 Penggunaan Tanpa Akun dan Pencegahan Penyalahgunaan

| ID     | Skenario                                                                                          | Hasil yang diharapkan                                                                                                                                              | Kategori |
| ------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| TR-92  | Sesi penuh tanpa login                                                                            | Tidak ada request ke domain Supabase                                                                                                                               | normal   |
| TR-93  | Permintaan magic link tanpa token CAPTCHA                                                         | Ditolak Supabase Auth                                                                                                                                              | negatif  |
| TR-94  | Permintaan magic link dengan token Turnstile uji yang selalu lolos                                | Diterima                                                                                                                                                           | normal   |
| TR-95  | Satu akun menyisipkan baris `review_logs` ke-1.001 dalam satu hari server                         | Ditolak trigger dengan kode kesalahan batas; baris tetap di antrean kirim klien                                                                                    | negatif  |
| TR-96  | Baris yang tertahan batas dikirim ulang setelah hari server berganti                              | Diterima                                                                                                                                                           | batas    |
| TR-97  | Perangkat baru ke-21 saat akun sudah punya 20 perangkat dengan `last_seen_at` dalam 90 hari       | Ditolak dengan kode batas perangkat; push perangkat itu berhenti tanpa karantina; latihan tetap berjalan                                                           | negatif  |
| TR-196 | Akun dengan 50.000 baris log mengirim satu baris lagi                                             | Ditolak dengan kode batas total; baris tetap di antrean kirim; ekspor tetap tersedia                                                                               | negatif  |
| TR-197 | `service_flags.signups_open = false`, akun baru tanpa perangkat mendaftarkan perangkat            | Ditolak dengan kode pendaftaran ditutup; latihan tetap berjalan; pesan pendaftaran ditutup tampil                                                                  | negatif  |
| TR-198 | `service_flags.signups_open = false`, akun yang sudah punya perangkat mendaftarkan perangkat baru | Diterima selama batas perangkat aktif belum tercapai                                                                                                               | batas    |
| TR-199 | Role `authenticated` membaca atau mengubah `service_flags`                                        | Ditolak karena tidak ada grant                                                                                                                                     | negatif  |
| TR-200 | Workflow alarm dijalankan dengan ambang uji di bawah ukuran database lokal                        | Workflow gagal dan menyebut ukuran database; di atas ambang uji workflow lolos                                                                                     | normal   |
| TR-201 | Login pertama di perangkat dengan 2.500 jawaban lokal                                             | Terkirim 1.000 per hari server selama tiga hari; status pengiriman bertahap tampil; tidak ada karantina                                                            | batas    |
| TR-98  | Akun tanpa consent versi wajib mengirim log latihan                                               | Ditolak dengan kode consent khusus; dialog tampil dan log tetap di antrean kirim, tidak dikarantina                                                                | negatif  |
| TR-99  | Versi kebijakan baru dengan `requires_reconsent = true` diterbitkan                               | Push berhenti sampai baris `privacy_consents` untuk versi baru tersimpan                                                                                           | batas    |
| TR-100 | 1.000 pengguna dengan data sintetis di database lokal                                             | Query RLS milik satu pengguna tetap memakai index dan di bawah 50 ms                                                                                               | batas    |
| TR-101 | Pemulihan cadangan `pg_dump` terenkripsi ke proyek kosong                                         | Data aplikasi, objek Auth yang dibutuhkan, RLS, grant, dan migration pulih; login dan sinkronisasi diuji sebelum layanan dibuka                                    | normal   |
| TR-102 | Header respons situs statis dari `vercel.json`                                                    | Tidak ada cookie pelacak; CSP mengizinkan origin aplikasi untuk aset dan endpoint analitik serta domain Supabase/Turnstile yang diperlukan; tidak memblokir TR-137; tidak ada pelanggaran CSP di halaman mana pun | batas    |

### 6.15 Masuk dengan Google

| ID     | Skenario                                                                                              | Hasil yang diharapkan                                               | Kategori |
| ------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------- |
| TR-103 | Stack Supabase lokal dengan provider OAuth tiruan, alur PKCE penuh                                    | Session terbentuk; `code_verifier` tidak pernah tampil di URL       | normal   |
| TR-104 | Callback dengan `state` atau `code_verifier` yang tidak cocok                                         | Ditolak; tidak ada session                                          | negatif  |
| TR-105 | Pengguna email yang sudah ada masuk lewat Google dengan email sama                                    | `user_id` sama; dua identitas di `auth.identities`                  | batas    |
| TR-106 | Masuk lewat Google dengan email berbeda dari akun email yang sudah ada                                | `user_id` baru; data akun lain tidak tersentuh                      | batas    |
| TR-107 | `redirectTo` ke domain yang tidak ada di daftar Redirect URL                                          | Supabase Auth menolak atau mengembalikan ke Site URL                | negatif  |
| TR-108 | Query ke tabel Terka setelah login Google                                                             | Tidak ada kolom nama atau foto di tabel Terka                       | negatif  |
| TR-109 | Deteksi user agent untuk Instagram, Facebook, Messenger, TikTok, LINE, Chrome Android, dan Safari iOS | Lima pertama dianggap browser di dalam aplikasi; dua terakhir tidak | batas    |
| TR-110 | Callback menerima `error=access_denied`                                                               | Tidak ada session; tidak ada perubahan data lokal                   | batas    |
| TR-111 | Verifikasi kode OTP benar, salah, dan kedaluwarsa                                                     | Session hanya terbentuk untuk kode benar yang belum kedaluwarsa     | normal   |
| TR-112 | Persetujuan tersimpan lokal, callback berhasil, penulisan `privacy_consents` gagal sekali             | Diulang otomatis; push event tertahan sampai persetujuan tersimpan  | batas    |
| TR-113 | Hapus akun yang memiliki identitas Google dan email                                                   | Pengguna, kedua identitas, dan seluruh baris Terka terhapus         | normal   |

### 6.16 Domain dan Email

| ID     | Skenario                                                           | Hasil yang diharapkan                                                     | Kategori |
| ------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------- | -------- |
| TR-114 | Callback OAuth dibuka di browser berbeda dari tempat login dimulai | Pertukaran code gagal karena `code_verifier` tidak ada; tidak ada session | batas    |
| TR-115 | Request ke `terka.vercel.app` dengan path dan query                | Respons 308 ke `terka.my.id` dengan path dan query yang sama              | normal   |
| TR-116 | Query DNS untuk SPF di `send.terka.my.id`, DKIM di `resend._domainkey.terka.my.id`, dan DMARC di `_dmarc.terka.my.id`, lewat workflow terjadwal | Ketiganya ada dan sesuai konfigurasi Resend | batas    |
| TR-117 | `redirectTo` ke `terka.vercel.app`                                 | Ditolak, karena hanya `terka.my.id` dan `localhost` yang diizinkan        | negatif  |
| TR-118 | 81 permintaan email login dalam satu jam di stack lokal            | Permintaan ke-81 ditolak rate limit                                       | batas    |
| TR-119 | Pemantau mengirim email uji ke `contact@terka.my.id`               | Diteruskan ke email pribadi pemilik proyek                                | normal   |

### 6.17 Tampilan Fakta dan Sesi Tes Penempatan

| ID     | Skenario                                                        | Hasil yang diharapkan                                              | Kategori |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| TR-120 | Pengguna A membaca `fact_views`                                 | Hanya baris milik A                                                | normal   |
| TR-121 | Pengguna A mengubah baris `fact_views` miliknya                 | Ditolak                                                            | negatif  |
| TR-122 | `fact_views` dari ponsel sampai di laptop                       | Rotasi fakta di laptop memakai tampilan dari ponsel                | normal   |
| TR-123 | Sesi placement ditutup dengan `placement_level` dan `active_ms` | Semua kolom penutup tersimpan atomik; update setelah tutup ditolak | normal   |
| TR-124 | `practice_runs` `placement` yang tidak pernah ditutup           | Diabaikan replay                                                   | batas    |

### 6.18 Skema Fisik (ERD)

| ID     | Skenario                                                                                                                                                              | Hasil yang diharapkan                                                                                                 | Kategori |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| TR-125 | Pengguna A menyisipkan `review_voids` yang menunjuk id jawaban milik pengguna B                                                                                       | Ditolak foreign key gabungan; tidak ada informasi apakah id itu ada                                                   | negatif  |
| TR-126 | Tidak aktif: foreign key `sightings.review_id` dari rancangan lama                                                                                                    | Tidak dijalankan; kontrak baru menghapus relasi jawaban. ID tidak dipakai ulang; pemeriksaan penggantinya TR-154      | negatif  |
| TR-127 | Klien mengirim nilai `received_at` atau `server_seq`                                                                                                                  | Ditolak karena tidak ada grant kolom                                                                                  | negatif  |
| TR-128 | Dua perangkat mengirim batch `review_logs` bersamaan untuk akun yang sama                                                                                             | `usage_daily.row_count` sama dengan jumlah baris yang benar-benar masuk; baris duplikat yang dilewati tidak terhitung | batas    |
| TR-129 | `review_logs` dengan `local_day` dua hari di depan tanggal server                                                                                                     | Ditolak `CHECK`                                                                                                       | negatif  |
| TR-130 | `review_logs` dengan `local_day` tujuh hari lalu                                                                                                                      | Diterima                                                                                                              | batas    |
| TR-131 | Klien mengirim `card_id` di payload `review_logs` atau `card_events`                                                                                                  | Ditolak; kolom `card_id` tidak ada di skema server. Klien membentuk `card_id` lokal dari `content_id` dan `mode`      | negatif  |
| TR-132 | Job pembersihan harian                                                                                                                                                | `usage_daily` lebih dari 30 hari terhapus; `review_logs` dan `fact_views` utuh                                        | normal   |
| TR-133 | Pengguna menyetujui dua versi kebijakan berturut-turut                                                                                                                | Dua baris `privacy_consents`; baris versi lama tetap ada                                                              | normal   |
| TR-134 | Menghapus baris `privacy_policy_versions` yang pernah disetujui                                                                                                       | Ditolak `on delete restrict`                                                                                          | negatif  |
| TR-135 | `EXPLAIN` pull `review_logs` satu pengguna dengan 1 juta baris milik pengguna lain                                                                                    | Memakai index `(user_id, server_seq)`; tidak ada sequential scan                                                      | batas    |
| TR-136 | Id dengan versi UUID selain 7                                                                                                                                         | Ditolak domain `uuid_v7`; baris masuk karantina di klien                                                              | negatif  |
| TR-180 | `delete_user()` untuk akun yang mengisi semua tabel pengguna: sesi, jawaban yang merujuk sesi, pembatalan, tampilan fakta, perangkat, parameter, catatan, persetujuan | Berhasil; tidak ada baris milik akun tersisa; tidak ada pelanggaran `NOT NULL` dari foreign key `(user_id, run_id)`   | batas    |
| TR-181 | Akun punya 20 perangkat, satu di antaranya terakhir terlihat 91 hari lalu; perangkat baru didaftarkan                                                                 | Diterima; perangkat lama tetap ada dan log yang merujuknya utuh                                                       | batas    |
| TR-182 | Klien mengirim `last_seen_at` bertanggal lama saat insert atau update `devices`                                                                                       | Ditolak grant pada insert; pada update nilai ditimpa `now()`; perangkat tetap terhitung aktif                         | negatif  |
| TR-183 | `fsrs_params` dengan `training_set_hash` bukan 32 byte, atau payload berisi daftar ID                                                                                 | Ditolak `CHECK` atau karena kolom tidak ada di skema                                                                  | negatif  |
| TR-184 | `set_items` sah terbesar di data uji, lalu `set_items` yang melewati batas byte                                                                                       | Yang sah diterima; yang melewati batas ditolak `CHECK`. Angka batas terkunci di tes ini                               | batas    |
| TR-203 | `set_items` berisi objek berkunci, tuple dengan jumlah elemen salah, atau `match_type` di luar domain                                                                 | Ditolak `valid_set_items`; tidak ada sebagian butir tersimpan                                                         | negatif  |
| TR-185 | Batch 200 baris `review_logs` dari satu akun                                                                                                                          | Penghitung naik 200; fungsi `bump_usage` dijalankan sekali per statement, bukan 200 kali                              | batas    |
| TR-186 | `review_logs` dengan `tz` yang tidak ada di `timezones`, lalu batch 200 baris dengan `tz` sah                                                                         | Yang pertama ditolak foreign key; batch sah tidak memanggil `pg_timezone_names`                                       | negatif  |
| TR-187 | Sesi ditutup di perangkat A setelah cursor perangkat B melewati insert sesi itu                                                                                       | Pull berikutnya di B menerima penutupan lewat `server_seq` baru; `practice_runs` tidak ditarik utuh                   | batas    |
| TR-188 | `review_logs` dengan `correct = false` dan `match_type = 'unverified'`, lalu `correct` null dengan `match_type = 'exact'`                                             | Keduanya ditolak `CHECK`; `correct` null dengan `unverified` atau `intro_read` diterima                               | negatif  |
| TR-189 | Daftar nilai domain dan `CHECK` enum di database hasil migration dibandingkan dengan konstanta klien                                                                  | CI gagal jika ada nilai yang hanya ada di salah satu sisi                                                             | normal   |
| TR-190 | Setiap tabel dan kolom yang disebut `Terka_ERD.md` dan TRD bagian 4.2 dibandingkan dengan skema hasil migration                                                       | CI gagal jika dokumen menyebut tabel atau kolom yang tidak ada di skema                                               | normal   |

### 6.19 Analitik Kunjungan

| ID     | Skenario                                                           | Hasil yang diharapkan                                                                  | Kategori |
| ------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | -------- |
| TR-137 | Pindah dari `/` ke `/sesi`, menjawab 20 soal, lalu ke `/statistik` | Tepat tiga page view terkirim; menjawab soal tidak menambah page view                  | normal   |
| TR-138 | Header dan storage browser setelah kunjungan                       | Tidak ada cookie yang dibuat Web Analytics                                             | negatif  |
| TR-139 | Payload page view                                                  | Hanya path dan data standar Web Analytics; tidak ada isi jawaban, kode, atau `user_id` | negatif  |
| TR-140 | Script Web Analytics gagal dimuat                                  | Aplikasi dan latihan tetap berjalan tanpa kesalahan                                    | batas    |

---

### 6.20 Pemeriksaan Konsistensi

| ID     | Skenario                                                                                         | Hasil yang diharapkan                                                                                                                         | Kategori |
| ------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TR-141 | Persetujuan pertama dan persetujuan versi baru tanpa consent aktif                               | Insert consent diizinkan untuk pemilik dan versi valid; log baru tetap tertahan sampai consent tersimpan                                      | normal   |
| TR-142 | Retry `privacy_consents`                                                                         | Konflik memakai `(user_id, policy_version)`; tidak meminta id/`server_seq`; pull utuh menghasilkan satu baris                                 | batas    |
| TR-143 | Retry insert event memberi respons kosong akibat duplikat                                        | Klien membaca baris kanonis dan metadata server sebelum membersihkan antrean kirim                                                            | batas    |
| TR-144 | Sesi placement ditutup tanpa `placement_level`, atau sesi non-placement dengan `placement_level` | Ditolak; penutupan valid wajib mengikuti jenis sesi                                                                                           | negatif  |
| TR-145 | Hasil optimasi anonim lalu diklaim akun dan disinkronkan                                         | `training_set_hash` tidak berubah; daftar ID tidak ikut terkirim; metadata sequence tidak diwajibkan atau digunakan sebagai identitas dataset | batas    |
| TR-146 | Array `set_items` terlalu panjang, field invalid, atau agregat tidak konsisten                   | Ditolak utuh oleh validasi struktur; tidak ada sebagian butir tersimpan                                                                       | negatif  |
| TR-147 | Void baru menunjuk jawaban lama di tengah riwayat                                                | Replay penuh berjalan; hasil sama dengan log tanpa jawaban target                                                                             | batas    |
| TR-148 | Penutupan sesi placement tiba setelah jawaban lain diterapkan                                    | Replay penuh berjalan; jawaban sesi terdampak dihitung ulang, bukan hanya waktu penutupan                                                     | batas    |
| TR-149 | Kuota total akun tercapai lalu hari server berganti                                              | Tetap tertahan; antrean kirim utuh dan ekspor tersedia; tidak menjanjikan retry harian akan lolos                                             | batas    |
| TR-150 | Fakta ready tanpa source atau sourceCheckedAt                                                    | Build gagal; fakta draft tanpa sumber sah tetapi tidak ditampilkan                                                                            | negatif  |
| TR-151 | Jawaban dikirim lalu umpan balik dibiarkan terbuka                                               | Event dan antrean kirim langsung tersedia; sinkronisasi tidak menunggu Lanjut; durasi umpan balik masuk `active_ms` saat sesi ditutup         | batas    |
| TR-152 | Parameter aktif dengan timestamp identik di dua perangkat                                        | Tie-break `device_id` dan id identik pada replay penuh maupun bertahap                                                                        | batas    |
| TR-153 | `practice_runs` lebih dari 1.000 baris, sesi lama baru ditutup                                   | Pull seluruh sesi memakai pagination; penutupan terbaca walau sequence tetap                                                                  | batas    |
| TR-154 | Skema `sightings` baru dan push pencarian Referensi                                              | Tidak ada `review_id` atau FK ke `review_logs`; event hanya berisi metadata pencarian; `review_logs` tidak bertambah                          | normal   |
| TR-156 | Sesi selesai saat offline dan baru dikirim sesudahnya                                            | Insert sesi terbuka lalu log jawaban lalu update penutupan; tidak melanggar trigger insert/close                                              | normal   |
| TR-157 | FK `user_id` berformat UUID Auth berbeda dari UUID v7 event                                      | `user_id` valid diterima; aturan v7 hanya untuk ID yang dibuat klien                                                                          | batas    |

---

### 6.21 Format Data dan Kompatibilitas

| ID     | Skenario                                                                                                               | Hasil yang diharapkan                                                                                                                                             | Kategori |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TR-158 | Payload kartu memakai mode di luar lima nilai domain `card_mode`                                                       | Ditolak validasi konten, klien, dan CHECK database versi akhir                                                                                                    | negatif  |
| TR-161 | Impor dua kali, lalu ekspor                                                                                            | Hasil identik tanpa duplikat; formatVersion 4                                                            | batas    |
| TR-162 | Impor formatVersion selain 4, lebih lama atau lebih baru                                                                                  | Ditolak sebelum penulisan; data lokal tetap utuh                                                                                                                  | negatif  |
| TR-165 | Klien lama melakukan sinkronisasi setelah masa kompatibilitas selesai                                                  | Aplikasi meminta pembaruan; data lokal tetap dapat diekspor; tidak ada penulisan ke skema akhir dengan format lama                                                | batas    |
| TR-205 | Klien dengan `ENGINE_VERSION` lama menarik event dengan `engine_version` lebih besar atau `mode` yang tidak dikenalnya | Event disimpan di Dexie; replay tidak berjalan; pesan versi baru tampil; latihan dan antrean kirim tetap berjalan; setelah pembaruan replay penuh berjalan sekali | batas    |

### 6.22 Data Kode Khusus

| ID     | Skenario                                                                        | Hasil yang diharapkan                                                                                                   | Kategori |
| ------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| TR-166 | Build dengan `../data/special-codes.json`                                            | Lolos; `specials[]` berisi 130 entri CD; `referencePlates[]` berisi tiga entri format (RI, CC, CH); CD 92 `needsReview` | normal   |
| TR-167 | Dua entri CD `high` memakai nomor yang sama                                     | Build gagal dengan pesan yang menyebut kedua `id`                                                                       | negatif  |
| TR-168 | Alias satu entri CD sama dengan `holder` entri CD lain setelah normalisasi      | Build gagal                                                                                                             | negatif  |
| TR-169 | `specials[].id` sama dengan salah satu `regions[].id`                           | Build gagal                                                                                                             | negatif  |
| TR-170 | `regions[].id` diawali `cd-` diikuti angka                                      | Build gagal                                                                                                             | negatif  |
| TR-171 | Entri `high` tanpa sumber, atau sumbernya tanpa `checkedAt`                     | Build gagal                                                                                                             | negatif  |
| TR-172 | Sumber `media-mengutip-instansi` tanpa `originalUrl`                            | Peringatan pada build biasa; gagal pada build rilis publik                                                              | batas    |
| TR-173 | `reviewBy` sudah lewat                                                          | Peringatan build; entri tetap dipakai                                                                                   | batas    |
| TR-174 | `review_logs` dengan `content_id = 'cd-49-jepang'` dan `mode = 'code2region'`   | Ditolak `CHECK`: mode wilayah tidak boleh memakai id kode khusus                                                        | negatif  |
| TR-175 | `review_logs` dengan `content_id = 'dk'` dan `mode = 'special2holder'`          | Ditolak `CHECK`: mode kode khusus wajib memakai id `cd-`                                                                | negatif  |
| TR-176 | `specials[]` memuat entri dengan `series` selain CD, atau `id` berawalan `ref-` | Build gagal                                                                                                             | negatif  |
| TR-177 | Ekspor dengan kartu kode khusus lalu impor ke perangkat kosong                  | Keadaan identik, termasuk `special_enabled` dan kartu `holder2special` yang terbuka                                     | normal   |
| TR-178 | Tabel CD di `Terka_Special_Codes.md` dibandingkan dengan `specials[]` di `../data/special-codes.json` | Nomor, pemegang, dan ejaan sumber identik untuk 130 baris                                                               | normal   |
| TR-179 | `referencePlates[]` memuat entri RI dengan `number` terisi                      | Build gagal                                                                                                             | negatif  |

## 7. Pengujian Alur Menyeluruh (E2E-)

Tes E2E dijalankan dengan Playwright di Chromium dan WebKit (bagian 2). Setiap tes memeriksa alur dari sisi pengguna, termasuk teks UI di `Terka_Microcopy.md`.

### 7.1 Alur Utama dan Keyboard

| ID     | Skenario                                                  | Hasil yang diharapkan                                                                                               | Kategori |
| ------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| E2E-01 | Buka aplikasi pertama kali tanpa akun                     | Sambutan dan tawaran tes tampil; setelah tes atau Lewati, beranda tampil dan Mulai belajar aktif; tanpa layar login | normal   |
| E2E-02 | Satu sesi harian penuh hanya dengan keyboard              | Semua soal bisa dijawab dan dilanjutkan tanpa mouse; sesi berakhir di **Sesi selesai**                              | normal   |
| E2E-03 | Jawaban benar, salah, dan diterima dengan koreksi ejaan   | Teks **Benar**, **Belum tepat** diikuti **Jawaban: …**, dan **Benar · ejaan diperbaiki**                            | normal   |
| E2E-04 | Enter di kolom kosong                                     | Tidak ada perubahan di layar                                                                                        | negatif  |
| E2E-05 | Z setelah jawaban                                         | **Jawaban dibatalkan**; soal yang sama tampil lagi                                                                  | normal   |
| E2E-06 | Level diturunkan dan dinaikkan manual                     | Label **Tidak memengaruhi jadwal** dan **Dihitung penuh** tampil sesuai arah                                        | normal   |
| E2E-07 | Layar Sesi selesai dengan kandidat fakta siap terbit      | Lima metrik dengan label Microcopy dan fakta bersumber; tidak ada Tombol mengulang sesi                             | normal   |
| E2E-08 | Beranda setelah semua soal selesai                        | **Tidak ada soal yang perlu diulang hari ini.**; tidak ada tombol latihan lagi                                      | batas    |
| E2E-09 | Antrean pengulangan melebihi ambang tingkat Menengah (40) | **Materi baru dijeda hari ini agar sesi tetap ringan.**                                                             | batas    |

### 7.2 Perkenalan, Kartu Sulit, dan Catatan Pengingat

| ID     | Skenario                                                               | Hasil yang diharapkan                                                                                                                                                      | Kategori |
| ------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| E2E-10 | Materi baru pertama di sesi                                            | Label **Materi baru**; setelah memilih, **Jawaban: …** dan **Tebakan tidak dinilai.**                                                                         | normal   |
| E2E-11 | Perkenalan selesai tanpa jawaban langkah, sesi ditutup, sesi baru dibuka | Kartu yang sama masuk salinan antrean baru dan kali ini dinilai; sesi lama tidak menunggu timer                                                                            | normal   |
| E2E-12 | Kode terlewat untuk keempat kalinya                                    | Tawaran catatan pengingat tampil di bawah hasil; Enter tetap langsung lanjut                                                                                               | normal   |
| E2E-13 | Menulis catatan pengingat 281 karakter                                 | **Maksimal 280 karakter.**; tidak tersimpan                                                                                                                                | negatif  |
| E2E-14 | Kartu mencapai 6 kali terlewat                                         | Penanda **Sulit Dikuasai**, daftar daerah kode itu, dan **Kode ini beberapa kali terlewat. Jawabannya ditampilkan dulu untuk dipelajari ulang.** tampil sebelum pertanyaan | normal   |
| E2E-15 | Kartu mencapai 8 kali terlewat                                         | **Kode ini dinonaktifkan sementara. Tinjau di halaman statistik.**; kartu muncul di daftar Statistik                                                                       | normal   |
| E2E-16 | **Tinjau kode** lalu aktifkan kembali                                  | **Kode ini diaktifkan kembali dan dimulai dari awal.**                                                                                                                     | normal   |

### 7.3 Cakupan dan Latihan Terfokus

| ID     | Skenario                                                                  | Hasil yang diharapkan                                                                    | Kategori |
| ------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| E2E-17 | Menelusuri pohon Cakupan lalu keluar tanpa **Pilih wilayah ini**          | Cakupan di beranda tidak berubah                                                         | batas    |
| E2E-18 | **Pilih wilayah ini** pada Kawasan Maluku                                 | Beranda menampilkan Cakupan baru dan jumlah materi baru sesuai data                      | normal   |
| E2E-19 | **Latih wilayah ini** pada wilayah yang memiliki kartu yang perlu diulang | Soal yang perlu diulang diberi penanda **Soal ini juga dihitung untuk jadwal hari ini.** | normal   |
| E2E-20 | **Latih wilayah ini** pada wilayah yang belum pernah dipelajari           | **Belum ada materi yang bisa dilatih di wilayah ini.**                                   | batas    |
| E2E-21 | Ringkasan Latihan Terfokus                                                | **Latihan selesai** dan **12 soal dijawab · akurasi 83%**, tanpa perubahan penguasaan    | normal   |

### 7.4 Tantangan Harian dan Mode Kilat

| ID     | Skenario                                                | Hasil yang diharapkan                                                       | Kategori |
| ------ | ------------------------------------------------------- | --------------------------------------------------------------------------- | -------- |
| E2E-22 | Menyelesaikan Tantangan Harian                          | **Tantangan hari ini selesai**; Hari Beruntun bertambah                     | normal   |
| E2E-23 | Membuka Tantangan Harian kedua kali di hari yang sama   | **Sudah selesai untuk hari ini**                                            | batas    |
| E2E-24 | Satu hari terlewat dalam 30 hari                        | **Jatah toleransi digunakan hari ini.**; tidak ada kalimat yang menyalahkan | batas    |
| E2E-25 | Mode Kilat di Kawasan Maluku, skor melampaui rekor      | **Rekor baru di Kawasan Maluku: 24**                                        | normal   |
| E2E-26 | Mode Kilat di wilayah tanpa rekor                       | **Belum ada rekor untuk wilayah ini.** sebelum mulai                        | batas    |
| E2E-27 | Mode Kilat ditutup di tengah hitungan, lalu dibuka lagi | Rekor tidak berubah                                                         | batas    |

### 7.5 Referensi dan Pelat Terlihat

| ID     | Skenario                                         | Hasil yang diharapkan                                                                                                     | Kategori |
| ------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | -------- |
| E2E-28 | Ketik DR di Referensi                            | Data DR langsung tampil; tidak ada tahap menjawab                                                                         | normal   |
| E2E-29 | Hasil pencarian kode ditampilkan                 | Tidak ada kolom jawaban atau teks penilaian; pengguna langsung membaca rincian                                            | normal   |
| E2E-30 | Membuka rincian kode dari hasil Referensi        | Tidak memerlukan tombol Lihat jawaban atau tindakan perantara                                                             | normal   |
| E2E-31 | Ketik nama wilayah "Lombok"                      | Hasil langsung tampil, tanpa tawaran menebak                                                                              | batas    |
| E2E-32 | Ketik `DK 1234 ABC`                              | Referensi membuka DK; Statistik Pelat Terlihat bertambah satu; bagian input selain kode depan tidak disimpan atau dikirim | batas    |
| E2E-33 | Kode yang belum dipelajari dicari                | Data langsung tampil; kartu tetap Belum Dipelajari dan kuota tidak terpakai                                               | batas    |
| E2E-34 | Pencarian tanpa hasil                            | **Tidak ada hasil untuk "XQ".**                                                                                           | negatif  |
| E2E-35 | Shortcut PWA **Referensi** di layar utama ponsel | Aplikasi terbuka langsung di Referensi dengan kolom pencarian aktif                                                       | normal   |

### 7.6 Akun dan Sinkronisasi

| ID      | Skenario                                                                    | Hasil yang diharapkan                                                                                                                                                                                                      | Kategori |
| ------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| E2E-36  | Login dengan Google di perangkat yang sudah memiliki riwayat                | Pesan penggabungan dengan jumlah jawaban yang ditambahkan                                                                                                                                                                  | normal   |
| E2E-37  | Tautan masuk kedaluwarsa                                                    | **Kode ini sudah kedaluwarsa. Kirim kode baru.**                                                                                                                                                                           | negatif  |
| E2E-38  | Dua browser context dengan akun sama; jawab 5 soal di context A             | Setelah pull, beranda context B menunjukkan jumlah soal yang sama dengan A                                                                                                                                                 | normal   |
| E2E-39  | Context A dan B offline, keduanya menjawab kartu yang sama, lalu online     | Keduanya akhirnya menunjukkan jadwal yang sama untuk kartu itu                                                                                                                                                             | batas    |
| E2E-40  | Offline selama satu sesi                                                    | **Sedang offline. Perubahan disimpan di perangkat ini.**; sesi tetap berjalan; setelah online status jadi tersinkron                                                                                                       | normal   |
| E2E-41  | Session berakhir saat offline, lalu kembali online                          | **Sesi masuk berakhir. Masuk lagi untuk melanjutkan sinkronisasi.**; latihan tetap bisa dipakai                                                                                                                            | batas    |
| E2E-42  | Login akun B di perangkat yang datanya milik akun A                         | **Data di perangkat ini milik akun lain.** dengan dua pilihan                                                                                                                                                              | negatif  |
| E2E-43  | Keluar dengan perubahan tertunda                                            | Peringatan dengan **Sinkronkan dulu** dan **Keluar tetap**                                                                                                                                                                 | batas    |
| E2E-44  | Perangkat baru login                                                        | **Menyiapkan data belajar…**, lalu beranda menampilkan angka yang sama dengan perangkat lama                                                                                                                               | normal   |
| E2E-45  | Hapus akun tanpa mengetik HAPUS                                             | Tombol konfirmasi tidak aktif                                                                                                                                                                                              | negatif  |
| E2E-133 | Login di perangkat baru saat akun sudah aktif di 20 perangkat dalam 90 hari | **Akun ini sudah dipakai di 20 perangkat dalam 90 hari terakhir. Latihan tetap berjalan, dan data tersimpan di perangkat ini. Sinkronisasi dicoba lagi besok.**; sesi tetap bisa dimulai; tidak ada perubahan di karantina | negatif  |
| E2E-134 | Profil yang terakhir berlatih 270 hari lalu dengan 40 kode jatuh tempo membuka Beranda | **Mulai belajar** membuka **Cek ingatan**; **Lewati, mulai sesi biasa** membuka **Sesi hari ini** | normal |
| E2E-135 | Pengguna baru menekan **Mulai belajar** di halaman awal | Tawaran tes penempatan tampil; tidak ada tombol **Ikut tes penempatan** terpisah | normal |
| E2E-136 | Menekan **Mulai tes** di tawaran tes penempatan | Tes penempatan terbuka tanpa beranda sempat tampil | batas |

### 7.7 Ekspor dan Impor

| ID     | Skenario                           | Hasil yang diharapkan                                        | Kategori |
| ------ | ---------------------------------- | ------------------------------------------------------------ | -------- |
| E2E-46 | **Ekspor data**                    | File JSON terunduh; **Data diekspor**                        | normal   |
| E2E-47 | Impor file yang sama dua kali      | Impor kedua: 0 jawaban ditambahkan                           | batas    |
| E2E-48 | Impor file yang bukan ekspor Terka | **File ini bukan ekspor Terka. Tidak ada data yang diubah.** | negatif  |
| E2E-49 | Ekspor terakhir lebih dari 30 hari | Pengingat tampil di layar penutup sesi                       | batas    |

### 7.8 Tanpa Koneksi, Kegagalan, dan Teks Antarmuka

| ID     | Skenario                                                                     | Hasil yang diharapkan                                                                                                                                                     | Kategori |
| ------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| E2E-50 | Kunjungan kedua dalam mode offline                                           | Aplikasi terbuka dan sesi bisa dimulai                                                                                                                                    | normal   |
| E2E-51 | Kunjungan pertama dalam mode offline                                         | **Pemasangan pertama memerlukan koneksi internet. Coba lagi saat online.**                                                                                                | negatif  |
| E2E-52 | IndexedDB dipaksa gagal dibaca                                               | **Data belajar tidak dapat dibuka. Coba muat ulang aplikasi.**; tidak ada soal yang dimulai                                                                               | negatif  |
| E2E-53 | `plates.json` dipaksa gagal dimuat                                           | **Data pelat tidak dapat dimuat. Coba buka kembali aplikasi.**                                                                                                            | negatif  |
| E2E-54 | Penyimpanan dipaksa penuh saat menjawab                                      | **Penyimpanan perangkat penuh. Ekspor data, lalu kosongkan ruang penyimpanan.**                                                                                           | negatif  |
| E2E-55 | Pindai seluruh teks UI di alur belajar                                       | Tidak ada istilah terlarang: `mature`, `relearning`, `lapses`, `node`, `activeScope`, FSRS, peluang ingat, antrean kirim, replay, "Terjadi kesalahan", "Hebat!", "Salah!" | negatif  |
| E2E-56 | Pindai label bilah bawah di viewport 360 px                                  | Keempat label tampil utuh tanpa terpotong                                                                                                                                 | batas    |
| E2E-57 | Jawab soal dengan zona waktu browser `Asia/Makassar` pukul 23.59, lalu 00.00 | Jumlah materi baru yang tersedia berganti hanya setelah pukul 00.00                                                                                                       | batas    |

### 7.9 Tes Penempatan

| ID     | Skenario                                                                                               | Hasil yang diharapkan                                                                                                                                                         | Kategori |
| ------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| E2E-58 | Pembukaan pertama                                                                                      | Satu layar sambutan menawarkan tes penempatan sebelum beranda; pengguna dapat melewatinya                                                                                     | normal   |
| E2E-59 | **Lewati, mulai dari awal**                                                                            | Beranda tampil; saran Cakupan Bali & Nusa Tenggara                                                                                                                            | normal   |
| E2E-60 | Menjawab benar semua soal                                                                              | Hasil memakai template **Tingkat: {tingkat}** dan **Sekitar {persentase}% kode sudah dikenal.** dengan tingkat Ahli; kode yang benar tidak muncul sebagai Perkenalan di sesi pertama | normal   |
| E2E-61 | Menjawab 2 dari 8 soal pertama                                                                         | Tes berhenti setelah soal ke-8; hasil memakai template **Tingkat: {tingkat} · …** dengan tingkat Pemula                                                                       | batas    |
| E2E-62 | **Tidak tahu** dengan mouse dan dengan keyboard                                                        | Soal berikutnya langsung tampil                                                                                                                                               | normal   |
| E2E-63 | Menjawab soal tes                                                                                      | Tidak ada teks **Benar** atau **Belum tepat** selama tes                                                                                                                      | batas    |
| E2E-64 | **Pakai saran ini**                                                                                    | Cakupan di beranda berubah ke saran                                                                                                                                           | normal   |
| E2E-65 | Aplikasi ditutup di tengah tes, lalu dibuka lagi                                                       | Tawaran tes muncul lagi dari awal; tidak ada kode yang masuk pengulangan                                                                                                      | batas    |
| E2E-66 | Statistik sebelum/sesudah jawaban terhitung pertama di luar tes dari sesi harian atau Latihan Terfokus | Tawaran tes hilang setelah jawaban terhitung; pencarian Referensi, pratinjau, dan Perkenalan saja tidak menutupnya                                                            | batas    |

### 7.10 Pratinjau Sesi

| ID      | Skenario                                                                            | Hasil yang diharapkan                                                                                                                     | Kategori |
| ------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| E2E-67  | **Mulai belajar**                                                                   | **Pratinjau sesi** tampil; Enter memulai; Esc kembali ke beranda tanpa perubahan                                                          | normal   |
| E2E-68  | Sesi berantrean tetap berisi Perkenalan dan review yang kemudian salah              | Jumlah soal sama dengan salinan antrean; belajar awal/belajar ulang baru menunggu sesi berikutnya; jadwal pengulangan terlihat di beranda | normal   |
| E2E-69  | Sesi tanpa soal Tebak berwaktu                                                      | Info Tebak berwaktu tidak tampil                                                                                                          | batas    |
| E2E-70  | Pratinjau dibiarkan 11 menit, lalu **Mulai**                                        | Pratinjau diperbarui sebelum soal pertama tampil                                                                                          | batas    |
| E2E-71  | Pratinjau Mode Kilat di Kawasan Maluku                                              | **60 detik · jawab sebanyak mungkin** dan rekor Maluku                                                                                    | normal   |
| E2E-72  | Pratinjau di viewport 360 px                                                        | Semua bagian terbaca tanpa gulir horizontal                                                                                               | batas    |
| E2E-134 | Buka pratinjau sesi harian berisi soal Tebak daerah, Tebak kode, dan Tebak berwaktu | Jenis soal tampil sebagai **Tebak daerah · …**, **Tebak kode · …**, **Tebak berwaktu · …**; tidak ada panah "→" di layar                  | normal   |
| E2E-135 | Jawab satu soal dari setiap jenis soal                                              | Label di atas pertanyaan sesuai tabel label dan kalimat soal di Microcopy 3.3                                                             | normal   |

### 7.11 Fun Facts

| ID     | Skenario                                                                      | Hasil yang diharapkan                                        | Kategori |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------ | -------- |
| E2E-74 | Sesi selesai dengan fakta siap terbit                                         | Fun Facts dengan label dan sumber tampil di bawah metrik     | normal   |
| E2E-75 | 21 sesi berturut-turut dengan jam yang dimajukan                              | Tidak ada fakta yang sama dalam 20 layar akhir berurutan     | batas    |
| E2E-76 | Dua browser context, fakta tampil di A, lalu layar akhir di B setelah sinkron | Fakta itu tidak tampil di B                                  | batas    |
| E2E-77 | Layar akhir dengan fakta                                                      | Tidak ada tombol untuk menambah sesi                         | negatif  |

### 7.12 Cakupan dan Jawaban

| ID     | Skenario                                          | Hasil yang diharapkan                                                 | Kategori |
| ------ | ------------------------------------------------- | --------------------------------------------------------------------- | -------- |
| E2E-78 | Pohon Cakupan                                     | Tidak ada tingkat kode                                                | normal   |
| E2E-79 | Cakupan Sumatera, soal pilihan untuk BK           | Empat pilihan, semuanya kab/kota di Sumatera; tidak ada nama provinsi | normal   |
| E2E-80 | Ketik "Binjai" untuk BK                           | **Benar** dan **Juga benar: …**                                       | normal   |
| E2E-81 | Ketik "Bukit Tinggi" untuk BA                     | **Benar** dan **Penulisan baku: Bukittinggi**                         | normal   |
| E2E-82 | Ketik "Pekanbru" untuk BM                         | **Benar · ejaan diperbaiki** dan nama bakunya                         | normal   |
| E2E-83 | Ketik "Medan" untuk BB                            | **Belum tepat** dan jawaban yang benar                                | negatif  |
| E2E-84 | Ketik "Sumatera Utara" untuk BK                   | **Belum tepat**                                                       | negatif  |
| E2E-86 | Pindah tab di tengah soal, kembali, lalu menjawab | Jawaban dinilai normal; tidak ada pesan tambahan                      | batas    |

### 7.13 Penggunaan Publik dan Tanpa Akun

| ID     | Skenario                                                          | Hasil yang diharapkan                                                                  | Kategori |
| ------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| E2E-87 | Pembukaan pertama di browser baru                                 | Layar sambutan tampil sekali; tidak muncul lagi setelah ditutup                        | normal   |
| E2E-88 | Sesi penuh tanpa login, dengan network log Playwright             | Tidak ada request ke domain Supabase                                                   | normal   |
| E2E-89 | Dari pembukaan pertama sampai soal pertama, emulasi ponsel dan 4G | Soal pertama bisa dijawab dalam kurang dari 60 detik                                   | batas    |
| E2E-90 | Sesi penuh hanya dengan sentuhan di viewport 360 px               | Semua soal bisa dijawab; tombol **Lanjut** terjangkau tanpa gulir                      | normal   |
| E2E-91 | Tujuh hari aktif tanpa akun                                       | Ajakan login muncul sekali di layar akhir; **Nanti saja** membuatnya tidak muncul lagi | batas    |
| E2E-92 | Dialog persetujuan ditutup tanpa menekan **Setuju dan lanjutkan** | Tidak ada redirect ke Google                                                           | negatif  |
| E2E-93 | Minta tautan masuk dua kali dalam 60 detik                        | Permintaan kedua ditolak dengan teks kirim ulang                                       | batas    |
| E2E-94 | Halaman Tentang                                                   | Memuat batas data, privasi, tautan kebijakan, dan tautan laporan                       | normal   |
| E2E-95 | Referensi dibuka                                                  | Penanda bukan rujukan resmi terlihat tanpa gulir                                       | batas    |
| E2E-96 | Dua akun berbeda di dua browser                                   | Tidak ada data satu akun yang tampil di akun lain                                      | negatif  |

### 7.14 Masuk dengan Google

| ID      | Skenario                                                                                                               | Hasil yang diharapkan                                                                                            | Kategori |
| ------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| E2E-97  | **Masuk dengan Google** di Chromium dengan provider OAuth tiruan di stack Supabase lokal                               | Kembali ke Terka dalam keadaan masuk; riwayat lokal tergabung                                                    | normal   |
| E2E-98  | Persetujuan kebijakan belum diberikan, lalu **Masuk dengan Google**                                                    | Dialog persetujuan tampil lebih dulu; tidak ada redirect sebelum **Setuju dan lanjutkan**                        | negatif  |
| E2E-99  | User agent Instagram                                                                                                   | Tombol Google tersembunyi; pesan browser aplikasi dan **Salin tautan** tampil; masuk dengan email tetap tersedia | batas    |
| E2E-100 | Login Google dibatalkan di halaman provider                                                                            | Kembali ke layar masuk tanpa pesan; data lokal utuh; masih pengguna tanpa akun                                   | batas    |
| E2E-101 | Masuk dengan email, keluar, lalu masuk dengan Google memakai alamat yang sama                                          | Akun yang sama; riwayat yang sama                                                                                | batas    |
| E2E-102 | Masuk dengan kode 6 digit                                                                                              | Masuk tanpa membuka tautan                                                                                       | normal   |
| E2E-103 | Ekspor di browser A tanpa akun, impor di browser B, lalu login Google di B                                             | Riwayat dari A tergabung ke akun                                                                                 | normal   |
| E2E-104 | Mode offline di layar masuk                                                                                            | Tombol masuk nonaktif dengan keterangan memerlukan koneksi                                                       | batas    |
| E2E-105 | Uji manual di perangkat nyata sebelum rilis: Chrome Android, Safari iOS, PWA iOS dengan kode, dan tautan dari WhatsApp | Keempatnya berhasil masuk; hasilnya dicatat di checklist rilis                                                   | normal   |

### 7.15 Domain dan Email

| ID      | Skenario                                                            | Hasil yang diharapkan                                                                   | Kategori |
| ------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| E2E-106 | Kode salah tiga kali                                                | **Kode tidak cocok…** tiap kali; tidak ada data yang berubah                            | negatif  |
| E2E-107 | Membuka `terka.vercel.app/statistik`                                | Dialihkan permanen ke `terka.my.id/statistik`                                           | normal   |
| E2E-108 | Email login diterima di Gmail dan Outlook                           | Pengirim `no-reply@terka.my.id`; tidak masuk spam; lolos SPF, DKIM, dan DMARC di header | normal   |
| E2E-109 | Halaman `terka.my.id/privasi`                                       | Bisa dibuka tanpa login dan tanpa JavaScript                                            | batas    |
| E2E-110 | Ekspor di browser A tanpa akun, impor di browser B, lalu login di B | Riwayat dari A tergabung ke akun                                                        | normal   |

### 7.16 Pembatalan melalui Layar Sentuh dan Pintasan Keyboard

| ID      | Skenario                                      | Hasil yang diharapkan                                                             | Kategori |
| ------- | --------------------------------------------- | --------------------------------------------------------------------------------- | -------- |
| E2E-111 | Ketuk **Batalkan jawaban** di viewport 360 px | **Jawaban dibatalkan**; soal yang sama tampil lagi; tombol hilang setelah dipakai | normal   |
| E2E-112 | Pratinjau sesi di perangkat sentuh            | Info pintasan keyboard tidak tampil                                               | batas    |

### 7.17 Perubahan Tingkat

| ID      | Skenario                                                                        | Hasil yang diharapkan                                                                                                  | Kategori |
| ------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| E2E-113 | Replay log sintetis yang memenuhi syarat naik tingkat, lalu buka pratinjau sesi | Info **Tingkat naik ke Mahir. Materi baru per hari sekarang 12.** tampil                                               | normal   |
| E2E-114 | Replay log sintetis yang memenuhi syarat turun tingkat                          | Info **Tingkat disesuaikan ke Menengah. Materi baru per hari sekarang 10.** tampil; tidak ada kalimat yang menyalahkan | batas    |

### 7.18 Pemeriksaan Konsistensi

| ID      | Skenario                                                                 | Hasil yang diharapkan                                                                                                         | Kategori |
| ------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------- |
| E2E-115 | Latihan Terfokus dengan campuran kartu yang perlu diulang dan yang belum | Pengantar menyebut pengecualian jadwal; hanya soal yang benar-benar terhitung diberi penanda                                  | normal   |
| E2E-116 | Kartu review mencapai ambang uji Level 3                                 | Label Uji penguasaan tampil dan pengguna tidak perlu memilih level manual                                                     | normal   |
| E2E-117 | Seluruh fakta draft                                                      | Sesi selesai tanpa blok fakta dan tanpa pesan kesalahan                                                                       | batas    |
| E2E-118 | Cakupan Bali, materi baru DK                                             | Perkenalan memiliki jawaban dan pengecoh sah; tidak memperkenalkan kartu kawasan lain                                         | batas    |
| E2E-119 | Sesi selesai setelah Perkenalan                                          | Tidak menunggu timer; beranda menunjukkan waktu pengulangan berikutnya tanpa Tombol latihan tambahan di layar akhir | normal   |
| E2E-120 | Membuka sesi himpunan dari Statistik                                     | Pratinjau satu soal; banyak butir dapat dikirim; hasil akhir dan undo mencakup satu soal utuh                                 | normal   |

### 7.19 Referensi Tanpa Penilaian

| ID      | Skenario                                                                   | Hasil yang diharapkan                                                                                                                    | Kategori |
| ------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| E2E-121 | Cari kode yang kartunya perlu diulang, belum perlu diulang, dan masih baru | Ketiganya langsung menampilkan konten tanpa tebakan atau penilaian; tidak membuat `review_logs` dan tidak mengubah keadaan aplikasi FSRS | normal   |
| E2E-122 | Cari kode berulang dalam 10 menit di perangkat sama                        | Data selalu terbuka; satu Pelat Terlihat; tidak ada perubahan kuota atau pasangan tertukar                                               | batas    |

### 7.20 Cakupan Materi dan Bahasa

| ID      | Skenario                                                       | Hasil yang diharapkan                                                                                                        | Kategori |
| ------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------- |
| E2E-123 | Telusuri semua mode dan Cakupan provinsi                       | Pilihan kartu hanya berasal dari lima mode yang didukung; tidak ada generator pertanyaan dari pelat lengkap                  | normal   |
| E2E-124 | Masukkan pelat lengkap pada Referensi                          | Hasil memakai kode depan; jaringan, penyimpanan, analitik, dan diagnostik tidak menerima bagian input lainnya                | batas    |
| E2E-125 | Impor berkas ekspor dari versi Terka sebelumnya | Pesan versi tidak didukung tampil; tidak ada data yang diubah | batas    |
| E2E-126 | Baca semua layar jadwal, pratinjau, dan ringkasan              | Istilah mengikuti Microcopy 2: perlu diulang, perkiraan durasi, target waktu aktif, dan batas waktu digunakan sesuai konteks | normal   |

### 7.21 Kode Khusus

| ID      | Skenario                                                          | Hasil yang diharapkan                                                                                                                                                                                     | Kategori |
| ------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| E2E-127 | Aktifkan Latihan Kode diplomat dari Statistik, kembali ke Beranda | Tombol **Kode diplomat** tampil; pratinjau berjudul **Kode diplomat · kode negara di pelat CD** menunjukkan materi baru CD; label soal **Tebak diplomat**                                                 | normal   |
| E2E-136 | Buka Referensi, lalu kartu Kode Khusus dan daftar Kode diplomat   | Kartu berlabel **KODE KHUSUS** dengan judul **Pelat tanpa wilayah** dan empat baris CD, CC, CH, RI; daftar menampilkan **130** entri, **CD 12** sampai **CD 145**, dan catatan nomor yang tidak tercantum | normal   |
| E2E-137 | Buka Statistik dengan 42 kartu Kode diplomat dikuasai             | Kartu **Kode diplomat** menampilkan **42** **dari 130 dikuasai** dan **Dihitung terpisah dari penguasaan wilayah.**                                                                                       | normal   |
| E2E-128 | Cari "RI", "RI 1", dan "RI 20" di Referensi                       | Ketiganya membuka entri format RI yang sama beserta **Tidak ada sumber valid yang memuat daftar lengkap kode RI, dan alokasi nomornya dapat berubah sewaktu-waktu.**; tidak ada jabatan per nomor         | normal   |
| E2E-129 | Cari "CD 49" di Referensi dengan jalur nonaktif                   | Hasil **CD 49 · Jepang** dengan sumber dan tanggal pemeriksaan; ajakan **Latih kode negara CD** tampil                                                                                                    | normal   |
| E2E-130 | Jawab "CD 49 07" pada soal kode Jepang                            | **Belum tepat** diikuti **Cukup kode negaranya: CD 49**                                                                                                                                                   | negatif  |
| E2E-131 | Cari "Jepang" di Referensi                                        | Hasil **CD 49 · Jepang** tampil bersama sumber dan tanggal pemeriksaan                                                                                                                                    | normal   |
| E2E-132 | Matikan seri CD saat masih ada kartu CD yang dipelajari           | Teks **Materi baru berhenti. Soal yang sudah dipelajari tetap muncul saat perlu diulang.** tampil                                                                                                         | batas    |
| E2E-133 | Profil baru menyelesaikan sesi harian pertama sampai ringkasan | Setiap kode baru dijawab tepat dua kali (Perkenalan dan satu soal ulang); Beranda lalu menampilkan **Tidak ada soal yang perlu diulang hari ini.** | normal |
