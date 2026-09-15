# TERKA — Product Requirements Document (PRD)

**Versi:** 2.1 (MVP) · **Status:** Draft · **Bahasa:** Indonesia
**Acuan:** Dokumen Kode Plat Nomor Kendaraan Indonesia (sumber data)
**Dokumen terkait:** SRD (aturan perilaku sistem) · TRD (arsitektur dan model data)

> **Tagline:** Lihat platnya, terka asalnya.
> **Fokus dokumen ini:** masalah, prinsip, cakupan produk, alur pengguna, dan ukuran keberhasilan.

---

## 1. Product Overview

**Product Name:** Terka

**Product Type:** Progressive Web App (PWA) untuk latihan hafalan berbasis spaced repetition — satu pengguna, offline-first, tanpa backend.

**Problem Statement:** Kode plat nomor Indonesia mencakup sekitar 60 kode wilayah depan (1–2 huruf), ditambah ratusan kombinasi kode belakang di tingkat kabupaten/kota. Membaca tabelnya berulang kali tidak cukup, karena tiga hal. Pertama, materi tidak muncul lagi sesuai kebutuhan: kode yang sudah dikuasai tetap terbaca, sedangkan kode yang mulai lupa belum tentu terulang. Kedua, membaca tabel melatih pengenalan, bukan recall. Ketiga, banyak kode berpola mirip — BE/BD/BH/BG, D/E/F/T/Z, AA/AB/AD/AE/AG — sehingga kesalahan muncul karena satu kode tertukar dengan kode lain.

Enam puluh kode sekaligus juga terlalu berat kalau semuanya masuk satu kelompok. Materi harus bisa dipersempit sampai satu kode, lalu dilebarkan bertahap sampai seluruh Indonesia. Karena itu aplikasi butuh hierarki cakupan yang jelas, bukan filter biasa.

**Development Context:** Proyek pribadi, satu pengguna, dikerjakan sendiri. Sumber datanya sudah ada: dokumen referensi kode plat yang sudah diverifikasi dan dikoreksi. Terka memakai data itu sebagai materi latihan, bukan mengumpulkan data baru.

---

## 2. Design Principles

Sembilan prinsip berikut mendasari setiap keputusan fitur. Kalau ada usulan fitur yang bertentangan dengan salah satunya, fitur itu tidak dipakai.

1. **Recall aktif lebih utama daripada pengenalan.** Jawaban diketik, bukan dipilih. Pilihan ganda hanya dipakai di kartu yang benar-benar baru sebagai tahap peralihan, lalu berhenti begitu kartu naik status.
2. **Konsistensi jadwal mengalahkan volume latihan.** Sepuluh menit setiap hari lebih berguna daripada dua jam seminggu sekali. Aplikasi menahan latihan berlebih, bukan memancing pengguna menambah sesi.
3. **Kode mirip yang saling tertukar adalah sumber kesalahan utama.** Sistem tidak cukup mencatat bahwa jawaban salah; sistem juga mencatat jawaban itu tertukar dengan apa. Pasangan yang sering tertukar lalu ditampilkan berdampingan sampai pengguna bisa membedakannya dengan konsisten.
4. **Konteks latihan menyerupai pemakaian nyata.** Soal sebisa mungkin tampil sebagai plat utuh (`DK 1234 ABC`), bukan kode yang berdiri sendiri, supaya hasil latihan gampang dipakai saat melihat plat di jalan.
5. **Konteks mengalahkan pengulangan tanpa makna.** Setiap kartu membawa konteks historis singkat tentang asal kodenya. Informasi yang punya alasan atau cerita lebih gampang diingat daripada asosiasi kosong.
6. **Cakupan membatasi materi baru, bukan kartu yang sudah waktunya diulang.** Memilih satu kawasan boleh menahan materi baru dari cakupan lain, tetapi tidak boleh menyembunyikan kartu lama yang sudah jatuh tempo.
7. **Tingkat kesulitan mengikuti perkembangan kartu, bukan selera sesaat.** Level bawaan ditentukan kematangan kartu. Level boleh diturunkan manual, tetapi jawaban benar di level yang lebih mudah tidak dihitung sebagai bukti penguasaan penuh.
8. **Sistem tidak menanyakan hal yang bisa diukur sendiri.** Grade diturunkan dari benar-salah dan response time, bukan ditanyakan ke pengguna. Pertanyaan yang jawabannya sudah diketahui sistem hanya menambah satu ketukan dan satu sumber inkonsistensi.
9. **Data tersimpan lokal dan tetap dipegang pengguna.** Tidak ada akun, server, atau pelacakan pemakaian. Konsekuensinya, backup wajib ada dan bukan fitur pelengkap.

---

## 3. Goals

**Primary Goal:** Menyebutkan wilayah asal dari kode depan mana pun dengan akurasi minimal 95%, waktu sampai ketukan pertama di bawah 3 detik, dan kemampuan itu bertahan setidaknya 30 hari tanpa latihan intensif.

**MVP Goals:**

- Seluruh kode wilayah depan masuk penjadwalan spaced repetition.
- Tiga mode soal jalan: kode → wilayah, wilayah → kode, dan plat utuh → wilayah.
- Materi bisa dipersempit ke empat tingkat — nasional, kawasan, provinsi, atau satu kode — tanpa merusak jadwal yang sedang berjalan.
- Penjadwalan memakai FSRS dengan desired retention 0,90, sehingga tingkat tantangan menyesuaikan sendiri per kartu.
- Tiga tingkat kesulitan berjalan otomatis mengikuti kematangan kartu, dengan syarat Level 3 sebelum kartu boleh matang.
- Statistik akurasi dan waktu jawab tersedia per kartu, per wilayah terpilih, dan per tingkat kesulitan.
- Aplikasi jalan penuh tanpa koneksi internet.
- Sesi harian rutin selesai di bawah 10 menit setelah pola belajar stabil, dengan anggaran waktu yang dihitung eksplisit di SRD bagian 4.7, bukan diasumsikan.

**Out of Scope:** menjadi produk publik, mendukung banyak pengguna, menyediakan konten di luar kode plat, atau menjadi rujukan resmi untuk urusan administratif.

---

## 4. Target User

**Target awal:** satu orang — pemilik proyek.

**Karakteristik yang membentuk desain:**

- Dokumen referensinya sudah lengkap, jadi fitur pencarian data bukan nilai jual utama.
- Tinggal di Bali, tempat plat luar daerah lewat setiap hari. Frekuensi kemunculan nyata bisa dipakai untuk menentukan prioritas kartu dan urutan membuka cakupan.
- Terbiasa cepat dengan keyboard, jadi alur menjawab lalu lanjut ke soal berikutnya harus bisa dijalankan tanpa mouse, termasuk saat berpindah cakupan.

**Implikasi langsung:** onboarding, autentikasi, dukungan multi-user, dan tutorial tidak diperlukan. Asumsi ini baru ditinjau ulang kalau produk dibuka ke publik, dan itu sengaja ditunda sampai Fase 3.

---

## 5. Scope (MVP)

**In scope:**

- Seluruh kode wilayah depan (1–2 huruf) beserta wilayah dan konteks historisnya.
- Hierarki cakupan empat tingkat secara penuh (SRD bagian 2). Ini masuk MVP karena biayanya rendah — pada dasarnya cuma filter antrean — sementara dampaknya besar untuk kelayakan proyek di minggu pertama.
- Kode belakang untuk lima wilayah prioritas: **DK, B, L, D, AD**. Dasarnya frekuensi ditemui di jalan dari sudut pandang pengguna, bukan kelengkapan nasional. Prioritas berikutnya: DR dan EA.
- Engine spaced repetition, penilaian jawaban ketik, drill untuk pasangan yang sering tertukar.
- Tiga tingkat kesulitan (SRD bagian 3), berlaku di seluruh bentuk soal.
- Tujuh bentuk soal Golongan A dan satu bentuk Golongan B (bagian 6.3). Sebelas bentuk lain sudah dirancang dan tercatat, tetapi ditunda ke Fase 2.
- Kumpulan fakta historis singkat sebagai konteks tambahan (bagian 13).
- Statistik per kartu dan per wilayah, Tantangan Harian, serta Mode Kilat.
- PWA offline dengan backup otomatis.

**Out of scope:**

- Peta interaktif sebagai mode soal (Fase 2 — nilainya tinggi, biayanya juga).
- Akun, sinkronisasi antar-perangkat, leaderboard sosial (Fase 3 dan seterusnya).
- Kode khusus (RI, CD, CC) — tampil di halaman Referensi, tidak masuk sistem hafalan.

**Jumlah kartu.** Setiap mode jadi kartu tersendiri dengan jadwalnya masing-masing. Karena itu jumlah kartu bisa dihitung, bukan dikira-kira:

| Sumber kartu | Perhitungan | Jumlah |
| --- | --- | --- |
| Kode → wilayah | 60 kode × 1 | 60 |
| Wilayah → kode | 60 kode × 1, dibuka bertahap | 60 |
| Tanpa Petunjuk | 60 kode × 1 | 60 |
| Sebutkan sebanyak mungkin | 60 kode × 1, dibuka bertahap | 60 |
| Plat utuh | 5 wilayah prioritas × 1 | 5 |
| Kode belakang | 5 wilayah prioritas, rata-rata 12 kabupaten | ~60 |
| **Total** | | **~305** |

Bentuk benar/salah kilat, bukan-yang-mana, dan fakta → kode tidak menambah kartu; ketiganya cara menyajikan kartu yang sudah ada. Angka ~305 dipakai untuk semua proyeksi jadwal, menggantikan perkiraan kasar 500 di versi sebelumnya.

**Batas beban harian:** maksimal 10 kartu baru per hari, ditambah kartu yang sudah waktunya diulang. Batas ini global, bukan per cakupan. Ini bukan preferensi tampilan, melainkan pengaman terhadap salah satu risiko utama proyek (lihat bagian 10).

---

## 6. Core Features

### 6.1 Spaced Repetition Engine

Inti produk. Setiap kartu punya jadwal sendiri yang mengikuti riwayat jawabannya. Kartu yang sering salah muncul lebih sering; kartu yang sudah mapan makin jarang. Detail algoritmanya di SRD bagian 4.

Tanpa komponen ini, sisa fiturnya cuma jadi kuis biasa yang hasil hafalannya cepat hilang.

### 6.2 Cakupan

Pemilih **Cakupan** punya empat tingkat: Nasional → Kawasan → Provinsi → Kode. Tingkat terkecil adalah satu kode beserta seluruh wilayah dan kode belakang yang dicakupnya, misalnya DK saja atau BE saja.

Dua hal ini berbeda dan tidak boleh tertukar: **Cakupan** menentukan materi baru mana yang boleh mulai dipelajari, sedangkan **Latihan Terfokus** adalah latihan tambahan untuk wilayah tertentu yang tidak mengubah jadwal kartu yang belum jatuh tempo. Aturan lengkapnya di SRD bagian 2.

### 6.3 Question Types

Bentuk soal dibagi tiga golongan menurut waktu pengerjaannya. Faktor itu yang menentukan apakah bentuk soal boleh masuk antrean harian.

**Golongan A — soal singkat.** Satu fakta, jawaban tunggal, selesai di bawah 5 detik. Hanya golongan ini yang boleh jadi kartu biasa di antrean harian.

| Bentuk | Contoh | Level | Status |
| --- | --- | --- | --- |
| Kode → Wilayah | `B` → ketik wilayah | 2 | MVP |
| Wilayah → Kode | `Purwokerto` → ketik kode | 2 | MVP |
| Plat utuh → Wilayah | `DK 1234 ABC` → wilayah, lalu kabupaten | 2–3 | MVP |
| Kode belakang | `B ... xUx` → kabupaten | 2–3 | MVP |
| Benar/salah kilat | "BE = Bengkulu?" batas 2 detik | 1 | MVP |
| Mana yang bukan | "Mana yang BUKAN wilayah BK?" | 1 | MVP |
| Fakta → Kode | "Kode mana yang dulunya DS?" | 2 | MVP |
| Tanpa Petunjuk | Kode ditampilkan, jawaban diketik tanpa petunjuk, batas 8 detik | 3 | MVP |
| Isi deret bolong | "AA, AB, ?, AE, AG" | 2 | Fase 2 |
| Kode Terbalik | "Kode mana yang merupakan kebalikan dari AD?" | 2 | Fase 2 |
| Petunjuk bertahap | Tiga petunjuk, nilai turun tiap dibuka | 2 | Fase 2 |
| Plat Tidak Mungkin | "Mana plat yang tidak mungkin ada?" | 3 | Fase 2 |
| Skenario lokasi | "Di Denpasar melihat AD 5678 XY, dari mana?" | 2 | Fase 2 |

**Golongan B — soal gabungan.** Satu soal bisa makan satu sampai dua menit. Tidak pernah masuk antrean harian sebagai kartu biasa; dijadwalkan terpisah dengan interval sendiri dan hanya muncul kalau prasyaratnya terpenuhi.

| Bentuk | Contoh | Level | Status |
| --- | --- | --- | --- |
| Sebutkan sebanyak mungkin | "Sebutkan 5 daerah kode plat BK" | 3 | MVP |
| Kelompokkan berdasarkan wilayah | Seret 8 kode ke 7 kawasan | 2 | Fase 2 |
| Urutkan kronologis | Susun W, DP/DW, KU, PB, PA, PT menurut tanggal | 3 | Fase 2 |
| Soal Berantai | Jawaban satu soal menjadi bahan soal berikutnya | 3 | Fase 2 |
| Wilayah berbatasan | "Kode apa saja yang berbatasan dengan D?" | 3 | Fase 2 |
| Perbaiki pernyataan salah | "DA adalah kode Kalteng." → betulkan | 3 | Fase 2 |

**Golongan C — khusus Mode Kilat.** Terlalu cepat untuk memberi sinyal penjadwalan yang bermakna, tetapi berguna melatih kecepatan: benar/salah kilat, tebak kawasan dari kode, tebak huruf pertama saja. Jawaban di golongan ini tidak pernah memperbarui interval.

Empat bentuk soal MVP di luar mode inti dipilih bukan karena paling menarik, melainkan karena biaya implementasinya sangat kecil di atas komponen yang sudah ada. Tiga bentuk Golongan A memakai alur penilaian dan data yang sama, tanpa komponen UI baru. Satu-satunya tambahan dari Golongan B adalah "sebutkan sebanyak mungkin", karena bentuk itu paling menuntut sekaligus paling besar nilai latihannya.

**Tanpa Petunjuk adalah bentuk Level 3 yang tersedia untuk semua kode.** Bentuk ini sengaja tidak bergantung pada data tambahan: tidak butuh data kode belakang, tidak butuh pasangan yang sering tertukar, tidak butuh prasyarat kematangan. Setiap kode wajib punya bentuk ini. Alasannya struktural: syarat Level 3 di SRD bagian 3.4 hanya bisa dilewati kalau selalu ada minimal satu bentuk soal Level 3, sementara tiga bentuk Level 3 lainnya punya prasyarat.

**Prasyarat "sebutkan sebanyak mungkin".** Kartu "sebutkan sebanyak mungkin" (`bk::setrecall`) baru dibuat setelah kartu `bk::code2region` mencapai interval minimal 14 hari. Prasyaratnya sengaja bukan status `mature`, karena status itu ikut bergantung pada syarat Level 3. Kalau `mature` dipakai sebagai prasyarat, kedua aturan saling menunggu dan tidak ada yang terpenuhi. Aturan penilaiannya di SRD bagian 5.2.

**Pengecoh.** Pada bentuk pilihan, pengecoh diambil menurut tingkat kesulitan (SRD bagian 3). Pengecoh dari pulau lain terlalu gampang dieliminasi dan membuat soal kehilangan daya ujinya, jadi ia hanya dipakai di tingkat termudah.

Mode plat utuh memakai generator yang menggabungkan angka acak dengan sufiks yang valid. Tampilan soalnya terus berubah, jadi pengguna tidak bisa menghafal bentuk visual tertentu.

### 6.4 Confusion Drill

Setelah engine spaced repetition, fitur ini yang rasio nilai terhadap biayanya paling besar. Sistem tidak hanya mencatat kartu mana yang salah, tetapi juga jawaban salah apa yang diberikan. Kalau dua item berulang kali tertukar, sistem membuat drill yang menampilkan keduanya berdampingan. Logika lengkapnya di SRD bagian 6.

### 6.5 Fakta Singkat

Setelah pengguna menjawab, kartu bisa menampilkan satu atau dua kalimat **Fakta Singkat** dari bagian 13, misalnya asal pembagian karesidenan, pola pengelompokan huruf, atau tanggal perubahan kode. Fakta ini tidak muncul sebelum jawaban, supaya tidak berubah jadi petunjuk.

Setiap Fakta Singkat punya label status — `terverifikasi`, `diperdebatkan`, atau `legenda` — dan labelnya selalu tampil. Tujuannya bukan kehati-hatian akademis. Beberapa cerita yang paling gampang diingat justru paling lemah dasarnya; menandainya sejak awal mencegah cerita itu tertanam sebagai fakta pasti.

### 6.6 Stats and Mastery Map

Statistik dibatasi tiga tampilan supaya fitur ini tidak tumbuh jadi dashboard:

- Daftar kartu terlemah, diurut menurut tingkat kesalahan.
- Perkiraan jumlah kartu yang perlu diulang selama 14 hari ke depan, dikelompokkan per kawasan.
- Peta Indonesia yang diwarnai menurut tingkat penguasaan tiap cakupan.

Peta Penguasaan bersifat statis dan cuma untuk melihat tingkat penguasaan wilayah. Peta interaktif sebagai mode soal adalah pekerjaan terpisah di Fase 2.

### 6.7 Tantangan Harian and Mode Kilat

**Tantangan Harian:** lima soal, sekali sehari, dengan hitungan Hari Beruntun. Bebannya ringan dan, yang lebih penting, menciptakan jeda antar sesi. Jeda itu justru yang membentuk memori jangka panjang. Soal diambil dari seluruh kartu yang pernah dipelajari, tanpa memandang cakupan.

**Mode Kilat:** 60 detik, kejar sebanyak mungkin jawaban benar; hasil terbaik disimpan sebagai Rekor Terbaik. Rekor dicatat terpisah per wilayah, karena Mode Kilat tingkat nasional dan Mode Kilat satu kawasan tidak sebanding tingkat kesulitannya.

### 6.8 Referensi

Halaman **Referensi** memungkinkan pengguna menelusuri dan mencari seluruh data tanpa penilaian. Navigasinya memakai hierarki wilayah yang sama dengan Cakupan. Halaman ini menggantikan kebiasaan membuka PDF saat butuh informasi cepat, dan tetap bisa menampilkan entri yang tingkat kepercayaannya belum cukup untuk masuk sistem hafalan.

---

## 7. User Flow

**Konvensi istilah UI.** Istilah internal di model data tidak otomatis jadi teks yang dilihat pengguna. Label berikut jadi acuan tunggal untuk seluruh UI supaya satu konsep tidak punya beberapa nama:

| Konsep | Label UI | Catatan |
| --- | --- | --- |
| `activeScope` / wilayah yang dipilih untuk materi baru | **Cakupan** | Dipakai di beranda dan pemilih wilayah |
| Sesi harian utama | **Mulai belajar** | Tombol utama di beranda |
| Latihan tambahan untuk wilayah tertentu | **Latih wilayah ini** | Membuka **Latihan Terfokus** tanpa mengubah Cakupan |
| Tantangan lima soal harian | **Tantangan Harian** | Nama mode tetap |
| Latihan kecepatan 60 detik | **Mode Kilat** | Nama resmi mode di UI |
| Penelusuran data tanpa penilaian | **Referensi** | Tujuan di bilah bawah, bukan tombol di beranda |
| Pemilih materi baru | **Cakupan** | Tujuan di bilah bawah; sekaligus nama pengaturannya |
| Satu node yang sedang disorot di pemilih | **wilayah** | Bukan nama pengaturan — lihat aturan istilah di bawah |
| Navigasi tetap di bagian bawah layar | **bilah bawah** | Empat tujuan: Beranda, Cakupan, Statistik, Referensi |
| Menerapkan pilihan wilayah | **Pilih wilayah ini** | Pemilih memakai model dua langkah; menelusuri saja tidak mengubah apa pun |
| Visual tingkat penguasaan wilayah | **Peta Penguasaan** | Nama resmi tampilan peta |
| Confusion drill untuk dua kode yang sering tertukar | **Bandingkan Kode** | Nama internalnya confusion drill |
| Status `mature` | **Dikuasai** | Nama internal tidak ditampilkan |
| Status `leech` | **Sulit Dikuasai** | Muncul sebagai penanda pada soal |
| Status `suspended` | **Dinonaktifkan** | Nama internal tidak ditampilkan |

Istilah teknis seperti FSRS, retrievability, `review`, `relearning`, dan nama properti JSON tetap dipakai di bagian spesifikasi teknis, tetapi tidak muncul di alur belajar biasa kecuali di layar debug atau pengaturan lanjutan.

**Satu kata untuk satu konsep.** Versi sebelumnya memakai dua kosakata — "cakupan" di prosa spesifikasi dan "Wilayah Belajar" di UI. Pembagian itu dibatalkan. Keduanya disatukan jadi **Cakupan**, dipakai di spesifikasi maupun UI.

Pemicunya bilah bawah. Label tab di layar ponsel realistis menampung sekitar sepuluh karakter; "Wilayah Belajar" tidak muat dan akan terpotong, sementara "Cakupan" muat dengan nyaman. Begitu tab-nya berlabel Cakupan sedangkan beranda berlabel Wilayah Belajar, aplikasi punya dua nama untuk satu hal — melanggar aturan 7 di bawah, dan masalahnya lebih besar daripada kekurangan masing-masing istilah itu.

Kekhawatiran sebelumnya bahwa "cakupan" terdengar seperti istilah implementasi ternyata berlebihan. Ia kata Indonesia biasa, bukan nama properti seperti `activeScope`.

| Istilah | Boleh tampil ke pengguna? |
| --- | --- |
| **Cakupan** | Ya — nama tab dan nama pengaturan |
| **Kawasan** | Ya — tingkat kedua pada hierarki |
| **wilayah** | Ya — merujuk satu node yang sedang disorot, bukan nama pengaturan |
| **node**, `activeScope` | Tidak — hanya prosa spesifikasi dan model data |

Baris ketiga penting supaya microcopy-nya tetap masuk akal: **Cakupan** nama pengaturannya, **wilayah** yang dipilih untuk mengisi pengaturan itu. Karena itu tombol **Pilih wilayah ini** mengubah **Cakupan**, dan kalimatnya tetap terbaca wajar.

### 7.1 Microcopy Guidelines

Microcopy Terka mengikuti aturan berikut supaya seluruh UI terasa konsisten:

1. **Tulis singkat dan langsung.** Teks tombol idealnya 1–4 kata. Pesan status cukup satu kalimat kalau tidak menuntut tindakan lanjutan.
2. **Pakai sentence case untuk tombol dan pesan.** Contoh: **Mulai belajar**, **Kembali ke beranda**, **Perbarui cadangan**. Nama fitur tetap berkapitalisasi nama, misalnya **Tantangan Harian** dan **Mode Kilat**.
3. **Jangan tampilkan istilah implementasi.** Pengguna tidak perlu melihat `mature`, `relearning`, `lapses`, `node`, `activeScope`, FSRS, atau retrievability selama alur belajar normal. Pengecualian tertulis: **Level 1**, **Level 2**, dan **Level 3** beserta namanya — Kenali, Ingat, Kuasai — boleh tampil, karena ketiganya konsep yang dipahami pengguna, bukan nama properti model data.
4. **Hindari bahasa yang menghakimi.** Pakai **Belum tepat**, bukan "Salah!", dan **Perlu ditinjau**, bukan kalimat yang menyiratkan pengguna gagal.
5. **Pesan error menyebut tindakan berikutnya.** Jangan cuma menampilkan "Terjadi kesalahan". Jelaskan apa yang gagal dan apa yang bisa dilakukan pengguna.
6. **Jangan memancing latihan tambahan setelah sesi selesai.** Layar akhir cukup merangkum hasil dan menyediakan jalan kembali ke beranda.
7. **Satu istilah untuk satu konsep.** Kartu `due` selalu disebut **soal yang perlu diulang**, materi yang belum pernah dipelajari disebut **materi baru**, dan pengaturan materi baru selalu disebut **Cakupan**, tidak pernah "wilayah belajar" atau "lingkup".
8. **Angka mengalahkan kalimat panjang.** Pakai **12 soal perlu diulang**, bukan "Terdapat dua belas soal yang sudah waktunya untuk diulang hari ini".
9. **Status bersifat deskriptif, bukan motivasional.** Hindari "Hebat!", "Luar biasa!", atau "Jangan menyerah!" sebagai respons standar. Aplikasi memberi informasi, bukan menilai pengguna.

### 7.2 Core Microcopy

#### Bilah bawah

Navigasi tetap di bagian bawah layar dengan empat tujuan:

| Tujuan | Label | Isi |
| --- | --- | --- |
| Layar utama | **Beranda** | Jumlah soal yang perlu diulang, Cakupan aktif, tiga tindakan latihan |
| Pemilih materi | **Cakupan** | Pohon Nasional → Kawasan → Provinsi → Kode, dengan model dua langkah |
| Perkembangan | **Statistik** | Peta Penguasaan, kartu terlemah, perkiraan beban 14 hari ke depan, daftar kartu Sulit Dikuasai, status cadangan |
| Data | **Referensi** | Penelusuran seluruh kode tanpa penilaian |

Referensi ada di sini, bukan di beranda, karena ia bukan aktivitas latihan melainkan tempat mencari informasi — dan sering dibuka justru saat pengguna sedang tidak berlatih, misalnya waktu melihat plat asing di jalan. Menaruhnya sebagai tombol beranda akan menyamakannya dengan Mulai belajar, Tantangan Harian, dan Mode Kilat, padahal ketiganya menjadwalkan atau menilai sesuatu sedangkan Referensi tidak.

**Cakupan** jadi tujuan tersendiri, bukan layar yang dibuka dari beranda. Alasannya sama seperti Referensi: ia bukan aktivitas latihan. Sebagai tab, model dua langkah di bagian 7.3 juga terasa lebih wajar — pengguna bisa masuk, membandingkan beberapa wilayah, lalu keluar tanpa mengubah apa pun, persis seperti membuka Referensi.

Tujuan **Statistik** jadi rumah untuk seluruh tampilan di bagian 6.6 beserta status cadangan. Sebelum versi ini, dokumen mendefinisikan isi statistik tetapi tidak pernah menyebut layarnya.

Tujuan aktif ditandai label dan ikon berwarna penuh; sisanya abu-abu. Tidak ada penanda lain — tanpa garis bawah, tanpa latar, tanpa animasi berpindah.

Bilah bawah tidak menampilkan badge angka di tujuan mana pun. Jumlah soal yang perlu diulang sudah jadi angka utama di beranda, dan menduplikasinya sebagai badge permanen mengubahnya jadi pengingat yang terus menekan — bertentangan dengan prinsip 2 di bagian 2.

#### Beranda

| Situasi | Teks UI |
| --- | --- |
| Ada pengulangan | **12 soal perlu diulang** |
| Ada materi baru | **4 materi baru tersedia** |
| Tidak ada pengulangan | **Tidak ada soal yang perlu diulang hari ini.** |
| Semua materi baru di Cakupan sudah diperkenalkan | **Semua materi di wilayah ini sudah diperkenalkan.** |
| Materi baru ditahan karena antrean pengulangan terlalu besar | **Materi baru dijeda hari ini agar sesi tetap ringan.** |
| Label wilayah aktif | **Cakupan** |
| Tombol sesi utama | **Mulai belajar** |
| Tombol tantangan | **Tantangan Harian** |
| Tombol latihan cepat | **Mode Kilat** |

Tidak ada tombol **Latihan lagi** pada keadaan kosong setelah sesi harian selesai. Kalau memang tidak ada soal yang perlu diulang, beranda cukup menunjukkan jadwal hari itu sudah beres.

#### Saat menjawab soal

| Situasi | Teks UI |
| --- | --- |
| Kolom jawaban | **Ketik jawaban…** |
| Jawaban benar | **Benar** |
| Jawaban diterima dengan koreksi ejaan | **Benar · ejaan diperbaiki** |
| Jawaban salah | **Belum tepat** |
| Batas waktu habis | **Waktu habis** |
| Menampilkan jawaban | **Jawaban: Bengkulu** |
| Level diturunkan manual | **Tidak memengaruhi jadwal** |
| Level dinaikkan manual | **Dihitung penuh** |
| Jawaban terakhir dibatalkan | **Jawaban dibatalkan** |
| Lanjut dengan keyboard | **Enter untuk lanjut** |

Untuk jawaban salah, UI menampilkan **Belum tepat** diikuti jawaban yang benar. Sistem tidak memakai teks seperti "Salah besar", "Coba lagi", atau pesan motivasional acak karena tidak menambah informasi.

Kedua label level wajib tampil, bukan cuma yang penurunan. Aturan di SRD bagian 3.3 asimetris — menaikkan level dihitung penuh, menurunkan tidak — dan pengguna tidak punya alasan menaikkan level kalau konsekuensi menguntungkannya tidak pernah kelihatan. Menampilkan **Tidak memengaruhi jadwal** saja membuat fitur level terasa semata-mata pembatas.

**Level 1**, **Level 2**, dan **Level 3** termasuk istilah yang boleh tampil ke pengguna, sebagai pengecualian tertulis atas aturan 3 di bagian 7.1. Ketiganya sudah punya nama bermakna — Kenali, Ingat, Kuasai — dan bukan nama properti model data.

#### Bandingkan Kode

| Situasi | Teks UI |
| --- | --- |
| Judul | **Bandingkan Kode** |
| Pengantar pasangan | **BE dan BD sering tertukar. Bedakan keduanya.** |
| Setelah benar | **Benar** |
| Pasangan tidak lagi aktif | **Latihan khusus untuk pasangan ini selesai.** |

Kalimat pengantar wajib menyebut kedua kode secara eksplisit. Jangan memakai label abstrak seperti "pasangan kebingungan" atau istilah teknis dari model data.

#### Latihan Terfokus

| Situasi | Teks UI |
| --- | --- |
| Judul | **Latihan Terfokus · Kawasan Maluku** |
| Pengantar | **Latihan tambahan. Jadwal tidak berubah.** |
| Kartu yang memang sudah waktunya diulang | **Soal ini juga dihitung untuk jadwal hari ini.** |
| Tidak ada kartu yang bisa dilatih | **Belum ada materi yang bisa dilatih di wilayah ini.** |
| Selesai | **Latihan selesai** |
| Ringkasan | **12 soal dijawab · akurasi 83%** |

Perilaku Latihan Terfokus bercabang, jadi wajib dijelaskan di layar. Menurut SRD bagian 4.11, jawaban di sini tidak mengubah jadwal, **kecuali** kartunya memang sudah jatuh tempo — dan waktu itu jawabannya dihitung seperti sesi biasa. Tanpa penanda per soal, pengguna tidak punya cara membedakan keduanya, lalu mengira sesi harian masih utuh padahal sebagiannya sudah terpakai.

Ringkasan Latihan Terfokus tidak menampilkan perubahan penguasaan wilayah, karena sebagian besar jawabannya memang tidak menggerakkan status kartu.

#### Kartu Sulit Dikuasai

| Situasi | Teks UI |
| --- | --- |
| Penanda pada soal | **Sulit Dikuasai** |
| Penjelasan fakta tampil lebih dulu | **Kode ini beberapa kali terlewat. Petunjuknya ditampilkan lebih dulu.** |
| Kartu mencapai batas dan dinonaktifkan | **Kode ini dinonaktifkan sementara. Tinjau di halaman statistik.** |
| CTA peninjauan | **Tinjau kartu** |
| Diaktifkan kembali | **Kode ini diaktifkan kembali dan dimulai dari awal.** |

SRD bagian 6.4 menetapkan kartu dengan 6 kegagalan menampilkan Fakta Singkat **sebelum** pertanyaan. Dari sisi pengguna, perubahan itu terlihat mendadak dan gampang disalahartikan sebagai bug, jadi wajib disertai penjelasan singkat. Penonaktifan otomatis pada 8 kegagalan juga harus diberitahukan, karena kode yang tiba-tiba berhenti muncul tanpa kabar akan luput dari perhatian sampai ketemu di jalan.

Nadanya menjelaskan keadaan kartu, bukan menilai pengguna. Pakai **beberapa kali terlewat**, bukan "kamu sering salah di kode ini".

#### Pemilih Cakupan

| Situasi | Teks UI |
| --- | --- |
| Judul tab | **Cakupan** |
| Wilayah yang sedang aktif | **Aktif sekarang** |
| Jumlah materi | **8 materi baru tersedia** |
| Terapkan pilihan | **Pilih wilayah ini** |
| Latihan tanpa mengganti pilihan | **Latih wilayah ini** |
| Tidak ada materi baru | **Tidak ada materi baru di wilayah ini.** |
| Kembali ke nasional | **Seluruh Indonesia** |

**Pilih wilayah ini** mengubah Cakupan. **Latih wilayah ini** cuma memulai Latihan Terfokus. Kedua tindakan tidak boleh berlabel mirip karena konsekuensinya berbeda.

#### Ringkasan sesi

Judul layar: **Sesi selesai**.

Label statistik yang dipakai:

| Metrik | Label UI |
| --- | --- |
| Akurasi sesi | **Akurasi** |
| Rata-rata waktu sampai ketukan pertama | **Rata-rata waktu respons** |
| Pasangan baru yang sering tertukar | **Kode yang perlu dibedakan** |
| Perubahan penguasaan | **Penguasaan wilayah** |
| Jumlah soal | **Soal dijawab** |

Keadaan khusus:

- Tidak ada pasangan baru → **Tidak ada kode baru yang sering tertukar.**
- Penguasaan tidak berubah → **Penguasaan wilayah belum berubah pada sesi ini.**
- Tombol keluar → **Kembali ke beranda**.

Layar ini tidak menampilkan CTA untuk mengulang sesi atau menambah materi baru.

#### Tantangan Harian

| Situasi | Teks UI |
| --- | --- |
| Sebelum mulai | **5 soal · sekali sehari** |
| Tombol | **Mulai tantangan** |
| Selesai | **Tantangan hari ini selesai** |
| Sudah dikerjakan | **Sudah selesai untuk hari ini** |
| Hari toleransi digunakan | **Jatah toleransi digunakan hari ini.** |
| Label rangkaian hari | **Hari Beruntun** |

Kalau satu hari terlewat, aplikasi tidak memakai pesan seperti "Streak-mu rusak". Cukup sampaikan keadaan catatan Hari Beruntun saat ini.

#### Mode Kilat

| Situasi | Teks UI |
| --- | --- |
| Pengantar | **60 detik · jawab sebanyak mungkin** |
| Tombol | **Mulai** |
| Waktu habis | **Waktu habis** |
| Skor | **24 jawaban benar** |
| Wilayah yang dimainkan | **Mode Kilat · Kawasan Maluku** |
| Rekor baru | **Rekor baru di Kawasan Maluku: 24** |
| Bukan rekor baru | **Rekor terbaik di Kawasan Maluku: 31** |
| Belum ada rekor di wilayah ini | **Belum ada rekor untuk wilayah ini.** |

Rekor baru boleh ditandai secara visual, tanpa kalimat perayaan tambahan.

Nama wilayah wajib disebut di setiap tampilan rekor. Bagian 8 menetapkan Rekor Terbaik dicatat terpisah per wilayah, jadi angka tanpa nama wilayah menyesatkan: main Mode Kilat di Kawasan Maluku lalu melihat rekor nasional akan terbaca sebagai kemunduran, padahal keduanya tidak sebanding.

#### Referensi dan pencarian

| Situasi | Teks UI |
| --- | --- |
| Kolom pencarian | **Cari kode atau wilayah…** |
| Tidak ada hasil | **Tidak ada hasil untuk "{query}".** |
| Entri belum cukup kuat untuk latihan | **Belum terverifikasi penuh** |
| Data hanya untuk referensi | **Tersedia di Referensi, belum masuk latihan.** |

Label `high`, `medium`, dan `low` tidak ditampilkan mentah ke pengguna. Nilainya tetap bagian model data internal.

#### Status kartu yang terlihat pengguna

| Kondisi internal | Teks UI |
| --- | --- |
| `new` | **Belum Dipelajari** |
| `learning`, `review`, `relearning` | **Sedang Dipelajari** |
| `mature` | **Dikuasai** |
| `leech` | **Sulit Dikuasai** |
| `suspended` karena perlu verifikasi data | **Dinonaktifkan · data perlu diverifikasi** |
| `suspended` karena terlalu banyak kegagalan | **Dinonaktifkan · perlu ditinjau** |

Status detail cuma perlu muncul di halaman statistik atau pemeriksaan kartu. Status tidak ditampilkan di tiap soal karena tidak membantu proses menjawab.

#### Cadangan data

| Situasi | Teks UI |
| --- | --- |
| Cadangan berhasil diperbarui | **Cadangan diperbarui** |
| Informasi waktu | **Terakhir dicadangkan 2 hari lalu** |
| Cadangan lebih dari 14 hari | **Cadangan terakhir sudah lebih dari 14 hari.** |
| CTA | **Perbarui cadangan** |
| Izin folder hilang | **Akses ke folder cadangan terputus. Pilih folder lagi.** |
| CTA pemulihan izin | **Pilih folder** |
| Peramban tidak mendukung cadangan otomatis | **Cadangan otomatis belum didukung di peramban ini. Unduh cadangan secara manual.** |
| CTA manual | **Unduh cadangan** |
| Pemulihan selesai | **Cadangan berhasil dipulihkan** |

Peringatan cadangan bernada informatif. Kehilangan progres memang risiko nyata, tetapi bahasanya tidak perlu menakut-nakuti.

#### Error dan keadaan gagal

Pesan error mengikuti pola **apa yang terjadi → apa yang bisa dilakukan**:

| Kondisi | Teks UI |
| --- | --- |
| Data lokal gagal dibaca | **Data belajar tidak dapat dibuka. Coba muat ulang aplikasi.** |
| Data referensi gagal dimuat | **Data plat tidak dapat dimuat. Coba buka kembali aplikasi.** |
| Penyimpanan permanen tidak tersedia | **Penyimpanan permanen tidak tersedia. Pastikan cadangan data tetap aktif.** |
| Operasi gagal tetapi aman dicoba lagi | **Perubahan belum tersimpan. Coba lagi.** |
| Tidak ada koneksi tetapi aplikasi tetap dapat dipakai | **Sedang offline. Latihan tetap dapat digunakan.** |

Hindari pesan generik **"Terjadi kesalahan"** kalau penyebab atau langkah pemulihannya sudah diketahui sistem.

### 7.3 Main Flow

1. Buka aplikasi dari layar utama sebagai PWA, tanpa layar masuk.
2. Beranda menampilkan angka utama berupa **jumlah soal yang perlu diulang hari ini**. Di bawahnya ada **Cakupan** beserta persentase penguasaannya, lalu tiga tindakan: **Mulai belajar**, **Tantangan Harian**, dan **Mode Kilat**. Cakupan dan Referensi tidak ikut di antara ketiganya, melainkan di bilah bawah (bagian 7.2).
3. Tekan **Mulai belajar** untuk memulai sesi harian. Soal pertama muncul sesuai urutan prioritas di SRD bagian 4.7.
4. Ketik jawaban lalu tekan Enter.
5. Sistem memeriksa jawaban menurut SRD bagian 5 dan menghitung grade secara internal menurut SRD bagian 4.4. UI cuma menampilkan hasil jawaban, level soal, dan satu **Fakta Singkat**. Kalau pengguna menurunkan level manual, tombol level diberi keterangan **"Tidak memengaruhi jadwal"**.
6. Tekan Enter sekali lagi untuk lanjut. Tidak ada tombol penilaian tambahan, jadi seluruh alur bisa dijalankan dari keyboard.
7. Soal berikutnya muncul langsung, tanpa animasi transisi yang memperlambat.
8. Setelah antrean habis, layar ringkasan menampilkan akurasi, rata-rata waktu respons, pasangan kode baru yang terdeteksi sering tertukar, dan perubahan persentase penguasaan pada Cakupan.
9. Kembali ke beranda, tanpa ajakan menambah sesi latihan.

Tab **Cakupan** di bilah bawah membuka pemilih wilayah berjenjang: Nasional → Kawasan → Provinsi → Kode. Nama Cakupan aktif di beranda juga bisa ditekan sebagai jalan pintas ke tab yang sama.

Pemilihnya memakai **model dua langkah**: menelusuri pohon cuma menyorot satu wilayah dan menampilkan jumlah materi baru di dalamnya; Cakupan baru berubah setelah pengguna menekan **Pilih wilayah ini**. Menelusuri saja tidak pernah mengubah pengaturan apa pun.

Ini disengaja. Salah satu guna pemilih wilayah adalah membandingkan beberapa wilayah sebelum memutuskan — melihat sisa materi baru di Sumatera dibanding Sulawesi. Kalau menyorot langsung menerapkan, membandingkan jadi mustahil tanpa efek samping, dan pengguna bisa keluar dari layar ini dengan Cakupan yang berubah tanpa pernah bermaksud mengubahnya.

Tindakan **Latih wilayah ini** memulai Latihan Terfokus pada wilayah yang sedang disorot, juga tanpa mengubah Cakupan.

Langkah 9 adalah keputusan desain yang disengaja. Aplikasi tidak mendorong sesi tambahan karena latihan berlebih justru mengganggu jadwal spaced repetition yang jadi dasar sistem.

---

## 8. Habit and Gamification

Yang dipakai:

- **Hari Beruntun** dari Tantangan Harian, dengan satu jatah toleransi untuk hari yang terlewat dalam tiap periode 30 hari bergulir — bukan per bulan kalender. Dengan begitu, melewatkan tanggal 31 dan tanggal 1 tidak terhitung sebagai dua periode toleransi. Satu hari yang terlewat tidak seharusnya menghapus motivasi yang dibangun berbulan-bulan.
- **Rekor Terbaik** di Mode Kilat, dicatat per wilayah dan selalu tampil bersama nama wilayahnya. Pembandingnya cuma pencapaian pengguna sendiri.
- **Peta Penguasaan** — warna makin pekat seiring naiknya persentase penguasaan tiap wilayah.
- **Uji Penguasaan Kawasan** — kawasan dinyatakan selesai ketika seluruh kartunya `mature` dan tidak ada pasangan yang sering tertukar di dalamnya. Maluku dengan dua kode sengaja tetap jadi kawasan termudah, karena capaian awal yang cepat lebih berguna untuk membangun momentum daripada tingkat kesulitan yang diseragamkan.
- **Indikator Tingkat Penguasaan** — tiga lingkaran pada tiap wilayah menunjukkan persentase kartu yang sudah lolos Level 1, Level 2, dan Level 3. Indikator ini menunjukkan kedalaman penguasaan, bukan cuma luas materi yang sudah dibuka.

  **Lolos Level N** berarti kartu pernah dijawab benar minimal sekali di level itu. Definisi ini sengaja dipilih supaya sejalan dengan syarat `mature` di SRD bagian 3.4, yang memakai rumusan persis sama. Perlu dicatat, "lolos" tidak berarti kartu meninggalkan level itu — satu kartu bisa lolos ketiga level sekaligus, dan level yang disajikan tetap ditentukan status kartu menurut SRD bagian 3.2. Karena kartu hampir selalu melewati Level 1 dan 2 lebih dulu, lingkaran Level 3 hampir selalu yang paling kecil, dan itulah lingkaran yang paling informatif.
- **Fakta Tambahan** — tiap kartu yang mencapai `mature` membuka fakta historis yang lebih panjang dari bagian 13, sebagai hadiah kecil yang tetap menguatkan hafalan.

Yang sengaja tidak dipakai: XP, level akun, badge koleksi, misi harian bertingkat, dan mata uang dalam aplikasi. Mekanisme seperti itu berisiko menggeser fokus dari penguasaan materi ke pengumpulan poin. Untuk aplikasi satu pengguna, nilai tambahnya juga kecil sekali.

---

## 9. KPI

| Metrik | Target | Alasan dipilih |
| --- | --- | --- |
| Retensi kartu `mature` | ≥ 90% | Ukuran sebenarnya apakah hafalannya bertahan |
| Selisih retensi aktual dan desired retention | dalam ±3 poin dari 0,90 | Mendeteksi parameter FSRS yang meleset sebelum terasa di beban pengulangan |
| Median waktu sampai ketukan pertama | < 3 detik | Memisahkan jawaban yang langsung muncul dari jawaban yang butuh berpikir, tanpa merugikan nama panjang; metrik ini juga jadi salah satu dasar grade di SRD bagian 4.4 |
| Kode depan berstatus `mature` | 100% dalam 90 hari | Sasaran utama produk |
| Kawasan dikuasai | 7 dari 7 dalam 120 hari | Mendorong seluruh kawasan dipelajari, bukan cuma yang paling familiar |
| Kartu yang lolos syarat Level 3 | 100% dari kartu `mature` | Menjaga status matang tetap berarti, bukan sekadar label |
| Beban pengulangan harian | stabil di bawah 40 kartu | Indikator dini bahwa beban latihan mulai terlalu tinggi |
| Hari aktif per minggu | ≥ 5 | Konsistensi lebih menentukan daripada durasi |

Akurasi sesi harian sengaja tidak dijadikan KPI. Angkanya naik ketika kartu terlalu gampang, jadi mengejarnya justru mendorong penjadwalan yang buruk.

---

## 10. Risks

**Operasional**

- **IndexedDB terhapus, seluruh progres hilang.** Ini risiko tertinggi sekaligus yang paling sering diremehkan di aplikasi tanpa backend — membersihkan data browser, mode privat, atau ganti perangkat sudah cukup untuk memusnahkan riwayat berbulan-bulan. Mitigasi: `navigator.storage.persist()` sejak awal, backup otomatis mingguan ke folder tersinkron cloud lewat File System Access API, dan pengingat di layar penutup sesi kalau backup terakhir lewat 14 hari.
- **Data plat berubah** karena pemekaran wilayah atau kode baru. Ini bukan risiko teoretis: dalam sebelas tahun terakhir, wilayah yang dulu berkode DS pecah jadi lima kode. Mitigasi: versi pada `plates.json`, ID stabil yang tidak pernah didaur ulang, dan changelog yang menandai kartu terdampak, bukan menghapusnya. Kode baru otomatis masuk kawasannya karena hierarki cakupan dibentuk otomatis dari data.
- **Pemetaan waktu ke grade tidak akurat.** Grade otomatis membuat ambang persentil menyetir seluruh penjadwalan, padahal ambangnya belum tervalidasi. Ambang terlalu longgar bisa memperpanjang interval kartu yang sebenarnya masih lemah; ambang terlalu ketat menambah beban pengulangan tanpa perlu. Mitigasi: simpan data jawaban mentah (SRD bagian 4.5) supaya seluruh riwayat bisa dihitung ulang dengan ambang berbeda, plus fase awal sampai tiap level punya 30 sampel.
- **Response time terganggu hal di luar aplikasi.** Kalau pengguna terinterupsi di tengah soal, waktunya jadi panjang meski itu tidak menggambarkan kekuatan ingatan, dan sistem bisa salah menyimpulkan kartunya terlalu sulit. Mitigasi: respons di atas 60 detik tidak masuk hitungan persentil dan grade-nya ditetapkan 3 — Bagus; rolling window 200 jawaban juga meredam pengaruh outlier tunggal.
- **Optimasi dijalankan terlalu dini.** Optimasi parameter bisa memperbaiki penjadwalan, tetapi bisa juga memperburuknya kalau datanya kurang. Dari beberapa ratus review saja, parameternya bisa kelihatan meyakinkan padahal cuma menempel pada noise. Efeknya baru terasa beberapa minggu kemudian saat prediksi jadwal mulai meleset. Mitigasi: perlakukan batas minimum data di bagian 11 sebagai syarat wajib, simpan parameter lama, dan bandingkan tiap hasil optimasi dengan parameter default sebelum dipakai.
- **Kartu sulit dikuasai terlalu sering muncul di antrean.** Kartu yang gagal terus tanpa pasangan yang sering tertukar lolos dari mekanisme pembedaan dan bisa mendominasi sesi harian. Mitigasi: aturan otomatis untuk status `leech` dan `suspended` di SRD bagian 6.4.
- **Enter tertekan sebelum jawaban selesai.** Grade otomatis menghapus risiko salah tekan tombol penilaian, tetapi menggesernya ke baris ketik: satu Enter terlalu cepat mencatat jawaban benar sebagai salah, dan pada kartu `mature` itu berarti lapse yang tidak seharusnya. Mitigasi: undo jawaban terakhir di SRD bagian 4.10.
- **Data berkepercayaan rendah terlanjur dihafal.** Kode belakang tingkat kabupaten adalah bagian yang paling sering keliru di sumber daring. Mitigasi: aturan `confidence` di TRD bagian 4.

**Keberlanjutan proyek**

- **Tunggakan pengulangan menumpuk di minggu ketiga.** Ini salah satu pola kegagalan paling umum di aplikasi spaced repetition: awalnya pengguna menambah banyak kartu baru, beberapa minggu kemudian pengulangan harian melonjak, dan aplikasinya ditinggal. Mitigasi: batas global 10 kartu baru per hari, aturan penahanan di SRD bagian 4.7, dan syarat pembukaan kartu arah sebaliknya di SRD bagian 4.8 — ketiganya tidak boleh jadi opsi yang bisa dimatikan.
- **Tunggakan tersembunyi karena filter cakupan.** Kalau pengulangan ikut disaring cakupan, berpindah kawasan akan terasa ringan meski kartu jatuh tempo terus bertambah di cakupan lain. Begitu pengguna kembali, jumlahnya melonjak sekaligus. Mitigasi: aturan mutlak di SRD bagian 2.4 bahwa pengulangan tidak pernah disaring cakupan.
- **Berlatih di kawasan yang itu-itu saja.** Cakupan yang tidak pernah diganti membuat kawasan yang lebih sulit terus tertunda. Mitigasi: KPI "kawasan dikuasai" di bagian 9, dan indikator jumlah materi baru di luar Cakupan yang tetap terlihat di beranda.
- **Generator soal menyita terlalu banyak waktu.** Membuat bentuk soal kreatif memang menyenangkan, tetapi bisa menghabiskan waktu sebelum sistem intinya benar-benar dipakai. Mitigasi: MVP dibatasi ke tujuh bentuk Golongan A dan satu bentuk Golongan B yang tidak butuh komponen UI baru. Sebelas bentuk lain sudah tercatat di bagian 6.3, tetapi baru boleh digarap di Fase 2.
- **Level terlalu sering diturunkan.** Level 1 lebih nyaman dan cepat, jadi berpotensi jadi pilihan default manual. Mitigasi: aturan asimetris di SRD bagian 3.3 memastikan jawaban di level lebih rendah tidak mempercepat progres kartu, ditambah KPI syarat Level 3 di bagian 9.
- **Membangun terlalu banyak fitur sebelum produknya dipakai.** Peta interaktif dan fitur tambahan lain menarik digarap, tetapi bisa memakan berminggu-minggu sebelum sistem intinya pernah diuji dalam pemakaian nyata. Mitigasi: MVP fokus ke bagian 6.1 sampai 6.5 dan 6.8; fitur lain baru dipertimbangkan setelah 14 hari pemakaian nyata berturut-turut.

---

## 11. Roadmap

**Fase 2 — Penguatan konteks**

- Peta interaktif sebagai mode soal: tunjuk wilayah di peta, atau sebaliknya. Memori spasial bisa jadi penopang hafalan yang kuat dan belum dipakai di MVP, dan petanya sudah memakai `id` yang sama dengan cakupan sehingga sebagian pekerjaannya sudah beres.
- Kode belakang untuk seluruh wilayah yang tingkat kepercayaan datanya tinggi, dimulai dari DR dan EA.
- Mode kronologi: menyusun kode baru menurut urutan tanggal peresmiannya, memakai kumpulan fakta di bagian 13 sebagai materi soal.
- Cakupan gabungan: memilih beberapa wilayah sekaligus, misalnya Sumatera bersama Kalimantan.
- Sebelas bentuk soal yang ditunda dari MVP digarap menurut biaya implementasi, mulai dari yang paling ringan: isi deret bolong, Kode Terbalik, dan skenario lokasi lebih dulu karena cuma butuh template teks baru; lalu petunjuk bertahap, Plat Tidak Mungkin, dan perbaiki pernyataan salah; terakhir kelompokkan berdasarkan kawasan, urutkan kronologis, Soal Berantai, dan wilayah berbatasan karena keempatnya menuntut UI drag-and-drop atau alur multi-langkah.

**Fase 3 — Adaptasi dari data sendiri**

Fase 3 terdiri dari tiga tahap berurutan, masing-masing dengan syarat minimum data. Syaratnya wajib; menjalankan satu tahap terlalu dini bisa menghasilkan model yang tampak presisi padahal cuma menempel pada noise.

| Tahap | Yang dikerjakan | Syarat minimum data | Perkiraan waktu |
| --- | --- | --- | --- |
| 1 | Optimasi parameter FSRS dari riwayat pribadi | ~1.000 review total dan beberapa ratus kartu | ~40 hari pemakaian harian |
| 2 | Penyesuaian per tingkat kesulitan, lalu pemilihan level berbasis retrievability | ~150 review per level | ~60 hari |
| 3 | Kalibrasi ambang persentil penentu grade | ~1.000 review, sama seperti tahap 1 | Kapan saja setelah tahap 1 |

**Tahap 1 — Optimasi parameter.** Parameter bawaan FSRS berasal dari riwayat banyak orang. Di tahap ini parameternya disetel ke pola lupa pengguna Terka sendiri. Dengan sekitar 305 kartu dan rata-rata 25 review per hari, 1.000 review tercapai kira-kira dalam 40 hari.

Satu batasan penting: parameter dioptimalkan sebagai **satu set untuk seluruh kartu**, walaupun jenis kartu Terka tidak seragam — `code2region` dan `setrecall`, misalnya, menuntut kerja kognitif yang berbeda. Mengoptimalkan parameter terpisah per jenis kartu menaikkan kebutuhan data sekitar enam kali lipat, kira-kira delapan bulan pemakaian. Karena itu MVP menerima satu set parameter global. Kalau nanti perlu dipisah, batas paling jauh adalah dua set — berbasis pengenalan dan berbasis recall tanpa petunjuk — dan itu pun cuma kalau datanya menunjukkan perbedaan yang benar-benar berarti.

**Tahap 2 — Level adaptif.** Tahap ini menggantikan pemetaan berbasis status di SRD bagian 3.2. Sistem cuma perlu mempelajari satu faktor penyesuaian per level: seberapa jauh Level 1 dan Level 3 menggeser peluang berhasil dibanding Level 2 sebagai acuan. Karena cuma butuh dua nilai tambahan, syarat datanya jauh lebih ringan daripada tahap 1. Begitu nilainya cukup terukur, sistem memilih level dengan peluang berhasil paling dekat ke 0,90. Kartu yang terlalu gampang di Level 2 bisa naik otomatis, kartu yang masih goyah bisa turun. Tahap ini juga membuka jalan mengganti aturan biner di SRD bagian 3.3 dengan pembobotan bertingkat.

**Tahap 3 — Kalibrasi ambang grade.** Response time sudah dipakai menentukan grade sejak MVP (SRD bagian 4.4), tetapi ambang persentil 20 dan 80 masih asumsi awal. Tahap ini mencari ambang yang memberi akurasi prediksi FSRS terbaik pada data sendiri: hitung ulang seluruh riwayat memakai beberapa pasangan ambang kandidat, lalu bandingkan hasilnya.

Hitung ulang menyeluruh cuma mungkin karena SRD bagian 4.5 menyimpan data jawaban mentah, bukan grade final yang terkunci. Tanpa keputusan itu, ambang baru tidak bisa diterapkan ke riwayat lama.

Tahap ini ditandai **spekulatif**. Pemetaan response time ke grade bukan bagian dari model FSRS standar dan belum tervalidasi khusus di literatur. Karena itu tiap perubahan wajib diuji dengan membandingkan akurasi prediksi antar kandidat ambang, dan sistem harus kembali ke ambang sebelumnya kalau tidak ada yang lebih baik.

- Analisis pola kesalahan lanjutan: memetakan kelompok item yang sering tertukar, bukan cuma pasangan. Tidak perlu model machine learning; pada skala sekitar 60 kode, hitungan frekuensi pasangan sudah cukup informatif.

**Fase 4 — Kemungkinan publik**

- Autentikasi, sinkronisasi, dan berbagi progres. Baru dipertimbangkan kalau produknya terbukti jalan untuk satu pengguna selama minimal enam bulan.

---

## 12. Success Criteria

MVP dinyatakan berhasil kalau seluruh kondisi berikut terpenuhi:

1. Kartu `code2region` dan `blindrecall` untuk seluruh kode wilayah depan berstatus `mature` dalam 90 hari sejak kartu pertama. Kriteria ini menyebut kartu, bukan kode, karena `mature` adalah sifat kartu — satu kode punya beberapa kartu dengan jadwal berbeda. `setrecall` dan `region2code` sengaja tidak dimasukkan karena keduanya dibuka bertahap dan mustahil selesai di jendela yang sama.
2. Akurasi pada uji buta — 30 soal acak tingkat nasional setelah 14 hari tanpa latihan — minimal 90%.
3. Sesi harian rutin selesai di bawah 10 menit selama empat minggu berturut-turut.
4. Aplikasi masih dipakai di hari ke-30, ke-60, dan ke-90. Kriteria ini lebih penting daripada tiga kriteria sebelumnya, karena desain sebagus apa pun tidak berarti kalau aplikasinya sudah ditinggal di minggu kedua.

---

## 13. Facts and Historical Context

Bagian ini jadi sumber materi untuk fitur di bagian 6.5 dan confusion drill di SRD bagian 6.3. Tiap butir diberi label status:

> **terverifikasi** — dikonfirmasi sumber resmi atau sumber primer.
> **diperdebatkan** — beredar luas, tetapi sumbernya saling bertentangan.
> **legenda** — cerita populer yang belum punya dasar historis kuat. Tetap disertakan karena berguna sebagai jangkar ingatan, asalkan statusnya jelas.

### 13.1 Asal-usul Sistem

1. **legenda** — Cerita yang paling banyak beredar: pada 1811 Inggris merebut Batavia dengan sekitar 15.600 tentara yang terbagi ke dalam 26 batalion berkode A–Z, dan tiap wilayah yang ditaklukkan mewarisi huruf batalionnya. Batavia jatuh ke Batalion B, Surabaya ke L, Banten ke A, Madura ke M.
2. **diperdebatkan** — Validitas cerita batalion itu masih dipersoalkan di kalangan sejarawan, dan versi tandingannya menyebut sistem kode Hindia Belanda meniru pola Eropa: satu atau dua huruf mewakili satu karesidenan, tanpa kaitan militer sama sekali.
3. **terverifikasi** — Aturan penomoran kendaraan berlaku menyeluruh di Hindia Belanda pada 1921–1922, jauh setelah pendudukan Inggris berakhir pada 1816.
4. **terverifikasi** — Negara pertama yang menerapkan pelat nomor adalah Prancis, pada 1893.
5. **terverifikasi** — Pelat nomor Hindia Belanda disebut *kentekens*, muncul di masa transisi kereta kuda ke kendaraan bermotor sekitar 1890–1910.
6. **terverifikasi** — Buku *Handboek voor automobilisten en motorwielrijders* terbitan Java Motor Club tahun 1920 memuat 36 kode wilayah, dan jadi sumber primer tertua yang bisa diperiksa untuk melacak kode-kode awal.
7. **legenda** — Menurut versi batalion, kereta kuda di Batavia wajib memakai plakat huruf B diikuti lima digit angka dan huruf A untuk *annex* atau C untuk *cargo*.
8. **legenda** — AB Yogyakarta dan AD Solo dikatakan berasal dari dua batalion sekaligus (A+B dan A+D), karena wilayah Mataram dianggap negara tersendiri dan menyerah lewat jalur berbeda.
9. **diperdebatkan** — Cerita bahwa batalion C, I, J, O, Q, U, V, W, X, Y, dan Z cuma jadi pasukan cadangan sehingga hurufnya tidak terpakai tidak cocok dengan kenyataan: W dan Z kini dipakai, dan keduanya justru ditetapkan di era modern.

### 13.2 DA — Anomali Paling Terkenal

10. **terverifikasi** — Empat provinsi di Kalimantan memakai kode berawalan K (KB, KH, KT, KU), tetapi Kalimantan Selatan memakai DA.
11. **terverifikasi** — Penjelasannya: pada masa Hindia Belanda, wilayah *Zuider en Ooster Afdeeling van Borneo* — mencakup yang kini jadi Kalsel, Kalteng, Kaltim, dan Kaltara — memakai satu kode tunggal, yaitu DA. Kalsel adalah wilayah pertama di Kalimantan yang memakai pelat nomor.
12. **terverifikasi** — Kode KB, KH, dan KT baru muncul setelah pembagian provinsi pasca-kemerdekaan; DA dipertahankan di wilayah asalnya. Kalimantan Barat sebelumnya berkode BR sebelum jadi KB.
13. **diperdebatkan** — Versi Ditlantas Polda Kalsel menyebut DA singkatan dari Distrik Amandit, wilayah yang kini termasuk Kabupaten Hulu Sungai Selatan dengan Kandangan sebagai pusatnya.
14. **diperdebatkan** — Versi lain menyebut DA kebalikan dari AD (Surakarta), karena FN Nieuwenhuyzen menjabat Residen Surakarta sekaligus Gubernemen Komisaris untuk Borneo bagian selatan dan timur, lalu menyeragamkan kode kedua wilayahnya dengan cara membalik hurufnya.
15. **terverifikasi** — Handboek 1920 tidak menyebut DA sebagai singkatan apa pun; besar kemungkinan ia cuma kode urut yang ditetapkan pemerintah kolonial. Tiga tebakan populer — "Dayak Asli", "Daerah Air", dan "Distrik Amandit" — tidak didukung sumber itu.
16. **terverifikasi** — KU adalah kode termuda di Kalimantan, menyusul pemekaran Kalimantan Utara dari Kalimantan Timur pada 2012.

### 13.3 Papua — Kode yang Paling Sering Berubah

17. **terverifikasi** — Papua Barat memisahkan diri dari kode DS dan meresmikan PB pada 29 April 2013, diserahkan Kakorlantas kepada Gubernur Abraham Octavianus Atururi.
18. **terverifikasi** — Papua sendiri mengganti DS jadi PA pada 1 Juli 2016, bertepatan dengan HUT Bhayangkara.
19. **terverifikasi** — Pada 2024, tiga provinsi hasil pemekaran mengambil kode sendiri: Papua Barat Daya jadi PY pada Mei, Papua Selatan jadi PS pada Juli, dan Papua Tengah jadi PT — ditandai penyerahan pelat PT 1 kepada Pj Gubernur Ribka Haluk pada 19 Agustus 2024.
20. **terverifikasi** — Artinya dalam sebelas tahun, satu kode tunggal DS berkembang jadi lima kode terpisah: PA, PB, PY, PS, dan PT. Ini contoh terbaik kenapa data plat harus diberi versi, bukan dianggap tetap.

### 13.4 Sulawesi Selatan

21. **terverifikasi** — Kode DD dipecah jadi DD, DP, dan DW, berlaku sejak 1 Juni 2012 berdasarkan Peraturan Kapolri Nomor 5 Tahun 2012.
22. **terverifikasi** — Pemicunya kuota: pertumbuhan sekitar 24.000 sepeda motor dan 3.600 mobil per bulan membuat nomor DD hampir habis.
23. **terverifikasi** — Pembagiannya: DD untuk 9 kota/kabupaten, DP untuk 11 kabupaten, DW untuk 4 kabupaten.
24. **terverifikasi** — Sempat beredar tanggal 2021 untuk pemberlakuan DP dan DW, termasuk dari laman Bapenda Sulsel. Tanggal itu keliru; yang benar 1 Juni 2012.

### 13.5 Jawa dan Sekitarnya

25. **terverifikasi** — Kode W untuk Gresik dan Sidoarjo baru ditetapkan sekitar tahun 2000, memisah dari L Surabaya. Jadi W bukan warisan kolonial, melainkan kode era milenium.
26. **terverifikasi** — Kode Z memisah dari D, yang merupakan eks-Karesidenan Priangan.
27. **terverifikasi** — Sebagian besar Kabupaten Tangerang memakai pelat A (Banten), bukan B, dengan kode belakang V/W/X/Y/Z. Awalnya cuma 7 kecamatan, lalu berkembang jadi 19 kecamatan sejak 2016.
28. **terverifikasi** — Kota Tangerang Selatan tetap masuk kategori pelat B, jadi satu kabupaten dan satu kota bertetangga bisa beda kode depan.

### 13.6 Sumatera

29. **terverifikasi** — Sebelum disatukan di bawah BN, Bangka dan Belitung berkode berbeda: Bangka memakai BN dan Belitung memakai BP, terlihat pada foto kendaraan Belitung era 1920-an.
30. **terverifikasi** — Kode BP kini justru dipakai Kepulauan Riau — contoh kode yang berpindah wilayah sepenuhnya, dan alasan kuat kenapa ID kartu tidak boleh didaur ulang.
31. **terverifikasi** — Sumatera Utara satu-satunya provinsi dengan dua kode depan: BK untuk bagian timur termasuk Medan, dan BB untuk wilayah Tapanuli.

### 13.7 Pola yang Berguna untuk Hafalan

32. **terverifikasi** — Hampir seluruh Sumatera memakai kode dua huruf berawalan B: BA, BB, BD, BE, BG, BH, BK, BL, BM, BN, BP. Yang tidak ikut pola ini justru B tunggal, dan itu Jakarta.
33. **terverifikasi** — Hampir seluruh Kalimantan memakai awalan K, dengan DA sebagai satu-satunya pengecualian.
34. **terverifikasi** — Blok D dua huruf mencakup Sulawesi, Bali, Nusa Tenggara, dan Maluku sekaligus: DB, DC, DD, DE, DG, DH, DK, DL, DM, DN, DP, DR, DT, DW, ditambah EA, EB, dan ED di Nusa Tenggara.
35. **terverifikasi** — Karena itu DK Bali bukan anomali seperti yang sering dikira; ia justru bagian rapi dari blok D yang sama.
36. **terverifikasi** — Jawa memakai huruf tunggal, ditambah seri AA sampai AG untuk wilayah yang tidak kebagian huruf tunggal: AA, AB, AD, AE, AG.
37. **terverifikasi** — Papua satu-satunya kawasan yang seluruh kodenya berawalan huruf sama dan seluruhnya ditetapkan pada abad ke-21.

### 13.8 Regulasi dan Warna Modern

38. **terverifikasi** — Sejak 15 Juni 2022, pelat kendaraan pribadi berubah dari dasar hitam tulisan putih jadi dasar putih tulisan hitam, untuk mendukung pembacaan kamera tilang elektronik ETLE.
39. **terverifikasi** — Warna lainnya: kuning untuk angkutan umum, merah untuk kendaraan pemerintah, hijau untuk kawasan perdagangan bebas seperti Batam, dan putih-biru untuk diplomatik.
40. **terverifikasi** — Pelat putih dengan tulisan merah bukan pelat wilayah, melainkan TCKB (Tanda Coba Kendaraan Bermotor), dipakai kendaraan baru sebelum pelat tetapnya selesai.
41. **terverifikasi** — Dasar hukum sistem registrasi yang berlaku sekarang adalah Peraturan Kepolisian Nomor 7 Tahun 2021 tentang Registrasi dan Identifikasi Kendaraan Bermotor.
42. **terverifikasi** — Kode RI khusus untuk kendaraan dinas Presiden, Wakil Presiden, Ketua Lembaga Tinggi Negara, dan pejabat setingkat menteri, sedangkan CC khusus untuk kendaraan Konsul Kehormatan.
43. **terverifikasi** — Untuk keperluan resmi seperti mutasi, cek pajak, atau jual-beli kendaraan, rujukan yang sah adalah SAMSAT setempat atau aplikasi SIGNAL Korlantas — daftar daring sering tidak sinkron dengan pemekaran wilayah terbaru.

---

## 14. Open Questions

Pertanyaan terbuka soal perilaku sistem ada di SRD bagian 9.

1. Apakah domain `terka.app` tersedia? Perlu dicek sebelum namanya dipakai di luar repositori pribadi.
2. Setelah DR dan EA, wilayah mana yang masuk prioritas ketiga untuk kode belakang? Keputusannya menunggu data frekuensi nyata dari beberapa bulan pemakaian, bukan tebakan di awal.
3. Apakah butir berlabel `legenda` di bagian 13 layak jadi materi soal tersendiri (misalnya "mana cerita yang belum terverifikasi?"), atau cukup jadi konteks pasif? Menjadikannya soal berisiko justru memperkuat cerita yang ingin ditandai lemah.
4. Apakah penanda per soal di Latihan Terfokus ("Soal ini juga dihitung untuk jadwal hari ini") justru mendorong Latihan Terfokus dipakai sebagai pengganti sesi harian? Perlu diamati setelah dipakai; kalau terjadi, penandanya mungkin diganti jadi ringkasan di akhir sesi saja.
