# TERKA — Product Requirements Document (PRD)

**Status:** Draf · **Bahasa:** Indonesia  
**Dokumen terkait:** `Terka_SRD.md`, `Terka_TRD.md`, `Terka_ERD.md`, `Terka_ERD.puml`, `Terka_Fun_Facts.md`, `../data/fun-facts.json`, `Terka_Special_Codes.md`, `../data/special-codes.json`, `Terka_Microcopy.md`, dan `Terka_Tests.md`.

> **Slogan:** Lihat pelatnya, terka asalnya.
>
> Dokumen ini menetapkan tujuan produk, fitur, alur pengguna, dan ukuran keberhasilannya. Aturan penilaian dan jadwal dijelaskan dalam SRD; rancangan implementasinya ada dalam TRD dan ERD.

**Pemilik angka.** Setiap angka aturan ditulis sekali, di dokumen pemiliknya. Dokumen lain merujuk bagian itu tanpa mengulang angkanya, supaya mengubah satu angka cukup di satu tempat.

| Jenis angka                                                   | Pemilik                             | Dokumen lain                                                |
| ------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| Aturan perilaku: kuota, ambang, interval, batas waktu soal    | SRD                                 | Merujuk bagian SRD, misalnya "batas harian (SRD 4.7)"       |
| Batas infrastruktur: baris, perangkat, email, ukuran database | TRD bagian 6 dan 9                  | ERD menjelaskan constraint-nya dan merujuk TRD              |
| Target produk, KPI, dan kriteria keberhasilan                 | PRD                                 | Tidak diulang di SRD atau TRD                               |
| Teks UI yang memuat angka aturan                              | Microcopy, dengan placeholder `{…}` | Tests memeriksa teks hasil render dengan nilai yang berlaku |

Tests boleh memakai angka konkret sebagai data uji, karena tes memang harus memeriksa nilai tertentu. Setelah kode ada, angka aturan berpindah ke satu modul konstanta (`src/rules.ts`) yang dipakai aplikasi dan tes. Dokumen tetap menjelaskan alasan setiap angka.

## 1. Gambaran Produk

Terka adalah aplikasi web progresif (PWA) untuk menghafal hubungan kode depan pelat kendaraan dengan kabupaten/kota yang menggunakan kode tersebut. Pengguna dapat berlatih tanpa akun. Setelah aplikasi dimuat dan disimpan di perangkat, latihan tetap tersedia tanpa koneksi internet. Akun menyediakan sinkronisasi progres antarperangkat.

Membaca tabel belum tentu membuat seseorang mampu mengingat jawabannya. Terka memberi latihan berulang pada waktu yang sesuai, meminta pengguna mengingat tanpa bantuan secara bertahap, dan membantu membedakan kode yang mirip, seperti BE/BD/BH/BG atau AA/AB/AD/AE/AG.

Materi dapat dipilih dari tingkat nasional, kawasan, atau provinsi. Semua soal memakai kode depan dan hubungan kode itu dengan daerah. Satu kode dapat digunakan oleh beberapa kabupaten/kota; aplikasi tidak menyimpulkan satu daerah tertentu dari pelat lengkap.

Selain kode wilayah, Terka menyediakan latihan **Kode diplomat** yang opsional (nama internalnya Latihan Kode Khusus). Jalur ini melatih kode negara pada pelat CD, dengan jadwal dan kuota yang terpisah dari latihan wilayah (bagian 6.16).

Proyek dikembangkan secara mandiri, gratis, dan tanpa iklan. Dokumen referensi menjadi bahan penyusunan data, tetapi setiap hubungan kode dan daerah tetap harus memenuhi pemeriksaan sumber sebelum digunakan dalam latihan. Terka bukan rujukan resmi untuk administrasi kendaraan.

## 2. Prinsip Perancangan

1. **Utamakan kemampuan mengingat.** Pilihan ganda membantu tahap awal; soal ketik menguji ingatan tanpa menampilkan pilihan jawaban.
2. **Jaga latihan tetap ringan.** Sasaran rutinnya kurang dari 10 menit waktu aktif per hari. Materi baru dibatasi agar pengulangan tidak terus menumpuk.
3. **Catat kode yang tertukar.** Jawaban salah yang cocok dengan daerah atau kode lain menjadi dasar latihan Bandingkan Kode.
4. **Ajukan pertanyaan sesuai bukti.** Hanya kode dan hubungan daerah berlabel `high` yang menjadi materi latihan. Data yang belum cukup kuat diberi penanda di Referensi.
5. **Pisahkan latihan dari bacaan sejarah.** Fun Facts hanya muncul pada akhir sesi, jika naskahnya sudah siap diterbitkan.
6. **Cakupan memilih materi baru.** Kartu yang sudah dipelajari tetap mengikuti jadwalnya, meskipun pengguna berpindah Cakupan.
7. **Kesulitan mengikuti perkembangan kartu.** Sistem menentukan level bawaan. Menurunkan level secara manual tidak memberikan bukti penguasaan untuk memperpanjang jadwal.
8. **Nilai jawaban secara otomatis.** Sistem memakai hasil jawaban dan sinyal interaksi; pengguna tidak diminta menilai sendiri seberapa mudah soalnya.
9. **Pengguna memegang kendali atas datanya.** Latihan berjalan dari perangkat, riwayat dapat diekspor, dan data akun dapat dihapus. Sinkronisasi menyediakan salinan di luar perangkat; pencadangan server dan ekspor tetap diperlukan.

## 3. Tujuan

**Tujuan utama:** pengguna mampu menyebut daerah yang sesuai dengan kode depan dengan akurasi minimal 95%, mulai mengetik dalam waktu kurang dari 3 detik, dan mempertahankan kemampuan itu setidaknya 30 hari tanpa latihan intensif.

| Bidang          | Hasil yang diharapkan                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Belajar         | Pengulangan memakai FSRS-6 dengan target retensi 0,90; parameter disesuaikan setelah data pribadi mencukupi                        |
| Materi          | Latihan dua arah kode → daerah dan daerah → kode, dilengkapi soal berwaktu dan penyebutan beberapa daerah                          |
| Penguasaan      | Setiap kartu memiliki jalur Level 3; status Dikuasai memerlukan interval panjang dan keberhasilan Level 3 pada kartu itu (SRD 3.4) |
| Pengalaman awal | Pengguna baru dapat menjawab soal pertama dalam kurang dari 60 detik tanpa masuk akun                                              |
| Durasi          | Isi dan perkiraan durasi terlihat sebelum sesi; waktu aktif latihan rutin ditargetkan di bawah 10 menit per hari                   |
| Fleksibilitas   | Cakupan dapat diganti tanpa menghapus jadwal; latihan opsional dicatat terpisah                                                    |
| Data            | Riwayat pengguna yang masuk akun dapat dipulihkan di perangkat lain; pengguna tanpa akun tetap dapat mengekspor riwayat            |
| Operasional     | Pengeluaran awal dibatasi pada domain; pemicu penyesuaian layanan ditetapkan dalam TRD 6                                           |
| Mutu            | Setiap aturan memiliki skenario uji; kegagalan pemeriksaan wajib menghentikan penerbitan                                           |

Tahap belajar awal selesai di sesi yang sama: kode baru ditanyakan sekali lagi beberapa soal kemudian, dan kode yang dijawab salah ditanyakan sekali lagi di akhir sesi. Selain soal ulang itu, sesi tidak menambah soal setelah dimulai. Perhitungan durasi dijelaskan dalam SRD 4.7 dan 4.14.

## 4. Pengguna Sasaran

| Pengguna                                          | Kebutuhan utama                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Pengguna yang penasaran setelah melihat kendaraan | Pencarian langsung, latihan singkat, dan penggunaan tanpa akun                 |
| Pengguna yang ingin hafal seluruh kode            | Jadwal konsisten, statistik kemajuan, dan sinkronisasi                         |
| Pengguna yang sudah mengenal banyak kode          | Tes penempatan, soal tanpa bantuan, dan latihan menyebut beberapa daerah       |
| Pemilik proyek sebagai penguji pertama            | Penggunaan rutin di ponsel dan laptop untuk menilai kenyamanan dan konsistensi |

Ponsel menjadi perangkat utama. Tombol mudah dijangkau dengan satu tangan dan kolom jawaban mendukung keyboard layar. Pintasan keyboard fisik tetap tersedia. Aplikasi tidak menganggap pengguna memahami istilah penjadwalan atau bersedia membuat akun.

Penjelasan awal cukup satu layar. Bantuan lain diberikan saat diperlukan, sementara halaman Tentang menjelaskan penggunaan data dan batas keandalannya.

## 5. Ruang Lingkup

Rilis pertama mencakup data kode depan dan kabupaten/kota, alias serta variasi penulisan, tiga tingkat Cakupan, penjadwalan FSRS-6, tiga level soal, penilaian ketik, Latihan Kode Khusus CD, Bandingkan Kode, Catatan pengingat, tes penempatan, pratinjau, statistik, Referensi, pencatatan Pelat Terlihat, akun opsional, sinkronisasi, ekspor, impor, dan pengaman layanan publik.

Naskah sejarah hanya digunakan pada bagian Fun Facts setelah lolos pemeriksaan sumber. Kode negara CD yang berlabel `high` dapat dilatih melalui Latihan Kode Khusus. Pelat RI, CC, dan CH hanya tersedia di Referensi.

Rilis ini tidak mencakup fitur sosial, papan peringkat, iklan, pembayaran, konten di luar kode pelat, login selain Google dan email, atau pemulihan satu akun dari cadangan database. UI dan konten hanya tersedia dalam bahasa Indonesia; terjemahan tidak direncanakan. Pemulihan akun menggunakan sinkronisasi atau ekspor pengguna; cadangan database dipakai untuk pemulihan layanan secara keseluruhan.

**Identitas kartu.** Setiap kartu memiliki jadwal sendiri. Untuk `N` kode yang memenuhi syarat latihan, kartu yang tersedia adalah:

| Mode                 | Fungsi                                                               | Jumlah maksimum   |
| -------------------- | -------------------------------------------------------------------- | ----------------- |
| `code2region`        | Menyebut daerah dari kode                                            | N                 |
| `region2code`        | Menyebut kode dari nama daerah; terbuka bertahap                     | N                 |
| `setrecall`          | Menyebut beberapa daerah; memerlukan sedikitnya tiga daerah yang sah | N                 |
| **Subtotal wilayah** | Dihitung dari data saat aplikasi dibangun                            | **3 × N**         |
| `special2holder`     | Menyebut pemegang dari kode khusus, misalnya CD 49 → Jepang          | S                 |
| `holder2special`     | Menyebut kode khusus dari pemegangnya; terbuka bertahap              | S                 |
| **Total**            | Dihitung dari data saat aplikasi dibangun                            | **3 × N + 2 × S** |

Revisi data ini memuat 61 kode yang memenuhi syarat, sehingga jumlahnya paling banyak 183 kartu wilayah. `S` adalah jumlah entri kode khusus berlabel `high`; data yang sama memuat 130 entri CD, sehingga jalur kode khusus menambah paling banyak 260 kartu. Perkenalan, tes penempatan, Tebak berwaktu, Benar atau salah, dan Mana yang bukan tidak menambah jenis kartu. Tebak berwaktu adalah bentuk Level 3 kartu `code2region` dan `region2code`, bukan kartu dengan jadwal sendiri. Referensi tidak membuat kartu atau jawaban latihan.

Batas materi baru harian berlaku global menurut tingkat pengguna (SRD 4.7), lintas Cakupan dan perangkat. Pengulangan yang sudah terjadwal mengikuti aturan SRD 4.7. Latihan Kode Khusus memakai kuota sendiri dan tidak mengurangi batas ini (SRD 2.9).

## 6. Fitur Utama

### 6.1 Penjadwalan Pengulangan

FSRS-6 menentukan jadwal dari riwayat setiap kartu. Materi yang masih sulit diingat mendapat pengulangan lebih dekat. Parameter awal digunakan sampai syarat optimasi pribadi terpenuhi. Hasil optimasi diperiksa sebelum diaktifkan dan dapat dikembalikan otomatis jika hasilnya memburuk.

Jadwal dihitung dari riwayat yang sama pada setiap perangkat. Aturannya ada di SRD 4; mekanisme penyimpanan dan penghitungan ulang ada di TRD 4.

### 6.2 Cakupan

Cakupan memiliki tiga tingkat: **Nasional → Kawasan → Provinsi**. Pilihan ini menentukan kelompok materi baru serta sumber awal pilihan jawaban. Tingkat kode tidak menjadi pilihan Cakupan; rincian kode dapat dibuka di Referensi atau Statistik.

| Tingkat  | Materi baru                                     | Sumber awal pilihan jawaban              |
| -------- | ----------------------------------------------- | ---------------------------------------- |
| Nasional | Kode dari seluruh Indonesia                     | Daerah atau kode di seluruh Indonesia    |
| Kawasan  | Kode dalam kawasan terpilih                     | Daerah atau kode dalam kawasan tersebut  |
| Provinsi | Kode yang dikelompokkan dalam provinsi terpilih | Daerah atau kode dalam provinsi tersebut |

Jika pengecoh yang sah tidak cukup, sumbernya diperluas ke kawasan kartu, lalu nasional. Perluasan pilihan tidak membuka materi baru di luar Cakupan.

Soal kode → daerah menerima salah satu kabupaten/kota yang sah. Nama provinsi tidak menjadi pilihan ganda, dan hanya diterima sebagai jawaban ketik jika kode tersebut secara eksklusif mencakup seluruh provinsi. Aturan rinci ada di SRD 2.8.

**Latihan Terfokus** berbeda dari Cakupan: fitur ini melatih kartu yang sudah dipelajari di wilayah tertentu. Jawabannya hanya dapat memperbarui jadwal jika kartu sudah perlu diulang dan seluruh syarat penjadwalan terpenuhi.

### 6.3 Bentuk Soal

**Golongan A** berisi soal singkat yang dapat masuk sesi harian.

| Bentuk           | Tugas                                                                                                                 | Level |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- | ----- |
| Tebak daerah     | Menyebut satu kab/kota yang memakai kode; pilihan ganda saat tahap awal                                               | 1–3   |
| Tebak kode       | Menyebut kode dari nama kab/kota lengkap; pilihan ganda saat tahap awal                                               | 1–3   |
| Benar atau salah | Memeriksa pasangan kode dan daerah dalam 5 detik                                                                      | 1     |
| Mana yang bukan  | Memilih daerah yang tidak memakai kode soal                                                                           | 1     |
| Tebak berwaktu   | Bentuk Level 3 Tebak daerah dan Tebak kode: menjawab dengan batas waktu input pertama (SRD 4.4); bukan kartu terpisah | 3     |

**Tanpa petunjuk parsial.** Tidak ada bentuk soal yang menampilkan huruf pertama, digit pertama, atau sebagian jawaban. Kesulitan naik dari memilih, ke mengetik, lalu ke mengetik dengan batas waktu (SRD 3.1). Nama bentuk di UI ditulis sebagai tindakan, seperti **Tebak daerah**, bukan arah panah (`Terka_Microcopy.md` bagian 1).

**Golongan B**, yaitu **Sebutkan sebanyak mungkin**, berjalan sebagai sesi terpisah satu soal. Kartu `setrecall` terbuka setelah kartu `code2region` kode itu cukup stabil dan kodenya memiliki cukup kab/kota yang sah; syarat pastinya di SRD 4.8. Perkenalannya memakai Level 1; penilaian berikutnya memakai Level 3. Sesi ini dibuka dari Statistik atau pemeriksaan kode, mengikuti kuota global, dan tidak masuk sesi harian, Tantangan Harian, atau Mode Kilat.

**Golongan C** khusus Mode Kilat: benar/salah, mengenali kawasan, atau mengenali huruf pertama. Jawabannya tidak mengubah jadwal.

Setiap kartu memiliki bentuk Level 3 sesuai modenya. Keberhasilan satu kartu tidak meluluskan kartu lain. Kartu tidak perlu menunggu pasangan tertukar muncul untuk diuji penguasaannya.

Pengecoh harus salah untuk pertanyaan yang diajukan. Pada soal Tebak daerah, pilihan berupa kab/kota; pada soal Tebak kode, pilihan berupa kode. Jika empat pilihan sah tidak dapat dibentuk, Perkenalan menampilkan informasi tanpa tebakan dan soal berikutnya memakai bentuk ketik sesuai SRD 2.8.

### 6.4 Bandingkan Kode

Sistem mengenali pasangan kode yang berulang kali tertukar. Latihan menampilkan kedua kode dan meminta pengguna membedakannya. Ambang pencatatan, penghentian latihan pasangan, dan pengaruhnya terhadap jadwal mengikuti SRD 6.

### 6.5 Fun Facts

Satu fakta dapat muncul pada akhir setiap mode, lengkap dengan sumber dan label **Terverifikasi**, **Diperdebatkan**, atau **Mitos**. Hanya naskah berstatus publikasi `ready` yang dapat dipilih. Jika belum tersedia, bagian ini tidak ditampilkan dan sesi tetap selesai.

Label sejarah menjelaskan kekuatan bukti; status publikasi menjelaskan kesiapan naskah. Keduanya berbeda. Fakta tidak menjadi soal atau pilihan jawaban. Pemilihan mengutamakan kode yang baru dilatih, menghindari pengulangan dari N tampilan terakhir, dan membatasi mitos yang berdekatan. N dihitung dari jumlah naskah siap terbit menurut SRD 4.15. Riwayat tampil ikut disinkronkan.

### 6.6 Statistik dan Peta Penguasaan

Statistik menyediakan daftar kartu yang paling sering salah, perkiraan pengulangan selama 14 hari, dan peta tingkat penguasaan wilayah. Peta bersifat informatif; pengguna tidak menjawab soal melalui peta pada rilis pertama.

Halaman ini juga memuat kartu Sulit Dikuasai, Pelat Terlihat, status sinkronisasi, tanggal ekspor terakhir, akun, dan akses sesi Sebutkan sebanyak mungkin. Riwayat parameter FSRS hanya tersedia di pengaturan lanjutan.

### 6.7 Tantangan Harian dan Mode Kilat

**Tantangan Harian** tersedia sekali sehari dan berisi paling banyak lima kartu Golongan A yang sudah dipelajari. Jika hanya tiga kartu tersedia, tampilkan tiga; jika tidak ada, mode belum tersedia. Tantangan mengambil kartu lintas Cakupan dan mencatat Hari Beruntun, sama seperti sesi harian yang tuntas.

**Mode Kilat** berlangsung dalam satu putaran berdurasi tetap (SRD 4.4). Skor dihitung dari jawaban benar, dan Rekor Terbaik disimpan per wilayah. Kedua mode tidak memperbarui jadwal belajar.

### 6.8 Referensi

Referensi menampilkan data langsung setelah pengguna mencari kode atau nama daerah. Hierarki penelusurannya mengikuti wilayah. Data yang belum memenuhi syarat latihan tetap dapat ditampilkan dengan label kepercayaan.

Halaman ini tidak memiliki soal, tebakan, penilaian, atau perubahan jadwal. Pencarian kode wilayah dapat menambah catatan Pelat Terlihat sesuai bagian 6.10.

Pencarian kode CD, misalnya "CD 49", menampilkan pemegangnya, sumber, label kepercayaan, dan tanggal pemeriksaan. Pencarian nama negara atau organisasi menampilkan kodenya. Input yang memuat nomor urut registrasi, seperti "CD 49 07", hanya dibaca kode negaranya; bagian lain dibuang. Referensi juga menjelaskan format CC dan CH. Pencarian RI, dengan atau tanpa nomor, hanya menampilkan format seri RI dan keterangan bahwa tidak ada sumber valid yang memuat daftar lengkap kode RI dan alokasinya dapat berubah sewaktu-waktu. Referensi tidak menampilkan jabatan per nomor RI.

### 6.9 Akun dan Sinkronisasi

Semua fitur belajar tersedia tanpa akun. Riwayat hanya tersimpan di browser yang dipakai, sehingga ekspor tetap diperlukan jika pengguna ingin menyimpan salinan.

Masuk dengan Google menjadi pilihan utama. Masuk dengan email menyediakan tautan dan kode enam digit. Jalur email tetap tersedia ketika Google tidak dapat digunakan dari browser di dalam aplikasi atau ketika pengguna memakai PWA iPhone. Email yang sama mengarah ke akun yang sama sesuai aturan penyedia identitas.

Persetujuan kebijakan privasi diminta sebelum masuk pertama kali dan setelah perubahan kebijakan yang memerlukan persetujuan ulang. CAPTCHA digunakan pada jalur email. Rincian autentikasi dan data profil mengikuti TRD 5.1.

Sinkronisasi berjalan saat aplikasi dibuka, beberapa detik setelah jawaban tersimpan, dan saat koneksi kembali. Beranda menampilkan ikon status; penjelasannya tersedia di Statistik. Ekspor menyimpan riwayat dalam JSON dan diingatkan setelah 30 hari.

Saat keluar, aplikasi menyelesaikan sinkronisasi sebelum menghapus data lokal. Jika masih ada perubahan yang belum terkirim, pengguna harus memilih apakah menunggu sinkronisasi atau tetap keluar. Menghapus akun menghapus data server; penanganan salinan lokal dijelaskan sebelum tindakan dilakukan.

Ajakan masuk tersedia di Statistik dan satu kali pada akhir sesi setelah tujuh hari aktif tanpa akun. Menutup ajakan tersebut tidak membuatnya muncul kembali.

### 6.10 Pelat Terlihat

Pelat Terlihat mencatat frekuensi pencarian kode depan di Referensi. Catatan ini menunjukkan minat pencarian, bukan bukti bahwa kendaraan benar-benar dilihat. Frekuensi dalam jendela waktu terakhir membantu menentukan urutan materi baru (SRD 2.7).

Pencarian kode yang sama berulang kali dalam waktu singkat di perangkat yang sama hanya dicatat sekali, dan pencarian nama daerah serta kode khusus RI/CD/CC/CH tidak dicatat. Aturan pastinya di SRD 4.11.

Hanya identitas kode depan yang disimpan. Jika input berupa pelat lengkap, bagian lainnya dibuang sebelum penyimpanan, analitik, atau catatan diagnostik. Pencarian tidak membuat `review_logs`, menggunakan kuota belajar, meluluskan level, menambah pasangan tertukar, atau mengubah jadwal. PWA menyediakan pintasan ke Referensi.

### 6.11 Catatan Pengingat

Pengguna dapat menulis asosiasi pribadi sepanjang maksimal 280 karakter, satu catatan per kode. Contohnya, “DR: Dari Rinjani”. Catatan dapat diubah melalui pemeriksaan kode.

Tawaran menulis catatan muncul setelah empat kegagalan pengulangan dan tetap opsional. Catatan ditampilkan setelah jawaban; pada kartu Sulit Dikuasai, catatan dapat muncul sebelum pertanyaan. Ambang dan pengecualian penilaian mengikuti SRD 6.4.

### 6.12 Perkenalan

Materi baru dimulai dengan soal pilihan ganda berlabel **Tebak dulu**, lalu jawaban dan daftar daerah yang sesuai ditampilkan. Tebakan dicatat tanpa nilai penjadwalan atau pasangan tertukar. Jika pilihan yang sah tidak cukup, tampilkan informasi tanpa tebakan.

Perkenalan menggunakan kuota materi baru. Kode itu ditanyakan sekali lagi di sesi yang sama; setelah itu tidak jatuh tempo lagi hari itu. Label **Tebak dulu** hanya digunakan pada Perkenalan.

### 6.13 Tes Penempatan

Tes ditawarkan setelah layar sambutan dan boleh dilewati. Bentuknya kode → daerah dengan jawaban ketik, tombol **Tidak tahu**, tanpa hasil benar atau salah di setiap soal. Tes terdiri dari tiga tahap adaptif dengan jumlah soal dan perkiraan durasi di SRD 4.13.

Hasil tes memberi tingkat awal, perkiraan kode yang sudah dikenal, dan saran Cakupan. Hanya kartu yang benar-benar dijawab benar tanpa gangguan yang langsung masuk tahap pengulangan. Kartu lain tetap baru. Syarat status Dikuasai tidak berubah.

Tes dapat diambil atau diulang selama belum ada jawaban yang dihitung untuk jadwal di luar tes. Perkenalan saja belum menutup kesempatan itu. Setelah tersedia riwayat yang cukup, tingkat disesuaikan otomatis menurut SRD 4.16. Batas awal per tingkat adalah 8, 10, 12, dan 13 materi baru; melewati tes memakai batas Menengah.

### 6.14 Pratinjau Sesi

Pratinjau menampilkan jumlah soal, rincian jenis dan level, perkiraan durasi, serta paling banyak tiga informasi yang relevan. **Mulai** atau Enter membuka sesi; **Kembali** atau Esc menutup pratinjau tanpa mengubah data belajar.

Sesi dengan antrean tetap memakai daftar yang sudah ditampilkan. Kode yang baru diperkenalkan ditanyakan sekali lagi beberapa soal kemudian, dan kode yang dijawab salah ditanyakan sekali lagi di akhir sesi. Setelah sesi harian selesai, tidak ada soal yang perlu diulang sampai besok. Pratinjau diperbarui sebelum mulai jika sudah terbuka lebih dari 10 menit, hari berganti, atau data yang memengaruhi antrean berubah.

Mode Kilat menampilkan durasi tetapnya. Tes penempatan menampilkan batas atas jumlah soal karena jumlah akhirnya bergantung pada hasil tiap tahap. Rumus durasi ada di SRD 4.14.

### 6.15 Layar Sambutan dan Halaman Tentang

Layar sambutan menjelaskan fungsi Terka, penggunaan tanpa akun, penyimpanan progres di perangkat, dan batas data. Setelah itu pengguna dapat mengikuti tes penempatan atau langsung membuka beranda.

Halaman Tentang menjelaskan sumber dan pembaruan konten, arti label kepercayaan, penggunaan data, perbedaan akun dan tanpa akun, kebijakan privasi, serta cara melaporkan data yang keliru melalui `contact@terka.my.id`. Penjelasan harus menegaskan bahwa Terka bukan layanan resmi dan progres tanpa akun terpisah antarbrowser.

### 6.16 Latihan Kode Khusus

Latihan Kode Khusus, yang tampil di UI sebagai **Kode diplomat**, melatih kode negara pada pelat CD, yang tidak menunjuk wilayah. Jalur ini nonaktif secara bawaan dan diaktifkan dari Statistik atau dari hasil pencarian kode khusus di Referensi. Setelah aktif, Beranda menampilkan tombol **Kode Khusus** di bawah tombol utama.

| Seri | Yang dilatih                                              | Entri latihan pada revisi ini | Sumber utama                           |
| ---- | --------------------------------------------------------- | ----------------------------- | -------------------------------------- |
| CD   | Kode negara korps diplomatik dan organisasi internasional | 130 (CD 12 sampai CD 145)     | Lampiran Perpol 7/2021 huruf D angka 4 |

Daftar lengkap, alias, sumber per entri, dan alasan setiap label ada di `Terka_Special_Codes.md`.

**Bentuk soal.** Setiap entri menghasilkan dua kartu. `special2holder` bertanya dari kode: "CD 49 dipakai perwakilan mana?". `holder2special` bertanya dari pemegang: "Berapa kode CD untuk Jepang?". Kartu `holder2special` terbuka setelah kartu `special2holder` entri yang sama cukup stabil (SRD 2.9). Level 1 memakai pilihan ganda, Level 2 jawaban ketik tanpa batas waktu, dan Level 3 jawaban ketik dengan batas waktu input pertama.

**Yang tidak ditanyakan.** Nomor urut registrasi di belakang kode negara tidak pernah menjadi soal atau jawaban, karena nomor itu menunjuk kendaraan tertentu dan tidak memiliki daftar resmi yang terbuka.

**Terpisah dari latihan wilayah.** Kartu kode khusus tidak masuk sesi harian, Tantangan Harian, Mode Kilat, tes penempatan, Bandingkan Kode, Peta Penguasaan, atau Uji Penguasaan Kawasan. Materi barunya memiliki kuota lima kartu per hari dan ambang penahanan sendiri. Menonaktifkan jalur hanya menghentikan materi baru, seperti Cakupan. Kartu yang sudah dipelajari tetap mengikuti jadwalnya walaupun jalur dinonaktifkan, dan tetap terlihat sebagai soal yang perlu diulang di tombol **Kode Khusus**.

**Syarat materi.** Hanya entri `high` yang menjadi soal. Aturan labelnya ada di `Terka_Special_Codes.md` bagian 3 dan TRD 4.1. Data CD diperiksa ulang setiap enam bulan. Jika pemegang satu nomor berubah, kartu lama dinonaktifkan dan pemegang baru hadir sebagai materi baru dengan `id` baru.

**Penanda kemajuan.** Statistik menampilkan penguasaan CD secara terpisah dari penguasaan wilayah. Kartu kode khusus tidak dihitung dalam kriteria penguasaan wilayah di bagian 12.

## 7. Alur Pengguna

### 7.1 Alur Utama

1. Pada kunjungan pertama, tampilkan sambutan, lalu tawarkan tes penempatan atau pilihan melewatinya.
2. Beranda menampilkan soal yang perlu diulang, materi baru yang tersedia, Cakupan, dan status sinkronisasi. Tombol utama adalah **Mulai belajar**, **Tantangan Harian**, dan **Mode Kilat**. Jika Latihan Kode Khusus aktif, tombol **Kode diplomat** tampil di bawahnya beserta jumlah soal yang perlu diulang.
3. Bilah bawah memuat Beranda, Cakupan, Statistik, dan Referensi. Menelusuri wilayah tidak mengubah Cakupan; pengguna menerapkannya melalui **Pilih wilayah ini**. **Latih wilayah ini** membuka Latihan Terfokus tanpa mengganti Cakupan.
4. Sebelum latihan, tampilkan pratinjau. Setelah dimulai, pilihan keyboard 1–4 dikunci dengan Enter; ketukan atau klik langsung mengunci pilihan. Jawaban ketik dikirim dengan Enter. Kolom kosong tidak dikirim.
5. Tampilkan hasil dan jawaban yang benar. Level ditentukan otomatis, tetapi dapat diubah manual dengan penjelasan dampaknya. Perkenalan tidak dinilai.
6. Enter atau **Lanjut** membuka soal berikutnya. Pada ponsel, tombol tetap mudah dijangkau dan keyboard layar tidak ditutup di antara soal ketik.
7. Jawaban terakhir pada perangkat yang sama dapat dibatalkan dengan Z atau **Batalkan jawaban**, sampai jawaban berikutnya masuk atau layar soal ditutup. Pembatalan tidak tersedia pada Mode Kilat.
8. Setelah antrean selesai, tampilkan ringkasan, perubahan penguasaan yang relevan, dan Fun Facts jika tersedia. Tombol penutup adalah **Kembali ke beranda**, tanpa ajakan menambah sesi.

### 7.2 Alur Akun dan Sinkronisasi

Pengguna membuka akun dari Statistik, membaca kebijakan privasi, lalu memilih Google atau email. Setelah identitas terverifikasi, riwayat lokal yang belum dimiliki akun digabungkan ke akun tersebut. Data yang sudah dimiliki akun lain tidak dipindahkan otomatis.

Pada perangkat baru, aplikasi mengambil riwayat sebelum menyusun jadwal. Tanpa koneksi, latihan memakai salinan lokal dan perubahan menunggu pengiriman. Jika sesi masuk berakhir, latihan tetap tersedia, tetapi sinkronisasi menunggu pengguna masuk kembali.

Ekspor dan impor tersedia dari Statistik. Hasil impor menyebut jumlah data yang ditambahkan dan yang sudah ada. Berkas dari versi format lain atau yang bukan ekspor Terka ditolak tanpa mengubah data yang tersimpan; riwayat dari versi Terka sebelumnya tidak dimigrasikan.

### 7.3 Alur Referensi dan Pelat Terlihat

Pengguna membuka Referensi, memasukkan kode atau nama daerah, lalu langsung melihat hasil. Input pelat lengkap dibaca hanya untuk mengambil kode depannya. Tidak ada tahap menebak atau tombol untuk menampilkan jawaban.

Pencarian kode yang memenuhi aturan pencatatan menambah Pelat Terlihat. Pengguna kemudian dapat kembali ke halaman sebelumnya; tidak ada perubahan jadwal atau kuota latihan.

## 8. Kebiasaan Belajar dan Penanda Kemajuan

- **Hari Beruntun:** dihitung dari sesi harian yang tuntas atau Tantangan Harian, dengan satu hari toleransi dalam periode 30 hari bergerak. Dua hari yang terlewat di sisi pergantian bulan tetap masuk periode yang sama.
- **Rekor Terbaik:** skor Mode Kilat tertinggi per wilayah. Rekor nasional dan kawasan dipisahkan.
- **Uji Penguasaan Kawasan:** kawasan dinyatakan dikuasai jika seluruh kartu yang dihitung berstatus `mature` dan tidak ada pasangan tertukar aktif yang melibatkan kodenya. Kartu `locked` dan `suspended` tidak dihitung.
- **Indikator Level:** tiga lingkaran menunjukkan persentase kartu yang pernah berhasil di Level 1, 2, dan 3. Keberhasilan dihitung per kartu dari jawaban sah yang tidak dibatalkan dan tidak memakai bantuan yang membocorkan jawaban. Lulus satu level tidak otomatis meluluskan level lain.

Terka tidak memakai XP, mata uang, koleksi lencana, atau misi berlapis. Semua penanda kemajuan dihitung dari gabungan riwayat setelah sinkronisasi. Tantangan yang diselesaikan di dua perangkat pada hari yang sama tetap dihitung satu hari.

## 9. Ukuran Keberhasilan (KPI)

KPI belajar dihitung per pengguna. KPI produk memakai agregat akun yang masuk. Analitik kunjungan hanya menghitung kunjungan halaman tanpa mengirim riwayat latihan pengguna tanpa akun.

| Metrik belajar                                                        | Target                                                            |
| --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Retensi kartu Dikuasai                                                | Minimal 90%                                                       |
| Selisih retensi aktual dari target 0,90                               | Dalam rentang ±3 poin persentase                                  |
| Median waktu sampai input pertama                                     | Kurang dari 3 detik                                               |
| Penguasaan kartu `code2region` seluruh kode                           | 100% dalam 90 hari                                                |
| Kawasan dikuasai                                                      | 7 dari 7 dalam 120 hari                                           |
| Kartu `mature` yang memenuhi syarat Level 3                           | 100%                                                              |
| Beban pengulangan                                                     | Stabil di bawah ambang penahanan tingkat pengguna                 |
| Hari aktif                                                            | Minimal 5 hari per minggu                                         |
| Perubahan belum tersinkron lebih dari 24 jam saat terhubung           | 0                                                                 |
| Kartu yang mencapai batas penundaan dua hari                          | Kurang dari 5% pengulangan harian                                 |
| Pencarian Referensi yang mengubah jadwal atau mencatat jawaban        | 0                                                                 |
| Kesalahan pada pengulangan pertama kartu hasil tes penempatan         | Maksimal 20%                                                      |
| Sesi dengan antrean tetap yang selesai dalam rentang durasi perkiraan | Minimal 80%; bandingkan `active_ms` dengan rentang `estimated_ms` |
| Kesalahan berikutnya setelah jawaban bertipe `typo`                   | Tidak lebih tinggi daripada setelah jawaban `exact`               |
| Retensi kartu kode khusus Dikuasai                                    | Minimal 90%; dilaporkan terpisah dari kartu wilayah               |
| Kartu kode khusus dari entri yang tidak berlabel `high`               | 0                                                                 |

| Metrik produk                                  | Target                          |
| ---------------------------------------------- | ------------------------------- |
| Pengguna akun yang masih aktif pada hari ke-30 | Minimal 30%                     |
| Median retensi antar pengguna akun             | Dalam rentang ±3 poin dari 0,90 |
| Pengguna wajar yang mencapai batas data harian | 0                               |
| Laporan data keliru yang terbukti              | Dicatat tanpa target jumlah     |

Kunjungan bulanan, perbandingan pengunjung `/sesi` dengan `/`, dan kunjungan `/referensi` dipantau terpisah. Target perpindahan dari beranda ke sesi ditentukan setelah 30 hari data tersedia. Ketentuan layanan analitik dan batas paket harus diperiksa saat penerapan menurut TRD 3.

Akurasi sesi harian tidak menjadi sasaran utama: angka tinggi dapat muncul karena soal terlalu mudah. Retensi, konsistensi penggunaan, dan beban latihan lebih mewakili tujuan produk.

## 10. Risiko

| Risiko                                            | Penanganan                                                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Data browser hilang atau perangkat berganti       | Penyimpanan persisten, akun opsional, ekspor, dan peringatan perubahan yang belum terkirim                      |
| Layanan sinkronisasi tidak tersedia               | Latihan lokal tetap berjalan; status kegagalan ditampilkan dan layanan dipantau                                 |
| Database rusak atau terhapus                      | Cadangan terenkripsi dan prosedur pemulihan sesuai TRD 6                                                        |
| Jadwal berbeda setelah sinkronisasi               | Versi algoritma dikunci; urutan riwayat dan pengacakan deterministik diuji                                      |
| Konten berubah atau belum terbukti                | Versi data, ID stabil, pemeriksaan sumber per hubungan, dan penonaktifan materi yang tidak lagi memenuhi syarat |
| Penilaian otomatis atau optimasi kurang tepat     | Simpan sinyal mentah, gunakan versi aturan, evaluasi hasil, dan kembalikan parameter jika memburuk              |
| Pengulangan menumpuk                              | Kuota materi baru, ambang penahanan, dan pembatasan kartu terkait                                               |
| Kartu terus salah                                 | Catatan pengingat, bantuan belajar, dan penonaktifan untuk ditinjau                                             |
| Jawaban terkirim terlalu cepat                    | Abaikan kolom kosong dan sediakan pembatalan jawaban terakhir                                                   |
| Tes penempatan terlalu mudah meluluskan kartu     | Tombol Tidak tahu, tanpa pilihan ganda, dan pemantauan hasil pengulangan pertama                                |
| Toleransi ejaan menerima daerah yang salah        | Pemeriksaan kamus sebelum toleransi, ambang menurut panjang nama, dan tes benturan alias                        |
| Login gagal pada browser atau perangkat tertentu  | Jalur Google dan email, kode enam digit, serta uji perangkat nyata                                              |
| Email atau domain bermasalah                      | Pemeriksaan DNS email, pemantauan layanan, dan pengingat sebelum masa aktif domain berakhir                     |
| Penyalahgunaan layanan publik                     | CAPTCHA email, batas pengiriman, batas data akun, serta pemisahan data melalui RLS                              |
| Biaya layanan meningkat                           | Pemicu kapasitas dan peninjauan paket sebelum batas tercapai                                                    |
| Data dianggap sebagai rujukan administratif resmi | Penjelasan batas data di sambutan, Tentang, dan Referensi; jalur laporan kesalahan                              |
| Input pencarian menyimpan identitas kendaraan     | Simpan hanya kode depan dan jangan kirim input lengkap ke analitik atau diagnostik                              |
| Daftar kode CD di media keliru                    | Data CD hanya dari lampiran Perpol 7/2021; daftar media tidak dipakai sebagai sumber                            |
| Kode CD baru setelah 2021 belum tercatat          | Referensi menjelaskan batas tanggal data; kode baru menunggu sumber resmi Kemlu atau perubahan peraturan        |
| Ruang lingkup pengembangan membesar               | Dahulukan latihan dan konsistensi data; fitur lanjutan menunggu pemakaian nyata                                 |

Kebijakan privasi dan ketentuan penyedia layanan perlu diperiksa sebelum login publik dibuka. Rancangan teknis tidak menggantikan pemeriksaan tersebut.

## 11. Rencana Pengembangan

**Urutan rilis pertama:** selesaikan penjadwalan, penyimpanan lokal, sinkronisasi, dan tes; gunakan aplikasi selama 14 hari pada dua perangkat sebelum menyempurnakan Pelat Terlihat dan Catatan pengingat. Buka latihan tanpa akun lebih dulu. Login publik dibuka setelah sumber biaya paket Pro Supabase diputuskan (TRD bagian 10) dan setelah autentikasi, kebijakan privasi, pengaman data, email, dan pencadangan siap.

**Fase 2 — Penguatan latihan:** soal peta, pemilihan beberapa Cakupan sekaligus, dan variasi soal berbasis kode depan. Kandidat variasinya adalah melengkapi deret, membalik urutan kode, skenario lokasi, mengenali kode tidak valid, memperbaiki pernyataan, mengelompokkan kode, soal berantai, dan wilayah berbatasan. Masing-masing memerlukan aturan dan tes sebelum ditambahkan.

**Fase 3 — Adaptasi dari riwayat pribadi.** Tabel berikut memuat tahap 1, 2, dan 3 secara berurutan. Tahap 1 sudah termasuk rilis pertama; tahap berikutnya menunggu data.

| Pengembangan adaptasi                     | Syarat awal                   | Status                                             |
| ----------------------------------------- | ----------------------------- | -------------------------------------------------- |
| Optimasi parameter FSRS pribadi           | Syarat data di SRD 4.12       | Termasuk rilis pertama; mengikuti SRD 4.12         |
| Pemilihan level berdasarkan peluang ingat | Sekitar 150 jawaban per level | Ditunda sampai data cukup                          |
| Kalibrasi bobot penilaian                 | Sekitar 1.000 jawaban         | Eksperimen; dipakai hanya jika hasilnya lebih baik |

Parameter tetap satu set global sampai data menunjukkan perlunya pemisahan. **Fase 4 — Pengembangan setelah rilis publik** mencakup kemungkinan fitur kompetitif dan pemulihan satu akun dari cadangan server. Keduanya berada di luar rilis pertama. Fitur kompetitif memerlukan validasi server sebelum dibangun.

## 12. Kriteria Keberhasilan

1. Kartu `code2region` untuk semua kode yang memenuhi syarat berstatus Dikuasai, yang berarti pernah lulus Tebak berwaktu, dalam 90 hari sejak latihan dimulai. Kartu kode khusus tidak termasuk kriteria ini.
2. Akurasi uji tanpa bantuan pada 30 soal acak nasional mencapai 90% setelah 14 hari tanpa latihan.
3. Waktu aktif latihan rutin berada di bawah 10 menit per hari selama empat minggu; waktu menunggu jadwal dan latihan opsional, termasuk Latihan Kode Khusus, tidak dihitung.
4. Aplikasi tetap digunakan pada hari ke-30, ke-60, dan ke-90.
5. Selama 30 hari penggunaan dua perangkat, tidak ada jawaban hilang dan keadaan aplikasi sama setelah sinkronisasi selesai.
6. Semua pengujian otomatis yang berlaku dalam `Terka_Tests.md` lolos di CI, termasuk WebKit. Pemeriksaan manual memiliki hasil yang tercatat.
7. Optimasi berjalan setelah syarat data terpenuhi dan keputusan penerimaan atau penolakannya tercatat.
8. Pengguna baru dapat menjawab soal pertama dalam 60 detik tanpa akun melalui ponsel dengan koneksi 4G.
9. Latihan tanpa akun tidak mengirim permintaan ke Supabase.
10. Login Google dan email, sinkronisasi, ekspor, serta penghapusan akun diuji pada Chrome Android, Safari iOS, dan PWA iOS. Pengiriman email diperiksa pada kotak masuk nyata.

## 13. Pertanyaan yang Masih Terbuka

Pertanyaan tentang penyetelan perilaku ada di SRD 10; keputusan implementasi dan layanan yang belum final ada di TRD 10.

1. Apakah pelat CC dan CH perlu masuk Latihan Kode Khusus? Keputusan menunggu konfirmasi Kemlu bahwa CD, CC, dan CH memakai kode negara yang sama. Sampai ada konfirmasi, keduanya hanya tersedia di Referensi.
