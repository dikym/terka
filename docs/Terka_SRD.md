# TERKA — System Requirements Document (SRD)

**Versi:** 2.1 (MVP) · **Status:** Draft · **Bahasa:** Indonesia
**Acuan:** Dokumen Kode Plat Nomor Kendaraan Indonesia (sumber data)
**Dokumen terkait:** PRD (produk dan alur pengguna) · TRD (arsitektur dan model data)

> **Tagline:** Lihat platnya, terka asalnya.
> **Fokus dokumen ini:** aturan pemilihan materi, penjadwalan, penilaian jawaban, dan siklus status kartu.

---

## 1. Purpose and Scope

Dokumen ini menetapkan perilaku sistem Terka: aturan memilih materi, tingkat kesulitan, penjadwalan, penilaian jawaban, penanganan kode yang sering tertukar, dan siklus status kartu. Isinya adalah aturan yang harus dipenuhi implementasi, bukan alasan produknya dan bukan pilihan teknologinya.

Konteks produk, alur pengguna, dan seluruh microcopy ada di PRD. Model data, arsitektur, backup, dan pipeline build ada di TRD.

Kalau satu aturan di dokumen ini bertentangan dengan prinsip di PRD bagian 2, prinsip itu yang menang dan aturannya diperbaiki.

---

## 2. Scope and Material Selection

### 2.1 Four Levels

| Tingkat | Contoh | Perkiraan jumlah pilihan | Kegunaan |
| --- | --- | --- | --- |
| Nasional | Seluruh Indonesia | 1 | Sasaran akhir, dan mode uji |
| Kawasan | Jawa, Sumatera, Bali & Nusa Tenggara | 7 | Tingkat utama untuk memilih wilayah belajar |
| Provinsi | Jawa Barat, Sulawesi Selatan | 38 | Tingkat menengah, dipakai kalau satu kawasan terlalu besar |
| Kode | DK, BE, AD | ~60 | Unit terkecil — satu kode beserta seluruh wilayah dan kode belakangnya |

Jumlah pilihan di tiap tingkat dihitung otomatis dari `plates.json` saat build, bukan ditulis manual di kode. Ini penting karena jumlah kode bisa berubah; Papua saja bertambah tiga kode sepanjang 2024.

Tidak ada tingkat di bawah kode. Kabupaten yang dibedakan lewat kode belakang bukan pilihan wilayah tersendiri, melainkan bagian dari cakupan kode di atasnya. Alasannya praktis: memilih "Kabupaten Badung" tanpa DK tidak masuk akal, karena kode belakang cuma bermakna bersama kode depannya.

### 2.2 Region Grouping

| Kawasan | Kode anggota |
| --- | --- |
| Sumatera | BA, BB, BD, BE, BG, BH, BK, BL, BM, BN, BP |
| Jawa | A, B, D, E, F, G, H, K, L, M, N, P, R, S, T, W, Z, AA, AB, AD, AE, AG |
| Kalimantan | DA, KB, KH, KT, KU |
| Sulawesi | DB, DC, DD, DL, DM, DN, DP, DT, DW |
| Bali & Nusa Tenggara | DK, DR, EA, DH, EB, ED |
| Maluku | DE, DG |
| Papua | PA, PB, PY, PS, PT |

Pengelompokannya mengikuti kedekatan administratif, bukan definisi geologis pulau. Madura masuk Jawa, Bangka Belitung dan Kepulauan Riau masuk Sumatera, dan Nusa Tenggara digabung dengan Bali jadi satu kawasan. Maluku berdiri sendiri karena cuma dua kode dan tidak ada kawasan lain yang logis untuk menampungnya.

Ukuran antar kawasan memang timpang — Jawa berisi 22 kode, Maluku cuma 2 — dan itu tidak perlu diseragamkan. Maluku bisa diselesaikan cepat sehingga memberi rasa maju sejak awal, sedangkan Jawa memang lebih cocok dipecah lagi lewat tingkat provinsi.

### 2.3 Codes That Cross Province Borders

Beberapa kode tidak berhenti di satu provinsi. Contoh paling jelas: B mencakup DKI Jakarta, sebagian Jawa Barat, dan sebagian Banten, sementara sebagian besar Kabupaten Tangerang justru memakai A.

Aturannya: setiap kode punya tepat satu `province` primer dan boleh punya daftar `spans` berisi provinsi lain yang ikut tercakup. Hierarki cakupan dibangun hanya dari `province` primer, jadi satu kode tidak pernah muncul di dua provinsi. Isi `spans` tidak memengaruhi navigasi sama sekali — ia cuma tampil sebagai catatan di Fakta Singkat.

Keputusan ini mengorbankan sedikit ketepatan geografis demi struktur cakupan yang tetap berupa hierarki konsisten. Kalau satu kode boleh muncul di beberapa wilayah sekaligus, persentase penguasaan akan tumpang tindih dan tidak bisa dihitung konsisten.

### 2.4 Cakupan versus Latihan Terfokus

Bagian ini memisahkan dua konsep yang sekilas mirip tetapi fungsinya berbeda.

**Cakupan** adalah pilihan wilayah yang tersimpan antar sesi dan hanya menentukan **materi baru** mana yang boleh mulai dipelajari. Kartu lama yang sudah masuk jadwal tetap bisa muncul meski berasal dari wilayah lain.

**Kartu yang pernah dipelajari tidak pernah disembunyikan Cakupan.** Begitu kartu jatuh tempo, kartu itu masuk sesi harian. Aturan ini mencegah tunggakan pengulangan menumpuk tanpa terlihat saat pengguna berpindah kawasan.

**Latihan Terfokus** adalah latihan tambahan untuk wilayah tertentu di luar sesi harian. Jawabannya tetap dicatat untuk statistik dan deteksi pasangan yang sering tertukar, tetapi **tidak mengubah jadwal** kartu yang belum jatuh tempo. Kalau latihan tambahan ikut menjadwal ulang kartu, data interval jadi bias karena kartu terlihat lebih gampang daripada aslinya.

```
Menyusun sesi harian:

  kartu yang sudah waktunya diulang → ambil dari SELURUH kartu
        ↓
  materi baru                     → hanya dari Cakupan
        ↓
  materi baru di wilayah lain     → tetap dihitung dan ditampilkan,
                                     tetapi belum dimasukkan ke sesi

Mengganti Cakupan:
  - tidak mengubah jadwal kartu yang sudah ada
  - tidak mereset batas 10 kartu baru pada hari tersebut
```

Batas kartu baru berlaku global per hari. Pengguna tidak bisa gonta-ganti Cakupan untuk menarik materi baru melebihi batas harian.

### 2.5 Mastery Status per Scope

- Persentase penguasaan satu cakupan = jumlah kartu `mature` di dalamnya dibagi total kartu di cakupan itu.
- Cakupan dinyatakan **dikuasai** kalau seluruh kartunya `mature` dan tidak ada pasangan sering tertukar yang melibatkannya.
- Angka ini dipakai untuk mewarnai Peta Penguasaan dan menentukan Uji Penguasaan Kawasan di PRD bagian 8.

Syarat "tidak ada pasangan yang sering tertukar" sengaja ditambahkan. Tanpa itu, satu kawasan bisa dinyatakan dikuasai padahal dua kode di dalamnya masih rutin tertukar — dan justru masalah semacam itu yang paling gampang tidak kelihatan di angka persentase.

### 2.6 Suggested Unlock Order

Cakupan awal yang disarankan: **Bali & Nusa Tenggara**, lalu **Jawa**, kemudian kawasan lain menurut frekuensi kemunculannya di jalan. Kode yang sering terlihat sehari-hari dapat pengulangan alami di luar aplikasi, sedangkan kawasan awal yang kecil membuat kemajuan terasa dalam hitungan hari, bukan minggu.

Ini cuma saran urutan. Pengguna tetap bebas memilih Cakupan mana pun kapan pun.

---

## 3. Difficulty Levels

### 3.1 Three Levels

Tingkat kesulitan didefinisikan dari **berapa banyak petunjuk yang tersedia sebelum pengguna menjawab**, bukan dari seberapa jarang materinya muncul. Definisi ini dipakai karena jumlah petunjuk langsung menentukan seberapa keras pengguna harus menarik informasi dari ingatan.

| Level | Nama | Tuntutan | Bentuk soal khas |
| --- | --- | --- | --- |
| 1 | Kenali | Jawaban ada di layar, tinggal dipilih | Pilihan ganda, benar/salah kilat, mana yang bukan |
| 2 | Ingat | Jawaban diketik, satu petunjuk diberikan | Kode → wilayah, wilayah → kode, fakta → kode |
| 3 | Kuasai | Jawaban ditarik tanpa petunjuk, atau harus membedakan dua item mirip | Tanpa Petunjuk, sebutkan sebanyak mungkin, confusion drill, plat utuh sampai kabupaten |

Pengecoh ikut berubah menurut level: Level 1 memakai pengecoh dari kawasan lain sehingga gampang dieliminasi, sedangkan Level 3 memakai pengecoh yang diambil langsung dari daftar pasangan sering tertukar milik kartu itu sendiri.

### 3.2 Automatic Level Assignment

Secara bawaan, level tidak dipilih pengguna. Level mengikuti status kartu:

| Status kartu | Level yang disajikan |
| --- | --- |
| `new`, `learning` | 1 — Kenali |
| `review`, `relearning` | 2 — Ingat |
| `mature` | 3 — Kuasai |

Kenaikan level otomatis menjaga kartu lama tetap menantang. Tanpa mekanisme ini, kartu berinterval 60 hari masih diuji dengan tuntutan yang sama seperti hari pertama, sehingga jawaban benar tidak lagi jadi bukti penguasaan yang kuat.

Pemetaan berbasis status ini sengaja dibuat sederhana untuk MVP. FSRS sebenarnya sudah menghitung retrievability, yaitu perkiraan peluang pengguna masih ingat satu kartu saat ini, dan nilainya jauh lebih halus daripada tiga kategori status. Penyempurnaannya direncanakan di PRD bagian 11: level dipilih berdasarkan peluang berhasil yang paling dekat dengan desired retention, bukan cuma berdasarkan status kartu. Penghalang utamanya sekarang bukan kerumitan implementasi, melainkan data yang belum cukup untuk mengukur pengaruh tiap level terhadap peluang berhasil.

### 3.3 Asymmetric Rule for Manual Override

Pengguna boleh mengganti level manual, tetapi konsekuensinya tidak simetris:

```
Level manual LEBIH TINGGI dari level otomatis
  → jawaban benar diperhitungkan seperti biasa dan interval diperbarui
  → alasannya: benar pada tuntutan yang lebih berat menunjukkan
    penguasaan yang lebih kuat

Level manual LEBIH RENDAH dari level otomatis
  → jawaban tidak memperbarui `stability`, `difficulty`, maupun interval
  → statistik akurasi dan pasangan yang sering tertukar tetap dicatat
  → alasannya: benar di tuntutan yang lebih ringan bukan bukti bahwa
    kartu masih dikuasai pada tuntutan aslinya
```

Aturan ini memakai prinsip yang sama dengan Latihan Terfokus di bagian 2.4. Tanpanya, pengguna bisa menurunkan level untuk mendapat hasil yang kelihatan bagus, padahal kemampuan yang ingin diukur justru tidak diuji pada tuntutan yang semestinya.

Aturan biner ini sengaja sederhana: jawaban di level lebih rendah tidak dipakai memperbarui jadwal, walaupun sebenarnya tetap membawa sebagian informasi soal penguasaan kartu. Pendekatan yang lebih halus — misalnya bobot parsial — butuh data untuk mengukur seberapa besar tiap level menggeser peluang berhasil. Penyempurnaan itu dijadwalkan di PRD bagian 11, Fase 3 tahap 2.

Pengguna tetap boleh menurunkan level karena fiturnya berguna di kondisi tertentu, misalnya setelah lama tidak berlatih atau saat situasi tidak memungkinkan mengetik. Yang dibatasi bukan tindakan menurunkan level, melainkan pemakaian hasilnya sebagai bukti penguasaan penuh.

### 3.4 Mature Requirements

Kartu hanya boleh mencapai status `mature` kalau memenuhi keduanya: interval sudah 21 hari **dan** kartu pernah dijawab benar minimal sekali di Level 3.

Syarat kedua membuat Level 3 benar-benar punya konsekuensi. Tanpanya, "Kuasai" cuma label tampilan, dan kartu bisa dinyatakan matang tanpa pernah diuji tanpa petunjuk. Aturan ini merambat ke tingkat di atasnya: definisi cakupan tuntas di bagian 2.5 dan Uji Penguasaan Kawasan otomatis memakai syarat yang sama.

**Jaminan ketersediaan.** Syarat ini cuma sah kalau setiap kartu punya jalur untuk melewatinya. Tiga dari empat bentuk Level 3 bersyarat: "sebutkan sebanyak mungkin" menuntut interval 14 hari, confusion drill menuntut adanya pasangan yang sering tertukar, dan plat utuh sampai kabupaten menuntut data kode belakang yang di MVP cuma ada untuk lima wilayah. Karena itu bentuk **Tanpa Petunjuk** wajib ada untuk setiap kode tanpa kecuali. Tanpa jaminan ini, kode seperti DE atau DG — yang tidak punya data kode belakang dan mungkin tidak pernah tertukar dengan apa pun — akan mentok di interval 21 hari selamanya, kawasan Maluku tidak pernah bisa dinyatakan dikuasai, dan KPI penguasaan kawasan di PRD bagian 9 mustahil tercapai.

Acceptance criteria yang mengikat: untuk setiap kode di `plates.json`, generator soal harus bisa menghasilkan minimal satu soal Level 3 yang sah tanpa bergantung pada riwayat pengguna. Ini dicek lewat tes otomatis saat build, bukan diasumsikan.

### 3.5 Levels in Special Modes

- **Tantangan Harian** — campuran ketiga level, mengikuti status masing-masing kartu.
- **Mode Kilat** — selalu Level 1. Tujuannya melatih kecepatan, dan mengetik jawaban akan mengukur kecepatan jari, bukan kecepatan mengingat. Karena Level 1 biasanya di bawah level otomatis kebanyakan kartu, jawaban Mode Kilat tidak pernah memperbarui interval.
- **Confusion drill** — selalu Level 3, tanpa memandang status kartu. Pasangan yang sering tertukar memang soal pembedaan, dan menyajikannya sebagai pilihan ganda mudah justru menghapus gunanya.

---

## 4. Spaced Repetition Algorithm

### 4.1 Algorithm Choice

MVP memakai **FSRS dengan parameter default**, bukan SM-2.

Versi sebelumnya memilih SM-2 karena mengira FSRS butuh riwayat besar sebelum bisa dipakai. Anggapan itu keliru. Optimasi parameter memang butuh riwayat, tetapi FSRS bisa dipakai sejak pengulangan pertama dengan parameter bawaan yang sudah dilatih dari jutaan review pengguna lain. Riwayat pribadi cuma dibutuhkan untuk menyetelnya lebih lanjut, bukan sebagai syarat awal.

Dampaknya, implementasi jadi lebih sederhana: tidak perlu menulis dua algoritma dan tidak perlu memindahkan jadwal di tengah jalan. Rencana yang dulu disebut "migrasi ke FSRS" di Fase 3 sekarang cukup jadi pembaruan nilai parameter, tanpa mengubah struktur data.

### 4.2 How FSRS Works

FSRS memodelkan ingatan pada satu kartu dengan tiga besaran, disingkat DSR:

| Besaran | Arti | Analogi |
| --- | --- | --- |
| **D — Difficulty** | Tingkat kesulitan kartu bagi pengguna | Makin tinggi D, makin sulit kartu itu dipertahankan dalam ingatan |
| **S — Stability** | Perkiraan berapa lama ingatan terhadap kartu tetap kuat | Makin tinggi S, makin lebar jarak pengulangan yang bisa diambil |
| **R — Retrievability** | Perkiraan peluang pengguna masih bisa mengingat kartu saat ini | Nilainya turun seiring waktu sejak pengulangan terakhir |

R menyusut mengikuti kurva lupa: baru diulang R mendekati 1, makin lama makin turun, dan kecepatan turunnya ditentukan S. Kartu ber-S 60 hari kehilangan ingatan jauh lebih lambat daripada kartu ber-S 3 hari.

Setiap kali kartu dijawab, ketiganya diperbarui:

```
Jawaban benar  → S naik, R kembali mendekati 1
Jawaban salah  → S turun tajam, D naik
Jawaban benar saat R sudah rendah → S naik lebih banyak
```

Baris terakhir adalah prinsip utama sistem ini. Berhasil mengingat sesuatu saat ingatan sudah melemah memberi penguatan lebih besar daripada mengulang materi yang masih segar. Karena itu jadwal yang terlalu rapat bukan cuma membuang waktu, tetapi juga memberi penguatan lebih kecil per pengulangan.

### 4.3 Desired Retention

Dari model di atas, penjadwalan jadi satu hitungan sederhana: cari kapan R akan turun ke angka target, lalu jadwalkan pengulangan di hari itu.

Angka target itu disebut **desired retention**. Parameter inilah yang menyetel keseimbangan antara interval yang terlalu longgar dan terlalu ketat. Terka memakai **0,90**.

| Desired retention | Efek |
| --- | --- |
| 0,80 | Interval panjang, pengulangan sedikit, lebih sering lupa |
| **0,90** | Titik seimbang yang dipakai Terka |
| 0,95 | Interval pendek, hafalan ketat, beban pengulangan naik tajam |

Rentang 0,80–0,95 umumnya dianggap wajar, dengan 0,90 cocok untuk kebanyakan orang. Menaikkannya memperpendek interval dan menambah pengulangan harian, jadi angka ini terikat langsung ke anggaran waktu di bagian 4.7 — mengubahnya berarti hitungan anggaran wajib diulang.

Karena D dan S dihitung per kartu, kartu yang sudah dikuasai dapat interval yang makin panjang sampai berbulan-bulan, sementara kartu yang masih lemah tetap muncul tiap beberapa hari. Tingkat tantangan menyesuaikan sendiri, tanpa mekanisme tambahan.

### 4.4 Automatic Grading

**Tidak ada tombol penilaian.** FSRS memakai empat grade, dan grade itu ditentukan sistem dari dua hal yang sudah tersedia: benar atau salahnya jawaban, dan waktu sampai ketukan pertama.

Anki butuh penilaian mandiri karena jawabannya subjektif — cuma pengguna yang tahu apakah ia benar-benar ingat atau sekadar merasa ingat. Terka tidak punya masalah itu: jawabannya diketik dan diperiksa mesin. Menanyakan "tadi seberapa sulit?" ke orang yang baru saja mengetik jawaban benar cuma menambah satu ketukan per kartu dan satu sumber inkonsistensi, tanpa menambah informasi yang belum dipegang sistem.

**Pemetaan.**

| Kondisi | Grade | Alasan |
| --- | --- | --- |
| Salah, atau lewat batas waktu | 1 — Lagi | Tidak ada ambiguitas |
| Benar, tetapi butuh toleransi salah ketik | 2 — Sulit | Salah ejaan menandakan jawaban belum mantap |
| Benar, waktu di atas persentil 80 | 2 — Sulit | Response time lambat menandakan jawaban tidak langsung muncul |
| Benar, waktu antara persentil 20 dan 80 | 3 — Bagus | Kasus normal |
| Benar, waktu di bawah persentil 20 | 4 — Mudah | Jawaban muncul cepat, jadi interval boleh melar lebih jauh |

**Yang diukur adalah waktu sampai ketukan pertama, bukan sampai Enter ditekan.** Bedanya penting supaya pemetaan di atas tetap adil. Waktu penyelesaian total dipengaruhi panjang jawaban — "Kepulauan Riau" jelas lebih lama diketik daripada "Bali" meski keduanya diingat dengan keyakinan yang sama. Waktu sampai ketukan pertama lebih dekat menggambarkan proses mengingat daripada kecepatan mengetik.

**Persentil dihitung per tingkat kesulitan dan bersifat pribadi.** Level 1 dijawab dengan satu klik, Level 3 diketik dari nol, jadi sebaran waktunya sama sekali tidak sebanding. Tiap level punya distribusi sendiri, dihitung dari 200 jawaban benar terakhir di level itu — rolling window, bukan seluruh riwayat, supaya ambangnya ikut bergeser saat pengguna makin cepat.

**Fase awal.** Sebelum satu level punya 30 jawaban benar, semua jawaban benar di level itu diberi grade 3 — Bagus. Persentil dari sampel kecil belum bisa dipercaya; memakainya terlalu dini bisa menggeser interval berdasarkan data yang belum representatif.

**Batas waktu.** Mode Tanpa Petunjuk memakai batas 8 detik (bagian 9 nomor 2). Level lain tanpa batas waktu; jawaban lambat cukup ditangani lewat ambang persentil.

### 4.5 Storing Raw Answer Data, Not Grades

Setiap review menyimpan datanya sendiri, bukan cuma hasil pemetaannya:

```
{ "cardId": "dk::code2region", "ts": "...", "level": 2,
  "correct": true, "fuzzy": false, "msToFirstKey": 1840 }
```

Grade dihitung dari catatan itu setiap kali dibutuhkan, jadi tidak perlu dibekukan saat pengguna menjawab.

Ini salah satu pengaman terpenting di versi ini. Pemetaan response time ke grade di bagian 4.4 belum tervalidasi literatur; ambang persentil 20 dan 80 adalah asumsi awal yang masuk akal, bukan hasil penelitian langsung. Dengan menyimpan data mentah, ambangnya bisa diubah kapan saja dan seluruh riwayat bisa dihitung ulang seolah aturan baru sudah dipakai sejak awal. Kalau yang disimpan cuma grade final, ambang yang keliru mengunci riwayat secara permanen dan sulit diperbaiki.

Konsekuensinya di Fase 3 tahap 1: optimasi parameter FSRS jadi lebih penting, bukan kurang. Parameter default FSRS dikalibrasi pada data berisi penilaian manusia, sedangkan sebaran grade Terka dihasilkan mesin dan hampir pasti beda bentuknya. Penyetelan ke data sendiri yang akan menutup selisih itu.

### 4.6 Intervals and Learning Steps

**Learning steps** untuk kartu baru: tampil lagi setelah 1 menit, lalu 10 menit, kemudian masuk jadwal hitungan FSRS. Kalau kartu berstatus `review` dijawab salah, statusnya jadi `relearning` dan kartu dijadwalkan ulang setelah 10 menit.

**Fuzzing interval:** tiap interval hasil hitungan digeser acak ±5% supaya kartu yang dipelajari di hari yang sama tidak selalu jatuh tempo bersamaan lalu menumpuk.

**Implementasi:** pakai library FSRS yang sudah ada, bukan menulis ulang algoritmanya. Membuat scheduler sendiri padahal rumus dan implementasi teruji sudah tersedia cuma memperbesar peluang bug tanpa imbalan setara.

### 4.7 Daily Queue Order

```
Antrean sesi disusun dengan prioritas:

  1. Kartu `relearning` (paling membutuhkan pengulangan)
        ↓
  2. Confusion drill untuk pasangan yang sering tertukar
        ↓
  3. Kartu yang sudah waktunya diulang, dari seluruh cakupan,
     diurut dari interval terpendek
        ↓
  4. Kartu baru dari Cakupan, dibatasi 10 per hari
        ↓
  jika antrean 1–3 melebihi 40 kartu → kartu baru ditahan hari itu
```

**Anggaran waktu di balik kedua angka itu.** Learning steps 1 menit dan 10 menit berarti satu kartu baru tayang tiga kali dalam satu sesi, dan tayangan kartu baru lebih lama karena ada Fakta Singkat yang dibaca.

```
10 kartu baru × 3 tayangan × ~12 detik  = 360 detik
40 pengulangan × ~5 detik                    = 200 detik
                                   total ≈ 560 detik ≈ 9,3 menit
```

Batas 10 kartu baru dan 40 pengulangan dipilih karena hasilnya masih muat di target sesi 10 menit. Batas 20 kartu baru di versi sebelumnya menghasilkan sekitar 15 menit dan bentrok dengan target di PRD bagian 3, 9, dan 12. Bentroknya tidak kelihatan dulu karena anggaran waktunya belum pernah dihitung eksplisit. Kalau salah satu batas diubah, hitungan ini wajib diulang.

Aturan penahanan di langkah terakhir menjaga beban tetap terkendali dalam jangka panjang. Tanpanya, kartu baru terus bertambah sementara tunggakan pengulangan menumpuk, sesi harian naik dari sekitar 10 menit jadi puluhan menit, dan aplikasinya berhenti jadi kebiasaan.

### 4.8 Two-Way Cards

Arah "kode → wilayah" dan "wilayah → kode" dijadwalkan sebagai **dua kartu terpisah**, dengan dua pembatas:

1. **Syarat membuka kartu arah sebaliknya.** Kartu arah sebaliknya baru dibuat setelah kartu arah utama mencapai interval minimal 7 hari. Sebelum itu, kartunya belum ada di sistem.
2. **Pemisahan jadwal kartu dari wilayah yang sama.** Dua kartu dari wilayah yang sama tidak tampil di hari yang sama. Kalau jadwalnya bertepatan, kartu arah sebaliknya mundur satu hari.

Alasannya: menggabungkan dua arah dalam satu kartu bisa menyembunyikan kelemahan di salah satu arah, sedangkan membuat keduanya sejak awal langsung menggandakan beban harian. Syarat pembukaan memberi kompromi yang lebih baik — kemampuan dua arah tetap terukur terpisah, tetapi kartu keduanya baru ditambahkan setelah kartu utama lebih stabil dan lebih jarang minta pengulangan.

Kartu arah sebaliknya mewarisi cakupan dari kartu arah utama, jadi tidak pernah muncul sebagai materi baru di kawasan yang belum disentuh.

### 4.9 Day Boundary and Time Zone

Tiga hal bergantung pada batas hari — kuota kartu baru, jadwal pengulangan, dan hitungan hari aktif berturut-turut — jadi batas itu harus ditetapkan eksplisit.

- Pergantian hari jatuh pada **pukul 04.00 waktu lokal perangkat**, bukan tengah malam dan bukan UTC. Latihan pukul 01.00 masih dihitung sebagai hari sebelumnya, jadi sesi larut malam tidak memakai kuota kartu baru hari berikutnya dan tidak memutus Hari Beruntun.
- Time zone diambil dari perangkat. Untuk pengguna di WITA, batas harinya 04.00 WITA.
- Pindah time zone tidak pernah memajukan jadwal pengulangan. Kalau zona berubah dan batas hari jadi terlewat lebih cepat, sistem memakai yang lebih lambat di antara keduanya, supaya bepergian tidak menghasilkan dua kuota kartu baru dalam satu hari nyata.

### 4.10 Undo

Grade otomatis menghapus risiko salah tekan tombol penilaian, tetapi menyisakan risiko lain: pengguna bisa menekan Enter sebelum jawabannya selesai diketik. Dalam alur cepat, kesalahan seperti ini gampang terjadi dan bisa mencatat jawaban benar sebagai salah.

Aturannya: **jawaban terakhir selalu bisa dibatalkan**, lewat tombol Z, sampai jawaban berikutnya masuk. Pembatalan memulihkan `stability`, `difficulty`, `interval`, `due`, `reps`, dan `lapses` ke nilai sebelum grade itu, jadi tiap kartu menyimpan satu salinan state sebelumnya.

Implementasinya cuma butuh satu properti tambahan per kartu. Biayanya kecil sekali dibanding manfaatnya, karena mencegah kerusakan data yang sulit terdeteksi setelah sesi selesai.

### 4.11 Effect of Special Modes on Scheduling

Ditulis eksplisit supaya satu kartu tidak pernah dinilai dua kali dalam sehari:

| Mode | Sumber kartu | Memperbarui interval? |
| --- | --- | --- |
| Sesi harian | Antrean bagian 4.7 | Ya |
| Tantangan Harian | Kartu yang sudah pernah dipelajari | Tidak |
| Mode Kilat | Kartu yang sudah pernah dipelajari | Tidak |
| Latihan Terfokus | Satu wilayah yang dipilih | Hanya kalau kartunya sudah jatuh tempo |

Tantangan Harian dan Mode Kilat tidak memperbarui interval karena keduanya bisa menarik kartu yang belum jatuh tempo. Kalau hasilnya ikut mengubah jadwal, satu kartu bisa dinilai dua kali dalam sehari dengan hasil berbeda. Hasil akhirnya lalu bergantung pada urutan penilaian — sumber bug sekaligus perusak konsistensi data interval.

Keduanya tetap mencatat akurasi dan pasangan yang sering tertukar. Yang dicabut cuma wewenangnya atas jadwal.

---

## 5. Answer Grading

### 5.1 Single Answer

Jawaban ketik bebas memunculkan masalah yang tidak ada di pilihan ganda: menentukan kapan jawaban masih boleh dihitung benar. Karena itu urutan pemeriksaan berikut bersifat tetap dan dijalankan berurutan:

1. **Normalisasi.** Huruf kecil semua, spasi berlebih dibuang, tanda baca dibuang, awalan administratif seperti "Kota", "Kabupaten", "Kab." diabaikan.
2. **Cocok persis dengan alias.** Tiap wilayah punya daftar nama alternatif yang dihitung benar penuh (misalnya "Jogja", "Yogya", "Yogyakarta", "DIY"). Cocok di sini → benar, selesai.
3. **Cek kamus lebih dulu.** Kalau jawaban cocok persis dengan nama wilayah **lain** yang valid, jawaban itu langsung dinilai salah dan dicatat sebagai pasangan yang sering tertukar. Tidak ada toleransi salah ketik di langkah ini. Kamusnya kamus nasional, bukan kamus cakupan aktif — kesalahan lintas pulau justru yang paling penting tercatat.
4. **Toleransi salah ketik, hanya untuk jawaban berupa nama wilayah.** Jarak Levenshtein dengan ambang 1 untuk jawaban di bawah 8 karakter dan 2 untuk yang lebih panjang, dengan syarat tambahan huruf pertama harus sama. Dihitung benar, tetapi ejaan yang benar tetap tampil sebagai koreksi, dan review-nya ditandai `fuzzy` sehingga grade-nya dibatasi di 2 — Sulit (bagian 4.4).

**Jawaban berupa kode dinilai kecocokan persis, tanpa toleransi sama sekali.** Ini pengecualian mutlak atas langkah 4, dan alasannya aritmetis: kode plat panjangnya satu sampai dua huruf, jadi ambang Levenshtein 1 akan menerima BD untuk jawaban BE, juga BG untuk BE, DR untuk DK, AB untuk AD, dan PB untuk PA. Syarat huruf pertama sama justru memperparah, karena persis itulah ciri pasangan yang paling sering tertukar.

Dampaknya bukan cuma salah nilai. Kalau toleransi salah ketik dipakai pada kode, detektor pasangan sering tertukar di bagian 6 kehilangan data penting karena kesalahan seperti BD ↔ BE malah dihitung benar. Fitur yang seharusnya memaafkan salah ketik jadi ikut menutupi kesalahan ingatan.

Syarat huruf pertama sama dipakai sebagai pengaman awal selama data kalibrasi belum cukup. Nama wilayah pendek dengan huruf awal berbeda gampang memicu kecocokan palsu; syarat ini menekan risiko itu tanpa menunggu ratusan jawaban nyata.

### 5.2 Set Answer

Bentuk "sebutkan sebanyak mungkin" butuh aturan sendiri, karena tidak ada satu jawaban benar.

1. **Pakai ambang, bukan kelengkapan penuh.** Targetnya jumlah jawaban yang wajar, bukan seluruh isi himpunan — misalnya 5 dari 12 wilayah untuk kode besar. Menuntut semuanya membuat kode seperti B terlalu sulit dan kode seperti DG terlalu gampang, sehingga tingkat kesulitan antar kode tidak sebanding.
2. **Urutan bebas, tanpa batas waktu.** Jawaban diketik satu per satu. Yang diukur bukan kecepatan.
3. **Berhenti kapan saja tanpa penalti.** Nilainya jumlah yang berhasil disebut, bukan rasio terhadap total, jadi berhenti di angka 5 tidak dihukum.
4. **Kesalahan yang bermakna tetap dicatat.** Jawaban keliru yang sebenarnya valid untuk kode lain dicatat sebagai pasangan yang sering tertukar. Bentuk soal ini paling subur untuk menemukan pola kebingungan, karena recall tanpa petunjuk sering memunculkan wilayah lain yang tertukar di ingatan.
5. **Penilaian akhir.** Mencapai ambang setara "Bagus"; melampaui ambang dua item atau lebih jadi "Mudah"; di bawah ambang jadi "Sulit"; nol jawaban benar jadi "Lagi".

---

## 6. Confusion Detection and Handling

### 6.1 Recording

Setiap jawaban salah dicatat sebagai pasangan berarah `(kartu_benar, jawaban_diberikan)`, bukan cuma status salah. Sistem jadi tahu bukan cuma bahwa pengguna gagal mengingat, tetapi juga item apa yang tertukar di ingatannya.

### 6.2 When a Pair Enters the Drill List

| Kondisi | Tindakan |
| --- | --- |
| Pasangan muncul 3 kali dalam 30 hari | Tandai sebagai pasangan yang sering tertukar |
| Pasangan sudah ditandai | Tambahkan confusion drill ke prioritas 2 antrean |
| Benar 5 kali berturut pada confusion drill | Hapus tanda dan kembalikan ke jadwal normal |
| Tertukar lagi setelah tanda dihapus | Ambang turun jadi 2 kali |

Pasangan yang sering tertukar tidak dibatasi Cakupan. Kalau BE tertukar dengan DE, confusion drill tetap bisa muncul meski cakupan aktifnya cuma Sumatera. Kesalahan lintas kawasan justru penting dicatat karena lebih gampang lolos kalau latihan selalu dikurung per wilayah.

### 6.3 Drill Format

Kedua item tampil bersamaan dalam pertanyaan yang menuntut pengguna membedakan keduanya, misalnya: "Mana yang Bengkulu, BD atau BE?" Sistem juga menampilkan satu ciri pembeda yang konkret, seperti pengelompokan geografis, urutan huruf, atau fakta historis dari PRD bagian 13.

Pendekatan ini berbeda dari intuisi umum yang menyuruh memisahkan item serupa. Memisahkannya cuma menunda momen kedua item harus dibedakan. Menampilkannya berdampingan justru membantu pengguna membentuk ciri pembeda yang jelas.

### 6.4 Leech Cards

Bagian 6.1 sampai 6.3 menangani kartu yang tertukar dengan kartu tertentu. Ada pola kegagalan lain: kartu yang terus salah tanpa pola jawaban pengganti yang konsisten. Kartu seperti ini tidak punya pasangan untuk dibuatkan confusion drill, jadi ia bisa bolak-balik ke `relearning`, muncul terus, dan akhirnya memakan porsi besar antrean harian.

| Kondisi | Tindakan |
| --- | --- |
| `lapses` mencapai 6 | Ditandai sebagai kartu sulit dikuasai; konteks tampil sebelum pertanyaan |
| `lapses` mencapai 8 | Kartu jadi `suspended` otomatis dan masuk daftar pemeriksaan |
| Setelah ditinjau | Diaktifkan manual, dengan D dan S direset ke nilai kartu baru |

Menampilkan Fakta Singkat sebelum pengguna menjawab di ambang pertama memang menyimpang dari prinsip PRD bagian 6.5, dan itu disengaja. Kalau kartu sudah gagal enam kali, recall tanpa bantuan terbukti belum jalan; memberi konteks lebih dulu lebih berguna daripada mempertahankan aturan umum secara kaku.

Batas penonaktifan diperlukan supaya satu kartu bermasalah tidak menyita antrean harian. Mengistirahatkan satu kartu lebih baik daripada membiarkannya membuat seluruh sesi terasa berat dan merusak kebiasaan belajar.

---

## 7. Card State Flow

| Status internal | Label kalau perlu tampil di UI | Masuk status ini ketika | Jadwal berikutnya | Berubah status ketika |
| --- | --- | --- | --- | --- |
| `locked` | Belum Tersedia | Kartu arah sebaliknya belum boleh dibuka | Tidak dijadwalkan | Kartu arah utama mencapai interval 7 hari |
| `new` | Belum Dipelajari | Kartu belum pernah dilihat | Antre di prioritas 4 kalau termasuk Cakupan | Dijawab pertama kali |
| `learning` | Sedang Dipelajari | Jawaban pertama masuk | 1 menit → 10 menit | Dua tahap awal selesai |
| `review` | Sedang Dipelajari | Tahap `learning` selesai | Sesuai interval terhitung, tanpa memandang Cakupan | Salah dijawab |
| `relearning` | Sedang Dipelajari | Salah saat berstatus `review` | 10 menit, lalu interval berikutnya dipotong 50% | Benar sekali |
| `mature` | Dikuasai | Interval 21 hari **dan** pernah benar di Level 3 | Sesuai interval | Salah dijawab |
| `leech` | Sulit Dikuasai | `lapses` mencapai 6 | Sesuai interval, Fakta Singkat tampil lebih dulu | `lapses` turun setelah reset |
| `suspended` | Dinonaktifkan | Ditandai manual, `confidence` turun, `id` hilang dari data, atau `lapses` mencapai 8 | Tidak dijadwalkan | Diaktifkan kembali secara manual |

Cakupan cuma memengaruhi kartu berstatus `new`. Begitu kartu keluar dari status itu, jadwalnya dikelola global dan tidak bisa lagi disembunyikan dengan mengganti Cakupan.

Nama dalam backtick adalah **status internal** untuk implementasi dan debugging. UI tidak perlu menampilkan `review`, `relearning`, atau `leech` apa adanya. Beberapa status sengaja digabung ke label yang lebih sederhana supaya pengguna cuma melihat kondisi yang relevan: **Belum Dipelajari**, **Sedang Dipelajari**, **Dikuasai**, **Sulit Dikuasai**, atau **Dinonaktifkan**.

Status `suspended` diperlukan supaya entri yang belakangan diragukan bisa diistirahatkan tanpa menghapus riwayat belajarnya.

---

## 8. Acceptance Criteria

Kriteria berikut mengikat dan diperiksa lewat tes otomatis atau pemeriksaan manual sebelum MVP dinyatakan selesai. Tiap butir merangkum aturan yang sudah ditetapkan di bagian sebelumnya.

| # | Kriteria | Rujukan |
| --- | --- | --- |
| AC-1 | Untuk setiap kode di `plates.json`, generator soal menghasilkan minimal satu soal Level 3 yang sah tanpa bergantung pada riwayat pengguna. Dicek saat build. | bagian 3.4 |
| AC-2 | Kartu hanya jadi `mature` kalau interval ≥ 21 hari dan pernah benar minimal sekali di Level 3. | bagian 3.4 |
| AC-3 | Kartu yang sudah jatuh tempo tidak pernah disaring Cakupan; antrean pengulangan diambil dari seluruh kartu. | bagian 2.4 |
| AC-4 | Batas 10 kartu baru per hari berlaku global, dan mengganti Cakupan tidak mereset batas itu. | bagian 2.4 |
| AC-5 | Kartu baru ditahan hari itu kalau antrean prioritas 1–3 melebihi 40 kartu. | bagian 4.7 |
| AC-6 | Jawaban di level manual yang lebih rendah tidak mengubah `stability`, `difficulty`, maupun interval, tetapi tetap masuk statistik dan deteksi pasangan tertukar. | bagian 3.3 |
| AC-7 | Jawaban berupa kode dinilai kecocokan persis, tanpa toleransi salah ketik. | bagian 5.1 |
| AC-8 | Satu kartu tidak pernah memperbarui interval dua kali dalam satu hari; Tantangan Harian dan Mode Kilat tidak pernah menyentuh jadwal. | bagian 4.11 |
| AC-9 | Undo memulihkan `stability`, `difficulty`, `interval`, `due`, `reps`, dan `lapses` ke nilai sebelum grade terakhir. | bagian 4.10 |
| AC-10 | Batas hari jatuh pukul 04.00 waktu lokal perangkat, dan pindah time zone tidak pernah memajukan jadwal pengulangan. | bagian 4.9 |
| AC-11 | Grade dihitung ulang dari data jawaban mentah, bukan dibaca dari nilai yang dibekukan saat menjawab. | bagian 4.5 |
| AC-12 | Kartu dengan `lapses` 6 menampilkan Fakta Singkat sebelum pertanyaan, dan `lapses` 8 membuat kartunya `suspended` otomatis. | bagian 6.4 |

---

## 9. Open Questions

Pertanyaan terbuka soal produk dan konten ada di PRD bagian 14.

1. Apakah kawasan Jawa perlu dipecah jadi dua cakupan tetap (Jawa bagian barat dan timur) mengingat isinya 22 kode, atau cukup mengandalkan tingkat provinsi di bawahnya? Menunggu bukti bahwa tingkat provinsi memang terasa cukup saat dipakai.
2. Berapa batas waktu yang tepat untuk mode Tanpa Petunjuk? Angka 8 detik dipakai sebagai titik awal karena longgar untuk nama panjang tetapi masih menutup peluang menebak-nebak. Perlu ditinjau setelah median waktu ketukan pertama terkumpul.
3. Apakah jenis kartu yang berbeda punya pola lupa yang cukup berbeda untuk membenarkan dua set parameter FSRS? Baru bisa dijawab setelah tahap 1 Fase 3 selesai dan selisihnya terukur, bukan ditebak.
4. Apakah ambang persentil 20 dan 80 sudah tepat, dan apakah keduanya perlu beda antar level? Jawabannya menunggu tahap 3 Fase 3; sampai saat itu ambang sekarang diperlakukan sebagai titik awal, bukan angka final.
5. Apakah ambang `lapses` 6 dan 8 terlalu ketat untuk kode belakang, yang wajarnya memang lebih sulit daripada kode depan? Kemungkinan perlu ambang berbeda per jenis kartu.
