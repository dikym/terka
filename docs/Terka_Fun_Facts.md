# TERKA — Fun Facts

**Status:** Siap terbit · **Bahasa:** Indonesia
**Data pendamping:** `../data/Terka_Fun_Facts.json`
**Dokumen terkait:** PRD 6.5 (Fun Facts) · SRD 4.15 dan 8.10 (pemilihan dan pergiliran fakta) · TRD 4.1 (`facts[]` dan `sources[]`) · ERD (`content_facts`, `content_fact_sources`) · Special Codes (`Terka_Special_Codes.md`, `../data/Terka_Special_Codes.json`) · Microcopy (`Terka_Microcopy.md`) · Tests (`Terka_Tests.md`)

> **Slogan:** Lihat pelatnya, terka asalnya.
> **Fokus dokumen ini:** 41 fakta untuk blok Fun Facts di layar akhir, label sejarahnya, sumber setiap fakta, dan aturan penerbitannya. Pemeriksaan sumber terakhir dilakukan pada 1 Oktober 2026.

---

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menjadi naskah sumber untuk blok **Fun Facts** di layar akhir setiap mode (PRD bagian 6.5). Data yang dibaca build ada di `../data/Terka_Fun_Facts.json`; teks, label, dan sumber di kedua berkas wajib sama.

Fakta hanya tampil di layar akhir. Fakta tidak dipakai sebagai soal, pilihan jawaban, atau materi di tengah sesi. Aturan pemilihan dan pergiliran ada di SRD bagian 4.15 dan 8.10; teks UI-nya ada di Microcopy.

Seluruh 41 fakta berstatus `ready`. Setiap fakta punya sumber yang tercatat lengkap di bagian 11 — judul, penerbit, tanggal, URL, dan lokasi bagian yang mendukung klaim — serta tanggal pemeriksaan. Sebanyak 25 fakta didukung minimal dua sumber. Sisanya, 16 fakta, bersandar pada satu sumber resmi yang menetapkan atau mengumumkan aturannya sendiri: Perpol 7/2021 beserta lampirannya, Divisi Humas Polri, atau Bapenda Jawa Tengah.

---

## 2. Label Sejarah dan Status Penerbitan

Setiap fakta punya dua penanda yang berbeda fungsi. **Label sejarah** (`historyLabel`) menjelaskan kekuatan bukti dan tampil di layar akhir. **Status penerbitan** (`publicationStatus`) menjelaskan apakah fakta boleh dipilih aplikasi.

| Label           | Makna                                                                                        | Syarat sumber                                                                |
| --------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `terverifikasi` | Klaim didukung sumber resmi, sumber primer, atau salinan dokumen primer yang dapat ditelusuri | Minimal satu sumber yang langsung mendukung klaim                            |
| `diperdebatkan` | Ada beberapa versi dengan sumber yang saling bertentangan                                    | Sumber untuk setiap versi yang disebut di teks                               |
| `mitos`         | Cerita populer yang bukti sejarahnya lemah atau bertentangan dengan bukti yang tersedia      | Sumber yang menunjukkan cerita itu beredar; teks menyebut keterbatasan buktinya |

**Salinan dokumen primer.** Untuk masa Hindia Belanda, halaman *Handboek voor automobilisten en motorwielrijders* terbitan Java Motor Club yang dimuat Conam diperlakukan sebagai salinan dokumen primer. Narasi Conam sendiri tidak dipakai sebagai bukti tunggal, karena halaman yang sama juga memuat cerita batalion tanpa rujukan. Klaim dari Conam dicocokkan dengan sumber kedua jika tersedia.

**Klaim yang tidak sepakat antar-sumber.** Jika dua sumber berbeda pada satu detail, detail itu dibuang dari teks atau fakta diberi label `diperdebatkan`. Contohnya fakta 7 dan 8: Conam menyebut tanda IN mulai 1909 dan huruf X mulai 1937, sedangkan Wikipedia bahasa Belanda menyebut 1933 untuk keduanya. Teks hanya memuat hal yang disepakati kedua sumber.

| Status  | Makna                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| `draft` | Naskah belum lolos pemeriksaan. Boleh disimpan di repositori, tetapi tidak dipilih aplikasi                         |
| `ready` | Sumber sudah diperiksa, teks dan label sudah sesuai dengan sumber, dan penyunting sudah menyetujui penerbitannya |

**Syarat `ready`.** Fakta baru boleh `ready` jika memenuhi keempatnya:

1. `source` berisi minimal satu `id` yang terdaftar di `sources[]`.
2. `sourceCheckedAt` terisi dengan tanggal pemeriksaan.
3. Teks terdiri dari paling banyak tiga kalimat pendek dan setiap klaim didukung sumber yang dicantumkan.
4. Label sejarah sesuai dengan tabel di atas.

Build menolak fakta `ready` yang tidak memenuhi syarat 1 dan 2 (Tests TR-150). Status tidak berubah otomatis hanya karena sumber sudah tercatat. Jika tidak ada fakta `ready`, blok Fun Facts disembunyikan dan `fact_views` tidak ditulis.

**Format baris di dokumen ini.** Fakta ditulis `N. **Siap · label: X** — teks`, diikuti baris sumber. Fakta yang turun kembali ke draf ditulis `N. **Draf · usulan label: X** — teks`. Build menolak baris bernomor bercetak tebal yang tidak mengikuti salah satu format ini.

---

## 3. Struktur Data

`../data/Terka_Fun_Facts.json` berisi `summary`, `historyLabels`, `sources[]`, dan `facts[]`. Build menyalin `facts[]` dan `sources[]` ke `plates.json` (TRD bagian 4.1).

**Properti `facts[]`:**

| Properti            | Isi                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `ref`               | Nomor urut baca, sama dengan nomor di dokumen ini. Boleh berubah saat urutan disunting                    |
| `id`                | Pengenal tetap, pola `^[a-z0-9-]{1,32}$` sesuai domain `content_ref`. Tidak boleh didaur ulang            |
| `section`           | Judul bagian di dokumen ini                                                                               |
| `text`              | Teks yang tampil di layar akhir                                                                           |
| `historyLabel`      | `terverifikasi`, `diperdebatkan`, atau `mitos`                                                            |
| `publicationStatus` | `draft` atau `ready`                                                                                      |
| `relatedCodes`      | Kode yang dibahas fakta. Build memetakannya ke `regions[].facts[]`                                        |
| `source`            | Daftar `id` dari `sources[]`, minimal satu untuk fakta `ready`. `id` pertama tampil di layar akhir        |
| `sourceCheckedAt`   | Tanggal pemeriksaan sumber terakhir                                                                       |

**Properti `sources[]`:** `id`, `title`, `publisher`, `type`, `date` (boleh null hanya untuk halaman ensiklopedia atau wiki yang terus diperbarui), `url`, `originalUrl` (boleh null), `locator`, dan `checkedAt`. Bentuknya sama dengan `sources[]` di `Terka_Special_Codes.md` bagian 8.

**Aturan build:**

- `id` fakta unik dan mengikuti pola domain `content_ref`, karena `fact_views.fact_id` memakai domain itu.
- Setiap `id` di `source` wajib ada di `sources[]`.
- `sources[]` dari `../data/Terka_Fun_Facts.json` dan `../data/Terka_Special_Codes.json` digabung. `id` yang sama di kedua berkas wajib berisi data yang sama; jika berbeda, build gagal.
- Kode di `relatedCodes` yang tidak ada di `regions[]` — misalnya DS, BR, X, CD, RI, dan TCKB — tidak membentuk relasi dan tidak menggagalkan build.
- Teks dan label di dokumen ini dan di JSON wajib sama; build membandingkan keduanya.

**Perubahan `id`.** `fact-invasion-1811-numbered-units` (33 karakter) diganti `fact-invasion-1811-regiments`, karena melebihi batas 32 karakter domain `content_ref`. Fakta ini belum pernah tampil, jadi belum ada `fact_views` yang merujuk `id` lama. `id` lama masuk daftar `id` yang tidak digunakan lagi.

---

## 4. Asal-usul dan Mitos

1. **Siap · label: mitos** — Ada cerita populer yang menyebut kode pelat berasal dari 26 batalion Inggris yang menyerbu Jawa pada 1811. Cerita ini sudah dimuat media besar, tetapi bukti sejarah yang mendukungnya belum ditemukan.

   Sumber: `mobilmotorlama-2018`, `gnfi-2021-batalion`, `kompas-2024-batalion` · diperiksa 2026-10-01

2. **Siap · label: terverifikasi** — Pasukan Inggris yang menyerbu Jawa pada 1811 memakai nomor resimen, seperti ke-59 dan ke-78, bukan huruf. Jumlah pasukannya disebut sekitar 11.960 orang, berbeda dari angka 15.600 yang beredar dalam cerita batalion.

   Sumber: `fibis-java-expedition`, `highlanders-java-1811`, `mobilmotorlama-2018` · diperiksa 2026-10-01

3. **Siap · label: terverifikasi** — Kode pelat juga tidak berasal dari tentara Inggris yang datang pada 1945. Kode wilayah berbentuk huruf sudah berlaku sejak 1917, 28 tahun sebelum pasukan Sekutu pimpinan Inggris mendarat di Jakarta.

   Sumber: `nlwiki-kentekens`, `avatara-unesa-afnei`, `conam-ned-indie` · diperiksa 2026-10-01

4. **Siap · label: terverifikasi** — Salah satu versi lengkap cerita batalion Inggris dimuat blog otomotif pada Mei 2018. Saat ditanya pembaca, penulisnya menyebut forum, grup Facebook, dan buku sebagai bahan bacaannya. Cerita serupa kemudian dimuat media nasional sebagai sejarah kode pelat.

   Sumber: `mobilmotorlama-2018`, `gnfi-2021-batalion`, `kompas-2024-batalion` · diperiksa 2026-10-01

5. **Siap · label: terverifikasi** — Kode wilayah berbentuk huruf mulai berlaku di Jawa pada Oktober 1917. Daftar kode masa Hindia Belanda sudah memuat B untuk Batavia, D untuk Priangan, dan L untuk Surabaya, hampir 30 tahun sebelum proklamasi.

   Sumber: `conam-ned-indie`, `nlwiki-kentekens` · diperiksa 2026-10-01

6. **Siap · label: terverifikasi** — Sebelum 1917, pelat di Hindia Belanda memakai nama atau singkatan daerah, misalnya “Preanger 10”. Surabaya memakai SB, sedangkan Cirebon memakai CH. Bentuknya berbeda dari kode wilayah yang dipakai sekarang.

   Sumber: `conam-ned-indie`, `kompas-2022-stori` · diperiksa 2026-10-01

7. **Siap · label: terverifikasi** — Hindia Belanda punya kode negara sendiri untuk kendaraan: IN, singkatan dari Indes Néerlandaises. Tanda ini berbentuk oval, mirip stiker kode negara pada mobil di Eropa.

   Sumber: `conam-ned-indie`, `nlwiki-kentekens` · diperiksa 2026-10-01

8. **Siap · label: terverifikasi** — Huruf X pernah dipakai sebagai kode pelat di Hindia Belanda. Kode ini dipakai untuk kendaraan yang dibawa ke luar negeri, dan pelatnya dipasang bersama tanda oval IN.

   Sumber: `conam-ned-indie`, `nlwiki-kentekens` · diperiksa 2026-10-01

9. **Siap · label: terverifikasi** — Pelat hitam dengan tulisan putih sudah digunakan sejak zaman Belanda dan bertahan lebih dari seratus tahun. Pada 2022, pelat kendaraan pribadi mulai diganti menjadi putih agar lebih mudah dibaca kamera tilang elektronik.

   Sumber: `detikoto-2022-pelat-putih`, `conam-ned-indie` · diperiksa 2026-10-01

---

## 5. Arti Angka dan Huruf

10. **Siap · label: terverifikasi** — Angka pada pelat dibagi menurut jenis kendaraan. Rentang 1–1999 digunakan untuk mobil penumpang dan 2000–6999 untuk sepeda motor. Nomor 7000-an untuk bus, 8000-an untuk mobil barang, dan 9000-an untuk kendaraan khusus.

   Sumber: `perpol-7-2021` · diperiksa 2026-09-30

11. **Siap · label: terverifikasi** — Pembagian nomor pelat di Jakarta punya pengecualian. Nomor 8000-an digunakan untuk mobil penumpang, sedangkan mobil barang memakai nomor 9000-an.

   Sumber: `perpol-7-2021` · diperiksa 2026-09-30

12. **Siap · label: terverifikasi** — Saat jatah angka habis, penomoran dapat diulang dengan tambahan huruf di belakangnya. Urutannya dimulai dari A sampai Z, lalu AA sampai ZZ. Jika kombinasi itu juga habis, urutannya berlanjut ke AAA.

   Sumber: `perpol-7-2021` · diperiksa 2026-09-30

13. **Siap · label: terverifikasi** — Pada pelat B, huruf pertama setelah angka dapat menunjukkan wilayah pendaftaran kendaraan. S untuk Jakarta Selatan, T untuk Jakarta Timur, U untuk Jakarta Utara, P untuk Jakarta Pusat, dan B untuk Jakarta Barat.

   Sumber: `detikoto-2021-ntmc`, `detik-2012-polda-metro` · diperiksa 2026-10-01

14. **Siap · label: terverifikasi** — Kode pelat tidak selalu bisa dibaca sebagai singkatan nama daerah. Peraturan Polri mencantumkan kode dan wilayahnya, tetapi tidak menjelaskan kepanjangan huruf-huruf tersebut.

   Sumber: `perpol-7-2021` · diperiksa 2026-09-30

15. **Siap · label: terverifikasi** — Di Jawa ada kode AA, AB, AD, AE, dan AG, tetapi tidak ada AC atau AF. Kode-kode ini tercantum dalam daftar peninggalan Belanda. Daftar tersebut tidak menjelaskan mengapa beberapa huruf dilewati.

   Sumber: `conam-ned-indie`, `perpol-7-2021` · diperiksa 2026-10-01

16. **Siap · label: terverifikasi** — Cerita batalion Inggris menyebut W dan Z tidak dipakai karena menjadi kode pasukan cadangan. Namun, keduanya tercantum dalam daftar kode pelat. W mencakup Gresik, Sidoarjo, Mojokerto, dan Jombang, sedangkan Z mencakup Garut, Tasikmalaya, dan sekitarnya.

   Sumber: `perpol-7-2021`, `kompas-2021-lampiran`, `mobilmotorlama-2018` · diperiksa 2026-10-01

---

## 6. Cerita di Balik Kode Daerah

17. **Siap · label: terverifikasi** — Pelat B dipakai di tiga provinsi. Selain Jakarta, kode ini digunakan di Depok dan Bekasi, Jawa Barat, serta Kota Tangerang dan Tangerang Selatan, Banten.

   Sumber: `perpol-7-2021` · diperiksa 2026-09-30

18. **Siap · label: terverifikasi** — Pelat K ternyata berasal dari Jawa Tengah. Kode ini digunakan di Pati, Kudus, Jepara, Rembang, Blora, dan Grobogan.

   Sumber: `perpol-7-2021` · diperiksa 2026-09-30

19. **Siap · label: terverifikasi** — Dari lima provinsi di Kalimantan, hanya Kalimantan Selatan yang kode pelatnya tidak diawali K. Provinsi ini memakai DA, kode yang sudah digunakan sejak zaman Belanda.

   Sumber: `perpol-7-2021`, `conam-ned-indie` · diperiksa 2026-10-01

20. **Siap · label: terverifikasi** — Kalimantan Barat pernah memakai kode BR, sebelum berganti menjadi KB. Awalan B itu serupa dengan sejumlah kode di Sumatra, seperti BA, BK, dan BM.

   Sumber: `conam-ned-indie`, `perpol-7-2021` · diperiksa 2026-10-01

21. **Siap · label: diperdebatkan** — Polda Kalimantan Selatan pernah menjelaskan DA sebagai singkatan Distrik Amandit, kini Kandangan. Namun, daftar kode masa Hindia Belanda mencantumkan DA untuk wilayah selatan dan timur Kalimantan, bukan satu distrik. Asal huruf DA belum punya penjelasan yang disepakati.

   Sumber: `otomotifnet-2022-da`, `conam-ned-indie` · diperiksa 2026-10-01

22. **Siap · label: terverifikasi** — Bali dan Lombok pernah memakai kode pelat yang sama, yaitu DK. Setelah Lombok beralih ke DR, kode DK tetap digunakan di Bali.

   Sumber: `conam-ned-indie`, `perpol-7-2021` · diperiksa 2026-10-01

23. **Siap · label: terverifikasi** — Kode BP pernah digunakan di Belitung. Kini Belitung memakai BN bersama Bangka, sedangkan BP digunakan di Kepulauan Riau, termasuk Batam.

   Sumber: `conam-ned-indie`, `perpol-7-2021` · diperiksa 2026-10-01

24. **Siap · label: terverifikasi** — Papua pernah memakai kode DS sebelum berganti menjadi PA pada 2016. Awalan D itu juga ditemukan pada sejumlah kode di Sulawesi dan Maluku. Sejak 2024, provinsi hasil pemekaran mulai memakai kode sendiri, seperti PS, PT, dan PY.

   Sumber: `jpnn-2016-papua`, `detikoto-2024-papua`, `ddtc-2024-papua-selatan` · diperiksa 2026-10-01

25. **Siap · label: terverifikasi** — Lampiran peraturan Polri mencantumkan “Kab. Besuki” dalam daftar wilayah berkode P. Padahal, sekarang tidak ada kabupaten dengan nama itu. Besuki adalah nama karesidenan pada masa Hindia Belanda.

   Sumber: `perpol-7-2021`, `kompas-2021-lampiran`, `conam-ned-indie` · diperiksa 2026-10-01

---

## 7. Perubahan Kode di Sulawesi Selatan

26. **Siap · label: terverifikasi** — Sulawesi Selatan menambah kode DP dan DW pada 2012 karena ingin menghemat biaya. Sebelumnya, seluruh wilayah memakai DD. Menambah kode dinilai lebih murah daripada membeli mesin pencetak pelat bernomor lebih panjang yang harganya miliaran rupiah.

   Sumber: `detikoto-2012-sulsel`, `bisnis-2012-sulsel`, `perkap-5-2012` · diperiksa 2026-09-30

27. **Siap · label: terverifikasi** — Sejumlah situs menyebut DP dan DW mulai berlaku pada 2021. Namun, pemberitaan Juni 2012 sudah memuat pengumuman Polda Sulawesi Selatan tentang kedua kode tersebut. Tanggal 2021 tidak sesuai dengan catatan itu.

   Sumber: `detikoto-2012-sulsel`, `bisnis-2012-sulsel`, `detik-2020-sulsel`, `bapenda-sulsel-2021` · diperiksa 2026-09-30

---

## 8. Warna dan Pelat Khusus

28. **Siap · label: terverifikasi** — Warna pelat menunjukkan peruntukan kendaraan: putih untuk kendaraan pribadi, kuning untuk angkutan umum, dan merah untuk kendaraan pemerintah. Ada juga pelat hijau untuk kendaraan di kawasan perdagangan bebas yang mendapat pembebasan bea masuk.

   Sumber: `perpol-7-2021` · diperiksa 2026-09-30

29. **Siap · label: terverifikasi** — Ada pelat perak bertulisan hitam untuk kendaraan asing yang beroperasi di Indonesia. Pelat ini dipasang di kaca depan dan belakang, bukan di bemper. Wilayah berlakunya terbatas pada provinsi yang menerbitkannya.

   Sumber: `perpol-7-2021` · diperiksa 2026-09-30

30. **Siap · label: terverifikasi** — Mobil baru yang belum terdaftar dapat memakai pelat sementara berwarna putih dengan tulisan merah, yang disebut TCKB. Penggunaannya terbatas: mobil hanya boleh dikemudikan petugas dealer atau pabrik yang berseragam.

   Sumber: `perpol-7-2021` · diperiksa 2026-09-30

31. **Siap · label: terverifikasi** — Pelat rahasia memang diatur dalam peraturan Polri. STNK dan pelat ini digunakan untuk melindungi identitas petugas intelijen atau penyidik beserta kendaraannya.

   Sumber: `perpol-7-2021` · diperiksa 2026-09-30

32. **Siap · label: terverifikasi** — Kendaraan yang tidak diregistrasi ulang selama dua tahun setelah masa berlaku STNK habis dapat dihapus datanya. Prosesnya didahului tiga kali peringatan. Setelah datanya dihapus, kendaraan tidak dapat didaftarkan kembali.

   Sumber: `perpol-7-2021`, `detikoto-2022-stnk-mati`, `detikoto-2024-stnk-korlantas` · diperiksa 2026-10-01

33. **Siap · label: terverifikasi** — Pelat kendaraan listrik tidak seluruhnya berwarna biru. Warna biru hanya menjadi lis tambahan, sementara warna dasar pelat tetap menunjukkan peruntukan kendaraan, seperti kuning untuk angkutan umum atau merah untuk kendaraan pemerintah.

   Sumber: `polri-2022-lis-biru` · diperiksa 2026-09-30

---

## 9. Penggunaan Nomor Pilihan

34. **Siap · label: terverifikasi** — Nomor cantik tidak bisa langsung dipindahkan ke kendaraan lain begitu saja. Menurut Pasal 7 ayat (5) Perpol 7/2021, pemindahan nomor pilihan ke kendaraan lain atau pemilik lain tetap dikenai biaya penerimaan negara bukan pajak (PNBP).

   Sumber: `bapenda-jateng-2025-nrkb-pilihan` · diperiksa 2026-09-30

---

## 10. Kode Diplomatik dan Kendaraan Pejabat

35. **Siap · label: terverifikasi** — Daftar kode diplomatik dalam peraturan dimulai dari CD 12 untuk Amerika Serikat. Nomor 1 sampai 11 tidak tercantum dalam daftar tersebut.

   Sumber: `perpol-7-2021-lampiran` · diperiksa 2026-09-24

36. **Siap · label: terverifikasi** — Kode CD juga dipakai organisasi internasional. WHO memakai CD 74, sedangkan Sekretariat ASEAN memakai CD 100. Seluruhnya ada 29 organisasi internasional dalam daftar.

   Sumber: `perpol-7-2021-lampiran` · diperiksa 2026-09-24

37. **Siap · label: terverifikasi** — Sejumlah daftar di internet menulis CD 14 untuk Inggris. Dalam peraturan, CD 14 justru digunakan oleh Prancis, sedangkan Inggris memakai CD 15.

   Sumber: `perpol-7-2021-lampiran` · diperiksa 2026-09-24

38. **Siap · label: terverifikasi** — Peraturan Polri secara jelas menyebut RI 1 untuk Presiden. Pembagian nomor RI lainnya dikoordinasikan dengan Sekretariat Negara.

   Sumber: `perpol-7-2021-lampiran` · diperiksa 2026-09-24

39. **Siap · label: terverifikasi** — Menurut penjelasan Korlantas, tujuh utusan khusus presiden memakai kode pelat RI 36. Masing-masing dibedakan dengan angka kecil 1 sampai 7 di sudut kanan bawah pelat.

   Sumber: `korlantas-cnn-2025-ri36`, `kompas-id-2025-ri36` · diperiksa 2026-09-24

40. **Siap · label: terverifikasi** — Saat pelantikan pada Oktober 2024, mobil presiden memakai pelat bertuliskan “Indonesia 1”. Pada acara berikutnya, mobil tersebut kembali memakai RI 1.

   Sumber: `detikoto-2024-indonesia-1`, `suara-2024-indonesia-1` · diperiksa 2026-10-01

41. **Siap · label: terverifikasi** — Menurut Korlantas, urutan RI 1 sampai RI 13 juga mencakup istri presiden, istri wakil presiden, Gubernur BI, dan Ketua OJK. Peraturan Polri sendiri hanya menyebut presiden, wakil presiden, ketua lembaga tinggi negara, dan pejabat setingkat menteri. Daftar lengkap seluruh nomor RI belum tersedia, dan pembagiannya bisa berubah.

   Sumber: `korlantas-ig-via-detik-2026`, `perpol-7-2021-lampiran` · diperiksa 2026-09-24

---

## 11. Daftar Sumber

Kolom Diperiksa adalah tanggal pemeriksaan sumber. Sumber yang `id`-nya sama dengan `Terka_Special_Codes.md` bagian 8 disalin tanpa perubahan.

| ID | Judul | Penerbit | Jenis | Tanggal | Diperiksa | URL | URL asli | Lokasi |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `avatara-unesa-afnei` | Perjuangan Laskar Hizbullah Jombang dalam Mempertahankan Kemerdekaan 1944-1950 (Syamsul Ustadziya Rofif dan Wisnu) | AVATARA, e-Journal Pendidikan Sejarah, Vol. 15 No. 1, Universitas Negeri Surabaya | jurnal | 2023 | 2026-10-01 | https://ejournal.unesa.ac.id/index.php/avatara/article/view/58453/45563 | — | Pendahuluan, paragraf 1: AFNEI mendarat di Kemayoran 14 September 1945 dan di Tanjung Priok 29 September 1945; merujuk Sejarah Nasional Indonesia VI (Balai Pustaka, 2011), hlm. 188 |
| `bapenda-jateng-2025-nrkb-pilihan` | Penjelasan Bapenda Jawa Tengah tentang NRKB pilihan — tanggapan resmi aduan LGWP66964724 | Badan Pengelola Pendapatan Daerah Provinsi Jawa Tengah — LaporGub | instansi | 2025-02-12 | 2026-09-30 | https://laporgub.jatengprov.go.id/detail/LGWP66964724.html | — | Tanggapan Bapenda, 12 Februari 2025 pukul 16.35 WIB; kutipan Perpol 7/2021 Pasal 7 ayat (5) |
| `bapenda-sulsel-2021` | Nomor Kendaraan DD Warisan Belanda | Bapenda Provinsi Sulawesi Selatan | instansi | 2021-05-21 | 2026-09-30 | https://bapenda.sulselprov.go.id/v1/2021/05/21/nomor-kendaraan-dd-warisan-belanda/ | — | Memuat tanggal 1 Juni 2021 untuk DP dan DW; dipakai sebagai contoh tanggal yang bertentangan dengan pemberitaan 2012 |
| `bisnis-2012-sulsel` | Sulsel Berlakukan Tiga Kode Pelat Kendaraan | Kabar24 Bisnis.com | media-mengutip-instansi | 2012-06-07 | 2026-09-30 | https://kabar24.bisnis.com/read/20120607/78/80327/sulsel-berlakukan-tiga-kode-pelat-kendaraan | — | Wawancara Regident Ditlantas Polda Sulsel |
| `conam-ned-indie` | Kentekens in Nederlands-Indië tot 1945 | Conam (Contactgroep Auto- en Motorrijwiel Historie) | situs-sejarah | 2025-10-22 | 2026-10-01 | https://conam.info/kentekens/kentekens-in-nederlands-indie | — | Paragraf pelat 1900–1917 (nama gewest, SB, CH, foto “Preanger 10”); oval IN 1909; daftar kode huruf setelah 1917; huruf X sejak 1937; salinan halaman Handboek voor automobilisten en motorwielrijders terbitan Java Motor Club |
| `ddtc-2024-papua-selatan` | Dorong Kendaraan Mutasi ke Pelat PS, Papua Selatan Bebaskan BBNKB | DDTCNews | media-mengutip-instansi | 2024 | 2026-10-01 | https://news.ddtc.co.id/berita/daerah/1804029/dorong-kendaraan-mutasi-ke-pelat-ps-papua-selatan-bebaskan-bbnkb | — | Peluncuran pelat PS berdasarkan Peraturan Kapolda Papua 1/2024 tentang Penomoran Kendaraan Bermotor Daerah Papua dan DOB |
| `detik-2012-polda-metro` | Polda Metro: Selama Tersedia, Silakan Pesan Nopol Kendaraan Cantik | detikNews | media-mengutip-instansi | 2012-02-20 | 2026-10-01 | https://news.detik.com/berita/d-1846949/polda-metro-selama-tersedia-silakan-pesan-nopol-kendaraan-cantik | — | Pernyataan Kabag Regident Ditlantas Polda Metro Jaya: seri huruf belakang mengikuti wilayah alamat pemohon, misalnya T untuk Jakarta Timur |
| `detik-2020-sulsel` | Polda Sulsel Resmi Berlakukan Nopol Baru Tiga Huruf untuk Mobil | detikNews | media | 2020-06-11 | 2026-09-30 | https://news.detik.com/berita/d-5049710/polda-sulsel-resmi-berlakukan-nopol-baru-tiga-huruf-untuk-mobil | — | Bukti DP dan DW sudah dipakai sebelum 2021 |
| `detikoto-2012-sulsel` | Kode Huruf Nomor Polisi Kendaraan Bermotor di Sulsel Bertambah Jadi Tiga | detikOto | media-mengutip-instansi | 2012-06-06 | 2026-09-30 | https://oto.detik.com/mobil/d-1934705/kode-huruf-nomor-polisi-kendaraan-bermotor-di-sulsel-bertambah-jadi-tiga | — | Keterangan pers Kasubdit Regident Ditlantas Polda Sulsel, 6 Juni 2012: DP dan DW, alasan biaya mesin cetak |
| `detikoto-2021-ntmc` | Ini Arti Kode Angka dan Huruf di Pelat Nomor Kendaraan | detikOto (mengutip NTMC Polri) | media-mengutip-instansi | 2021-10-30 | 2026-10-01 | https://oto.detik.com/tips-and-tricks/d-5789056/ini-arti-kode-angka-dan-huruf-di-pelat-nomor-kendaraan | — | Penjelasan NTMC Polri tentang seri huruf wilayah Polda Metro Jaya: B, P, S, T, U |
| `detikoto-2022-pelat-putih` | Ini Alasan Polisi Ubah Pelat Hitam Jadi Putih | detikOto | media-mengutip-instansi | 2022-05-31 | 2026-10-01 | https://oto.detik.com/berita/d-6102996/ini-alasan-polisi-ubah-pelat-hitam-jadi-putih | — | Pernyataan Kasubdit STNK Ditregident Korlantas Polri: pelat putih berlaku mulai Juni 2022 untuk mendukung kamera ETLE |
| `detikoto-2022-stnk-mati` | STNK Mati 2 Tahun Jadi Bodong, Punya Mobil-motor tapi Cuma Jadi Pajangan | detikOto | media | 2022-12-17 | 2026-10-01 | https://oto.detik.com/berita/d-6466252/stnk-mati-2-tahun-jadi-bodong-punya-mobil-motor-tapi-cuma-jadi-pajangan | — | Kutipan lengkap UU 22/2009 Pasal 74 ayat (2) dan (3) |
| `detikoto-2024-indonesia-1` | Bukan 'Indonesia 1', Kini Mobil Kepresidenan Prabowo Pakai Pelat Nomor Ini | detikOto | media | 2024-10-22 | 2026-10-01 | https://oto.detik.com/mobil/d-7601151/bukan-indonesia-1-kini-mobil-kepresidenan-prabowo-pakai-pelat-nomor-ini | — | Pelat “Indonesia 1” usai pelantikan, lalu RI 1 pada acara serah terima memorandum Menteri Pertahanan |
| `detikoto-2024-papua` | Kode Pelat Nomor di 3 Provinsi Papua Diubah | detikOto (mengutip situs Korlantas Polri) | media-mengutip-instansi | 2024-08-21 | 2026-10-01 | https://oto.detik.com/berita/d-7501604/kode-pelat-nomor-di-3-provinsi-papua-diubah | — | Papua Barat Daya PY, Papua Selatan PS, Papua Tengah PT pada 2024 |
| `detikoto-2024-stnk-korlantas` | STNK Mati 2 Tahun Bakal Dihapus, Bagaimana Aturannya? | detikOto (mengutip situs Korlantas Polri) | media-mengutip-instansi | 2024-02-26 | 2026-10-01 | https://oto.detik.com/berita/d-7211704/stnk-mati-2-tahun-bakal-dihapus-bagaimana-aturannya | — | Pernyataan Korlantas tentang implementasi Pasal 74 UU 22/2009; surat peringatan mengacu Perpol 7/2021; kendaraan yang dihapus tidak dapat didaftarkan kembali |
| `fibis-java-expedition` | Java Expedition | FIBIS (Families in British India Society) | ensiklopedia | — | 2026-10-01 | https://wiki.fibis.org/w/Java_Expedition | — | Tabel kekuatan pasukan 1811: total 11.960; daftar resimen bernomor, antara lain HM 59th dan HM 78th |
| `gnfi-2021-batalion` | Alasan Tidak Digunakannya Huruf C pada Plat Kendaraan Bermotor di Indonesia | Good News From Indonesia | media | 2021-05-18 | 2026-10-01 | https://www.goodnewsfromindonesia.id/2021/05/18/alasan-tidak-digunakannya-huruf-c-pada-plat-kendaraan-bermotor-di-indonesia | — | Paragraf sejarah: 15.600 pasukan Inggris dan kode batalion B untuk Batavia, disajikan tanpa rujukan sejarah |
| `highlanders-java-1811` | The Invasion of Java | The Highlanders’ Museum | museum | — | 2026-10-01 | https://thehighlandersmuseum.com/?p=30029 | — | Resimen ke-78 dalam invasi Jawa 1811; kekuatan pasukan 11.960 orang |
| `jpnn-2016-papua` | Nomor Polisi di Papua Bukan DS Lagi | JPNN.com (mengutip Cenderawasih Pos) | media-mengutip-instansi | 2016-07-02 | 2026-10-01 | https://www.jpnn.com/news/resmi-nomor-polisi-di-papua-bukan-ds-lagi | — | Peluncuran PA 1 oleh Kapolda Papua, 1 Juli 2016; Keputusan Korlantas 168/VI/2016 |
| `kompas-2021-lampiran` | Ini Kode Wilayah pada Pelat Nomor Kendaraan yang Jarang Orang Tahu | Kompas.com | media | 2021-08-19 | 2026-10-01 | https://otomotif.kompas.com/read/2021/08/19/132208115/ini-kode-wilayah-pada-pelat-nomor-kendaraan-yang-jarang-orang-tahu?page=all | — | Salinan daftar kode wilayah Lampiran Perpol 7/2021: W (Gresik, Sidoarjo, Mojokerto, Jombang), P (Kab. Besuki, Situbondo, Bondowoso, Jember, Banyuwangi) |
| `kompas-2022-stori` | Sejarah Pelat Nomor Kendaraan di Indonesia | Kompas.com | media | 2022-12-23 | 2026-10-01 | https://www.kompas.com/stori/read/2022/12/23/150000379/sejarah-pelat-nomor-kendaraan-di-indonesia | — | Pelat dikenalkan Belanda di Jawa pada 1900 dengan kode daerah seperti SB untuk Surabaya; pemasangan kadang di samping kendaraan |
| `kompas-2024-batalion` | Asal-usul Kode Wilayah Pelat Nomor Kendaraan di Indonesia, Berawal dari Tentara Inggris | Kompas.com | media | 2024-04-17 | 2026-10-01 | https://otomotif.kompas.com/read/2024/04/17/150100215/asal-usul-kode-wilayah-pelat-nomor-kendaraan-di-indonesia-berawal-dari | — | Cerita batalion B untuk Batavia, dikutip dari laman Pemerintah Kota Surakarta |
| `kompas-id-2025-ri36` | Viral Mobil RI 36 Paksa Terobos Kemacetan, Siapa Pejabat Penggunanya? | Kompas.id | media | 2025-01-10 | 2026-09-24 | https://www.kompas.id/artikel/viral-mobil-ri-36-paksa-terobos-kemacetan-siapa-pejabat-penggunanya | — | Skema nomor kecil (RI 24 dan turunannya); RI 36.1–36.7 |
| `korlantas-cnn-2025-ri36` | Ada Angka Kecil di Pelat RI 36 Mobil Utusan Presiden, Apa Itu? (pernyataan Kasubdit STNK Dit Regident Korlantas Polri) | CNN Indonesia | media-mengutip-instansi | 2025-01-16 | 2026-09-24 | https://www.cnnindonesia.com/otomotif/20250116110327-579-1187800/ada-angka-kecil-di-pelat-ri-36-mobil-utusan-presiden-apa-itu | — | RI 36 nomor kecil 1–7 untuk utusan khusus presiden; penomoran RI dikoordinasikan dengan Kemensetneg |
| `korlantas-ig-via-detik-2026` | Daftar Pelat Nomor Mobil Dinas Pejabat RI dari Presiden hingga Menteri (mengutip Instagram Korlantas Polri) | detikOto | media-mengutip-instansi | 2026-04-18 | 2026-09-24 | https://oto.detik.com/berita/d-8450080/daftar-pelat-nomor-mobil-dinas-pejabat-ri-dari-presiden-hingga-menteri | — | Daftar RI 1–RI 13; unggahan Instagram asli Korlantas belum diarsipkan |
| `mobilmotorlama-2018` | Sejarah Asal Usul Plat Nomor Kendaraan di Indonesia | mobilmotorlama.com | blog | 2018-05-12 | 2026-10-01 | https://www.mobilmotorlama.com/2018/05/sejarah-asal-usul-plat-nomor-kendaraan.html | — | Paragraf 2 (15.600 tentara, 26 batalion A–Z); paragraf 4 (batalion cadangan, termasuk W dan Z); komentar penulis 20 Mei 2018 dan 16 Agustus 2020 tentang bahan bacaannya |
| `nlwiki-kentekens` | Nederlands-Indische kentekens | Wikipedia bahasa Belanda | ensiklopedia | — | 2026-10-01 | https://nl.wikipedia.org/wiki/Nederlands-Indische_kentekens | — | Bagian “Periode 1917-1949”: Motorreglement berlaku 1 Oktober 1917 dan memperkenalkan sistem kode baru; subbagian “Internationaal kenteken en de landcode IN”: kode X untuk kenteken internasional bersama landcode IN. Tahun mulai IN dan X berbeda dari Conam (1933 di sini, 1909 dan 1937 di Conam), jadi teks fakta tidak menyebut tahun |
| `otomotifnet-2022-da` | Berbau Kolonial, Pelat Nomor Kalsel Emang Beda, DA Singkatan Dari Ini | Otomotifnet (mengutip Kompas.com, 18 Oktober 2022) | media-mengutip-instansi | 2022-10-19 | 2026-10-01 | https://otomotifnet.gridoto.com/read/233532243/berbau-kolonial-pelat-nomor-kalsel-emang-beda-da-singkatan-dari-ini | — | Pernyataan Kasubdit Regident Ditlantas Polda Kalsel: DA = Distrik Amandit; DA dipakai untuk Zuider en Ooster Afdeeling van Borneo |
| `perkap-5-2012` | Peraturan Kapolri Nomor 5 Tahun 2012 tentang Registrasi dan Identifikasi Kendaraan Bermotor | Berita Negara RI 2012 No. 209 (peraturan.go.id) | peraturan | 2012 | 2026-09-30 | https://peraturan.go.id/files/bn209-2012.pdf | — | Dasar hukum yang disebut Ditlantas Polda Sulsel pada 2012; dicabut Perpol 7/2021 |
| `perpol-7-2021` | Peraturan Kepolisian Nomor 7 Tahun 2021 tentang Registrasi dan Identifikasi Kendaraan Bermotor | Berita Negara RI 2021 No. 476 (peraturan.go.id) | peraturan | 2021-05-05 | 2026-09-30 | https://peraturan.go.id/files/bn476-2021.pdf | — | Batang tubuh dan Lampiran: pembagian nomor urut, seri huruf, warna TNKB, TNKB khusus dan rahasia, penghapusan registrasi, kode wilayah |
| `perpol-7-2021-lampiran` | Lampiran Peraturan Kepolisian Negara RI Nomor 7 Tahun 2021 tentang Registrasi dan Identifikasi Kendaraan Bermotor | Polri; salinan JDIH BPK | peraturan | 2021-05-05 | 2026-09-24 | https://peraturan.bpk.go.id/Details/225016/perpol-no-7-tahun-2021 | https://peraturan.bpk.go.id/Download/219644/Perpol%20No.%207%20th%202021%20ttg%20regident_lampiran.pdf | Lampiran huruf B (kode registrasi), huruf D angka 4 (kode negara CD, hlm. 99–102), huruf F (TNKB khusus RI, hlm. 103–104) |
| `polri-2022-lis-biru` | Ditlantas Polda Sulteng Terapkan Aturan Penggunaan Nomor Kendaraan | Divisi Humas Polri — Tribratanews | instansi | 2022-08-16 | 2026-09-30 | https://tribratanews.polri.go.id/blog/nasional-3/ditlantas-polda-sulteng-terapkan-aturan-penggunaan-nomor-kendaraan-48992 | — | Penjelasan empat warna dasar TNKB dan lis biru kendaraan listrik pada akhir artikel |
| `suara-2024-indonesia-1` | Usai Dilantik Jadi Presiden, Prabowo Tinggalkan Gedung MPR Naik Mobil Maung Garuda Putih | Suara.com | media | 2024-10-20 | 2026-10-01 | https://www.suara.com/news/2024/10/20/135903/usai-dilantik-jadi-presiden-prabowo-tinggalkan-gedung-mpr-naik-mobil-maung-garuda-putih | — | Mobil presiden berpelat “Indonesia 1” setelah pelantikan, 20 Oktober 2024 |

---

## 12. Pemeliharaan

1. Setiap perubahan teks, label, atau sumber dicatat di Markdown dan JSON dalam commit yang sama. Perubahan itu ikut menaikkan `contentRev` di `plates.json` (TRD bagian 4.1).
2. Fakta yang sumbernya hilang atau terbukti salah diturunkan ke `draft`. Aplikasi berhenti memilihnya pada rilis konten berikutnya (TRD bagian 4.1, aturan 5).
3. Fakta 35–39 dan 41 memakai bahan dari `Terka_Special_Codes.md`. Periksa ulang setiap ada perubahan lampiran Perpol 7/2021, perombakan kabinet, atau perubahan nomenklatur lembaga.
4. Fakta 24 bergantung pada kode wilayah Papua yang masih berkembang. Periksa ulang setiap ada pengumuman kode baru dari Korlantas atau Polda Papua.
5. Sumber berjenis `media-mengutip-instansi` dilengkapi `originalUrl` ke pernyataan asli instansi begitu tersedia. Unggahan Instagram Korlantas yang dipakai fakta 41 wajib diarsipkan, sesuai `Terka_Special_Codes.md` bagian 7.
6. Jumlah fakta `ready` menentukan `N` pada SRD bagian 4.15. Dengan 41 fakta, `N = 20`.
