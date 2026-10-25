# TERKA — System Requirements Document (SRD)

**Status:** Draf · **Bahasa:** Indonesia
**Acuan:** Dokumen Kode Plat Nomor Kendaraan Indonesia (sumber data)
**Dokumen terkait:** PRD (produk dan alur pengguna) · TRD (arsitektur, model data, dan sinkronisasi) · ERD (skema database) · Fun Facts (`Terka_Fun_Facts.md`) · Special Codes (`Terka_Special_Codes.md`) · Microcopy (`Terka_Microcopy.md`) · Tests (`Terka_Tests.md`)

> **Slogan:** Lihat pelatnya, terka asalnya.
> **Fokus dokumen ini:** aturan pemilihan materi, penjadwalan, penilaian jawaban, siklus status kartu, dan konsistensi antarperangkat.

---

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menetapkan perilaku sistem Terka: aturan memilih materi, tingkat kesulitan, penjadwalan, penilaian jawaban, penanganan kode yang sering tertukar, siklus status kartu, dan konsistensi hasil saat Terka dipakai di beberapa perangkat. Isinya aturan yang harus dipenuhi implementasi, bukan alasan produknya dan bukan pilihan teknologinya.

Bagian 9 merangkum kriteria penerimaan. Katalog tes untuk setiap aturan, termasuk kondisi batas, ada di `Terka_Tests.md`.

Konteks produk dan alur pengguna ada di PRD; teks antarmuka ada di Microcopy. Model data dan sinkronisasi ada di TRD. Seluruh tes ada di `Terka_Tests.md`.

Setiap aturan di dokumen ini berlaku per pengguna. Jadwal, persentil waktu jawab, pasangan tertukar, parameter FSRS, rotasi fakta, dan hasil tes penempatan dihitung hanya dari log pengguna itu. Tidak ada aturan yang membandingkan satu pengguna dengan pengguna lain, dan tidak ada data pengguna lain yang ikut menentukan nilai penjadwalan.

Jika ditemukan pertentangan, perbaiki aturan dan dokumen terkait bersama-sama dengan tetap mengikuti prinsip produk dalam PRD 2.

**Kepemilikan aturan.** PRD menetapkan tujuan dan cakupan; SRD menetapkan perilaku; TRD menetapkan kontrak penyimpanan dan sinkronisasi; ERD menetapkan skema fisik yang wajib memenuhi TRD; Microcopy menjelaskan perilaku tersebut; Tests mengujinya tanpa menambah aturan diam-diam. Perubahan normatif harus memperbarui seluruh rujukan yang terdampak dalam revisi yang sama. Status Draf tetap berlaku sampai implementasi, data sumber, dan pengujian rilis tersedia.

---

## 2. Cakupan dan Pemilihan Materi

**Istilah yang digunakan.** Kartu adalah satu materi dalam satu mode. Pengulangan adalah latihan kembali sesuai jadwal. Kartu terkait menguji kode yang sama dengan bentuk berbeda. Nilai penjadwalan adalah masukan untuk FSRS, berbeda dari hasil benar atau salah yang dilihat pengguna. Nama seperti `due`, `learning`, dan `review` tetap dipakai saat merujuk properti atau status dalam kode.

### 2.1 Tiga Tingkat

| Tingkat  | Contoh                               | Perkiraan jumlah pilihan | Kegunaan                                            |
| -------- | ------------------------------------ | ------------------------ | --------------------------------------------------- |
| Nasional | Seluruh Indonesia                    | 1                        | Sasaran akhir dan mode uji                          |
| Kawasan  | Sumatera, Jawa, Bali & Nusa Tenggara | 7                        | Tingkat utama untuk memilih wilayah belajar         |
| Provinsi | Sumatera Utara, Bali                 | 38                       | Tingkat terkecil untuk memilih kelompok materi baru |

Jumlah pilihan di tiap tingkat dihitung otomatis dari `plates.json` saat build, bukan ditulis manual di kode. Ini penting karena jumlah kode bisa berubah; Papua saja bertambah tiga kode sepanjang 2024.

**Pemilihan berhenti di provinsi.** Cakupan mengelompokkan materi menurut wilayah administratif. Memilih satu kode tidak menambah tingkat wilayah, sehingga pemeriksaan kode dilakukan melalui Referensi atau Statistik. Provinsi dengan satu kode tetap dapat dipilih; sumber pengecohnya mengikuti bagian 2.8.

Data satu kode dapat dilihat langsung lewat Referensi; latihan berjalan melalui mode belajar. Pelat Terlihat hanya catatan frekuensi pencarian.

Kabupaten/kota tidak menjadi pilihan Cakupan karena kartu dibentuk per kode, bukan per kabupaten/kota. Nama daerah tetap dipakai dalam pertanyaan dan jawaban.

### 2.2 Pengelompokan Kawasan

| Kawasan              | Kode anggota                                                          |
| -------------------- | --------------------------------------------------------------------- |
| Sumatera             | BA, BB, BD, BE, BG, BH, BK, BL, BM, BN, BP                            |
| Jawa                 | A, B, D, E, F, G, H, K, L, M, N, P, R, S, T, W, Z, AA, AB, AD, AE, AG |
| Kalimantan           | DA, KB, KH, KT, KU                                                    |
| Sulawesi             | DB, DC, DD, DL, DM, DN, DP, DT, DW                                    |
| Bali & Nusa Tenggara | DK, DR, EA, DH, EB, ED                                                |
| Maluku               | DE, DG                                                                |
| Papua                | PA, PB, PY, PS, PT, PG                                                |

Pengelompokannya mengikuti kedekatan administratif, bukan definisi geologis pulau. Madura masuk Jawa, Bangka Belitung dan Kepulauan Riau masuk Sumatera, dan Nusa Tenggara digabung dengan Bali jadi satu kawasan. Maluku berdiri sendiri karena hanya dua kode dan tidak ada kawasan lain yang logis untuk menampungnya.

Ukuran antar kawasan memang timpang — Jawa berisi 22 kode, Maluku hanya 2 — dan itu tidak perlu diseragamkan. Maluku bisa diselesaikan cepat sehingga memberi rasa maju sejak awal, sedangkan Jawa memang lebih cocok dipecah lagi lewat tingkat provinsi.

### 2.3 Kode yang Digunakan di Beberapa Provinsi

Beberapa kode tidak berhenti di satu provinsi. Contoh paling jelas: B mencakup DKI Jakarta, sebagian Jawa Barat, dan sebagian Banten, sementara sebagian besar Kabupaten Tangerang justru memakai A.

Aturannya: setiap kode memiliki tepat satu `province` primer dan boleh memiliki daftar `spans` berisi provinsi lain yang ikut tercakup. Hierarki cakupan dibangun hanya dari `province` primer, jadi satu kode tidak pernah muncul di dua provinsi. Isi `spans` tidak memengaruhi navigasi sama sekali — ia hanya tampil sebagai catatan di Referensi.

**Keanggotaan kartu di tingkat provinsi:**

- Kartu tingkat kode (`code2region`, `region2code`, `setrecall`) masuk provinsi primer kodenya.

Satu kartu tetap hanya memiliki satu provinsi, jadi persentase penguasaan tidak tumpang tindih.

Keputusan ini mengorbankan sedikit ketepatan geografis demi struktur cakupan yang tetap berupa hierarki konsisten. Jika satu kode boleh muncul di beberapa wilayah sekaligus, persentase penguasaan akan tumpang tindih dan tidak bisa dihitung konsisten.

### 2.4 Cakupan dan Latihan Terfokus

Bagian ini memisahkan dua konsep yang sekilas mirip tetapi fungsinya berbeda.

**Cakupan** adalah pilihan wilayah yang tersimpan antar sesi dan hanya menentukan **materi baru** mana yang boleh mulai dipelajari. Kartu lama yang sudah masuk jadwal tetap bisa muncul meski berasal dari wilayah lain.

**Kartu yang pernah dipelajari tidak pernah disembunyikan Cakupan.** Begitu kartu Golongan A sudah perlu diulang, kartu itu masuk sesi harian. Kartu `setrecall` tetap terlihat dengan penanda perlu diulang pada sesi terpisah Golongan B (bagian 5.2), tanpa disaring Cakupan aktif. Aturan ini mencegah pengulangan yang tertunda menumpuk tanpa terlihat saat pengguna berpindah kawasan.

**Latihan Terfokus** adalah latihan tambahan untuk wilayah tertentu di luar sesi harian. Jawabannya tetap dicatat untuk statistik dan deteksi pasangan yang sering tertukar, tetapi **tidak mengubah jadwal** kartu yang belum waktunya diulang. Jika latihan tambahan ikut menjadwal ulang kartu, data interval jadi bias karena kartu terlihat lebih mudah daripada aslinya.

Antrean harian mengambil kartu yang perlu diulang dari seluruh wilayah, lalu menambahkan materi baru dari Cakupan aktif. Jumlah materi baru di luar Cakupan tetap terlihat, tetapi tidak ikut dimasukkan. Mengganti Cakupan tidak mengubah jadwal atau mengembalikan kuota yang sudah dipakai.

Batas kartu baru berlaku global per hari. Pengguna tidak bisa berulang kali mengganti Cakupan untuk menarik materi baru melebihi batas harian.

Dengan beberapa perangkat, batas harian dihitung dari gabungan log semua perangkat per `local_day`. Aturan untuk kuota yang terlampaui karena dua perangkat offline bersamaan ada di bagian 8.4.

### 2.5 Penguasaan per Cakupan

- Persentase penguasaan satu cakupan = rata-rata nilai setiap kartu yang dihitung. Kartu `mature` bernilai 1. Kartu `review` dan `relearning` bernilai `min(interval, 20) / 21`, jadi tumbuh bersama intervalnya tetapi tidak pernah penuh. Kartu `new` dan `learning` bernilai 0. Persentase 100% hanya tampil jika semua kartu `mature`; selain itu paling tinggi 99%.
- Persentase ini menunjukkan kemajuan sejak hari pertama belajar. Status **dikuasai** di bawah tetap memakai syarat `mature` penuh, jadi keduanya tidak tertukar.
- Kartu `suspended` dan `locked` tidak dihitung, baik di pembilang maupun penyebut. Jika dihitung, satu entri yang `confidence`-nya turun membuat 100% mustahil dicapai tanpa kesalahan pengguna, dan kartu arah sebaliknya yang belum boleh dibuka menurunkan persentase kawasan yang sebenarnya sudah dikuasai.
- Cakupan dinyatakan **dikuasai** jika seluruh kartu yang dihitung berstatus `mature` dan tidak ada pasangan sering tertukar aktif yang melibatkan kode di dalamnya, ke arah mana pun.
- Cakupan tanpa kartu yang dihitung — misalnya provinsi yang semua entrinya belum `high` — tidak memiliki persentase dan tidak bisa dinyatakan dikuasai.
- Angka ini dipakai untuk mewarnai Peta Penguasaan dan menentukan Uji Penguasaan Kawasan di PRD bagian 8.

Syarat "tidak ada pasangan yang sering tertukar" sengaja ditambahkan. Tanpa itu, satu kawasan bisa dinyatakan dikuasai padahal dua kode di dalamnya masih rutin tertukar — dan justru masalah semacam itu yang paling mudah tidak terlihat di angka persentase.

### 2.6 Saran Urutan Belajar

Cakupan awal yang disarankan: **Bali & Nusa Tenggara**, lalu **Jawa**, kemudian kawasan lain menurut frekuensi kemunculannya di jalan. Kode yang sering terlihat sehari-hari dapat pengulangan alami di luar aplikasi, sedangkan kawasan awal yang kecil membuat kemajuan terasa dalam hitungan hari, bukan minggu.

Ini hanya saran urutan. Pengguna tetap bebas memilih Cakupan mana pun kapan pun.

**Tawaran Cakupan berikutnya.** Jika tidak ada lagi kartu `code2region` berstatus `new` di Cakupan aktif tetapi masih ada di luar Cakupan, Beranda menawarkan satu ketukan untuk pindah. Cakupan provinsi pindah ke provinsi berikutnya di kawasan yang sama yang masih punya materi baru, lalu ke provinsi pertama yang masih punya materi baru di kawasan berikutnya; tingkat Cakupan tetap provinsi. Cakupan kawasan pindah ke kawasan berikutnya yang masih punya materi baru. Urutannya mengikuti urutan data dan berputar ke awal. Cakupan nasional tidak mendapat tawaran. Mengetuk tawaran sama dengan mengubah Cakupan lewat Setelan.

### 2.7 Urutan Materi Baru

Dalam Cakupan aktif, materi baru diperkenalkan dengan urutan berikut:

1. **Antar kode:** kode dengan jumlah Pelat Terlihat terbanyak dalam 90 hari terakhir lebih dulu. Jika seri, urutan kemunculan di `plates.json`.
2. **Dalam satu kode:** hanya `code2region` yang masuk sebagai materi baru. `region2code` dan `setrecall` memiliki syarat membuka (bagian 4.8) dan baru ikut antre setelah syaratnya terpenuhi.

Pelat Terlihat yang lebih tua dari 90 hari tidak dihitung, supaya urutan mengikuti kebiasaan jalan yang sekarang, bukan setahun lalu. Kode yang belum pernah terlihat tidak pernah tertahan selamanya: begitu kode yang terlihat habis diperkenalkan, kode lain menyusul menurut urutan data.

Aturan ini menjawab asumsi di PRD bagian 4 bahwa frekuensi kemunculan nyata bisa dipakai menentukan prioritas kartu. Datanya datang dari Pelat Terlihat.

### 2.8 Cakupan dan Bentuk Soal

Cakupan menentukan dua hal: materi baru mana yang dibuka, dan daftar nama yang boleh jadi pilihan jawaban.

| Cakupan                           | Materi baru yang diperkenalkan                         | Jenis soal                                                          | Bentuk jawaban          | Sumber pilihan dan pengecoh    |
| --------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- | ----------------------- | ------------------------------ |
| Nasional                          | Kartu tingkat kode dari seluruh Indonesia              | Tebak daerah, Tebak kode, Tebak berwaktu, Sebutkan sebanyak mungkin | Nama kab/kota atau kode | Kab/kota di seluruh Indonesia  |
| Kawasan, misalnya Sumatera        | Kartu tingkat kode di kawasan itu                      | Sama dengan Nasional                                                | Nama kab/kota atau kode | Hanya kab/kota di kawasan itu  |
| Provinsi, misalnya Sumatera Utara | Kartu untuk kode yang dikelompokkan dalam provinsi itu | Sama dengan Nasional                                                | Nama kab/kota atau kode | Hanya kab/kota di provinsi itu |

**Jawaban di tingkat kabupaten/kota.** Soal "Apa daerah kode BK?" diterima dengan nama kabupaten/kota mana pun yang memakai BK — Medan, Binjai, Deli Serdang. Satu nama sudah cukup. Menyebut sebanyak mungkin adalah tugas bentuk "sebutkan sebanyak mungkin", bukan bentuk ini. Setelah jawaban benar, UI menampilkan beberapa kab/kota lain dari kode yang sama.

**Nama provinsi** tidak pernah jadi pilihan. Nama provinsi hanya diterima sebagai jawaban ketik jika kode itu mencakup seluruh provinsi dan provinsi itu tidak memakai kode lain, seperti DK untuk Bali atau BL untuk Aceh. BK tidak bisa dijawab "Sumatera Utara", karena provinsi itu juga memakai BB. Sifat "mencakup seluruh provinsi" dihitung saat build dari data kab/kota, bukan ditulis manual.

**Pengecoh dan pilihan.** Untuk soal kode → daerah, ambil tiga nama kab/kota `high` dari kode lain dan satu jawaban benar. Tidak boleh ada pengecoh yang juga merupakan jawaban sah, termasuk akibat relasi banyak-ke-banyak. Sumber awal mengikuti tabel. Jika belum cukup tiga pengecoh unik, perluas ke kawasan kartu, lalu nasional. Ini berlaku juga di provinsi satu kode seperti Bali; perluasan hanya mengubah pilihan, tidak membuka materi baru di luar Cakupan. Jika data nasional pun tidak cukup, bentuk empat pilihan tidak dibuat: Perkenalan memakai soal informasi tanpa tebakan, dicatat `context = intro`, `question_type = 'intro_read'`; selain Perkenalan gunakan jawaban ketik dengan level yang sesuai.

Untuk soal daerah → kode, pilihan Level 1 berupa kode yang berbeda. Semua kode berlabel `high` yang sah untuk daerah tersebut diterima dan tidak boleh menjadi pengecoh. Sumber pilihan diperluas dengan urutan yang sama seperti soal kode → daerah. Nama provinsi tidak digunakan sebagai pilihan jawaban.

**Kartu dari luar Cakupan.** Kartu yang sudah perlu diulang tetap muncul dari seluruh kartu (bagian 2.4). Untuk kartu seperti itu, sumber pengecohnya kawasan kartu itu sendiri, supaya kartu DK tidak diberi pengecoh dari Sumatera hanya karena Cakupan aktifnya Sumatera.

**Soal Tebak kode (daerah → kode).** Kartunya tetap satu per kode. Setiap kali tampil, soal menampilkan satu kab/kota anggota yang dipilih PRNG menggunakan seed `cardId` dan jumlah `reps`, dengan syarat tidak sama dengan daerah yang ditampilkan di tayangan sebelumnya bila tersedia lebih dari satu daerah sah; kode dengan satu daerah mengulang daerah yang sama. Nama ditampilkan lengkap dengan awalannya — "Kabupaten Tangerang", bukan "Tangerang" — supaya soal tidak ambigu.

**Satu kab/kota, beberapa kode.** Sebagian Kabupaten Tangerang memakai A, sebagian B. Pada kode → daerah, nama diterima bila daerah itu memakai kode soal. Pada daerah → kode, seluruh kode `high` untuk daerah yang ditampilkan diterima; kartu tetap kartu asal yang sedang dijadwalkan, bukan dipindahkan ke kode jawaban.

**Nama sama, daerah beda.** Kota dan kabupaten bernama sama — Bogor, Bekasi, Tangerang — jadi satu nama setelah awalan administratif dibuang (bagian 5.1). Jika keduanya beda kode, jawaban benar asalkan salah satunya cocok dengan kode yang ditanyakan.

**Nama mode.** `code2region` berarti kode → kab/kota, dan `region2code` berarti kab/kota → kode. Kata `region` di nama mode merujuk entri kode di `plates.json` (`regions[]`), bukan provinsi.

### 2.9 Jalur Kode Khusus

Jalur ini melatih entri `specials[]` di `plates.json`, yaitu kode negara CD untuk korps diplomatik dan organisasi internasional. Aturan di bagian lain SRD berlaku juga untuk kartu kode khusus, kecuali yang diganti di bawah.

**Materi.** Hanya entri `specials[]` berlabel `high` yang membentuk kartu. Setiap entri menghasilkan dua kartu: `special2holder` (kode → pemegang) dan `holder2special` (pemegang → kode). Keduanya satu kelompok kartu terkait menurut bagian 4.8. `holder2special` berstatus `locked` sampai interval `special2holder` entri yang sama mencapai minimal 7 hari. Entri dengan `needsReview` tetap tampil di Referensi tetapi tidak membentuk kartu sampai tinjauannya selesai.

**Aktivasi.** Jalur nonaktif secara bawaan dan diatur lewat `specialEnabled`. Pengaturan ini hanya menentukan materi baru. Kartu kode khusus yang sudah dipelajari tetap mengikuti jadwal dan tetap dihitung sebagai perlu diulang walaupun jalur dinonaktifkan, sama seperti prinsip Cakupan di bagian 2.4.

**Antrean terpisah.** Kartu kode khusus tidak pernah masuk antrean harian Golongan A, Tantangan Harian, Mode Kilat, tes penempatan, Latihan Terfokus, atau Bandingkan Kode. Kartu itu hanya muncul di sesi `practice_runs.kind = 'special'` dengan `context = 'special'`, atau `context = 'intro'` untuk Perkenalan. Urutan antreannya mengikuti bagian 4.7 langkah 1, 3, dan 4; langkah Bandingkan Kode tidak ada.

**Kuota sendiri.** Materi baru kode khusus dibatasi 5 kartu per `local_day` dan ditahan jika antrean langkah 1 dan 3 melebihi 25 kartu. Kuota dan ambang ini tidak mengikuti tingkat pengguna, tidak mengurangi kuota wilayah, dan tidak menahan materi baru wilayah. Perkiraan waktu aktifnya 5 × 35 + 25 × 5 = 300 detik, dihitung terpisah dari target 10 menit latihan rutin. Kelebihan kuota akibat dua perangkat offline mengikuti bagian 8.4 dengan batas 5.

**Urutan materi baru.** Pelat Terlihat tidak mencatat kode khusus, jadi urutannya mengikuti nomor kode CD dari kecil ke besar.

**Pilihan dan pengecoh.** Semua pilihan berasal dari entri CD `high`. `special2holder` memakai nama pemegang; `holder2special` memakai kode, misalnya CD 49. Tiga pengecoh dipilih dengan PRNG ber-seed `cardId` dan `reps`:

| Level | `special2holder`                                | `holder2special`                                                                                            |
| ----- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1     | Pilihan ganda; pengecoh acak dari entri CD lain | Pilihan ganda; satu pengecoh nomor bertetangga (n − 1 atau n + 1) jika ada, sisanya acak dari entri CD lain |
| 2     | Ketik tanpa batas waktu                         | Ketik tanpa batas waktu                                                                                     |
| 3     | Ketik; batas 8 detik sampai input pertama       | Ketik; batas 8 detik sampai input pertama                                                                   |

Pengecoh tidak boleh berupa jawaban sah dari soal itu, termasuk alias pemegang yang sama. Seri CD berisi 130 entri, jadi empat pilihan sah selalu dapat dibentuk.

**Yang tidak ditanyakan.** Nomor urut registrasi, nama duta besar atau pejabat perwakilan, dan warna pelat tidak menjadi soal, pilihan, atau jawaban. Referensi boleh menjelaskannya.

**Penguasaan.** Syarat `mature` sama dengan bagian 3.4. Persentase penguasaan kode khusus dihitung terpisah dan tidak masuk penguasaan wilayah di bagian 2.5 maupun Uji Penguasaan Kawasan.

**Perubahan data.** Entri yang hilang atau turun dari `high` menjadikan kartunya `suspended` menurut TRD 4.1. Pemegang baru untuk nomor yang sama selalu memakai `id` baru, sehingga riwayat pemegang lama tidak berpindah ke pemegang baru.

---

## 3. Tingkat Kesulitan

### 3.1 Tiga Tingkat

Tingkat kesulitan didefinisikan dari **cara pengguna mengeluarkan jawaban**: memilih, mengetik, atau mengetik di bawah batas waktu. Tidak ada tingkat yang memakai petunjuk parsial seperti huruf pertama, digit pertama, atau tipe pemegang. Petunjuk seperti itu tanggung: terlalu banyak membantu untuk menguji ingatan, tetapi tidak cukup untuk mengajarkan jawabannya. Jika pengguna belum ingat, jalan keluarnya pilihan ganda di Level 1 atau jawaban yang ditampilkan setelah menjawab, bukan setengah jawaban sebelum menjawab.

| Level | Nama   | Tuntutan                                                                                                         | Bentuk soal khas                                                   |
| ----- | ------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1     | Kenali | Jawaban ada di layar, tinggal dipilih                                                                            | Pilihan ganda, benar atau salah, mana yang bukan                   |
| 2     | Ingat  | Jawaban diketik tanpa pilihan dan tanpa batas waktu                                                              | Tebak daerah, Tebak kode                                           |
| 3     | Kuasai | Jawaban diketik dengan batas waktu input pertama, disebut sebanyak mungkin, atau harus membedakan dua item mirip | Tebak berwaktu, Sebutkan sebanyak mungkin, latihan Bandingkan Kode |

Pilihan dan pengecoh mengikuti mode serta sumber awal dan aturan perluasan di bagian 2.8; daerah → kode memakai pilihan kode. Di dalam sumber itu, pengecoh ikut berubah menurut level. Level 1 memakai daerah dari provinsi lain jika tersedia, jadi lebih mudah dieliminasi. Latihan Bandingkan Kode di Level 3 memakai daerah dari kode yang sering tertukar dengan kartu itu.

### 3.2 Penentuan Level Otomatis

Secara bawaan, level ditentukan per kartu; pengguna tidak wajib menaikkannya untuk mencapai penguasaan. Terapkan aturan menurut urutan berikut:

| Kondisi                                                                | Level otomatis                                       |
| ---------------------------------------------------------------------- | ---------------------------------------------------- |
| Perkenalan (`context = intro`)                                         | 1 — Kenali; tidak dinilai                            |
| Latihan Bandingkan Kode                                                | 3 — Kuasai                                           |
| Mode Kilat                                                             | 1 — Kenali; tidak mengubah jadwal                    |
| Tes penempatan                                                         | 2 — Ingat                                            |
| `setrecall`, di luar Perkenalan                                        | 3 — Kuasai, termasuk saat belajar awal/belajar ulang |
| Kartu lain `new` atau `learning`                                       | 1 — Kenali                                           |
| Kartu lain `review`, interval ≥ 21 hari, belum pernah benar di Level 3 | 3 — Kuasai sebagai uji penguasaan otomatis           |
| Kartu lain `review` atau `relearning`                                  | 2 — Ingat                                            |
| Kartu `mature`                                                         | 3 — Kuasai                                           |

`leech` adalah penanda di atas fase FSRS, bukan pengganti fase tersebut; penanda itu menambahkan konteks sesuai bagian 6.4. `locked` dan `suspended` tidak disajikan. Pengecualian bentuk soal karena pilihan tidak cukup mengikuti bagian 2.8.

Pada uji penguasaan otomatis, `code2region` meminta satu kab/kota tanpa bantuan; `region2code` meminta kode dari nama daerah lengkap tanpa bantuan. Soal jawaban tunggal tanpa bantuan Level 3 memakai batas 8 detik sampai input pertama. Jawaban benar berlaku hanya untuk `card_id` yang dijawab. Bentuk soal ini disebut **Tebak berwaktu**. Ia bukan kartu tersendiri: `code2region` dan `region2code` memakai bentuk ini setiap kali level otomatisnya 3, baik sebagai uji penguasaan maupun sebagai pengulangan kartu `mature`.

Keberhasilan Level 3 dicatat historis per kartu dari jawaban sah yang tidak dibatalkan, bukan Perkenalan, bukan `unverified`, bukan jawaban saat suspended, dan tanpa konteks leech yang membocorkan jawaban. Untuk `setrecall`, keberhasilan berarti mencapai ambang. Setelah pembaruan jadwal, kartu menjadi `mature` hanya jika interval hasilnya ≥ 21 hari dan syarat historis itu terpenuhi. Menjawab kartu terkait tidak meluluskan kartu lain.

Pemilihan level berbasis peluang ingat tetap pekerjaan Fase 3 tahap 2 di PRD bagian 11. Rilis pertama memakai pemetaan eksplisit ini.

### 3.3 Dampak Perubahan Level Secara Manual

Pengguna boleh mengganti level manual, tetapi konsekuensinya tidak simetris:

| Perubahan manual | Dampak                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Level dinaikkan  | Jawaban dapat memperbarui jadwal jika syarat mode, waktu pengulangan, dan kartu terkait terpenuhi |
| Level diturunkan | Jawaban tidak memperbarui D, S, atau interval; akurasi dan kode tertukar tetap dicatat            |

Aturan ini memakai prinsip yang sama dengan Latihan Terfokus di bagian 2.4. Tanpanya, pengguna bisa menurunkan level untuk mendapat hasil yang terlihat bagus, padahal kemampuan yang ingin diukur justru tidak diuji pada tuntutan yang semestinya.

Aturan biner ini sengaja sederhana: jawaban di level lebih rendah tidak dipakai memperbarui jadwal, walaupun sebenarnya tetap membawa sebagian informasi soal penguasaan kartu. Pendekatan yang lebih halus — misalnya bobot parsial — memerlukan data untuk mengukur seberapa besar tiap level menggeser peluang berhasil. Pendekatan itu dijadwalkan di PRD bagian 11, Fase 3 tahap 2.

Pengguna tetap boleh menurunkan level karena fiturnya berguna di kondisi tertentu, misalnya setelah lama tidak berlatih atau saat situasi tidak memungkinkan mengetik. Yang dibatasi bukan tindakan menurunkan level, melainkan pemakaian hasilnya sebagai bukti penguasaan penuh.

### 3.4 Syarat Status Dikuasai

Kartu hanya boleh mencapai status `mature` jika memenuhi keduanya: interval sudah 21 hari **dan** kartu pernah dijawab benar minimal sekali di Level 3.

Syarat kedua membuat Level 3 benar-benar memiliki konsekuensi. Tanpanya, "Kuasai" hanya label tampilan, dan kartu bisa dinyatakan dikuasai tanpa pernah diuji tanpa pilihan dan di bawah batas waktu. Aturan ini merambat ke tingkat di atasnya: definisi cakupan tuntas di bagian 2.5 dan Uji Penguasaan Kawasan otomatis memakai syarat yang sama.

**Jaminan ketersediaan.** Setiap kartu harus memiliki bentuk Level 3 yang sesuai dengan modenya. Kartu `code2region` dan `region2code` diuji lewat Tebak berwaktu, sedangkan `setrecall` memakai Level 3 setelah Perkenalan. Penguasaan kartu tidak bergantung pada munculnya pasangan tertukar atau keberhasilan kartu lain.

Kriteria penerimaan yang mengikat: untuk setiap kartu yang dapat dibuat dari `plates.json`, generator harus menyediakan bentuk Level 3 sah sesuai mode; khusus kartu `code2region`, bentuk itu tidak bergantung pada pasangan tertukar. Riwayat hanya menentukan kapan kartu dibuka dan level disajikan, bukan ketersediaan bentuk Level 3-nya. Ini dicek lewat tes otomatis saat build, bukan diasumsikan.

### 3.5 Level pada Mode Khusus

- **Perkenalan** — selalu Level 1, dan tidak dinilai (bagian 4.7).
- **Tantangan Harian** — campuran ketiga level, mengikuti status masing-masing kartu.
- **Mode Kilat** — selalu Level 1. Tujuannya melatih kecepatan, dan mengetik jawaban akan mengukur kecepatan jari, bukan kecepatan mengingat. Karena Level 1 biasanya di bawah level bawaan kebanyakan kartu, jawaban Mode Kilat tidak pernah memperbarui interval.
- **Latihan Bandingkan Kode** — selalu Level 3, tanpa memandang status kartu. Pasangan yang sering tertukar memang soal pembedaan, dan menyajikannya sebagai pilihan ganda mudah justru menghapus gunanya.
- **Sesi Kode Khusus** — level otomatis mengikuti bagian 3.2; bentuk tiap level mengikuti tabel di bagian 2.9.
- **Referensi / Pelat Terlihat** — bukan mode soal, tidak memiliki level atau nilai penjadwalan.

---

## 4. Aturan Jadwal dan Sesi

### 4.1 Algoritma Penjadwalan

Mesin penjadwalan memakai **FSRS-6** lewat ts-fsrs, dengan versi library dikunci persis.

FSRS-6 memiliki 21 parameter. Satu di antaranya mengatur bentuk kurva lupa — seberapa cepat R turun di awal dibanding belakangan — sehingga kurva bisa disetel ke pola pengguna, bukan dipatok satu bentuk untuk semua orang. Selama belum ada parameter hasil optimasi, yang dipakai parameter default FSRS-6.

FSRS dipakai sejak review pertama dengan parameter default, dan riwayat pribadi hanya dibutuhkan untuk penyetelan lanjutan lewat bagian 4.12. Penyetelan berjalan dari log lokal lengkap; pengguna yang login memiliki salinan server untuk memulihkan riwayat setelah data browser dibersihkan.

Versi library dikunci karena status kartu dihitung ulang dari log (TRD bagian 4.4). Dua perangkat dengan versi berbeda bisa menghasilkan jadwal berbeda dari riwayat yang sama.

### 4.2 Cara Kerja FSRS

FSRS memodelkan ingatan pada satu kartu dengan tiga besaran, disingkat DSR:

| Besaran                | Arti                                                           | Analogi                                                               |
| ---------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| **D — Difficulty**     | Tingkat kesulitan kartu bagi pengguna                          | Semakin tinggi D, semakin sulit kartu itu dipertahankan dalam ingatan |
| **S — Stability**      | Perkiraan berapa lama ingatan terhadap kartu tetap kuat        | Semakin tinggi S, semakin lebar jarak pengulangan yang bisa diambil   |
| **R — Retrievability** | Perkiraan peluang pengguna masih bisa mengingat kartu saat ini | Nilainya turun seiring waktu sejak pengulangan terakhir               |

R menyusut mengikuti kurva lupa: baru diulang R mendekati 1, semakin lama semakin turun, dan kecepatan turunnya ditentukan S. Kartu ber-S 60 hari kehilangan ingatan jauh lebih lambat daripada kartu ber-S 3 hari.

Setiap kali kartu dijawab, ketiganya diperbarui:

```
Jawaban benar  → S naik, R kembali mendekati 1
Jawaban salah  → S turun tajam, D naik
Jawaban benar saat R sudah rendah → S naik lebih banyak
```

Baris terakhir adalah prinsip utama sistem ini. Berhasil mengingat sesuatu saat ingatan sudah melemah memberi penguatan lebih besar daripada mengulang materi yang masih segar. Karena itu jadwal yang terlalu rapat bukan hanya membuang waktu, tetapi juga memberi penguatan lebih kecil per pengulangan.

### 4.3 Target Retensi

Dari model di atas, penjadwalan jadi satu hitungan sederhana: cari kapan R akan turun ke angka target, lalu jadwalkan pengulangan di hari itu.

Angka target itu disebut **target retensi**. Parameter inilah yang menyetel keseimbangan antara interval yang terlalu longgar dan terlalu ketat. Terka memakai **0,90**.

| Target retensi | Efek                                                         |
| -------------- | ------------------------------------------------------------ |
| 0,80           | Interval panjang, pengulangan sedikit, lebih sering lupa     |
| **0,90**       | Titik seimbang yang dipakai Terka                            |
| 0,95           | Interval pendek, hafalan ketat, beban pengulangan naik tajam |

Target 0,90 adalah pilihan rancangan Terka. Menaikkan target akan memperpendek jarak pengulangan dan menambah beban harian. Karena itu, perubahan target harus disertai perhitungan ulang durasi dalam bagian 4.7.

Karena D dan S dihitung per kartu, kartu yang sudah dikuasai dapat interval yang semakin panjang sampai berbulan-bulan, sementara kartu yang masih lemah tetap muncul tiap beberapa hari. Tingkat tantangan menyesuaikan sendiri, tanpa mekanisme tambahan.

### 4.4 Penilaian Otomatis

**Pengguna tidak memilih nilai penjadwalan.** Sistem menentukan salah satu dari empat nilai FSRS berdasarkan jawaban dan interaksi yang tercatat. Hasil benar atau salah diperiksa secara otomatis; waktu respons dan kelancaran membantu membedakan jawaban yang langsung diingat dari jawaban yang masih ragu.

**Sinyal saling melengkapi.** Dua jawaban dapat sama-sama benar dan dimulai pada waktu yang sama, tetapi berbeda dalam kelancaran mengetik, koreksi, atau jeda. Semua sinyal di bawah diambil dari kolom jawaban tanpa meminta tindakan tambahan.

**Sinyal per jawaban:**

| #   | Sinyal              | Cara ukur                                                                 | Yang ditangkap                                       |
| --- | ------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | Benar atau salah    | Hasil pemeriksaan bagian 5                                                | Ingat atau tidak                                     |
| 2   | Jenis kecocokan     | `exact`, `variant`, atau `typo` beserta biaya salah ketiknya (bagian 5.1) | Kemantapan bentuk tulisan                            |
| 3   | Latensi             | Milidetik sampai input pertama                                            | Seberapa cepat ingatan muncul                        |
| 4   | Kelancaran mengetik | Milidetik per karakter dari input pertama sampai Enter                    | Ragu di tengah jawaban                               |
| 5   | Jeda terpanjang     | Jeda terlama antarinput setelah input pertama                             | Berhenti untuk mengingat                             |
| 6   | Koreksi             | Jumlah karakter yang dihapus dibanding panjang jawaban akhir              | Salah mulai lalu diperbaiki                          |
| 7   | Ganti pilihan       | Berapa kali pilihan Level 1 berpindah sebelum dikunci                     | Ragu antar opsi                                      |
| 8   | Metode input        | `keyboard` atau `touch`                                                   | Keyboard layar jauh lebih lambat dari keyboard fisik |
| 9   | Gangguan            | Aplikasi tidak terlihat selama soal tampil, atau latensi di atas 60 detik | Waktu yang tidak mencerminkan ingatan                |

Ganti pilihan hanya terukur saat Level 1 dijawab dengan keyboard: angka 1–4 memilih, Enter mengunci. Klik atau ketuk langsung mengunci, jadi nilainya selalu 0.

**Kelompok pembanding.** Persentil selalu dihitung terhadap jawaban benar pengguna sendiri dalam kelompok yang sebanding: `level × bentuk jawaban × metode input`. Ada tiga kelompok bentuk jawaban: pilihan, kode, dan nama daerah. Setiap kelompok memakai rentang bergerak 200 jawaban benar terakhir. Jika kelompok belum memiliki 30 jawaban, sistem memakai kelompok yang lebih lebar, `level × metode input`. Jika kelompok lebar juga belum 30, komponen berbasis persentil bernilai 0.

Metode input masuk kelompok karena tanpa pemisahan itu, setiap jawaban yang diketik di ponsel akan terlihat ragu dibanding jawaban dari laptop, dan kartu yang sering dijawab di ponsel dijadwalkan terlalu rapat.

**Skor kelancaran.** Jawaban benar diberi skor dari komponen berikut:

| Komponen            | Kondisi                                                  | Poin |
| ------------------- | -------------------------------------------------------- | ---- |
| Latensi             | Lebih cepat dari P20 kelompok                            | +2   |
| Latensi             | Antara P20 dan P80, termasuk tepat di P20 atau P80       | 0    |
| Latensi             | Lebih lambat dari P80                                    | −2   |
| Kelancaran mengetik | Milidetik per karakter lebih lambat dari P80 kelompok    | −1   |
| Jeda terpanjang     | Lebih lama dari P90 kelompok **dan** lebih dari 1.200 ms | −1   |
| Koreksi             | Karakter yang dihapus ≥ 30% panjang jawaban akhir        | −1   |
| Kecocokan           | `typo`                                                   | −1   |
| Kecocokan           | `exact` atau `variant`                                   | 0    |
| Ganti pilihan       | Minimal satu kali                                        | −1   |

Syarat 1.200 ms pada jeda terpanjang mencegah penalti untuk jeda yang pendek tetapi kebetulan di atas P90 pengguna yang sangat cepat.

**Pemetaan ke nilai penjadwalan jawaban tunggal:**

| Kondisi                 | Nilai penjadwalan                             |
| ----------------------- | --------------------------------------------- |
| Salah, atau waktu habis | 1 — Lagi                                      |
| Benar, ada gangguan     | 3 — Bagus, dan tidak masuk hitungan persentil |
| Benar, skor ≥ 2         | 4 — Mudah                                     |
| Benar, skor 0 atau 1    | 3 — Bagus                                     |
| Benar, skor ≤ −1        | 2 — Sulit                                     |

Akibatnya, Mudah hanya untuk jawaban yang cepat **dan** bersih: latensi di bawah P20 tanpa satu penalti pun. Jawaban lambat langsung Sulit.

**Salah ketik hanya mengurangi satu poin.** Jawaban cepat dengan satu salah ketik tetap Bagus, karena salah ketik ringan lebih sering kesalahan jari daripada tanda ingatan yang goyah. Variasi penulisan yang umum, seperti "Bukit Tinggi", tidak mengurangi poin sama sekali.

**Tahap awal.** Selama komponen persentil masih netral, nilai penjadwalan hanya bisa 3 atau 2: skor 0 dikurangi penalti absolut (koreksi, kecocokan, ganti pilihan). Nilai penjadwalan 4 baru mungkin setelah kelompok memiliki data.

**Ketukan pertama.** Yang dihitung input karakter pertama di kolom jawaban, termasuk tempel (paste). Tombol modifier seperti Shift atau Cmd, tombol panah, dan Backspace di kolom kosong tidak dihitung. Untuk Level 1, waktu sampai pilihan diklik atau dipilih dengan angka dipakai sebagai latensi.

**Batas waktu.** Soal jawaban tunggal tanpa bantuan Level 3 (termasuk Tebak berwaktu dan uji penguasaan otomatis) memakai batas 8 detik untuk input pertama, bukan Enter. Pengguna yang mulai di detik 7,9 boleh menyelesaikan jawaban panjang. Benar/salah kilat berbatas 5 detik sampai jawaban dikunci, di sesi harian maupun Mode Kilat. Mode Kilat juga memiliki batas putaran 60 detik; tes penempatan berbatas 15 detik sampai input pertama. `setrecall` dan bentuk lainnya tidak memakai batas waktu soal. Jika dua batas berlaku, batas yang lebih awal mengakhiri soal; putaran Kilat tidak menunggu soal selesai.

**Yang tidak masuk persentil:** Perkenalan termasuk intro_read, jawaban himpunan, unverified, jawaban tes penempatan, jawaban dengan gangguan, jawaban yang dibatalkan lewat undo, dan jawaban di level manual yang lebih rendah dari level bawaan.

**Mengapa peluang ingat tidak dipakai sebagai sinyal.** FSRS sudah memprediksi R sebelum kartu dijawab. Jika prediksi itu ikut menentukan nilai penjadwalan, model menilai dirinya sendiri dan kesalahan prediksinya tidak pernah terkoreksi. Nilai penjadwalan hanya dibentuk dari yang teramati.

**Status bobot.** Poin dan ambang di atas titik awal heuristik, bukan hasil penelitian. Semua sinyal disimpan mentah (bagian 4.5), aturan ini diberi nomor `GRADE_RULES_VERSION`, dan Fase 3 tahap 3 memilih bobot yang memberi akurasi prediksi FSRS terbaik pada data sendiri. Mengubah bobot menaikkan `ENGINE_VERSION`, dan seluruh riwayat dihitung ulang dengan bobot baru.

**Privasi.** Yang direkam hanya jeda waktu antarinput dan jumlah karakter yang dihapus, bukan tombol apa yang ditekan.

### 4.5 Penyimpanan Data Jawaban

Setiap jawaban menyimpan datanya sendiri, bukan hasil pemetaannya:

```
{ "id": "3f2c…", "contentId": "bk", "mode": "code2region", "context": "daily",
  "level": 2, "levelSource": "auto", "rawAnswer": "binjay",
  "correct": true, "matchType": "variant", "typoCost": 0,
  "acceptedAreaId": "kota-binjai", "msToFirstKey": 1840,
  "msTyping": 1210, "keyGapsMs": [180, 160, 220, 140, 510],
  "deletedChars": 0, "optionChanges": 0, "inputMode": "keyboard",
  "interrupted": false, "clientTs": "…", "localDay": "2026-09-21" }
```

Benar/salah dan jenis kecocokan dibekukan saat menjawab, karena pengguna sudah melihat hasilnya dan hasil itu tidak boleh berubah diam-diam. Jawaban yang tidak dinilai — `unverified` dan `intro_read` — menyimpan `correct` kosong (null), bukan `false`, supaya tidak pernah terhitung salah. Identitas kartu (`cardId`) dibentuk dari `contentId` dan `mode`. Yang dihitung ulang dari data di atas hanya nilai penjadwalan.

Daftar kolom lengkapnya ada di TRD bagian 4.2, tabel `review_logs`. Nilai penjadwalan dihitung dari catatan itu setiap kali dibutuhkan, dan tidak disimpan sebagai data acuan di perangkat maupun di Supabase. Jawaban himpunan menyimpan seluruh `set_items` dan memakai pemetaan khusus bagian 5.2.

Pemetaan waktu respons ke nilai penjadwalan adalah aturan awal yang perlu diuji. Penyimpanan data mentah memungkinkan bobot dan ambang diperbaiki tanpa kehilangan informasi dari jawaban lama. Hasil benar atau salah yang sudah ditampilkan tetap dipertahankan; yang dihitung ulang adalah dampaknya pada jadwal.

Prinsip ini berlaku untuk seluruh keadaan aplikasi: status kartu, pasangan tertukar, dan persentil juga tidak disimpan sebagai data acuan, melainkan dihitung ulang dari log (bagian 8.1).

Konsekuensinya untuk optimasi parameter (bagian 4.12): parameter default FSRS dikalibrasi pada data berisi penilaian manusia, sedangkan sebaran nilai penjadwalan Terka dihasilkan mesin dan hampir pasti beda bentuknya. Selisih itu tertutup begitu parameter disetel ke data sendiri.

### 4.6 Jarak Pengulangan dan Tahap Belajar

**Tahap belajar.** Satu langkah di dalam sesi, lalu FSRS; kartu tidak pernah jatuh tempo lagi pada hari yang sama. Setelah Perkenalan, kartu langsung waktunya dikerjakan (`due` = saat Perkenalan) dan ditanyakan sekali lagi di sesi yang sama, setelah 4 soal lain, atau di akhir sesi jika sisa soalnya kurang dari itu. Satu jawaban bernilai pada kartu `learning` atau `relearning`, benar atau salah, menyelesaikan langkah: kartu menjadi `review` dengan `due` tidak lebih awal dari awal hari lokal berikutnya, lalu jadwal mengikuti FSRS. Jika kartu `review` atau `mature` dijawab salah, kartu masuk `relearning`, langsung waktunya dikerjakan, dan ditanyakan sekali lagi di akhir sesi yang sama. Soal ulang ini berlaku di sesi harian, Latihan Terfokus, Sebutkan sebanyak mungkin, dan sesi kode khusus; Tantangan Harian, Mode Kilat, dan tes penempatan tidak menjadwalkan, jadi tidak menyisipkan soal ulang. Jika sesi ditinggalkan sebelum soal ulang dijawab, kartunya tetap waktunya dikerjakan dan muncul di sesi berikutnya — satu-satunya keadaan ketika soal muncul lagi di hari yang sama. Jawaban yang dibatalkan lewat undo ikut membatalkan soal ulang yang disisipkannya. Langkah yang terlambat dikerjakan tetap dinilai sebagai langkah belajar, bukan pengulangan biasa.

**Fuzz dengan pemerataan jadwal.** Untuk interval hasil hitungan minimal 3 hari, sistem menyusun rentang kandidat ±5% dari interval itu, dibulatkan ke hari. Dari rentang itu dipilih hari dengan jumlah kartu yang dijadwalkan untuk diulang paling sedikit. Jika beberapa hari seri, pemilihnya PRNG yang di-seed dari `id` jawaban. Interval di bawah 3 hari tidak digeser.

Rentang geser dipakai untuk mengisi hari yang lebih sepi lebih dulu, jadi beban harian lebih rata tanpa mengubah interval rata-rata. Seed dari `id` membuat replay di perangkat mana pun menghasilkan tanggal yang sama. Jumlah kartu yang perlu diulang per hari kandidat dihitung dari keadaan aplikasi pada saat jawaban itu diterapkan dalam replay, bukan dari keadaan aplikasi saat ini.

**Implementasi:** pakai ts-fsrs, bukan menulis ulang algoritmanya. Membuat scheduler sendiri padahal rumus dan implementasi teruji sudah tersedia hanya memperbesar peluang kesalahan program tanpa imbalan setara.

### 4.7 Urutan Soal Harian

1. Langkah belajar awal dan belajar ulang yang sudah waktunya dikerjakan.
2. Latihan Bandingkan Kode untuk pasangan aktif.
3. Pengulangan dari seluruh wilayah, dimulai dari peluang ingat terendah dan mengikuti aturan kartu terkait.
4. Perkenalan materi baru dalam Cakupan, selama kuota masih tersedia.

Hanya Golongan A masuk antrean harian. Sesi `setrecall` berjalan terpisah. Jika jumlah kartu pada prioritas 1–3 melebihi ambang penahanan, materi baru tidak ditambahkan hari itu.

**Batas pengulangan harian.** Prioritas 3 paling banyak berisi 30 soal per `local_day`, dikurangi pengulangan yang sudah dijawab hari itu. Yang dihitung adalah jawaban yang memperbarui memori FSRS pada kartu `code2region` atau `region2code` berstatus `review` atau `mature`, dari sesi mana pun (harian, Cek Ingatan, latihan terfokus). Langkah belajar, soal ulang di dalam sesi, Bandingkan Kode, `setrecall`, dan kode khusus tidak dihitung; kode khusus tetap memakai ambang penahanannya sendiri. Sisa pengulangan bergeser ke hari berikutnya tanpa pemberitahuan, tetap diurutkan dari peluang ingat terendah. Batas ini hanya memotong antrean harian; latihan terfokus yang dimulai pengguna tidak pernah diblokir. Ambang penahanan materi baru tetap dihitung dari seluruh tunggakan, jadi selama tunggakan besar materi baru tetap dijeda.

**Mengapa peluang ingat, bukan interval.** Interval terpendek adalah proksi yang lemah. Kartu berinterval 3 hari yang terlambat sehari dan kartu berinterval 30 hari yang terlambat 20 hari sama-sama waktunya diulang. Tetapi peluang ingat kartu kedua jauh lebih kecil. R menggabungkan interval dan keterlambatan jadi satu angka. Jika tidak ada pengulangan tertunda, urutan ini hampir tidak berpengaruh. Bedanya terasa setelah beberapa hari tidak berlatih: jika sesi dihentikan sebelum antrean habis, kartu yang tertinggal adalah kartu yang masih paling kuat.

**Perkenalan.** Materi baru tidak langsung dinilai. Jika empat pilihan sah tidak dapat dibentuk, gunakan intro_read sesuai 2.8; menutup soal informasi itu memulai belajar awal tanpa tebakan. Tayangan pertamanya berupa soal Level 1 berlabel **Tebak dulu**. Apa pun jawabannya, sistem langsung menampilkan jawaban yang benar beserta daftar kab/kota kode itu. Tebakan ini dicatat dengan `context: intro`, tetapi tidak menghasilkan nilai penjadwalan, tidak masuk persentil, dan tidak dicatat sebagai pasangan tertukar. Kartu lalu jadi `learning`, dan nilai penjadwalan FSRS pertama datang dari langkah belajar di dalam sesi.

Dua alasan di balik aturan ini:

1. Tebakan pada kartu yang belum pernah dilihat tidak mengukur ingatan. Jika tebakan pertama dinilai, tebakan beruntung pada pilihan ganda empat opsi — peluangnya 25% — langsung memberi nilai penjadwalan Bagus dan menaikkan S awal kartu yang sebenarnya belum dikenal.
2. Mencoba menjawab sebelum diberi tahu, lalu segera melihat jawaban yang benar, membantu mengingat lebih baik daripada hanya membaca materinya (pretesting effect; Kornell, Hays & Bjork, 2009). Tebakan yang salah pun berguna, asalkan umpan baliknya langsung.

Perkenalan memakai kuota materi baru. Undo pada Perkenalan mengembalikan kartu ke `new` dan mengembalikan kuotanya.

**Batas per tingkat.** Batas materi baru harian dan ambang penahanan mengikuti tingkat hasil tes penempatan (bagian 4.13). Pengguna yang melewati tes memakai batas Menengah.

Satu materi baru Golongan A diperkirakan memerlukan tiga interaksi: Perkenalan sekitar 15 detik, lalu satu langkah belajar sekitar 10 detik. Total waktu aktifnya sekitar 25 detik, tersebar dalam satu atau beberapa sesi. Waktu menunggu pengulangan tidak dihitung. Untuk perhitungan beban harian, satu pengulangan biasa diperkirakan 5 detik. Pratinjau sesi memakai perhitungan yang lebih rinci dalam bagian 4.14.

| Tingkat  | Materi baru per hari | Ambang penahanan | Perkiraan waktu aktif                    |
| -------- | -------------------- | ---------------- | ---------------------------------------- |
| Pemula   | 8                    | 40               | 8 × 25 + 40 × 5 = 400 detik ≈ 6,7 menit  |
| Menengah | 10                   | 40               | 10 × 25 + 40 × 5 = 450 detik ≈ 7,5 menit |
| Mahir    | 12                   | 32               | 12 × 25 + 32 × 5 = 460 detik ≈ 7,7 menit |
| Ahli     | 13                   | 28               | 13 × 25 + 28 × 5 = 465 detik ≈ 7,8 menit |

Tabel tersebut menempatkan perkiraan waktu aktif setiap tingkat di bawah 10 menit per hari. Angka ini merupakan target untuk pola belajar yang stabil, bukan batas yang menghentikan sesi. Jawaban yang lebih lambat, belajar ulang, dan pengulangan tertunda dapat menambah durasi. Sesi Sebutkan sebanyak mungkin dihitung terpisah. Tingkat yang lebih tinggi memperoleh kuota materi baru lebih besar dengan ambang penahanan lebih rendah, sehingga materi baru lebih cepat dijeda saat pengulangan menumpuk.

Tingkat awal diambil dari sesi tes penempatan terbaru yang selesai. Setelah itu tingkat diperbarui otomatis dari performa nyata (bagian 4.16). Jika batas, ambang, atau tahap belajar diubah, hitungan ini wajib diulang.

Aturan penahanan menjaga beban tetap terkendali dalam jangka panjang. Tanpanya, materi baru terus bertambah sementara pengulangan yang tertunda menumpuk, sesi harian naik dari sekitar 10 menit jadi puluhan menit, dan aplikasinya berhenti jadi kebiasaan. Ambang dihitung tepat: antrean sebanyak ambang masih mengizinkan materi baru, satu kartu lebih banyak menahannya.

**Cek Ingatan setelah libur.** Jika hari aktif terakhir paling lambat 7 hari sebelum hari ini dan pengulangan Golongan A yang jatuh tempo (sebelum dibatasi) lebih dari 30, Beranda menawarkan Cek Ingatan sekali untuk periode libur itu; tawaran hilang begitu ada jawaban hari ini. Isinya 20 soal dari kartu Golongan A yang sudah jatuh tempo, dibagi bergiliran ke setiap kawasan yang punya kartu jatuh tempo, mulai dari peluang ingat terendah dan mengikuti aturan kartu terkait; kawasan yang kartunya habis memberikan sisa jatahnya ke kawasan lain. Jawabannya memakai `practice_runs.kind = 'recheck'` dan `context = recheck`, dinilai sebagai pengulangan biasa, dan ikut dihitung dalam batas pengulangan harian. Layar hasil menampilkan, per kawasan, persentase jawaban benar di samping perkiraan peluang ingat sebelum tes (rata-rata R kartu yang diuji saat tes dimulai). Kartu yang tidak diuji tetap memakai jadwal FSRS-nya. Hasil tes hanya mengubah urutan: selama pengulangan jatuh tempo melebihi batas harian, kawasan dengan skor terendah didahulukan, lalu peluang ingat terendah; kawasan tanpa skor menyusul.

### 4.8 Kartu yang Saling Berkaitan

**Kartu terkait** adalah kartu yang menguji fakta yang sama dari arah atau bentuk berbeda, sehingga menjawab satu kartu bisa membocorkan jawaban kartu lain. Kelompoknya:

- Kartu tingkat kode dari satu kode: `code2region`, `region2code`, `setrecall`.
- Kartu dari satu entri kode khusus: `special2holder` dan `holder2special` (bagian 2.9).

**Syarat membuka.** Dua jenis kartu baru dibuat setelah kartu `code2region` kode yang sama cukup stabil:

| Kartu            | Syarat                                                                               | Rujukan                    |
| ---------------- | ------------------------------------------------------------------------------------ | -------------------------- |
| `region2code`    | Interval `code2region` minimal 7 hari                                                | Bagian 4.8                 |
| `setrecall`      | Interval `code2region` minimal 14 hari, dan kode memiliki minimal 3 kab/kota anggota | PRD bagian 6.3, bagian 5.2 |
| `holder2special` | Interval `special2holder` entri yang sama minimal 7 hari                             | Bagian 2.9                 |

Sebelum syaratnya terpenuhi, kartu berstatus `locked`. Setelah terbuka, kartu tidak dikunci lagi walaupun interval `code2region` kemudian turun karena lapse. Mengunci ulang kartu yang sudah memiliki riwayat hanya menyembunyikan jadwal yang sedang berjalan.

Kartu terkait dari kode yang pernah diperkenalkan boleh diperkenalkan walaupun Cakupan aktif sudah pindah ke kawasan lain. Kodenya bukan wilayah baru lagi, jadi kartu itu tidak melanggar prinsip Cakupan; kartunya tetap memakai kuota materi baru harian.

**Satu kelompok kartu terkait, satu jawaban terjadwal per hari.** Dalam satu `local_day`, paling banyak satu jawaban per kelompok kartu terkait yang boleh memperbarui jadwal, di luar langkah belajar awal dan belajar ulang. Sesi harian menyusun antrean supaya aturan ini terpenuhi: jika beberapa kartu terkait waktunya diulang di hari yang sama, yang disajikan kartu dengan R terendah, dan sisanya dilewati hari itu tanpa mengubah `due`-nya. Di mode lain — Latihan Terfokus, latihan Bandingkan Kode, sesi himpunan — jawaban kedua dari kelompok yang sama tetap dicatat, tetapi tidak dihitung untuk jadwal. Aturan yang sama berlaku untuk Perkenalan: paling banyak satu materi baru per kelompok kartu terkait per hari.

**Batas pelewatan.** Kartu yang sudah dilewati dua `local_day` berturut-turut karena aturan ini didahulukan di hari ketiga, mengalahkan kartu terkait lainnya meski R-nya lebih tinggi. Tanpa batas ini, kelompok dengan banyak kartu bisa terus menunda kartu yang sama.

**Alasan.** Menjawab `DK → Bali` lalu `Bali → DK` beberapa menit kemudian menguji ingatan jangka pendek, bukan kekuatan hafalan. Jawaban kedua hampir pasti benar dan cepat, nilai penjadwalan-nya jadi Mudah, dan interval kartu kedua bertambah panjang tanpa dasar. Anki memakai mekanisme serupa (kartu terkait burying) untuk alasan yang sama.

### 4.9 Batas Hari dan Zona Waktu

Tiga hal bergantung pada batas hari — kuota kartu baru, jadwal pengulangan, dan hitungan hari aktif berturut-turut — jadi batas itu harus ditetapkan eksplisit.

- Pergantian hari jatuh pada **pukul 00.00 waktu lokal perangkat**, bukan UTC. Hari belajar sama dengan tanggal kalender perangkat: latihan pukul 01.00 dihitung sebagai hari baru dan memakai kuota kartu baru hari itu.
- Zona waktu diambil dari perangkat. Untuk pengguna di WITA, batas harinya 00.00 WITA.
- Pindah zona waktu tidak pernah memajukan jadwal pengulangan. Jika zona berubah dan batas hari jadi terlewat lebih cepat, sistem memakai yang lebih lambat di antara keduanya, supaya bepergian tidak menghasilkan dua kuota kartu baru dalam satu hari nyata.

- `local_day` dan `tz` dicatat di setiap event saat kejadian dan tidak pernah dihitung ulang (TRD bagian 4.2). Jika dua perangkat berada di zona waktu berbeda, tiap event memakai hari lokal perangkatnya sendiri.
- Aturan "pakai yang lebih lambat" saat pindah zona waktu dijalankan per perangkat, dengan membandingkan batas hari baru terhadap `local_day` terakhir yang tercatat dari perangkat itu.
- Zona waktu yang memakai daylight saving tetap memiliki satu batas per hari. Jika perpindahan jam melompati pukul 00.00, hari dimulai pada saat pertama yang ada di tanggal itu, yaitu tepat setelah lompatan.

### 4.10 Pembatalan Jawaban

Nilai penjadwalan otomatis menghapus risiko salah tekan tombol penilaian, tetapi menyisakan risiko lain: pengguna bisa menekan Enter sebelum jawabannya selesai diketik. Dalam alur cepat, kesalahan seperti ini mudah terjadi dan bisa mencatat jawaban benar sebagai salah.

Aturannya:

- **Jawaban terakhir di perangkat ini** selalu bisa dibatalkan lewat tombol Z di keyboard atau tombol **Batalkan jawaban** di bawah hasil jawaban, sampai jawaban berikutnya masuk di perangkat yang sama atau layar soal ditutup.
- Pembatalan menyisipkan event `review_voids`, bukan menghapus jawaban. Replay melewati jawaban yang dibatalkan, sehingga `stability`, `difficulty`, `interval`, `due`, `reps`, dan `lapses` kembali persis seperti sebelum jawaban itu. Kuota materi baru, persentil, pasangan tertukar, dan status leech yang dipicu jawaban itu ikut kembali.
- Menekan Z atau tombol batal kedua kali tidak membatalkan jawaban sebelumnya; tombol batal hilang setelah dipakai. Undo hanya untuk satu jawaban terakhir.
- Jawaban dari perangkat lain tidak bisa dibatalkan, karena pengguna tidak sedang melihatnya.
- Undo tidak tersedia di Mode Kilat. Mode itu tidak mengubah jadwal, dan undo di tengah hitungan 60 detik hanya mengacaukan skor.
- Enter di kolom jawaban yang masih kosong diabaikan, bukan dikirim sebagai jawaban kosong. Ini menutup penyebab paling umum dari Enter yang tertekan terlalu cepat.

Karena keadaan aplikasi dihitung dari log, undo tidak memerlukan salinan keadaan aplikasi sebelumnya.

### 4.11 Pengaruh Mode Khusus terhadap Jadwal

Ditulis eksplisit supaya satu kartu tidak pernah dinilai dua kali dalam sehari:

| Mode                           | Sumber kartu                                     | Memperbarui jadwal?                                                                                                |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Sesi harian                    | Antrean Golongan A bagian 4.7                    | Ya                                                                                                                 |
| Sesi Sebutkan sebanyak mungkin | Kartu `setrecall` yang terbuka; antrean terpisah | Hanya jika kartu sudah perlu diulang, termasuk belajar awal; tunduk aturan kartu terkait. Perkenalan tidak dinilai |
| Perkenalan                     | Materi baru                                      | Tidak dinilai; memindahkan kartu dari `new` ke `learning`                                                          |
| Latihan Bandingkan Kode        | Pasangan yang sering tertukar                    | Hanya jika kartu sasarannya sudah waktunya diulang                                                                 |
| Tantangan Harian               | Kartu yang sudah pernah dipelajari               | Tidak                                                                                                              |
| Mode Kilat                     | Kartu yang sudah pernah dipelajari               | Tidak                                                                                                              |
| Latihan Terfokus               | Satu wilayah yang dipilih                        | Hanya jika kartunya sudah waktunya diulang                                                                         |
| Sesi Kode Khusus               | Kartu `special2holder` dan `holder2special`      | Ya, dengan kuota dan ambang penahanan sendiri (bagian 2.9). Perkenalan tidak dinilai                               |
| Referensi / Pelat Terlihat     | Pencarian konten, bukan kartu latihan            | Tidak pernah; tidak membuat jawaban                                                                                |

Aturan intinya: dalam satu `local_day`, jadwal satu kartu hanya boleh diperbarui satu jawaban, di luar langkah belajar awal dan belajar ulang. Langkah-langkah itu memang terjadi beberapa kali dalam sehari sebagai bagian dari memperkenalkan dan memulihkan kartu, bukan penilaian ulang. Begitu satu jawaban dihitung untuk jadwal, jadwal berikutnya belum tiba, sehingga jawaban berikutnya di mode lain pada hari yang sama otomatis tidak dihitung.

Tantangan Harian dan Mode Kilat tidak memperbarui jadwal karena keduanya bisa menarik kartu yang belum waktunya diulang. Jika hasilnya ikut mengubah jadwal, satu kartu bisa dinilai dua kali dalam sehari dengan hasil berbeda, dan hasil akhirnya bergantung pada urutan penilaian.

Semua mode tetap mencatat akurasi dan pasangan yang sering tertukar, kecuali Perkenalan; pengecualian kartu `new`, data `unverified`, dan sesi tes yang diabaikan mengikuti aturan khususnya. Yang dicabut hanya wewenangnya atas jadwal.

**Referensi tidak menilai jawaban.** Hasil pencarian langsung ditampilkan, baik materinya belum dipelajari, sudah perlu diulang, maupun masih menunggu jadwal. Pencarian tidak membuat `review_logs`, mengubah jadwal atau kelulusan level, memakai kuota, menambah pasangan tertukar, atau menutup kesempatan mengulang tes penempatan. Label **Tebak dulu** hanya digunakan dalam Perkenalan.

**Pencarian dan pencatatan Pelat Terlihat.** Catat hanya pencarian kode depan wilayah yang valid. Pencarian nama daerah dan kode khusus RI/CD/CC/CH tidak membuat catatan. Kode `medium` atau `low` tetap boleh dicatat sebagai frekuensi pencarian, dengan label kepercayaan yang terlihat. Jika input berisi pelat lengkap, ambil kode depannya lalu buang bagian lain sebelum penyimpanan apa pun. Pada perangkat yang sama, kode yang sama tidak dicatat lagi dalam waktu kurang dari 10 menit sejak catatan terakhir. Tepat 10 menit sudah boleh dicatat kembali. Pencarian yang diabaikan tidak memperpanjang rentang ini, dan catatan antarperangkat tidak digabung sebagai duplikat. Prioritas materi baru memakai jumlah catatan dalam 90 hari terakhir, per kode depan.

### 4.12 Optimasi Parameter

Optimasi berjalan otomatis begitu syarat datanya terpenuhi, dengan pengaman berikut.

**Syarat pertama kali.** Minimal 1.000 jawaban yang dihitung untuk jadwal dan minimal 200 kartu berbeda. Yang tidak dihitung: tebakan Perkenalan, jawaban yang dibatalkan, dan jawaban yang tidak memperbarui jadwal.

**Jadwal ulang.** Setelah optimasi pertama, optimasi berikutnya berjalan jika sudah ada tambahan 500 jawaban yang dihitung **dan** sudah lewat 30 hari sejak optimasi terakhir. Keduanya wajib; mana yang terpenuhi belakangan menentukan waktunya.

**Tempat berjalan.** Web Worker di perangkat mana pun, saat aplikasi tidak sedang menampilkan soal. Satu perangkat hanya menjalankan satu optimasi dalam satu waktu.

**Evaluasi.** Data dibagi menurut waktu: parameter dilatih dengan 80% data yang lebih lama, lalu diuji pada 20% data yang paling baru. Parameter yang sedang dipakai diuji pada potongan data yang sama. Parameter baru diterima jika keduanya terpenuhi:

1. Log loss turun minimal 1% relatif dibanding parameter yang sedang dipakai.
2. RMSE tidak lebih buruk.

Penurunan tepat 1% sudah diterima. Ambang 1% mencegah parameter berganti-ganti karena selisih yang hanya noise. Angka 80/20 dan 1% adalah titik awal, bukan hasil penelitian.

**Aktivasi.** Parameter yang diterima disimpan sebagai baris active dengan activated_at (TRD 4.2) dan berlaku untuk jawaban pada atau setelah waktu aktivasi efektif menurut TRD 4.4. Jadwal yang sudah terbentuk tidak dihitung ulang: kartu yang sudah memiliki `due` tetap, dan perubahan baru terasa mulai jawaban berikutnya di tiap kartu. Hasil yang ditolak juga disimpan, sebagai baris `rejected`, supaya riwayat keputusan bisa diperiksa.

**Rollback otomatis.** Setelah parameter baru aktif dan sudah ada minimal 300 jawaban yang dihitung sesudahnya, sistem membandingkan retensi aktual dengan target retensi 0,90. Retensi aktual adalah proporsi jawaban benar di antara 300 jawaban terhitung pertama sesudah aktivasi, hanya pada kartu yang sudah berstatus `review` atau `mature` sebelum dijawab. Jika selisihnya lebih dari 5 poin, sistem menyisipkan baris `active` baru yang menyalin parameter sebelumnya; selisih tepat 5 poin belum memicu rollback. Keputusan ini diambil sekali per aktivasi, dari 300 jawaban yang sama. Baris rollback mencatat metrik parameter yang dipulihkan sebagai metrik baru dan metrik parameter yang digantikan sebagai pembanding, sehingga baris itu sendiri tidak pernah dikembalikan lagi. Ambang 5 poin sengaja lebih longgar dari KPI ±3 poin di PRD bagian 9: KPI itu sinyal untuk diperiksa, sedangkan rollback otomatis hanya untuk parameter yang jelas meleset.

**Identitas data optimasi.** `training_set_hash` — hash dari seluruh ID jawaban terhitung yang dipakai, termasuk jawaban lokal anonim — menjadi identitas dataset di semua perangkat. Daftar ID lengkapnya (`training_event_ids`) hanya disimpan di perangkat yang menjalankan optimasi dan ikut ekspor, karena ukurannya tumbuh bersama riwayat (TRD bagian 4.2). `trained_through_seq` hanya metadata server opsional; ketiadaannya tidak menghalangi optimasi. Aktivasi yang waktunya sama dipecahkan dengan `device_id`, lalu `id`, secara leksikografis. Rollback menyalin bobot baseline dan identitas data keputusan rollback, bukan menimpa riwayat.

**Satu set global.** Seperti di PRD bagian 11, parameter dioptimalkan sebagai satu set untuk seluruh kartu. Parameter baru dipisah per jenis kartu jika datanya membuktikan perlu.

**Tahap belajar.** Setiap optimasi baru juga menghitung usulan tahap belajar dan belajar ulang dari riwayat yang sama, lalu menyimpannya di perangkat. Usulan itu tidak diterapkan otomatis, karena mengubah perhitungan durasi di bagian 4.7. Usulannya hanya ditampilkan di layar diagnostik untuk diputuskan manual; kegagalan menghitungnya tidak membatalkan keputusan optimasi.

### 4.13 Tes Penempatan

Tes penempatan mengukur kode mana yang sudah dikenal sebelum sesi pertama. Tanpa tes ini, pengguna yang sudah hafal puluhan kode tetap harus melewati Perkenalan satu per satu, sekitar 10 per hari — hampir seminggu hanya untuk mengulang yang sudah diketahui.

**Kapan tersedia.** Ditawarkan saat aplikasi pertama kali dibuka, sebelum sesi pertama. Bisa dilewati. Bisa diambil atau diulang selama belum ada jawaban yang dihitung untuk jadwal di luar tes, dari mode mana pun. Membuka pratinjau, memulai sesi tanpa menjawab, dan Perkenalan saja belum menutup kesempatan. Undo yang menghapus satu-satunya jawaban terhitung membukanya kembali. Setelah itu riwayat nyata lebih informatif daripada tes mana pun, jadi tawarannya hilang.

**Bentuk soal.** Kode → daerah, diketik, Level 2, tanpa pilihan ganda. Ada tombol **Tidak tahu** supaya pengguna tidak menebak. Tidak ada umpan balik per soal. Batas waktu 15 detik untuk ketukan pertama; lewat batas itu dihitung Tidak tahu.

**Tiga tahap adaptif.** Kode di tiap tahap diambil dari properti `placementTier` di `plates.json`:

| Tahap        | Kode                                                                 | Jumlah soal | Lanjut ke tahap berikutnya jika |
| ------------ | -------------------------------------------------------------------- | ----------- | ------------------------------- |
| 1 — Umum     | `common`, kode yang paling sering terlihat                           | 8           | Minimal 3 benar                 |
| 2 — Menengah | `medium`, minimal satu dari tiap kawasan yang memiliki kode `medium` | 10          | Minimal 6 benar                 |
| 3 — Lanjut   | `rare`                                                               | 10          | —                               |

Tes berisi paling banyak 28 soal, dengan perkiraan durasi 3 menit. Pemilihan kode memakai bilangan acak deterministik dengan `id` sesi sebagai seed agar hasilnya dapat diuji ulang.

**Klasifikasi:**

| Hasil                                             | Tingkat  |
| ------------------------------------------------- | -------- |
| Berhenti di tahap 1                               | Pemula   |
| Berhenti di tahap 2                               | Menengah |
| Selesai tahap 3, kurang dari 70% benar di tahap 3 | Mahir    |
| Selesai tahap 3, minimal 70% benar di tahap 3     | Ahli     |

Perkiraan persentase kode yang sudah dikenal dihitung per tier: proporsi benar di tier itu dikali jumlah kode tier itu. Tier yang tidak diuji dianggap 0%, karena pengguna yang gagal di kode umum hampir pasti belum mengenal kode langka.

**Dampak ke kartu.** Hanya kode yang benar-benar ditanyakan yang terpengaruh:

- **Benar tanpa gangguan** → kartu `code2region` kode itu langsung jadi `review`. Jawaban tes dipakai sebagai review pertama FSRS: nilai penjadwalan 4 jika latensi di bawah 3 detik dan kecocokannya `exact` atau `variant`, selain itu nilai penjadwalan 3. Kartu ini tidak lewat Perkenalan dan tidak memakai kuota materi baru.
- **Salah, Tidak tahu, waktu habis, atau benar dengan gangguan** → kartu tetap `new`. Jawaban salah yang cocok dengan kode lain dicatat sebagai satu kejadian pasangan tertukar.
- **Kode yang tidak ditanyakan** tetap `new`. Tingkat hanya mengubah rekomendasi, tidak pernah mengubah status kartu yang tidak diuji.
- **Syarat `mature` tidak dilonggarkan.** Kartu hasil tes tetap memerlukan interval 21 hari dan jawaban benar di Level 3.

Ambang tetap 3 detik dipakai karena persentil pribadi belum ada. Angka itu sama dengan target waktu di tujuan utama PRD bagian 3.

Karena paling banyak 28 kartu yang bisa masuk `review` lewat tes, dan tanggal jadwal pengulangannya disebar lewat pemerataan jadwal (bagian 4.6), tes tidak bisa membuat antrean pengulangan meledak di minggu pertama.

**Rekomendasi Cakupan:**

| Tingkat               | Cakupan yang disarankan                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| Pemula                | Bali & Nusa Tenggara (bagian 2.6)                                                     |
| Menengah, Mahir, Ahli | Kawasan dengan proporsi benar terendah di tahap 2 dan 3. Jika seri, urutan bagian 2.6 |

Rekomendasi hanya saran. Tingkat juga menentukan batas materi baru harian dan ambang penahanan (bagian 4.7).

**Sesi yang berlaku.** Jika tes diulang, hanya sesi selesai terbaru menurut kunci pengurutan berbasis started_at yang dipakai replay. Waktu ended_at menentukan selesai/tidak, bukan pemecah urutan sesi. Kartu dan pasangan tertukar dari sesi lama diabaikan. Sesi yang tidak selesai — aplikasi ditutup di tengah tes — diabaikan seluruhnya.

**Tes tidak masuk** Hari Beruntun, persentil waktu jawab, maupun hitungan syarat optimasi parameter.

### 4.14 Pratinjau Sesi

Setiap mode latihan dimulai dengan pratinjau. Sesi harian, Latihan Terfokus, dan Sebutkan sebanyak mungkin memakai antrean tetap yang disusun saat pratinjau. Satu kartu muncul paling banyak satu kali, kecuali satu soal ulang langkah belajar di bagian 4.6; mengulangi jawaban setelah pembatalan tetap dianggap upaya pada soal yang sama. Perkenalan dapat masuk sesi harian atau sesi himpunan jika kuota tersedia. Latihan Terfokus hanya memakai kartu yang sudah dipelajari. Langkah belajar yang muncul karena jawaban di sesi itu disisipkan sebagai soal ulang (bagian 4.6); selain itu antrean tidak bertambah. Beranda menampilkan kapan pengulangan berikutnya tersedia.

Tantangan Harian memuat paling banyak lima kartu Golongan A yang pernah dipelajari; jika hanya tiga tersedia, tampilkan tiga; jika nol, mode tidak tersedia. Mode Kilat menampilkan durasi tetap dan jenis soal, tanpa menjanjikan jumlah soal. Tes penempatan menampilkan batas atas 28 soal dan tahapan adaptif, bukan jumlah pasti per level. Kedua pengecualian itu dinyatakan di pratinjau. Sesi himpunan tidak dimasukkan ke Tantangan Harian atau Mode Kilat.

**Isi pratinjau:**

| Bagian            | Isi                                                               |
| ----------------- | ----------------------------------------------------------------- |
| Judul             | Nama mode dan Cakupan atau wilayah                                |
| Jumlah soal       | Total, dirinci jadi pengulangan, materi baru, dan Bandingkan Kode |
| Jenis soal        | Tiap bentuk soal beserta jumlahnya                                |
| Tingkat kesulitan | Jumlah soal per Level 1, 2, dan 3, menurut bagian 3.2             |
| Estimasi durasi   | Rentang menit, menurut rumus di bawah                             |
| Info penting      | Paling banyak 3 butir, hanya yang berlaku untuk sesi ini          |

**Butir info penting**, menurut prioritas:

1. Materi baru ditahan karena antrean pengulangan melebihi ambang penahanan (bagian 4.7).
2. Tingkat berubah hari ini, beserta batas materi baru yang baru (bagian 4.16).
3. Ada soal Tebak berwaktu dengan batas 8 detik.
4. Ada kartu Sulit Dikuasai.
5. Ada soal dari luar Cakupan karena sudah waktunya diulang.
6. Pintasan keyboard: Enter untuk menjawab, Z untuk membatalkan. Hanya tampil jika metode input soal terakhir `keyboard`.

Butir 6 hanya tampil di lima sesi pertama. Setelah itu pengguna sudah tahu, dan tempatnya lebih berguna untuk informasi yang berubah.

**Estimasi durasi.**

```
E = Σ d(soal yang benar-benar ada dalam snapshot antrean)
```

- Setelah minimal 30 sampel, `d = median(ms_total) + f` dari 200 jawaban terakhir pada kelompok `question_type × level × input_mode`, tanpa jawaban dibatalkan atau gangguan. `f` adalah perkiraan waktu membaca hasil jawaban: 10 detik untuk Perkenalan, 2 detik untuk soal lain. Durasi soal dan perkiraan waktu membaca hasil jawaban dijumlahkan; waktu menunggu belajar awal tidak dihitung. Nilai f adalah konstanta awal mesin penjadwalan yang diuji lewat KPI durasi, bukan pengukuran individual yang tidak tersimpan.
- Jika kelompok belum memiliki 30 data, nilai nominal: Perkenalan 15 detik, belajar awal/belajar ulang Golongan A 10 detik, Level 1 4 detik, Level 2 6 detik, Level 3 9 detik, Bandingkan Kode 8 detik, dan jawaban himpunan 60 detik termasuk langkah learning-nya.
- Hanya langkah belajar awal yang sudah masuk salinan antrean yang dihitung. Tidak ada tambahan dua langkah untuk setiap Perkenalan dan tidak ada tambahan probabilitas belajar ulang pada sesi saat ini.
- Rentang `0,8 × E` sampai `1,2 × E` dibulatkan ke menit terdekat. Jika kedua angka sama, tulis satu angka. Jika E < 60 detik, tulis "kurang dari 1 menit".
- Mode Kilat menampilkan 60 detik. Tes penempatan menampilkan "sekitar 3 menit · maksimal 28 soal" sebagai perkiraan adaptif.

`practice_runs.estimated_ms` menyimpan E; `active_ms` mengukur seluruh waktu sesi saat halaman terlihat dan tidak dijeda, termasuk umpan balik serta waktu upaya yang di-undo. `ended_at − started_at` tetap durasi kalender dan tidak dipakai membandingkan estimasi waktu aktif. KPI ketepatan estimasi hanya menghitung sesi selesai dengan antrean tetap, bukan Mode Kilat atau tes adaptif.

**Memperbarui pratinjau.** Jika pratinjau dibiarkan terbuka lebih dari 10 menit, `local_day` berganti, atau revisi keadaan aplikasi atau konten berubah sebelum mulai (misalnya setelah pull), antrean disusun ulang saat **Mulai** ditekan dan pratinjau diperbarui dulu. Antrean baru mengambil semua langkah yang sudah waktunya diulang pada salinan antrean baru. Jika salinan antrean masih berlaku, langkah yang baru memasuki waktu pengulangan tetap terlihat di beranda setelah sesi; tidak disisipkan diam-diam. Selama sesi, hasil sinkronisasi boleh disimpan tetapi penerapan ke salinan soal ditunda sampai sesi selesai; replay sesudahnya dapat mengubah dampak jadwal sesuai bagian 8.11.

**Antrean kosong.** Pratinjau tidak ditampilkan. Beranda sudah menyatakan tidak ada soal.

**Memulai sesi.** Enter atau **Mulai** membuka antrean yang sudah ditinjau. Esc atau **Kembali** menutup pratinjau tanpa mengubah riwayat belajar.

### 4.15 Fun Facts pada Akhir Sesi

Layar akhir setiap mode, termasuk sesi himpunan, menampilkan satu fakta di blok **Fun Facts** dari kandidat `publicationStatus = ready`, lengkap dengan label sejarah dan sumbernya. Jika tidak ada kandidat siap terbit, blok fakta disembunyikan dan tidak ada `fact_views` yang ditulis. Fakta tidak tampil di tempat lain: tidak di tengah sesi, tidak sebagai pilihan jawaban, dan tidak sebagai soal.

**Pemilihan fakta:**

1. Kandidat awal: hanya fakta `ready` di `plates.json`; jika kosong, hentikan pemilihan tanpa kesalahan.
2. Buang fakta yang termasuk `N` fakta terakhir yang tampil di layar akhir, dengan `N = min(20, ⌊jumlah fakta ready / 2⌋)`. Dengan 41 fakta siap terbit di `../data/fun-facts.json`, `N = 20`: satu fakta baru bisa tampil lagi setelah 20 fakta lain.
3. Buang fakta berlabel `mitos` jika salah satu dari dua fakta layar akhir sebelumnya juga `mitos`. Cerita yang paling mudah diingat justru yang paling lemah dasarnya, jadi porsinya dibatasi.
4. Dari sisa kandidat, utamakan fakta yang terkait kode yang dijawab di sesi itu. Jika tidak ada, pakai semua sisa kandidat.
5. Pilih satu dengan PRNG yang di-seed `id` practice sesi.
6. Jika langkah 2–3 menghabiskan kandidat, pilih fakta yang paling lama tidak tampil di layar akhir.

`N` mengikuti jumlah fakta supaya aturan tetap berjalan jika kumpulan faktanya kecil. Dengan 10 fakta siap terbit, `N = 5`; dengan satu fakta siap terbit, `N = 0`.

**Riwayat tampil** dicatat di tabel `fact_views` (TRD bagian 4.2) dan ikut sinkron. Fakta yang baru tampil di ponsel tidak akan tampil lagi di laptop dalam rentang yang sama.

**Fakta yang berubah.** Fakta yang statusnya berubah tampil dengan status terbaru. Fakta yang dihapus atau diturunkan kembali menjadi draf tidak tampil lagi; riwayatnya diabaikan dalam jendela pemilihan. Jumlah kandidat siap terbit menentukan N. Jika langkah cadangan terpakai, pengulangan atau mitos berdekatan boleh terjadi; preferensi rotasi bukan larangan mutlak pada kumpulan kecil.

Fun Facts bukan ajakan latihan. Layar akhir tetap tanpa Tombol untuk menambah sesi (Microcopy bagian 2, aturan 6).

### 4.16 Penyesuaian Tingkat Otomatis

Tes penempatan hanya memberi tingkat awal. Setelah itu, tingkat naik atau turun sendiri mengikuti performa nyata, supaya batas materi baru harian (bagian 4.7) tetap cocok dengan kemampuan pengguna.

**Kapan dievaluasi.** Di awal setiap `local_day`, memakai log 30 `local_day` sebelumnya. Evaluasi hanya berjalan jika periode itu berisi minimal 200 jawaban pengulangan: jawaban terhitung pada kartu berstatus `review` atau `mature`, tanpa langkah belajar awal, Perkenalan, dan tes penempatan.

**Naik satu tingkat** jika ketiganya terpenuhi:

1. Akurasi pengulangan minimal 90%.
2. Materi baru ditahan paling banyak 3 hari dalam 30 hari itu.
3. Tingkat sekarang bukan Ahli.

**Turun satu tingkat** jika salah satu terpenuhi, dan tingkat sekarang bukan Pemula:

1. Akurasi pengulangan di bawah 80%.
2. Materi baru ditahan lebih dari 10 hari dalam 30 hari itu.

**Hari materi baru ditahan** dihitung dari keadaan aplikasi di awal `local_day`: jumlah kartu prioritas 1–3 yang waktunya diulang melebihi ambang penahanan tingkat hari itu. Hari itu hanya dihitung jika pengguna juga aktif pada `local_day` tersebut, yaitu ada jawaban yang tercatat. Antrean yang menumpuk selama pengguna tidak berlatih tidak menunjukkan kemampuannya, jadi tidak boleh menurunkan tingkat. Karena dihitung dari keadaan aplikasi hasil replay, hasilnya sama di semua perangkat.

**Jeda antar-perubahan.** Setelah tingkat berubah, evaluasi berikutnya baru berjalan 14 hari kemudian. Tanpa jeda, pengguna di sekitar ambang bisa naik-turun setiap hari.

**Jika keduanya terpenuhi.** Syarat naik dan turun tidak mungkin terpenuhi bersamaan untuk akurasi. Untuk hari yang ditahan pun tidak: naik memerlukan paling banyak 3 hari, turun memerlukan lebih dari 10. Aturan ini tidak memerlukan pemecah seri.

**Dampak.** Batas dan ambang tingkat baru berlaku mulai `local_day` itu. Pratinjau sesi hari itu menyebut perubahannya (bagian 4.14). Kartu yang sudah ada tidak terpengaruh; yang berubah hanya berapa materi baru boleh masuk.

**Tingkat awal tetap dari tes.** Jika tes penempatan diulang sebelum ada jawaban terhitung di luar tes, tingkat awal diganti hasil tes terbaru. Evaluasi otomatis baru boleh mengubah tingkat setelah 30 `local_day` penuh sejak jawaban terhitung pertama di luar tes, sekalipun syarat 200 jawaban tercapai lebih cepat.

**Status angka.** Ambang 90%, 80%, 3 hari, 10 hari, dan 14 hari adalah titik awal, bukan hasil penelitian. Retensi target sistem 0,90, jadi akurasi pengulangan di atas 90% berarti pengguna mengingat lebih baik dari yang dijadwalkan, dan beban materi baru bisa dinaikkan.

---

## 5. Pemeriksaan Jawaban

### 5.1 Jawaban Tunggal

Jawaban ketik bebas memunculkan masalah yang tidak ada di pilihan ganda: kapan jawaban masih boleh dihitung benar. Tujuannya mirip cara Duolingo menilai jawaban ketik: salah ketik ringan diterima dan ditandai, tetapi nama daerah lain tetap salah. Urutan pemeriksaan berikut tetap dan dijalankan berurutan. Pemeriksaan berhenti di langkah pertama yang memberi hasil.

**Kamus.** Semua langkah membandingkan jawaban dengan kamus nasional: seluruh kab/kota di `plates.json` beserta `aliases` dan `variants`-nya, ditambah nama provinsi. Kamusnya nasional, bukan kamus Cakupan aktif, karena kesalahan lintas pulau justru yang paling penting tercatat. **Jawaban yang diterima** untuk Tebak daerah, termasuk bentuk Tebak berwaktu, adalah seluruh kab/kota `high` milik kode itu, ditambah nama provinsi jika eksklusif (bagian 2.8). Untuk `setrecall`, hanya anggota kab/kota `high`, tanpa jawaban provinsi. Daerah → kode menerima seluruh kode `high` daerah soal.

1. **Normalisasi.** Huruf kecil semua. Tanda baca diganti spasi, lalu spasi beruntun dipadatkan. Awalan administratif "kota", "kabupaten", "kab", dan "kotamadya" dibuang, hanya jika berdiri sebagai kata sendiri: "Kota Binjai" jadi "binjai", tetapi "Kotamobagu" tetap "kotamobagu".
2. **Bentuk tanpa spasi.** Jawaban dan nama di kamus juga dibandingkan tanpa spasi. "Bukit Tinggi" dan "Bukittinggi", "Pematang Siantar" dan "Pematangsiantar", "Pare Pare" dan "Parepare" dianggap sama persis. Hasil: `exact`.
3. **Alias.** Cocok dengan `aliases` — nama lain yang sah, seperti "Jogja" atau "DIY" — dihitung `exact`.
4. **Ejaan lama dan varian terdaftar.** Ejaan lama dipetakan ke ejaan baru sebelum dibandingkan: `oe → u`, `dj → j`, `tj → c`, `sj → sy`, `nj → ny`, `ch → kh`. "Djember" jadi "jember", "Tjilatjap" jadi "cilacap". Cocok dengan `variants` — salah eja yang umum dan terdaftar di data, seperti "Binjay" atau "Pekan Baru" — juga masuk langkah ini. Hasil: `variant`.
5. **Cek kamus.** Jika hasil langkah 1–4 cocok dengan nama di kamus yang **bukan** jawaban yang diterima, jawaban langsung salah. Pasangan tertukar dicatat antara kode yang ditanyakan dan kode milik nama itu. Tidak ada toleransi salah ketik di langkah ini.
6. **Toleransi salah ketik**, hanya untuk nama daerah:
   - Jarak dihitung dengan Damerau-Levenshtein berbobot pada bentuk tanpa spasi. Biaya 0,5 untuk: menukar dua huruf bersebelahan ("Mdean"), mengganti huruf dengan tombol QWERTY di sebelahnya ("Medsn"), dan menambah atau mengurangi satu huruf kembar ("Tebingtingi"). Kesalahan lain berbiaya 1.
   - Ambang menurut panjang nama baku dalam bentuk tanpa spasi: 1–4 huruf → 0, jadi tanpa toleransi; 5–7 huruf → 1; 8–11 huruf → 1,5; 12 huruf atau lebih → 2.
   - Huruf pertama harus sama.
   - Nama terdekat harus salah satu jawaban yang diterima, dan nama lain di kamus harus berjarak minimal 1 lebih jauh. Jika tidak, jawaban salah tanpa mencatat pasangan.
   - Hasil: `typo`, dengan biayanya dicatat sebagai `typoCost`.
7. **Selain itu salah.** Tanpa pasangan jika tidak cocok dengan apa pun.

**Mengapa nama pendek tanpa toleransi.** Nama empat huruf atau kurang — Batu, Bima, Muna, Poso, Siak — terlalu rapat satu sama lain. Satu huruf salah pada nama sependek itu lebih mungkin nama lain daripada salah ketik.

**Mengapa langkah 2–4 tanpa penalti.** Spasi, ejaan lama, dan salah eja umum menunjukkan pengguna tahu daerahnya, hanya belum hafal penulisan bakunya. Salah ketik di langkah 6 dikurangi satu poin di skor kelancaran (bagian 4.4), karena bisa jadi tanda jawaban belum mantap.

**Umpan balik.** `exact` yang ditulis sama dengan nama baku → **Benar**. `exact` atau `variant` yang penulisannya beda → **Benar** diikuti nama bakunya. `typo` → **Benar · ejaan diperbaiki** diikuti nama bakunya. Setelah jawaban benar untuk soal kode → daerah, UI juga menampilkan sampai tiga kab/kota lain dari kode yang sama.

**Keanggotaan yang belum terverifikasi.** Jika jawaban cocok dengan kab/kota yang keanggotaannya di kode itu baru berlabel `medium`, jawaban tidak dinilai: tidak benar, tidak salah, tidak mengubah jadwal, dan tidak mencatat pasangan. UI menjelaskan bahwa data daerah itu belum terverifikasi penuh. Menandainya salah bisa menghukum jawaban yang benar; menandainya benar berarti menghafal data yang belum pasti.

**Jawaban berupa kode dinilai kecocokan persis, tanpa toleransi sama sekali.** Normalisasinya hanya huruf besar dan buang spasi: "be", "BE", dan "B E" sama. Alasannya aritmetis: kode pelat panjangnya satu sampai dua huruf, jadi toleransi apa pun akan menerima BD untuk BE, DR untuk DK, AB untuk AD, atau PB untuk PA — persis pasangan yang paling sering tertukar. Jika toleransi dipakai pada kode, detektor pasangan di bagian 6 kehilangan data terpentingnya.

**Jawaban kode yang tidak ada**, misalnya "BX", dinilai salah tanpa mencatat pasangan.

**Batas input.** Kolom jawaban berhenti menerima input di 120 karakter. Enter di kolom kosong diabaikan (bagian 4.10).

**Referensi / Pelat Terlihat** tidak memakai penilaian jawaban; pencocokan pencarian hanya untuk menampilkan konten.

### 5.2 Jawaban Beberapa Daerah

Bentuk "sebutkan sebanyak mungkin" memerlukan aturan sendiri, karena tidak ada satu jawaban benar.

1. **Pakai ambang, bukan kelengkapan penuh.** Ambangnya `min(5, n − 1)`, dengan `n` jumlah kab/kota anggota kode itu. Kode dengan 12 wilayah memiliki ambang 5; kode dengan 3 wilayah memiliki ambang 2. Menuntut semuanya membuat kode seperti B terlalu sulit dan kode kecil terlalu mudah.
2. **Hanya untuk kode dengan minimal 3 kab/kota anggota.** Kode dengan satu atau dua kab/kota tidak memiliki himpunan yang layak disebutkan; bentuk ini tidak dibuat untuk kode seperti itu. Level 3 kode tersebut tetap terjamin lewat Tebak berwaktu (bagian 3.4).
3. **Urutan bebas, tanpa batas waktu.** Jawaban diketik satu per satu. Yang diukur bukan kecepatan.
4. **Berhenti kapan saja.** Tidak ada penalti tambahan karena berhenti; nilai penjadwalan tetap mengikuti jumlah hasil pada butir 8, termasuk Lagi bila nol. Maksimal 64 butir per soal; setelah batas tercapai, soal ditutup dan dinilai.
5. **Duplikat dihitung sekali.** Wilayah yang diketik dua kali, atau diketik lewat nama baku lalu lewat aliasnya, tetap satu.
6. **Toleransi salah ketik berlaku per butir**, dengan aturan yang sama seperti bagian 5.1.
7. **Kesalahan yang bermakna tetap dicatat.** Jawaban keliru yang sebenarnya valid untuk kode lain dicatat sebagai pasangan yang sering tertukar. Bentuk soal ini paling subur untuk menemukan pola kebingungan.
8. **Penilaian akhir.** Nol jawaban benar → nilai penjadwalan 1 (Lagi); positif tetapi di bawah ambang → nilai penjadwalan 2 (Sulit); ambang sampai ambang + 1 → nilai penjadwalan 3 (Bagus); minimal ambang + 2 → nilai penjadwalan 4 (Mudah). Pemetaan ini menggantikan skor kelancaran jawaban tunggal. Gangguan tidak mengubah nilai penjadwalan himpunan; soal ini tidak masuk persentil kelancaran. `correct` berarti mencapai ambang, termasuk untuk syarat Level 3.

**Sesi terpisah.** Kartu `setrecall` yang terbuka terlihat di Statistik/pemeriksaan kode sebagai **Sebutkan sebanyak mungkin** dengan penanda bahwa kartu perlu diulang. Membukanya menjalankan `practice_runs.kind = 'setrecall'` dan pratinjau satu soal. Perkenalan pertama memakai `context = intro`, Level 1, dan kuota baru global; penilaian berikutnya memakai `context = setrecall`, selalu Level 3, dengan satu langkah belajar yang ditanyakan ulang di sesi yang sama (bagian 4.6). Kartu ini tidak masuk antrean harian Golongan A; kuota, ambang penahanan materi baru, aturan satu Perkenalan per kelompok kartu terkait, dan satu jawaban terjadwal per kelompok kartu terkait tetap berlaku. Kartu yang belum perlu diulang tetap boleh dilatih tanpa mengubah jadwal. Log satu soal beserta seluruh butirnya disimpan atomik menurut TRD 4.2; undo membatalkan seluruh hasil.

### 5.3 Jawaban Kode Khusus

**Jawaban berupa nama pemegang** (`special2holder`). Kamusnya adalah seluruh `holder` dan `aliases` entri `specials[]`, termasuk entri `medium` dan `low`. `referencePlates[]` tidak masuk kamus. Kamus kab/kota tidak dipakai. Langkah pemeriksaan mengikuti bagian 5.1 dengan penyesuaian berikut:

1. Normalisasi langkah 1 berlaku, tetapi tanpa membuang awalan administratif. Kata "negara", "kedutaan", "kedubes", dan "republik" di awal jawaban dibuang, hanya jika sisa jawaban tidak kosong.
2. Langkah 2 dan 3 berlaku. Alias dihitung `exact`.
3. Langkah 4 tidak berlaku, karena peta ejaan lama dirancang untuk nama daerah.
4. Cek kamus: jawaban yang cocok dengan pemegang CD lain langsung salah. `confused_with` diisi `id` entri pemegang itu.
5. Toleransi salah ketik langkah 6 berlaku dengan ambang yang sama. Nama baku 1–4 huruf tanpa toleransi; ini menjaga pasangan seperti Iran/Irak dan Oman/Laos. Singkatan yang seluruhnya huruf kapital di data, seperti UNDP atau WHO, juga tanpa toleransi.
6. Jawaban yang cocok dengan entri CD `medium` atau `low` dinilai salah tanpa mencatat pasangan. Entri seperti itu tidak memiliki kartu, jadi tidak ada keanggotaan yang ditunda seperti bagian 5.1.

**Jawaban berupa kode** (`holder2special`). Normalisasinya: huruf besar, buang spasi, titik, dan tanda hubung. Awalan CD boleh ditulis atau tidak: "49", "CD 49", dan "cd49" sama. Awalan lain membuat jawaban salah tanpa pasangan, misalnya "CC 49". Angka nol di depan dibuang. Kecocokan harus persis, tanpa toleransi, dengan alasan yang sama seperti jawaban kode wilayah. Nomor yang dimiliki entri CD lain mencatat `confused_with`; nomor yang tidak ada dinilai salah tanpa pasangan.

**Input berlebih.** Jika jawaban kode memuat angka tambahan, misalnya "CD 49 07", jawaban dinilai salah. Soal hanya meminta kode negara, dan menerima angka tambahan membuat pengguna menghafal format yang keliru.

**Umpan balik.** Mengikuti bagian 5.1.

**Pasangan tertukar.** Pasangan kode khusus dicatat untuk Statistik, tetapi tidak membuka latihan Bandingkan Kode pada rilis ini.

---

## 6. Penanganan Kode yang Tertukar

### 6.1 Pencatatan

Setiap jawaban salah dicatat sebagai pasangan berarah `(kartu_benar, jawaban_diberikan)`, bukan hanya status salah. Sistem jadi tahu bukan hanya bahwa pengguna gagal mengingat, tetapi juga item apa yang tertukar di ingatannya.

### 6.2 Syarat Pasangan Masuk Latihan

| Kondisi                                            | Tindakan                                                 |
| -------------------------------------------------- | -------------------------------------------------------- |
| Pasangan muncul 3 kali dalam 30 hari               | Tandai sebagai pasangan yang sering tertukar             |
| Pasangan sudah ditandai                            | Tambahkan latihan Bandingkan Kode ke prioritas 2 antrean, paling banyak sekali sehari |
| Benar di 5 hari berbeda berturut-turut pada latihan Bandingkan Kode | Hapus tanda dan kembalikan ke jadwal normal |
| Tertukar lagi setelah tanda dihapus                | Ambang turun jadi 2 kali                                 |

Pasangan yang sering tertukar tidak dibatasi Cakupan. Jika BE tertukar dengan DE, latihan Bandingkan Kode tetap bisa muncul meski cakupan aktifnya hanya Sumatera. Kesalahan lintas kawasan justru penting dicatat karena lebih mudah lolos jika latihan selalu dikurung per wilayah.

Hitungan ini memakai gabungan jawaban dari semua perangkat. Pencarian Referensi dan Pelat Terlihat tidak ikut dihitung karena tidak menghasilkan jawaban. Tebakan Perkenalan tidak dihitung, karena kartunya belum pernah dipelajari. Jawaban yang dibatalkan lewat undo juga tidak dihitung.

Pasangan dicatat berarah, tetapi status "sering tertukar" berlaku untuk pasangan itu ke dua arah saat menentukan status dikuasai (bagian 2.5). Latihan Bandingkan Kode untuk pasangan yang salah satu kodenya `suspended` tidak ditampilkan sampai kodenya aktif lagi. Hanya drill pertama tiap hari yang dihitung. Hitungan 5 hari benar kembali ke nol begitu drill pertama hari itu salah; hari tanpa drill tidak mengubah hitungan.

### 6.3 Bentuk Latihan

Kedua item tampil bersamaan dalam pertanyaan yang menuntut pengguna membedakan keduanya, misalnya: "Mana yang Bengkulu, BD atau BE?" Setelah menjawab, sistem menampilkan satu ciri pembeda yang konkret, dipilih dengan urutan berikut: kawasan masing-masing kode jika berbeda; provinsinya jika satu kawasan; atau satu kab/kota yang hanya dipakai masing-masing kode jika satu provinsi. Ciri pembeda tidak tampil sebelum menjawab, karena latihan ini Level 3 dan ciri itu akan membocorkan jawabannya.

Pendekatan ini berbeda dari intuisi umum yang menyuruh memisahkan item serupa. Memisahkannya hanya menunda momen kedua item harus dibedakan. Menampilkannya berdampingan justru membantu pengguna membentuk ciri pembeda yang jelas.

### 6.4 Kartu Sulit Dikuasai

Bagian 6.1 sampai 6.3 menangani kartu yang tertukar dengan kartu tertentu. Ada pola kegagalan lain: kartu yang terus salah tanpa pola jawaban pengganti yang konsisten. Kartu seperti ini tidak memiliki pasangan untuk dibuatkan latihan Bandingkan Kode, jadi ia bisa bolak-balik ke `relearning`, muncul terus, dan akhirnya memakan porsi besar antrean harian.

| Kondisi             | Tindakan                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `lapses` mencapai 4 | Setelah jawaban, muncul tawaran menulis catatan pengingat. Opsional                                                        |
| `lapses` mencapai 6 | Ditandai sebagai kartu sulit dikuasai; daftar kab/kota kode itu dan catatan pengingat (jika ada) tampil sebelum pertanyaan |
| `lapses` mencapai 8 | Kartu jadi `suspended` otomatis dan masuk daftar pemeriksaan                                                               |
| Setelah ditinjau    | Diaktifkan manual, dengan D dan S direset ke nilai kartu baru dan `lapses` kembali ke 0                                    |

Menampilkan jawaban sebelum pertanyaan memang membuat soal itu lebih mudah, dan itu disengaja. Jika kartu sudah gagal enam kali, mengingat tanpa bantuan terbukti belum jalan; belajar ulang lebih dulu lebih berguna daripada terus gagal.

Batas penonaktifan diperlukan supaya satu kartu bermasalah tidak menyita antrean harian.

**Catatan pengingat.** Teks pendek buatan pengguna, maksimal 280 karakter, satu per kode — bukan per kartu, karena asosiasi untuk DK berlaku di semua mode DK. Catatan pengingat tampil setelah jawaban di semua kartu kode itu, dan sebelum pertanyaan hanya jika kartunya berstatus leech. Catatan pengingat kosong berarti dihapus.

Alasannya: asosiasi yang dibuat sendiri cenderung lebih melekat daripada asosiasi yang diberikan (generation effect; Slamecka & Graf, 1978). Pengguna yang tinggal di Bali juga memiliki asosiasi lokal yang tidak mungkin ditulis di data bawaan. Tawaran muncul di `lapses` 4, bukan sejak awal, supaya menulis catatan pengingat tidak jadi tugas tambahan untuk setiap kartu. Tawaran hanya muncul sekali per kode; jika ditolak, tawaran berikutnya baru muncul di `lapses` 6. Catatan pengingat bisa ditulis atau diubah kapan saja dari halaman pemeriksaan kode, tanpa menunggu tawaran.

---

## 7. Perubahan Status Kartu

| Status internal   | Label jika perlu tampil di UI | Masuk status ini ketika                                                                | Jadwal berikutnya                                                                        | Berubah status ketika                                     |
| ----------------- | ----------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `locked`          | Belum Tersedia                | Kartu terkait belum memenuhi syarat membuka (bagian 4.8)                               | Tidak dijadwalkan                                                                        | Syaratnya terpenuhi                                       |
| `new`             | Belum Dipelajari              | Kartu belum pernah diperkenalkan                                                       | Antre di prioritas 4 jika termasuk Cakupan                                               | Perkenalan selesai                                        |
| `learning`        | Sedang Dipelajari             | Perkenalan selesai                                                                     | Satu langkah di dalam sesi, langsung waktunya dikerjakan                                 | Satu jawaban bernilai; tidak jatuh tempo lagi hari itu    |
| `review`          | Sedang Dipelajari             | Tahap `learning` selesai                                                               | Sesuai interval terhitung, tanpa memandang Cakupan                                       | Salah dijawab                                             |
| `relearning`      | Sedang Dipelajari             | Salah saat berstatus `review` atau `mature`                                            | Satu langkah di dalam sesi, lalu interval hasil FSRS tanpa pemotongan tambahan           | Satu jawaban bernilai; tidak jatuh tempo lagi hari itu    |
| `mature`          | Dikuasai                      | Interval 21 hari **dan** pernah benar di Level 3                                       | Sesuai interval                                                                          | Salah dijawab                                             |
| `leech` (penanda) | Sulit Dikuasai                | `lapses` mencapai 6; fase learning/review/belajar ulang tetap disimpan sebagai turunan | Sesuai fase FSRS, konteks tampil lebih dulu; jawaban berbantuan tidak meluluskan Level 3 | Diaktifkan kembali setelah `suspended` dengan reset lapse |
| `suspended`       | Dinonaktifkan                 | Ditandai manual, `confidence` turun, `id` hilang dari data, atau `lapses` mencapai 8   | Tidak dijadwalkan                                                                        | Lihat di bawah                                            |

**Keluar dari `suspended`** tergantung penyebabnya:

- Ditandai manual → diaktifkan manual. D, S, dan `due` kembali ke nilai sebelum di-suspend; kartu bisa langsung perlu diulang.
- `lapses` mencapai 8 → diaktifkan manual, dengan reset seperti bagian 6.4.
- `confidence` turun atau `id` hilang → aktif sendiri begitu data kembali `high` atau `id`-nya kembali, dengan riwayat utuh. Penyebabnya ada di data, bukan di pengguna, jadi pemulihannya juga mengikuti data.

Syarat "pernah benar di Level 3" bersifat historis. Kartu `mature` yang salah lalu masuk `relearning` tidak perlu lulus Level 3 lagi untuk kembali `mature`; cukup intervalnya kembali ke 21 hari.

Cakupan hanya memengaruhi kartu berstatus `new`. Begitu kartu keluar dari status itu, jadwalnya dikelola global dan tidak bisa lagi disembunyikan dengan mengganti Cakupan.

**Jalur dari tes penempatan.** Kartu yang dijawab benar di tes penempatan berpindah langsung dari `new` ke `review`, tanpa Perkenalan dan tanpa `learning` (bagian 4.13).

**Tidak ada status yang disimpan.** Seluruh kolom tabel di atas adalah hasil replay log (TRD bagian 4.4). Tindakan manual pengguna disimpan sebagai event `card_events`; status yang muncul otomatis diturunkan dari log dan data.

Nama dalam backtick adalah status internal untuk implementasi dan penelusuran masalah. UI hanya menampilkan label di kolom kedua.

---

## 8. Konsistensi Antarperangkat

Bagian ini berlaku begitu pengguna login di lebih dari satu perangkat. Mekanisme sinkronisasinya ada di TRD bagian 5; yang ditetapkan di sini adalah hasil yang harus terlihat.

### 8.1 Keadaan Aplikasi Dihitung dari Riwayat

Status setiap kartu, pasangan tertukar, persentil waktu jawab, Hari Beruntun, dan Rekor Terbaik dihitung dari gabungan event semua perangkat. Dua perangkat yang sudah menerima event yang sama wajib menunjukkan keadaan aplikasi yang sama persis. Aturan ini yang membuat semua aturan di bawah bisa diuji.

### 8.2 Urutan Catatan

Urutan kejadian ditentukan kunci pengurutan di TRD bagian 4.4: waktu kejadian, lalu `device_id`, lalu `id`. Aturan per hari — kuota, satu jawaban terjadwal per hari, Hari Beruntun — memakai `local_day` yang tercatat di event, bukan waktu yang dihitung ulang.

### 8.3 Kartu yang Dijawab di Dua Perangkat

Jika satu kartu yang waktunya diulang dijawab di dua perangkat pada `local_day` yang sama — biasanya karena keduanya offline — jawaban yang lebih awal menurut kunci pengurutan dihitung untuk jadwal. Jawaban yang lain diperlakukan seperti Latihan Terfokus pada kartu yang belum waktunya diulang: dicatat, masuk statistik dan pasangan tertukar, tetapi tidak mengubah jadwal.

Contoh: DK waktunya diulang hari Senin. Pukul 07.10 dijawab benar di ponsel saat offline; pukul 20.00 dijawab salah di laptop. Setelah sinkron, jawaban pukul 07.10 yang menentukan jadwal. Jawaban salah pukul 20.00 tidak menambah `lapses`, tetapi tetap masuk hitungan akurasi dan pasangan tertukar.

### 8.4 Kelebihan Kuota Materi Baru

Dua perangkat offline bisa sama-sama menghabiskan kuota materi baru di hari yang sama. Perkenalan yang sudah terjadi tidak dibatalkan, karena pengguna sudah melihat materinya. Kelebihannya dipotong dari kuota hari berikutnya, paling banyak sebesar batas harian. Untuk tingkat Menengah (batas 10), kelebihan 4 membuat kuota besok jadi 6; kelebihan 15 membuat kuota besok 0, dan kuota lusa kembali 10.

### 8.5 Pembatalan Antarperangkat

Undo hanya membatalkan jawaban terakhir di perangkat yang sama (bagian 4.10). Jika jawaban itu sudah terkirim, perangkat lain ikut kembali ke keadaan aplikasi sebelum jawaban itu setelah menerima event pembatalannya.

### 8.6 Penonaktifan Manual dan Jawaban Bersamaan

Kartu yang di-suspend manual di satu perangkat bisa saja dijawab di perangkat lain yang belum tahu. Jawaban yang kunci pengurutannya setelah event suspend dicatat, tetapi tidak mengubah jadwal. Jawaban yang lebih awal dihitung normal.

### 8.7 Cakupan

Cakupan disimpan dengan aturan last-write-wins. Karena Cakupan tidak memengaruhi jadwal kartu yang sudah ada (bagian 2.4), konflik Cakupan hanya menentukan materi baru mana yang muncul berikutnya.

### 8.8 Hari Beruntun dan Rekor

- Satu `local_day` masuk Hari Beruntun jika Tantangan Harian diselesaikan hari itu, atau jika sesi harian ditutup setelah semua kartu yang direncanakannya terjawab (jumlah kartu berbeda yang dijawab ≥ `planned_count`). Soal ulang di dalam sesi mengulang kartu yang sama, jadi tidak menambah hitungan itu. Jawaban yang dibatalkan lewat undo tidak dihitung.
- Tantangan Harian atau sesi harian yang diselesaikan di dua perangkat pada `local_day` yang sama dihitung satu hari untuk Hari Beruntun.
- Rekor Terbaik Mode Kilat per wilayah = skor tertinggi dari semua perangkat. Putaran yang tidak ditutup — aplikasi ditutup paksa di tengah 60 detik — tidak dihitung.
- Jatah toleransi Hari Beruntun dihitung dari gabungan `local_day` semua perangkat.

### 8.9 Tes Penempatan di Dua Perangkat

Jika tes penempatan diselesaikan di dua perangkat sebelum keduanya sinkron, sesi dengan kunci pengurutan terbaru yang berlaku, sama seperti tes yang diulang di satu perangkat (bagian 4.13). Hasil sesi lainnya diabaikan.

### 8.10 Pergiliran Fakta Antarperangkat

Aturan `N` fakta terakhir di bagian 4.15 dihitung dari gabungan `fact_views` semua perangkat. Jika dua perangkat menampilkan fakta yang sama saat keduanya offline, tidak ada yang dibatalkan; setelah sinkron, fakta itu tercatat dua kali dan rentang `N`-nya dihitung dari tampilan yang terakhir.

### 8.11 Perubahan Setelah Sinkronisasi

Hasil yang tampil saat menjawab dihitung dari keadaan aplikasi lokal. Setelah sinkronisasi, dampak satu jawaban ke jadwal bisa berubah — misalnya jawaban yang tadinya dihitung jadi tidak dihitung karena perangkat lain lebih dulu menjawab kartu yang sama. Benar atau salahnya jawaban tidak pernah berubah; yang bisa berubah hanya dampaknya ke jadwal. Perubahan seperti ini tidak diberitahukan, dengan satu pengecualian: kartu yang jadi `suspended` karena `lapses` gabungan mencapai 8 diberitahukan di layar penutup sesi berikutnya di setiap perangkat.

### 8.12 Penggunaan Tanpa Akun

Tanpa akun, seluruh aturan di dokumen ini berjalan sama persis dari log lokal: jadwal, tes penempatan, pratinjau, rotasi fakta, dan optimasi parameter. Perbedaannya hanya dua.

1. **Satu perangkat, satu riwayat.** Tanpa akun tidak ada penggabungan, jadi aturan bagian 8.3 sampai 8.10 tidak pernah terpakai.
2. **Perpindahan ke akun.** Saat login pertama, seluruh log lokal diklaim akun itu dan digabung dengan data akun yang sudah ada (TRD bagian 5.1). Setelah penggabungan, aturan multi-perangkat berlaku seolah seluruh riwayat itu sejak awal milik akun tersebut. Tes penempatan di dua sumber mengikuti bagian 8.9.

Browser berbeda di satu perangkat adalah dua pengguna anonim yang berbeda. Halaman Tentang menyebutnya, supaya pengguna tidak mengira progresnya hilang saat pindah browser.

---

## 9. Kriteria Penerimaan

Kriteria berikut mengikat dan diperiksa lewat tes otomatis sebelum rilis. Tiap butir merangkum aturan di bagian sebelumnya; tes rincinya ada di `Terka_Tests.md`. AC-31 tidak digunakan lagi dan tidak boleh dipakai untuk aturan baru.

| ID    | Kriteria                                                                                                                                                                                                                                           | Rujukan        |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| AC-1  | Setiap kartu yang dapat dibuat memiliki bentuk Level 3 sah sesuai mode; kartu kode tidak bergantung pada pasangan tertukar. Jalur otomatis diuji per kartu                                                                                         | 3.4            |
| AC-2  | Kartu hanya jadi `mature` jika interval ≥ 21 hari dan pernah benar minimal sekali di Level 3                                                                                                                                                       | 3.4            |
| AC-3  | Cakupan tidak menyaring pengulangan: Golongan A masuk sesi harian, `setrecall` terlihat pada sesi terpisah                                                                                                                                         | 2.4            |
| AC-4  | Batas materi baru harian sesuai tingkat (bagian 4.7) berlaku global, dan mengganti Cakupan tidak mereset batas itu                                                                                                                                 | 2.4            |
| AC-5  | Materi baru ditahan hari itu jika antrean prioritas 1–3 melebihi ambang penahanan tingkatnya                                                                                                                                                       | 4.7            |
| AC-6  | Jawaban di level manual yang lebih rendah tidak mengubah `stability`, `difficulty`, maupun interval, tetapi tetap masuk statistik dan deteksi pasangan tertukar                                                                                    | 3.3            |
| AC-7  | Jawaban berupa kode dinilai kecocokan persis, tanpa toleransi salah ketik                                                                                                                                                                          | 5.1            |
| AC-8  | Dalam satu `local_day`, jadwal satu kartu hanya diperbarui satu jawaban, di luar langkah belajar awal dan belajar ulang; Tantangan Harian dan Mode Kilat tidak pernah mengubah jadwal                                                              | 4.11           |
| AC-9  | Undo memulihkan `stability`, `difficulty`, `interval`, `due`, `reps`, `lapses`, kuota, persentil, dan pasangan tertukar ke keadaan sebelum jawaban terakhir                                                                                        | 4.10           |
| AC-10 | Pergantian hari terjadi pukul 00.00 waktu lokal perangkat, dan pindah zona waktu tidak pernah memajukan jadwal pengulangan                                                                                                                         | 4.9            |
| AC-11 | Nilai penjadwalan dihitung ulang dari data jawaban mentah; nilai penjadwalan tidak disimpan di perangkat maupun server                                                                                                                             | 4.5            |
| AC-12 | Kartu dengan `lapses` 6 menampilkan konteks sebelum pertanyaan, dan `lapses` 8 membuat kartunya `suspended` otomatis                                                                                                                               | 6.4            |
| AC-13 | Perkenalan tidak menghasilkan nilai penjadwalan, tidak masuk persentil, tidak dicatat sebagai pasangan tertukar, dan memakai kuota materi baru                                                                                                     | 4.7            |
| AC-14 | Dalam satu `local_day`, paling banyak satu jawaban per kelompok kartu terkait yang dihitung untuk jadwal, di luar langkah belajar awal dan belajar ulang                                                                                           | 4.8            |
| AC-15 | Kartu yang dilewati aturan kartu terkait dua hari berturut-turut disajikan di hari ketiga                                                                                                                                                          | 4.8            |
| AC-16 | Antrean prioritas 3 terurut dari peluang ingat terendah                                                                                                                                                                                            | 4.7            |
| AC-17 | Log yang sama menghasilkan tanggal `due` yang sama di setiap replay dan setiap perangkat                                                                                                                                                           | 4.6, 8.1       |
| AC-18 | Parameter baru hanya aktif jika lolos syarat data dan syarat evaluasi di bagian 4.12                                                                                                                                                               | 4.12           |
| AC-19 | Parameter yang membuat retensi aktual meleset lebih dari 5 poin setelah 300 jawaban dikembalikan otomatis ke parameter sebelumnya                                                                                                                  | 4.12           |
| AC-20 | Kartu yang dijawab di dua perangkat pada hari yang sama hanya dihitung sekali untuk jadwal: jawaban paling awal                                                                                                                                    | 8.3            |
| AC-21 | Kelebihan kuota materi baru dipotong dari kuota hari berikutnya, paling banyak sebesar batas harian                                                                                                                                                | 8.4            |
| AC-22 | Referensi langsung menampilkan data; Pelat Terlihat tidak pernah membuat `review_logs`, mengubah jadwal/status kartu, kuota, persentil, atau pasangan tertukar                                                                                     | 4.11           |
| AC-23 | Materi baru diurut menurut jumlah Pelat Terlihat 90 hari terakhir, lalu urutan data                                                                                                                                                                | 2.7            |
| AC-24 | Kartu `suspended` dan `locked` tidak dihitung dalam persentase penguasaan                                                                                                                                                                          | 2.5            |
| AC-25 | Cakupan hanya memiliki tingkat Nasional, Kawasan, dan Provinsi                                                                                                                                                                                     | 2.1            |
| AC-26 | Pilihan mengikuti mode: kab/kota untuk kode → daerah, kode untuk daerah → kode; tidak pernah nama provinsi. Pengecoh tidak boleh merupakan jawaban sah; perluasan sumber mengikuti 2.8                                                             | 2.8            |
| AC-27 | Soal kode → daerah menerima kab/kota mana pun milik kode itu; nama provinsi hanya diterima untuk kode yang mencakup seluruh provinsi secara eksklusif                                                                                              | 2.8            |
| AC-28 | Bentuk tanpa spasi, alias, ejaan lama, dan varian terdaftar diterima tanpa penalti; salah ketik diterima hanya dalam ambang, dengan huruf pertama sama, dan terdekat secara unik; nama 1–4 huruf dan kode tanpa toleransi                          | 5.1            |
| AC-29 | Nilai penjadwalan jawaban tunggal biasa mengikuti skor kelancaran 4.4; nilai penjadwalan 4 hanya bila cepat tanpa penalti, benar dengan gangguan nilai penjadwalan 3. Tes penempatan dan himpunan mengikuti pemetaan khusus 4.13 dan 5.2           | 4.4, 4.13, 5.2 |
| AC-30 | Persentil dihitung per kelompok `level × bentuk jawaban × metode input`, dengan kelompok lebar sebagai cadangan di bawah 30 data                                                                                                                   | 4.4            |
| AC-32 | Tes penempatan hanya mengubah kartu kode yang ditanyakan; jawaban benar tanpa gangguan menjadi review pertama FSRS; hanya sesi terbaru yang selesai yang berlaku                                                                                   | 4.13           |
| AC-33 | Sesi berantrean tetap memakai salinan antrean pratinjau; yang disisipkan hanya satu soal ulang untuk kartu yang baru diperkenalkan atau baru salah; salinan antrean diperbarui jika lebih dari 10 menit, hari berganti, atau revisi keadaan aplikasi berubah. Kilat berdurasi tetap dan tes penempatan adaptif | 4.14           |
| AC-34 | Fakta `ready` hanya tampil di layar akhir dengan sumber; kandidat menghindari N tampilan terakhir dan mitos berdekatan, kecuali pilihan cadangan 4.15. Tanpa kandidat, blok disembunyikan. Rotasi memakai riwayat lintas perangkat               | 4.15           |
| AC-35 | Batas materi baru harian dan ambang penahanan mengikuti tabel tingkat di bagian 4.7; pengguna yang melewati tes memakai batas Menengah; tingkat awal diambil dari sesi tes penempatan terbaru yang selesai, lalu disesuaikan menurut 4.16          | 4.7, 4.13      |
| AC-36 | Tingkat naik atau turun satu langkah menurut syarat bagian 4.16, paling cepat 14 hari setelah perubahan sebelumnya, dengan hasil yang sama di semua perangkat                                                                                      | 4.16           |
| AC-37 | Hanya lima mode kartu yang dapat dibuat: `code2region`, `region2code`, dan `setrecall` untuk kode wilayah, serta `special2holder` dan `holder2special` untuk kode khusus; provinsi dan seri tidak menambah jenis kartu                             | 2.8, 2.9       |
| AC-38 | Catatan pencarian hanya menyimpan kode depan; input pelat lengkap tidak disimpan atau dikirim ke analitik maupun diagnostik                                                                                                                        | 4.11           |
| AC-39 | Kartu kode khusus hanya dibuat dari entri `specials[]` berlabel `high` tanpa `needsReview`; `referencePlates[]` tidak pernah membentuk kartu; `holder2special` terkunci sampai interval `special2holder` mencapai 7 hari                           | 2.9            |
| AC-40 | Jalur kode khusus nonaktif secara bawaan; kartunya tidak pernah masuk sesi harian, Tantangan Harian, Mode Kilat, tes penempatan, Latihan Terfokus, Bandingkan Kode, atau penguasaan wilayah                                                        | 2.9            |
| AC-41 | Materi baru kode khusus dibatasi 5 per hari dengan ambang penahanan 25, terpisah dari kuota dan ambang wilayah                                                                                                                                     | 2.9            |
| AC-42 | Nomor urut registrasi dan nama pejabat perwakilan tidak pernah muncul sebagai soal, pilihan, atau jawaban                                                                                                                                          | 2.9            |
| AC-43 | Jawaban nama pemegang memakai kamus `specials[]`; nama 1–4 huruf dan singkatan huruf kapital tanpa toleransi; jawaban kode khusus dinilai persis dan menolak angka tambahan                                                                        | 5.3            |

---

## 10. Pertanyaan yang Masih Terbuka

Pertanyaan terbuka soal produk dan konten ada di PRD bagian 13.

1. Apakah kawasan Jawa perlu dipecah jadi dua cakupan tetap (Jawa bagian barat dan timur) mengingat isinya 22 kode, atau cukup mengandalkan tingkat provinsi di bawahnya? Menunggu bukti bahwa tingkat provinsi memang terasa cukup saat dipakai.
2. Berapa batas waktu yang tepat untuk Tebak berwaktu? Angka 8 detik dipakai sebagai titik awal. Perlu ditinjau setelah median waktu ketukan pertama terkumpul.
3. Apakah jenis kartu yang berbeda memiliki pola lupa yang cukup berbeda untuk membenarkan dua set parameter FSRS? Baru bisa dijawab setelah beberapa putaran optimasi di bagian 4.12.
4. Apakah ambang persentil 20 dan 80 sudah tepat, dan apakah keduanya perlu beda antarlevel? Jawabannya menunggu Fase 3 tahap 3 di PRD bagian 11.
5. Apakah aturan satu jawaban terjadwal per kode membuat kode dengan banyak kartu tertinggal terlalu jauh? Indikatornya jumlah kartu yang kena batas pelewatan dua hari. Jika sering terjadi, aturannya bisa dilonggarkan jadi satu jawaban per mode kelompok (pengenalan vs mengingat tanpa bantuan).
6. Apakah usulan tahap belajar dari optimizer layak diterapkan? Mengubahnya berarti menghitung kembali durasi di bagian 4.7.
7. Apakah ambang tes penempatan — 3 dari 8, 6 dari 10, dan 70% — memisahkan tingkat dengan baik? Indikatornya proporsi kartu hasil tes yang salah di pengulangan pertamanya (KPI di PRD bagian 9).
8. Apakah bobot skor kelancaran perlu berbeda antara nama daerah dan kode? Kode hanya satu sampai dua huruf, jadi kelancaran mengetik dan koreksi hampir tidak memiliki ruang untuk terukur. Menunggu Fase 3 tahap 3.
9. Apakah jawaban nama provinsi untuk kode eksklusif, seperti "Bali" untuk DK, sebaiknya dibatasi di nilai penjadwalan 3 supaya pengguna terdorong menyebut kab/kota? Belum diterapkan karena jawabannya memang benar.
10. Apakah ambang penyesuaian tingkat — akurasi 90% untuk naik, 80% untuk turun, dan jumlah hari materi baru ditahan — cocok untuk pengguna nyata? Indikatornya seberapa sering tingkat berubah per pengguna dalam enam bulan pertama.
11. Apakah kuota 5 kartu kode khusus per hari terlalu lambat untuk 130 entri? Dengan kuota ini, seluruh `special2holder` diperkenalkan dalam sekitar 26 hari aktif. Indikatornya proporsi pengguna yang mematikan jalur ini sebelum seluruh entri diperkenalkan.
12. Apakah pasangan CD yang sering tertukar perlu latihan Bandingkan Kode sendiri? Keputusan menunggu data `confused_with` kode khusus setelah 60 hari.
