# TERKA — Panduan Teks Antarmuka

**Status:** Draf · **Bahasa:** Indonesia
**Dokumen terkait:** PRD (produk dan alur pengguna) · SRD (aturan perilaku) · Fun Facts (`Terka_Fun_Facts.md`, teks fakta di layar akhir) · Special Codes (`Terka_Special_Codes.md`, data kode CD di Referensi) · Tests (tes E2E yang memeriksa teks UI)

> **Slogan:** Lihat pelatnya, terka asalnya.
> **Fokus dokumen ini:** istilah UI, aturan penulisan, dan seluruh teks yang dilihat pengguna.

---

## 1. Istilah Antarmuka

Gunakan istilah berikut secara konsisten pada seluruh layar. Nama tabel dan properti tetap berada di spesifikasi teknis; label antarmuka menjelaskan tindakan atau keadaan yang perlu dipahami pengguna.

| Konsep                                                      | Label UI                                             | Catatan                                                                                                                          |
| ----------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `activeScope` / wilayah yang dipilih untuk materi baru      | **Cakupan**                                          | Dipakai di beranda dan pemilih wilayah                                                                                           |
| Sesi harian utama                                           | **Mulai belajar**                                    | Tombol utama di beranda                                                                                                          |
| Latihan tambahan untuk wilayah tertentu                     | **Latih wilayah ini**                                | Membuka **Latihan Terfokus** tanpa mengubah Cakupan                                                                              |
| Tantangan lima soal harian                                  | **Tantangan Harian**                                 | Nama mode tetap                                                                                                                  |
| Latihan kecepatan 60 detik                                  | **Mode Kilat**                                       | Nama resmi mode di UI                                                                                                            |
| Penelusuran dan pencarian data                              | **Referensi**                                        | Tujuan di bilah bawah, bukan tombol di beranda                                                                                   |
| Pemilih materi baru                                         | **Cakupan**                                          | Tujuan di bilah bawah; sekaligus nama pengaturannya                                                                              |
| Satu node yang sedang disorot di pemilih                    | **wilayah**                                          | Bukan nama pengaturan — lihat aturan istilah di bawah                                                                            |
| Navigasi tetap di bagian bawah layar                        | **bilah bawah**                                      | Empat tujuan: Beranda, Cakupan, Statistik, Referensi                                                                             |
| Menerapkan pilihan wilayah                                  | **Pilih wilayah ini**                                | Pemilih memakai model dua langkah; menelusuri saja tidak mengubah apa pun                                                        |
| Visual tingkat penguasaan wilayah                           | **Peta Penguasaan**                                  | Nama resmi tampilan peta                                                                                                         |
| Latihan Bandingkan Kode untuk dua kode yang sering tertukar | **Bandingkan Kode**                                  | Nama internalnya latihan Bandingkan Kode                                                                                         |
| Status `mature`                                             | **Dikuasai**                                         | Nama internal tidak ditampilkan                                                                                                  |
| Status `leech`                                              | **Sulit Dikuasai**                                   | Muncul sebagai penanda pada soal                                                                                                 |
| Status `suspended`                                          | **Dinonaktifkan**                                    | Nama internal tidak ditampilkan                                                                                                  |
| Tayangan pertama materi baru                                | **Perkenalan**                                       | Soalnya berlabel **Tebak dulu**                                                                                                  |
| Pencarian kode di Referensi yang dicatat                    | **Pelat Terlihat**                                   | Statistik frekuensi pencarian; tidak ada tahap menjawab di Referensi                                                             |
| Catatan asosiasi buatan pengguna                            | **Catatan pengingat**                                | Satu per kode                                                                                                                    |
| Pengiriman dan penarikan data antarperangkat                | **Sinkronisasi**                                     | Status ringkasnya **Tersinkron**                                                                                                 |
| Parameter FSRS hasil optimasi                               | **Parameter jadwal**                                 | Hanya di pengaturan lanjutan                                                                                                     |
| Tes awal untuk mengukur pengetahuan                         | **Tes penempatan**                                   | Hasilnya disebut **Tingkat**                                                                                                     |
| Layar sebelum soal pertama                                  | **Pratinjau sesi**                                   | Judulnya mengikuti mode, misalnya **Sesi hari ini**                                                                              |
| Fakta sejarah di layar akhir                                | **Fun Facts**                                        | Satu-satunya tempat fakta tampil                                                                                                 |
| Kabupaten atau kota                                         | **daerah** di soal; **kab/kota** di tempat sempit    | Nama lengkap dengan awalan di soal **Tebak kode**                                                                                |
| Kategori pelat tanpa wilayah: CD, CC, CH, RI                | **Kode Khusus**                                      | Label kategori kecil di atas judul Kode Khusus di Referensi dan Kode diplomat di Statistik. Bukan nama jalur latihan             |
| Jalur latihan kode negara CD (`specials[]`)                 | **Kode diplomat**                                    | Nama tombol, judul sesi, dan judul di Statistik. Nama internalnya Latihan Kode Khusus. Bukan "pelat diplomat" atau "pelat sakti" |
| Negara atau organisasi pemilik kode CD                      | **pemegang** di teks bantuan; **perwakilan** di soal | —                                                                                                                                |
| `code2region` (kode → daerah)                               | **Tebak daerah**                                     | Label jenis soal; bukan "Kode → daerah"                                                                                          |
| `region2code` (daerah → kode)                               | **Tebak kode**                                       | Label jenis soal; bukan "Daerah → kode"                                                                                          |
| Soal Level 3 jawaban tunggal dengan batas waktu             | **Tebak berwaktu**                                   | Bentuk soal Tebak daerah atau Tebak kode di Level 3, bukan kartu terpisah                                                        |
| `setrecall`                                                 | **Sebutkan sebanyak mungkin**                        | Nama sesi dan label soal                                                                                                         |
| Soal benar/salah                                            | **Benar atau salah**                                 | Dipakai di sesi harian dan Mode Kilat                                                                                            |
| Soal pilih daerah yang bukan anggota kode                   | **Mana yang bukan**                                  | —                                                                                                                                |
| `special2holder` dan `holder2special`                       | **Tebak diplomat**                                   | Satu label untuk kedua arah; kalimat soal yang membedakan arahnya                                                                |
| Angka setelah CD                                            | **kode negara**                                      | Dipakai juga untuk organisasi internasional, mengikuti istilah Perpol                                                            |

Istilah teknis seperti FSRS, peluang ingat, `review`, `relearning`, dan nama properti JSON tetap dipakai di bagian spesifikasi teknis, tetapi tidak muncul di alur belajar biasa kecuali di layar diagnostik atau pengaturan lanjutan.

**Cakupan** adalah nama pengaturan materi baru. **Wilayah** adalah pilihan di dalam pengaturan tersebut, misalnya Bali atau Sumatera. Tombol **Pilih wilayah ini** menerapkan pilihan tanpa mengubah nama pengaturannya.

| Istilah                                     | Boleh tampil ke pengguna?                                         |
| ------------------------------------------- | ----------------------------------------------------------------- |
| **Cakupan**                                 | Ya — nama tab dan nama pengaturan                                 |
| **Kawasan**                                 | Ya — tingkat kedua pada hierarki                                  |
| **wilayah**                                 | Ya — merujuk satu node yang sedang disorot, bukan nama pengaturan |
| **node**, `activeScope`                     | Tidak — hanya prosa spesifikasi dan model data                    |
| antrean kirim, event, replay, `review_logs` | Tidak — hanya TRD dan layar diagnostik                            |

Gunakan “wilayah” saat menyebut pilihan dan “Cakupan” saat menyebut pengaturan atau tab. Hindari istilah struktur data di antarmuka.

---

## 2. Pedoman Penulisan

Microcopy Terka mengikuti aturan berikut supaya seluruh UI terasa konsisten:

1. **Tulis singkat dan langsung.** Teks tombol idealnya 1–4 kata. Pesan status cukup satu kalimat jika tidak menuntut tindakan lanjutan.
2. **Pakai huruf kapital di awal kalimat untuk tombol dan pesan.** Contoh: **Mulai belajar**, **Kembali ke beranda**, **Ekspor data**. Nama fitur tetap berkapitalisasi nama, misalnya **Tantangan Harian** dan **Mode Kilat**.
3. **Jangan tampilkan istilah implementasi.** Pengguna tidak perlu melihat `mature`, `relearning`, `lapses`, `node`, `activeScope`, FSRS, atau peluang ingat selama alur belajar normal. Pengecualian tertulis: **Level 1**, **Level 2**, dan **Level 3** beserta namanya — Kenali, Ingat, Kuasai — boleh tampil, karena ketiganya konsep yang dipahami pengguna, bukan nama properti model data.
4. **Hindari bahasa yang menghakimi.** Pakai **Belum tepat**, bukan "Salah!", dan **Perlu ditinjau**, bukan kalimat yang menyiratkan pengguna gagal.
5. **Pesan kesalahan menyebut tindakan berikutnya.** Jangan hanya menampilkan "Terjadi kesalahan". Jelaskan apa yang gagal dan apa yang bisa dilakukan pengguna.
6. **Jangan memancing latihan tambahan setelah sesi selesai.** Layar akhir cukup merangkum hasil dan menyediakan jalan kembali ke beranda.
7. **Satu istilah untuk satu konsep.** Kartu `due` selalu disebut **soal yang perlu diulang**, materi yang belum pernah dipelajari disebut **materi baru**, dan pengaturan materi baru selalu disebut **Cakupan**, tidak pernah "wilayah belajar" atau "lingkup".
8. **Angka mengalahkan kalimat panjang.** Pakai **12 soal perlu diulang**, bukan "Terdapat dua belas soal yang sudah waktunya untuk diulang hari ini".
9. **Pilih kata sesuai konteks belajar.** Jadwal ditulis **waktunya diulang** atau **perlu diulang**. Durasi ditulis **perkiraan durasi**, **target waktu aktif**, atau **batas waktu**, sesuai maksudnya. Hindari terjemahan harfiah dan istilah administrasi keuangan.
10. **Status bersifat deskriptif, bukan motivasional.** Hindari "Hebat!", "Luar biasa!", atau "Jangan menyerah!" sebagai respons standar. Aplikasi memberi informasi, bukan menilai pengguna.
11. **Angka aturan ditulis sebagai placeholder.** Angka yang berasal dari aturan, seperti batas harian, batas waktu, atau batas perangkat, ditulis `{nama}` dan diisi dari modul konstanta saat render. Pemilik angkanya ada di SRD atau TRD (PRD, bagian pemilik angka). Angka lain di dokumen ini, seperti **12 soal perlu diulang**, hanya contoh hasil render.
12. **Jenis soal ditulis sebagai tindakan.** Pakai **Tebak daerah** dan **Tebak kode**, bukan panah seperti "Kode → daerah". Panah hanya dipakai di spesifikasi teknis.
13. **Soal tidak menampilkan petunjuk parsial.** Tidak ada huruf pertama, digit pertama, atau tipe pemegang sebelum pengguna menjawab. Jawaban lengkap baru tampil setelah menjawab, atau sebelum pertanyaan pada kartu Sulit Dikuasai (bagian 3.9).
14. **Nama lokasi ditulis lengkap.** Nama wilayah, kab/kota, dan kawasan tidak disingkat kecuali singkatannya memang lazim. Tulis **Bali & Nusa Tenggara**, bukan "Bali Nusra"; **Yogyakarta**, bukan "DIY" atau "DI Yogyakarta"; **Nusa Tenggara Barat**, bukan "NTB". Data menyimpan nama lengkap; **Kep.** untuk "Kepulauan" hanya boleh dipakai di tempat sempit.

---

## 3. Teks Antarmuka

### 3.1 Bilah bawah

Navigasi tetap di bagian bawah layar dengan empat tujuan:

| Tujuan         | Label         | Isi                                                                                                                                                    |
| -------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Layar utama    | **Beranda**   | Jumlah soal yang perlu diulang, Cakupan aktif, tiga tindakan latihan                                                                                   |
| Pemilih materi | **Cakupan**   | Pohon Nasional → Kawasan → Provinsi, dengan model dua langkah                                                                                          |
| Perkembangan   | **Statistik** | Peta Penguasaan, kartu terlemah, perkiraan beban 14 hari ke depan, daftar kartu Sulit Dikuasai, Pelat Terlihat, status sinkronisasi, ekspor data, akun |
| Data           | **Referensi** | Penelusuran kode dan wilayah dengan hasil langsung tampil                                                                                              |

Referensi menjadi tab tersendiri karena dapat digunakan kapan saja, termasuk saat pengguna hanya ingin mencari informasi. Beranda tetap berfokus pada pilihan latihan.

Tab Cakupan memungkinkan pengguna membandingkan wilayah sebelum menerapkan pilihan. Keluar dari tab tanpa menekan **Pilih wilayah ini** tidak mengubah pengaturan.

Tujuan **Statistik** jadi rumah untuk seluruh tampilan di PRD bagian 6.6 beserta status sinkronisasi, ekspor data, dan akun.

Tujuan aktif ditandai label dan ikon berwarna penuh; sisanya abu-abu. Tidak ada penanda lain — tanpa garis bawah, tanpa latar, tanpa animasi berpindah.

Bilah bawah tidak memakai lencana jumlah soal. Jumlah pengulangan cukup ditampilkan di beranda agar pengguna tidak menerima pengingat yang berulang pada setiap layar.

### 3.2 Beranda

| Situasi                                                      | Teks UI                                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Ada pengulangan                                              | **12 soal perlu diulang**                                               |
| Ada materi baru                                              | **4 materi baru tersedia**                                              |
| Tidak ada pengulangan                                        | **Tidak ada soal yang perlu diulang hari ini.**                         |
| Semua materi baru di Cakupan sudah diperkenalkan             | **Semua materi di wilayah ini sudah diperkenalkan.**                    |
| Materi baru ditahan karena antrean pengulangan terlalu besar | **Materi baru dijeda hari ini agar sesi tetap ringan.**                 |
| Label wilayah aktif                                          | **Cakupan**                                                             |
| Label persentase di bawah daftar Cakupan                     | **kemajuan**                                                            |
| Materi baru di Cakupan habis, ada Cakupan berikutnya         | **Materi di Kawasan Sumatera sudah dikenalkan semua.**                  |
| Tombol pindah ke Cakupan berikutnya                          | **Lanjut ke Kawasan Jawa**                                              |
| Tombol sesi utama                                            | **Mulai belajar**                                                       |
| Tombol tantangan                                             | **Tantangan Harian**                                                    |
| Tombol latihan cepat                                         | **Mode Kilat**                                                          |
| Tombol Kode diplomat, jalur aktif                            | **Kode diplomat** diikuti **· 6 perlu diulang** jika ada                |
| Ikon sinkronisasi, sudah tersinkron                          | Ikon tanpa teks; saat ditekan: **Tersinkron 3 menit lalu**              |
| Ikon sinkronisasi, ada yang menunggu                         | Ikon dengan titik; saat ditekan: **12 perubahan menunggu sinkronisasi** |
| Memuat data di perangkat baru                                | **Menyiapkan data belajar…**                                            |

Tidak ada tombol **Latihan lagi** pada keadaan kosong setelah sesi harian selesai. Jika memang tidak ada soal yang perlu diulang, beranda cukup menunjukkan jadwal hari itu sudah selesai.

### 3.3 Saat menjawab soal

| Situasi                                   | Teks UI                                                                           |
|-------------------------------------------|-----------------------------------------------------------------------------------|
| Kolom jawaban                             | **Ketik jawaban…**                                                                |
| Jawaban benar                             | **Benar**                                                                         |
| Jawaban diterima dengan koreksi ejaan     | **Benar · ejaan diperbaiki** diikuti nama bakunya                                 |
| Jawaban benar dengan penulisan tidak baku | **Benar** diikuti **Penulisan baku: Bukittinggi**                                 |
| Jawaban benar untuk soal Tebak daerah     | **Benar** diikuti **Juga benar: Medan, Deli Serdang, Tebing Tinggi**              |
| Keanggotaan daerah belum terverifikasi    | **Data daerah ini belum terverifikasi penuh. Soal ini tidak dihitung.**           |
| Jawaban salah                             | **Belum tepat**                                                                   |
| Batas waktu habis                         | **Waktu habis**                                                                   |
| Menampilkan jawaban                       | **Jawaban: Bengkulu**                                                             |
| Level diturunkan manual                   | **Tidak memengaruhi jadwal**                                                      |
| Level dinaikkan manual                    | **Dihitung penuh** — tetap tunduk syarat waktunya diulang dan aturan mode/sibling |
| Uji penguasaan otomatis                   | **Uji penguasaan · mulai mengetik dalam {detik} detik**                           |
| Perkenalan tanpa pilihan cukup            | **Kenali kode ini** diikuti daerahnya; tanpa kolom tebakan                        |
| Himpunan mencapai batas input             | **{batas} jawaban sudah dicatat. Hasil dihitung sekarang.**                       |
| Tombol batal di bawah hasil jawaban       | **Batalkan jawaban**                                                              |
| Jawaban terakhir dibatalkan               | **Jawaban dibatalkan**                                                            |
| Lanjut dengan keyboard                    | **Enter untuk lanjut**                                                            |
| Label soal Perkenalan                     | **Materi baru**                                                                   |
| Setelah tebakan Perkenalan                | **Jawaban: Bali** diikuti **Tebakan tidak dinilai.**                              |
| Undo tidak tersedia di Mode Kilat         | Tombol **Batalkan jawaban** tidak tampil; Z tidak berpengaruh                     |

Untuk jawaban salah, UI menampilkan **Belum tepat** diikuti jawaban yang benar. Sistem tidak memakai teks seperti "Salah besar", "Coba lagi", atau pesan motivasional acak karena tidak menambah informasi.

Tampilkan dampak perubahan level pada kedua arah. **Dihitung penuh** berarti hasil dapat memengaruhi jadwal jika syarat waktu pengulangan dan aturan mode terpenuhi; **Tidak memengaruhi jadwal** digunakan saat level diturunkan. Label harus sesuai hasil perhitungan, bukan menjanjikan perubahan jadwal pada setiap jawaban.

**Label dan kalimat soal.** Label tampil kecil di atas pertanyaan.

| Jenis soal                    | Label                         | Kalimat soal                                                                             |
| ----------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| Tebak daerah                  | **Tebak daerah**              | **BK dipakai daerah mana?**                                                              |
| Tebak kode                    | **Tebak kode**                | **Kode pelat Kabupaten Tangerang?**                                                      |
| Tebak berwaktu                | **Tebak berwaktu**            | **BK dipakai daerah mana?** diikuti hitung mundur **{detik} detik** sampai input pertama |
| Sebutkan sebanyak mungkin     | **Sebutkan sebanyak mungkin** | **Sebutkan daerah yang memakai BK.**                                                     |
| Benar atau salah              | **Benar atau salah**          | **BK dipakai Kota Medan.** Tombol: **Benar** · **Salah**                                 |
| Mana yang bukan               | **Mana yang bukan**           | **Mana yang tidak memakai BK?**                                                          |
| Bandingkan Kode               | **Bandingkan Kode**           | **BK atau BB: Kota Sibolga?**                                                            |
| Tebak diplomat, dari kode     | **Tebak diplomat**            | **CD 49 dipakai perwakilan mana?**                                                       |
| Tebak diplomat, dari pemegang | **Tebak diplomat**            | **Berapa kode CD untuk Jepang?**                                                         |

### 3.4 Layar sambutan dan Tentang

| Situasi                        | Teks UI                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Judul sambutan                 | **Terka**                                                                                                                         |
| Kalimat pembuka                | **Lihat pelatnya, terka asalnya. Latihan hafalan kode pelat nomor Indonesia.**                                                    |
| Batas data                     | **Terka membantu belajar kode pelat, bukan rujukan resmi. Data yang belum cukup terverifikasi diberi penanda.**                   |
| Tanpa akun                     | **Langsung belajar tanpa akun. Progres tersimpan di perangkat ini.**                                                              |
| Tautan                         | **Tentang Terka**                                                                                                                 |
| Judul halaman Tentang          | **Tentang Terka**                                                                                                                 |
| Tautan kebijakan               | **Kebijakan privasi**                                                                                                             |
| Tautan laporan                 | **Laporkan data yang keliru**                                                                                                     |
| Ajakan login di layar akhir    | **Progres ini hanya tersimpan di perangkat ini. Masuk untuk menyimpannya di akun.** Tombol: **Masuk** · **Nanti saja**            |
| Email tidak kunjung datang     | **Belum menerima email? Cek folder spam, atau kirim ulang dalam {detik} detik.**                                                  |
| CAPTCHA meminta interaksi      | Teks bawaan penyedia CAPTCHA, tanpa tambahan                                                                                      |
| Persetujuan saat login pertama | **Dengan masuk, email dan riwayat latihan disimpan untuk sinkronisasi. Baca kebijakan privasi.** Tombol: **Setuju dan lanjutkan** |

### 3.5 Tes penempatan

| Situasi                      | Teks UI                                                                                                                                                                                            |
|------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Tawaran di pembukaan pertama | **Mulai dengan tes singkat untuk menentukan titik awalmu. Belum tahu satu kode pun juga tidak apa-apa.**                                                                                           |
| Penjelasan tes               | **Jawab Tidak tahu kalau belum kenal kodenya; tes berhenti sendiri saat sudah cukup.**                                                                                                             |
| Halaman awal, ajakan penutup | **Mulai dari tes penempatan** · **Tes singkat menentukan titik awalmu. Kode yang sudah kamu kenal langsung diulang, sisanya diperkenalkan bertahap. Belum tahu satu kode pun juga tidak apa-apa.** |
| Keterangan                   | **Sekitar {menit} menit · maksimal {batas} soal · tanpa penilaian per soal**                                                                                                                       |
| Tombol                       | **Mulai tes** · **Lewati, mulai dari awal**                                                                                                                                                        |
| Tombol lewati soal           | **Tidak tahu**                                                                                                                                                                                     |
| Hasil                        | **Tingkat: Menengah**                                                                                                                                                                              |
| Rincian                      | **Sekitar {persentase}% kode sudah dikenal. {jumlahBenarTanpaGangguan} kode langsung masuk pengulangan. Materi lainnya dibuka bertahap, hingga {batas} per hari.**                                 |
| Saran Cakupan                | **Cakupan yang disarankan: Kawasan Sulawesi**                                                                                                                                                      |
| Tombol saran                 | **Pakai saran ini** · **Pilih sendiri**                                                                                                                                                            |
| Ulangi dari Statistik        | **Ulangi tes penempatan** — hanya tampil selama belum ada jawaban terhitung di luar tes, dari mode mana pun                                                                                        |

Tingkat tidak ditampilkan di beranda dan tidak dipakai sebagai label pengguna. Tingkat bukan status yang perlu dikejar. Perubahan tingkat hanya disebut di pratinjau sesi pada hari perubahan, dengan nada deskriptif: **Tingkat disesuaikan**, bukan "Kamu turun tingkat".

### 3.6 Pratinjau sesi

| Situasi                      | Teks UI                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Judul sesi harian            | **Sesi hari ini**                                                                                          |
| Judul Latihan Terfokus       | **Latihan Terfokus · Kawasan Maluku**                                                                      |
| Jumlah soal                  | **18 soal · 12 pengulangan · 4 materi baru · 2 Bandingkan Kode**                                           |
| Jenis soal                   | **Tebak daerah · 11**, **Tebak kode · 4**, **Tebak berwaktu · 3**                                          |
| Tingkat kesulitan            | **Level 1 · 4**, **Level 2 · 10**, **Level 3 · 4**                                                         |
| Estimasi                     | **Sekitar 6–9 menit waktu aktif**                                                                          |
| Pengulangan berikutnya       | **Pengulangan berikutnya tersedia pukul {waktu}.**                                                         |
| Sesi himpunan                | **Sebutkan sebanyak mungkin · {kode}**; jumlah satu soal dan estimasi waktu aktif                          |
| Estimasi sangat singkat      | **Kurang dari 1 menit**                                                                                    |
| Info: materi baru dijeda     | **Materi baru dijeda hari ini agar sesi tetap ringan.**                                                    |
| Info: tingkat naik           | **Tingkat naik ke {tingkat}. Materi baru per hari sekarang {batas}.**                                      |
| Info: tingkat turun          | **Tingkat disesuaikan ke {tingkat}. Materi baru per hari sekarang {batas}.**                               |
| Info: Tebak berwaktu         | **{jumlah} soal Tebak berwaktu: mulai mengetik dalam {detik} detik.**                                      |
| Info: kartu Sulit Dikuasai   | **2 kode Sulit Dikuasai menampilkan jawabannya dulu untuk dipelajari ulang.**                              |
| Info: soal dari luar Cakupan | **5 soal dari luar Cakupan karena sudah waktunya diulang.**                                                |
| Info: pintasan keyboard      | **Enter untuk menjawab · Z untuk membatalkan** — hanya untuk pengguna keyboard                             |
| Tombol                       | **Mulai** · **Kembali**                                                                                    |
| Mode Kilat                   | **{detik} detik · jawab sebanyak mungkin** diikuti rekor wilayah itu                                       |
| Tantangan Harian             | **{jumlahSoal} soal · sekali sehari** — paling banyak 5                                                    |
| Sesi Kode diplomat           | **Kode diplomat · kode negara di pelat CD**; jumlah soal, jenis, level, dan estimasi mengikuti sesi harian |

Pratinjau memakai angka, bukan kalimat panjang (aturan 8 di bagian 2 dokumen ini). Jika tidak ada info penting yang berlaku, bagian info tidak ditampilkan sama sekali.

### 3.7 Bandingkan Kode

| Situasi                        | Teks UI                                                                             |
|--------------------------------|-------------------------------------------------------------------------------------|
| Judul                          | **Bandingkan Kode**                                                                 |
| Pengantar pasangan             | **BE dan BD sering tertukar. Bedakan keduanya.**                                    |
| Ciri pembeda, setelah menjawab | **{kodeA}: {tempatA} · {kodeB}: {tempatB}**, misalnya **BE: Sumatera · DE: Maluku** |
| Setelah benar                  | **Benar**                                                                           |
| Pasangan tidak lagi aktif      | **Latihan khusus untuk pasangan ini selesai.**                                      |

Di Beranda, setiap pasangan memakai penghitung kecil **{hariBenar}/5**, misalnya **3/5**: jumlah hari berbeda drill pertamanya benar.

Kalimat pengantar wajib menyebut kedua kode secara eksplisit. Jangan memakai label abstrak seperti "pasangan kebingungan" atau istilah teknis dari model data.

### 3.8 Latihan Terfokus

| Situasi                                  | Teks UI                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| Judul                                    | **Latihan Terfokus · Kawasan Maluku**                                                       |
| Pengantar                                | **Latihan tambahan. Hanya soal yang sudah waktunya diulang yang dapat memengaruhi jadwal.** |
| Kartu yang memang sudah waktunya diulang | **Soal ini juga dihitung untuk jadwal hari ini.**                                           |
| Tidak ada kartu yang bisa dilatih        | **Belum ada materi yang bisa dilatih di wilayah ini.**                                      |
| Selesai                                  | **Latihan selesai**                                                                         |
| Ringkasan                                | **12 soal dijawab · akurasi 83%**                                                           |

Pada Latihan Terfokus, sebagian kartu sudah perlu diulang dan sebagian lainnya belum. Penanda per soal menjelaskan kapan jawaban juga dihitung untuk jadwal hari itu, sesuai SRD 4.11.

Ringkasan Latihan Terfokus tidak menampilkan perubahan penguasaan wilayah, karena sebagian besar jawabannya memang tidak menggerakkan status kartu.

### 3.9 Kartu Sulit Dikuasai

| Situasi                                | Teks UI                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| Penanda pada soal                      | **Sulit Dikuasai**                                                                       |
| Jawaban tampil lebih dulu              | **Kode ini beberapa kali terlewat. Jawabannya ditampilkan dulu untuk dipelajari ulang.** |
| Kartu mencapai batas dan dinonaktifkan | **Kode ini dinonaktifkan sementara. Tinjau di halaman statistik.**                       |
| Tombol peninjauan                      | **Tinjau kode**                                                                          |
| Diaktifkan kembali                     | **Kode ini diaktifkan kembali dan dimulai dari awal.**                                   |

Pada kegagalan pengulangan keenam, aplikasi menampilkan jawaban lengkap sebelum soal, bukan petunjuk parsial. Pada kegagalan kedelapan, kartu dinonaktifkan untuk ditinjau. Kedua perubahan perlu dijelaskan singkat agar pengguna memahami mengapa tampilan atau ketersediaan kartu berubah.

Nadanya menjelaskan keadaan kartu, bukan menilai pengguna. Pakai **beberapa kali terlewat**, bukan "kamu sering salah di kode ini".

### 3.10 Catatan pengingat

| Situasi                         | Teks UI                                                       |
| ------------------------------- | ------------------------------------------------------------- |
| Tawaran setelah 4 kali terlewat | **Kode ini beberapa kali terlewat. Tulis catatan pengingat?** |
| Tombol                          | **Tulis catatan** · **Nanti saja**                            |
| Contoh isian                    | **Misalnya: DR — Dari Rinjani**                               |
| Label saat tampil               | **Catatan pengingat**                                         |
| Tersimpan                       | **Catatan disimpan**                                          |
| Batas karakter terlampaui       | **Maksimal {batas} karakter.**                                |

Tawaran catatan pengingat tidak muncul di tengah alur cepat: letaknya di bawah hasil jawaban, dan Enter tetap langsung lanjut ke soal berikutnya tanpa menyentuh tawaran itu.

### 3.11 Pemilih Cakupan

| Situasi                             | Teks UI                                    |
|-------------------------------------|--------------------------------------------|
| Judul tab                           | **Cakupan**                                |
| Wilayah yang sedang aktif           | **Aktif sekarang**                         |
| Jumlah materi                       | **8 materi baru tersedia**                 |
| Terapkan pilihan                    | **Pilih wilayah ini**                      |
| Latihan tanpa mengganti pilihan     | **Latih wilayah ini**                      |
| Tidak ada materi baru               | **Tidak ada materi baru di wilayah ini.**  |
| Kembali ke nasional                 | **Seluruh Indonesia**                      |
| Label persentase wilayah            | **kemajuan**                               |
| Tooltip provinsi di Peta Penguasaan | **16%** diikuti **0 dari 5 kode dikuasai** |

**Pilih wilayah ini** mengubah Cakupan. **Latih wilayah ini** hanya memulai Latihan Terfokus. Kedua tindakan tidak boleh berlabel mirip karena konsekuensinya berbeda.

### 3.12 Ringkasan sesi

Judul layar: **Sesi selesai**.

Label statistik yang dipakai:

| Metrik                                 | Label UI                      |
| -------------------------------------- | ----------------------------- |
| Akurasi sesi                           | **Akurasi**                   |
| Rata-rata waktu sampai ketukan pertama | **Rata-rata waktu respons**   |
| Pasangan baru yang sering tertukar     | **Kode yang perlu dibedakan** |
| Perubahan penguasaan                   | **Penguasaan wilayah**        |
| Jumlah soal                            | **Soal dijawab**              |

Keadaan khusus:

- Tidak ada pasangan baru → **Tidak ada kode baru yang sering tertukar.**
- Penguasaan tidak berubah → **Penguasaan wilayah belum berubah pada sesi ini.**
- Tombol keluar → **Kembali ke beranda**.

**Fun Facts** tampil di bawah metrik, sebelum tombol keluar:

| Situasi                               | Teks UI                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Judul                                 | **Fun Facts**                                                                 |
| Label status                          | **Terverifikasi**, **Diperdebatkan**, atau **Mitos**                          |
| Sumber, wajib untuk fakta yang terbit | **Sumber: {rujukanYangSudahDiperiksa}**                                       |
| Tidak ada fakta siap terbit           | Blok Fun Facts tidak tampil; tidak ada pesan kesalahan atau sumber rekaan     |

Komponen Fun Facts juga tersedia di layar akhir Latihan Terfokus, Tantangan Harian, Mode Kilat, tes penempatan, dan sesi himpunan; faktanya dipilih per sesi dari kandidat siap terbit, bukan harus sama antarmode.

Layar ini tidak menampilkan Tombol untuk mengulang sesi atau menambah materi baru.

### 3.13 Tantangan Harian

| Situasi                   | Teks UI                                                          |
|---------------------------|------------------------------------------------------------------|
| Sebelum mulai             | **{jumlahSoal} soal · sekali sehari** — paling banyak 5          |
| Tombol                    | **Mulai tantangan**                                              |
| Selesai                   | **Tantangan hari ini selesai**                                   |
| Sudah dikerjakan          | **Sudah selesai untuk hari ini**                                 |
| Hari toleransi digunakan  | **Jatah toleransi digunakan hari ini.**                          |
| Label rangkaian hari      | **Hari Beruntun**                                                |
| Sumber hitungan (Beranda) | **Dihitung dari sesi harian yang tuntas atau Tantangan Harian.** |

Jika satu hari terlewat, aplikasi tidak memakai pesan seperti "Streak-mu rusak". Cukup sampaikan keadaan catatan Hari Beruntun saat ini.

### 3.13a Cek Ingatan

| Situasi                                 | Teks UI                                                                                                     |
|-----------------------------------------|-------------------------------------------------------------------------------------------------------------|
| Judul pratinjau                         | **Cek ingatan**                                                                                             |
| Keterangan pratinjau                    | **Sudah 8 hari sejak latihan terakhir. Jawab 20 soal untuk melihat seberapa banyak yang masih kamu ingat.** |
| Tautan melewati                         | **Lewati, mulai sesi biasa**                                                                                |
| Judul ringkasan                         | **Cek ingatan selesai**                                                                                     |
| Label hasil per kawasan                 | **Ingatanmu per kawasan**                                                                                   |
| Baris hasil                             | **Jawa · 75% benar · perkiraan 82%**                                                                        |
| Dibuka lagi setelah dikerjakan hari ini | **Cek ingatan hari ini sudah dikerjakan.** diikuti **Lanjutkan dengan sesi harian.**                        |
| Dibuka tanpa libur panjang              | **Cek ingatan ditawarkan setelah libur panjang.**                                                           |
| Penutup hasil                           | **Sisa pengulangan dibagi ke hari-hari berikutnya, mulai dari kawasan yang paling banyak terlupa.**         |

Tombol **Mulai belajar** di Beranda membuka Cek ingatan selama tawarannya berlaku; teksnya tidak berubah.

### 3.14 Mode Kilat

| Situasi                        | Teks UI                                    |
| ------------------------------ | ------------------------------------------ |
| Pengantar                      | **{detik} detik · jawab sebanyak mungkin** |
| Tombol                         | **Mulai**                                  |
| Waktu habis                    | **Waktu habis**                            |
| Skor                           | **24 jawaban benar**                       |
| Wilayah yang dimainkan         | **Mode Kilat · Kawasan Maluku**            |
| Rekor baru                     | **Rekor baru di Kawasan Maluku: 24**       |
| Bukan rekor baru               | **Rekor terbaik di Kawasan Maluku: 31**    |
| Belum ada rekor di wilayah ini | **Belum ada rekor untuk wilayah ini.**     |

Rekor baru boleh ditandai secara visual, tanpa kalimat perayaan tambahan.

Setiap rekor menyebut wilayahnya karena tingkat kesulitan nasional dan kawasan berbeda. Gunakan format yang sama pada rekor baru dan rekor sebelumnya.

### 3.15 Referensi dan pencarian

| Situasi                                      | Teks UI                                                                                                                                                                                                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kolom pencarian                              | **Cari kode atau wilayah…**                                                                                                                                                                                                                         |
| Kode atau nama ditemukan                     | Langsung tampilkan kode, daerah, dan rincian datanya; tanpa kolom jawaban atau penilaian                                                                                                                                                            |
| Tidak ada hasil                              | **Tidak ada hasil untuk "{query}".**                                                                                                                                                                                                                |
| Entri belum cukup kuat untuk latihan         | **Belum terverifikasi penuh**                                                                                                                                                                                                                       |
| Data hanya untuk referensi                   | **Tersedia di Referensi, belum masuk latihan.**                                                                                                                                                                                                     |
| Pencarian berulang dalam jendela deduplikasi | Hasil tetap tampil; tidak menambah Pelat Terlihat                                                                                                                                                                                                   |
| Statistik Pelat Terlihat                     | **Pelat terlihat · 30 hari terakhir**                                                                                                                                                                                                               |
| Hasil kode CD                                | **CD 49 · Jepang** diikuti **Kode negara korps diplomatik · Sumber: Lampiran Perpol 7/2021 · diperiksa {tanggal}**                                                                                                                                  |
| Input CD dengan nomor urut                   | Hasil memakai kode negara saja; tanpa teks tambahan                                                                                                                                                                                                 |
| Hasil pencarian RI, dengan atau tanpa nomor  | **Pelat RI dipakai kendaraan dinas Presiden, Wakil Presiden, ketua lembaga tinggi negara, dan pejabat setingkat menteri.** diikuti **Tidak ada sumber valid yang memuat daftar lengkap kode RI, dan alokasi nomornya dapat berubah sewaktu-waktu.** |
| Hasil kode CC atau CH                        | **CC dipakai korps konsulat, CH dipakai konsul kehormatan. Tersedia di Referensi, belum masuk latihan.**                                                                                                                                            |
| Ajakan dari hasil kode CD, jalur nonaktif    | **Latih kode negara CD** — membuka pengaturan Kode diplomat; hanya tampil pada hasil CD                                                                                                                                                             |

Referensi tidak memiliki Tombol menebak atau melihat jawaban, teks Benar/Belum tepat, maupun penanda dampak jadwal. Label **Tebak dulu** hanya digunakan pada Perkenalan di sesi belajar. Nilai high/medium/low tetap istilah internal; tampilkan label pengguna di tabel.

### 3.16 Status kartu yang terlihat pengguna

| Kondisi internal                            | Teks UI                                     |
| ------------------------------------------- | ------------------------------------------- |
| `new`                                       | **Belum Dipelajari**                        |
| `learning`, `review`, `relearning`          | **Sedang Dipelajari**                       |
| `mature`                                    | **Dikuasai**                                |
| `leech`                                     | **Sulit Dikuasai**                          |
| `suspended` karena perlu verifikasi data    | **Dinonaktifkan · data perlu diverifikasi** |
| `suspended` karena terlalu banyak kegagalan | **Dinonaktifkan · perlu ditinjau**          |

Status detail hanya perlu muncul di halaman statistik atau pemeriksaan kode. Status tidak ditampilkan di tiap soal karena tidak membantu proses menjawab.

### 3.17 Akun, sinkronisasi, dan ekspor

| Situasi                                 | Teks UI                                                                                                                                                                  |
|-----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Ajakan masuk di Statistik               | **Masuk untuk menyinkronkan progres antarperangkat**                                                                                                                     |
| Tombol utama masuk                      | **Masuk dengan Google**                                                                                                                                                  |
| Pemisah                                 | **atau**                                                                                                                                                                 |
| Kolom email                             | **Email**                                                                                                                                                                |
| Tombol masuk dengan email               | **Kirim tautan dan kode masuk**                                                                                                                                          |
| Tautan terkirim                         | **Tautan dan kode masuk dikirim ke nama@email.com.**                                                                                                                     |
| Kolom kode                              | **Kode 6 digit dari email**                                                                                                                                              |
| Tombol kode                             | **Masuk**                                                                                                                                                                |
| Kode salah                              | **Kode tidak cocok. Periksa lagi, atau kirim kode baru.**                                                                                                                |
| Kode atau tautan kedaluwarsa            | **Kode ini sudah kedaluwarsa. Kirim kode baru.**                                                                                                                         |
| Browser di dalam aplikasi lain          | **Masuk dengan Google tidak bisa dari browser aplikasi ini. Buka Terka di Chrome atau Safari, atau masuk dengan email.** Tombol: **Salin tautan**                        |
| Login Google dibatalkan                 | Tidak ada pesan; kembali ke layar masuk                                                                                                                                  |
| Login Google gagal                      | **Masuk dengan Google gagal. Coba lagi, atau masuk dengan email.**                                                                                                       |
| Sedang offline                          | Tombol masuk nonaktif, dengan keterangan **Masuk memerlukan koneksi internet.**                                                                                          |
| Data lokal digabung ke akun             | **Riwayat di perangkat ini digabung ke akun. 1.240 jawaban ditambahkan.**                                                                                                |
| Data lokal milik akun lain              | **Data di perangkat ini milik akun lain.** Tombol: **Kembali ke akun sebelumnya** · **Hapus data di perangkat ini**                                                      |
| Tersinkron                              | **Tersinkron 3 menit lalu**                                                                                                                                              |
| Ada perubahan menunggu                  | **12 perubahan menunggu sinkronisasi**                                                                                                                                   |
| Offline                                 | **Sedang offline. Perubahan disimpan di perangkat ini.**                                                                                                                 |
| Sesi masuk berakhir                     | **Sesi masuk berakhir. Masuk lagi untuk melanjutkan sinkronisasi.**                                                                                                      |
| Server tidak terjangkau {hari} hari     | **Server sinkronisasi tidak terjangkau sejak {hari} hari lalu. Latihan tetap berjalan.**                                                                                 |
| Perubahan ditolak server                | **3 perubahan gagal dikirim. Data tetap tersimpan di perangkat ini dan ikut dalam ekspor.**                                                                              |
| Tombol ekspor                           | **Ekspor data**                                                                                                                                                          |
| Ekspor selesai                          | **Data diekspor**                                                                                                                                                        |
| Pengingat ekspor                        | **Ekspor terakhir sudah lebih dari {hari} hari.**                                                                                                                        |
| Batas harian sinkronisasi               | **Batas pengiriman hari ini tercapai. Data tetap tersimpan dan akan dikirim setelah batas direset.**                                                                     |
| Batas total penyimpanan akun            | **Batas penyimpanan akun tercapai. Data baru tetap di perangkat ini. Ekspor data untuk menyimpannya.**                                                                   |
| Batas perangkat aktif                   | **Akun ini sudah dipakai di {batas} perangkat dalam {hari} hari terakhir. Latihan tetap berjalan, dan data tersimpan di perangkat ini. Sinkronisasi dicoba lagi besok.** |
| Kebijakan diperbarui                    | **Kebijakan privasi diperbarui. Baca dan setujui untuk melanjutkan sinkronisasi.**                                                                                       |
| Tombol impor                            | **Impor data**                                                                                                                                                           |
| Versi file impor tidak didukung         | **File ini dibuat Terka versi lain dan tidak dapat diimpor. Tidak ada data yang diubah.**                                                                                |
| Pembaruan aplikasi diperlukan           | **Perbarui Terka untuk melanjutkan sinkronisasi. Data di perangkat ini tetap tersedia untuk diekspor.**                                                                  |
| Perangkat lain memakai versi lebih baru | **Perangkat lain memakai Terka versi baru. Perbarui Terka untuk melanjutkan sinkronisasi. Latihan tetap berjalan.**                                                      |
| Pendaftaran akun baru ditutup           | **Sinkronisasi untuk akun baru sedang ditutup sementara. Latihan tetap berjalan, dan data tersimpan di perangkat ini.**                                                  |
| Klaim riwayat besar dikirim bertahap    | **Riwayat di perangkat ini dikirim bertahap. {terkirim} dari {total} jawaban sudah tersinkron.**                                                                         |
| Impor selesai                           | **Data diimpor. 320 jawaban ditambahkan, 1.240 sudah ada.**                                                                                                              |
| File impor tidak valid                  | **File ini bukan ekspor Terka. Tidak ada data yang diubah.**                                                                                                             |
| Tombol keluar                           | **Keluar**                                                                                                                                                               |
| Keluar dengan perubahan tertunda        | **12 perubahan belum tersinkron. Keluar sekarang akan menghapusnya dari perangkat ini.** Tombol: **Sinkronkan dulu** · **Keluar tetap**                                  |
| Tombol hapus akun                       | **Hapus akun**                                                                                                                                                           |
| Konfirmasi hapus akun                   | **Ketik HAPUS untuk menghapus akun dan seluruh data sinkron.**                                                                                                           |
| Akun terhapus                           | **Akun dan data sinkron sudah dihapus. Data di perangkat ini tetap ada.**                                                                                                |

Status sinkronisasi bernada informatif. Selama latihan tetap berjalan, tidak ada keadaan sinkronisasi yang perlu ditampilkan sebagai peringatan merah.

### 3.18 Kode Khusus dan Kode diplomat

| Situasi                                 | Teks UI                                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------------------- |
| Pengaturan, judul                       | **Latihan Kode diplomat**                                                                     |
| Pengaturan, penjelasan                  | **Latih kode negara pada pelat CD. Jadwal dan materi barunya terpisah dari latihan wilayah.** |
| Pengaturan, batas data                  | **Nomor urut di belakang kode negara tidak dilatih.**                                         |
| Jalur dinonaktifkan, masih ada kartu    | **Materi baru berhenti. Soal yang sudah dipelajari tetap muncul saat perlu diulang.**         |
| Soal Tebak diplomat, dari kode          | **CD 49 dipakai perwakilan mana?**                                                            |
| Soal Tebak diplomat, dari pemegang      | **Berapa kode CD untuk Jepang?**                                                              |
| Jawaban kode dengan angka tambahan      | **Belum tepat** diikuti **Cukup kode negaranya: CD 49**                                       |
| Semua materi baru diperkenalkan         | **Semua kode negara CD sudah diperkenalkan.**                                                 |
| Materi baru Kode diplomat dijeda        | **Materi baru Kode diplomat dijeda hari ini agar sesi tetap ringan.**                         |
| Kartu dinonaktifkan karena data berubah | **Pemegang kode ini berubah. Soal lamanya dinonaktifkan; data terbaru ada di Referensi.**     |

**Kode Khusus di Referensi.** Semua pelat tanpa wilayah dirangkum dalam satu daftar. Setiap baris berisi contoh pelat dari lampiran Perpol, nama pemakai, dan status di Terka.

| Bagian         | Teks UI                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| Label kategori | **KODE KHUSUS**                                                                                          |
| Judul          | **Pelat tanpa wilayah**                                                                                  |
| Baris CD       | Pelat **CD 12 5** · **Korps diplomatik dan organisasi internasional** · status **Latihan dan Referensi** |
| Baris CC       | Pelat **CC 12 10** · **Korps konsulat** · status **Referensi saja**                                      |
| Baris CH       | Pelat **CH 130 1** · **Konsul kehormatan** · status **Referensi saja**                                   |
| Baris RI       | Pelat **RI 1** · **Pejabat negara** · status **Hanya format**                                            |

Status **Latihan dan Referensi** ditandai titik hijau; dua status lain memakai titik abu-abu.

**Kode diplomat di Statistik.**

| Bagian         | Teks UI                                          |
| -------------- | ------------------------------------------------ |
| Label kategori | **KODE KHUSUS**                                  |
| Judul          | **Kode diplomat**                                |
| Angka utama    | **{dikuasai}** diikuti **dari {total} dikuasai** |
| Catatan kaki   | **Dihitung terpisah dari penguasaan wilayah.**   |

**Daftar Kode diplomat di Referensi.**

| Bagian         | Teks UI                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------- |
| Label kategori | **KODE DIPLOMAT**                                                                                   |
| Ringkasan      | **{total}** · **entri**, **CD {pertama}** · **kode pertama**, **CD {terakhir}** · **kode terakhir** |
| Baris entri    | **CD {kode}**, bendera, nama pemegang, lalu tipe **negara** atau **organisasi** di kanan            |
| Nomor kosong   | **Nomor {nomor} tidak tercantum di lampiran.** Tampil di bawah rentang yang memuat nomor itu        |

Contoh render dengan data sekarang: **130 entri**, **CD 12** sampai **CD 145**, dan nomor kosong 46, 91, 119, serta 124 (`Terka_Special_Codes.md` bagian 1).

### 3.19 Pesan Kesalahan dan Kegagalan

Pesan kesalahan mengikuti pola **apa yang terjadi → apa yang bisa dilakukan**:

| Situasi                                               | Teks UI                                                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Data lokal gagal dibaca                               | **Data belajar tidak dapat dibuka. Coba muat ulang aplikasi.**                                             |
| Data referensi gagal dimuat                           | **Data pelat tidak dapat dimuat. Coba buka kembali aplikasi.**                                             |
| Penyimpanan permanen tidak tersedia                   | **Penyimpanan permanen tidak tersedia. Masuk untuk menyinkronkan progres, atau ekspor data secara rutin.** |
| Operasi gagal tetapi aman dicoba lagi                 | **Perubahan belum tersimpan. Coba lagi.**                                                                  |
| Tidak ada koneksi tetapi aplikasi tetap dapat dipakai | **Sedang offline. Latihan tetap dapat digunakan.**                                                         |
| Penyimpanan perangkat penuh                           | **Penyimpanan perangkat penuh. Ekspor data, lalu kosongkan ruang penyimpanan.**                            |
| Kunjungan pertama tanpa koneksi                       | **Pemasangan pertama memerlukan koneksi internet. Coba lagi saat online.**                                 |

Hindari pesan generik **"Terjadi kesalahan"** jika penyebab atau langkah pemulihannya sudah diketahui sistem.
