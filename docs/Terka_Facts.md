# TERKA — Naskah Fakta dan Konteks Sejarah

**Status:** Draf · **Bahasa:** Indonesia
**Acuan:** Dokumen Kode Plat Nomor Kendaraan Indonesia (sumber data)
**Dokumen terkait:** PRD (produk dan alur pengguna) · SRD (aturan perilaku sistem) · TRD (arsitektur dan model data) · Kode Khusus (`Terka_Kode_Khusus.md`)

> **Slogan:** Lihat pelatnya, terka asalnya.
> **Fokus dokumen ini:** kumpulan fakta historis beserta label statusnya, sebagai bahan penyuntingan Fakta menarik di layar akhir.

---

## 1. Tujuan dan Status Naskah

Dokumen ini adalah naskah kandidat **Fakta menarik** untuk layar akhir setiap mode (PRD bagian 6.5). Hanya butir yang sudah lolos syarat penerbitan di bawah yang boleh tampil. Fakta tidak dipakai sebagai soal, pilihan jawaban, atau materi di tengah sesi. Tiap butir diberi label status:

> **terverifikasi** — dikonfirmasi sumber resmi atau sumber primer.
> **diperdebatkan** — beredar luas, tetapi sumbernya saling bertentangan.
> **legenda** — cerita populer yang belum memiliki dasar historis kuat. Tetap disertakan karena menarik, asalkan statusnya jelas.

Setiap butir diberi `id` stabil saat masuk `plates.json` (TRD bagian 4.1). Nomor urut di dokumen ini hanya untuk rujukan saat menyunting, bukan `id`. Mengubah label sejarah di sini (properti `historyLabel` di `plates.json`) ikut mengubah label yang tampil pada rilis konten berikutnya setelah verifikasi sumber.

**Syarat penerbitan, terpisah dari label sejarah.** `terverifikasi`, `diperdebatkan`, dan `legenda` menjelaskan kekuatan klaim, sedangkan `publicationStatus` (`draft` atau `ready`) menjelaskan kesiapan penerbitan. Seluruh 50 butir pada revisi ini masih `draft`. Teksnya ditulis sebagai catatan penyuntingan yang menyebut hal-hal yang perlu dibuktikan, bukan salinan siap tampil di aplikasi. Artinya, label yang tercantum merupakan usulan penyuntingan, bukan bukti bahwa pemeriksaan sumber per butir telah selesai. Penyelarasan dokumen ini tidak melakukan verifikasi sejarah baru.

Sebelum satu butir menjadi `ready`, editor wajib mencatat sumber yang dapat ditelusuri (`source`: judul/instansi, tanggal, URL atau nomor halaman), tanggal pemeriksaan (`sourceCheckedAt`), dan memeriksa kesesuaian teks serta label. Klaim `terverifikasi` perlu sumber resmi/primer yang langsung mendukungnya; `diperdebatkan` mencatat sumber versi yang bertentangan; `legenda` mencatat asal cerita dan menjelaskan keterbatasan bukti. Penyebutan nama buku dalam naskah saja belum memenuhi pemeriksaan halaman pendukung.

Konten draf boleh disimpan di repositori tetapi tidak dipilih aplikasi. Build menolak butir `ready` tanpa sumber atau tanggal pemeriksaan. Jika belum ada satu pun fakta `ready`, blok Fakta menarik tidak tampil dan tidak ada `fact_views` baru; latihan tetap berjalan. Tidak boleh mengubah `draft` menjadi `ready` otomatis hanya karena teks sumber tidak kosong. Format bundle mengikuti TRD 4.1 dan ERD 7.

---

## 2. Asal-usul Sistem

1. **Draf · usulan label: legenda** — Cerita populer menghubungkan kode wilayah dengan batalion Inggris yang menyerang Batavia pada 1811. Dalam cerita itu, B dikaitkan dengan Batavia, L dengan Surabaya, A dengan Banten, dan M dengan Madura. Hubungan tersebut perlu ditelusuri sebagai cerita, bukan dianggap sebagai asal-usul yang sudah terbukti.
2. **Draf · usulan label: diperdebatkan** — Asal-usul kode juga dijelaskan melalui pembagian karesidenan pada masa Hindia Belanda. Versi ini berbeda dari cerita batalion dan perlu dibandingkan menggunakan sumber sejarah yang dapat diperiksa.
3. **Draf · usulan label: terverifikasi** — Naskah awal menyebut penomoran kendaraan berlaku secara menyeluruh pada 1921–1922, setelah pemerintahan Inggris berakhir pada 1816. Tahun dan cakupan pemberlakuannya perlu diperiksa dari aturan pada masa itu.
4. **Draf · usulan label: terverifikasi** — Prancis pada 1893 sering disebut dalam pembahasan awal penggunaan pelat nomor. Klaim sebagai negara pertama perlu dibatasi menurut jenis aturan dan wilayah penerapannya.
5. **Draf · usulan label: terverifikasi** — Istilah kentekens digunakan dalam sumber berbahasa Belanda untuk tanda pengenal kendaraan. Kemunculannya dalam konteks kendaraan di Hindia Belanda perlu ditelusuri dari dokumen masa tersebut.
6. **Draf · usulan label: terverifikasi** — Handboek voor automobilisten en motorwielrijders, terbitan Java Motor Club tahun 1920, dapat menjadi bahan penelusuran kode wilayah. Jumlah kode dan halaman pendukungnya harus diperiksa sebelum naskah diterbitkan.
7. **Draf · usulan label: legenda** — Cerita batalion juga dikaitkan dengan penggunaan tanda pengenal pada kereta kuda di Batavia. Bagian cerita ini memerlukan sumber tersendiri; pengulangan cerita yang sama di beberapa laman belum menjadi bukti independen.
8. **Draf · usulan label: legenda** — Dalam cerita populer, AB dan AD dikaitkan dengan gabungan huruf batalion serta kedudukan wilayah Mataram. Penjelasan ini tetap diperlakukan sebagai legenda sampai ada bukti yang mendukungnya.
9. **Draf · usulan label: diperdebatkan** — Cerita bahwa sebagian huruf hanya mewakili pasukan cadangan perlu dibandingkan dengan sejarah pemakaian kode W dan Z. Jangan menyimpulkan asal kode hanya dari kesamaan huruf.

---

## 3. Riwayat Kode DA dan Kalimantan

10. **Draf · usulan label: terverifikasi** — Kode KB, KH, KT, dan KU memiliki huruf awal yang sama, sedangkan DA berbeda. Pola ini dapat menjadi bahan pengingat setelah daftar wilayah penggunaannya diperiksa.
11. **Draf · usulan label: terverifikasi** — Salah satu penjelasan menelusuri DA ke wilayah Zuider en Ooster Afdeeling van Borneo pada masa Hindia Belanda. Cakupan wilayah dan urutan penerapannya perlu didukung sumber primer.
12. **Draf · usulan label: terverifikasi** — Pembentukan KB, KH, dan KT dikaitkan dengan pembagian wilayah setelah kemerdekaan, sementara DA dipertahankan. Riwayat BR sebelum KB perlu diperiksa secara terpisah.
13. **Draf · usulan label: diperdebatkan** — Ada penjelasan yang mengartikan DA sebagai Distrik Amandit. Atribusi kepada Ditlantas Polda Kalimantan Selatan harus disertai sumber yang dapat ditelusuri dan dibandingkan dengan bukti sejarah.
14. **Draf · usulan label: diperdebatkan** — Penjelasan lain menghubungkan DA dengan urutan terbalik AD dan jabatan F. N. Nieuwenhuyzen. Hubungan sebab akibat tersebut belum boleh dinyatakan pasti tanpa sumber yang mendukung.
15. **Draf · usulan label: terverifikasi** — Tidak ditemukannya kepanjangan DA dalam satu buku tidak otomatis membuktikan bahwa kode itu hanya nomor urut. Naskah perlu membedakan isi sumber dari dugaan penyunting.
16. **Draf · usulan label: terverifikasi** — Pemakaian KU dikaitkan dengan pembentukan Kalimantan Utara pada 2012. Tanggal pembentukan provinsi dan tanggal penerapan kode kendaraan harus diperiksa sebagai dua peristiwa yang berbeda.

---

## 4. Perubahan Kode di Papua

17. **Draf · usulan label: terverifikasi** — Naskah awal mencatat peresmian PB untuk Papua Barat pada 29 April 2013. Tanggal, cakupan, dan acara penyerahannya memerlukan rujukan langsung.
18. **Draf · usulan label: terverifikasi** — Perubahan DS menjadi PA disebut berlangsung pada 1 Juli 2016. Sumber penerapan dan cakupan kendaraan yang terdampak perlu dilampirkan.
19. **Draf · usulan label: terverifikasi** — PY, PS, dan PT dikaitkan dengan provinsi hasil pemekaran di Papua pada 2024. Masing-masing kode memerlukan sumber penerapan tersendiri, termasuk peristiwa penyerahan pelat PT 1 pada Agustus 2024 jika tetap disebut.
20. **Draf · usulan label: terverifikasi** — Perubahan kode di Papua menunjukkan pentingnya versi data. Urutan DS, PA, PB, PY, PS, PT, dan PG harus dijelaskan dengan tanggal serta wilayah yang jelas, tanpa menganggap semua perubahan terjadi sekaligus.

---

## 5. Sulawesi Selatan

21. **Draf · usulan label: terverifikasi** — Pembagian DD menjadi DD, DP, dan DW disebut berlaku sejak 1 Juni 2012. Tanggal dan dasar peraturannya harus diperiksa dari dokumen penerapan, bukan hanya dari kutipan ulang.
22. **Draf · usulan label: terverifikasi** — Pertumbuhan kendaraan disebut sebagai salah satu alasan pembagian wilayah kode DD. Angka pertumbuhan bulanan perlu memiliki periode, sumber, dan cakupan yang jelas.
23. **Draf · usulan label: terverifikasi** — Naskah awal membagi wilayah DD, DP, dan DW menjadi 9, 11, dan 4 kabupaten/kota. Jumlah serta daftar wilayah harus diperiksa pada versi data yang sama.
24. **Draf · usulan label: terverifikasi** — Ada perbedaan tahun penerapan DP dan DW dalam bahan awal. Sebelum diterbitkan, telusuri sumber yang menyebut 2012 dan 2021 serta bedakan tanggal penerapan dari tanggal penulisan laman.

---

## 6. Jawa dan Sekitarnya

25. **Draf · usulan label: terverifikasi** — Kode W untuk Gresik dan Sidoarjo disebut terpisah dari wilayah L sekitar tahun 2000. Tahun dan dasar penerapannya perlu diperiksa sebelum dikaitkan dengan periode sejarah tertentu.
26. **Draf · usulan label: terverifikasi** — Kode Z dikaitkan dengan pemisahan wilayah yang sebelumnya menggunakan D. Naskah perlu mencantumkan daerah dan waktu perubahan secara jelas.
27. **Draf · usulan label: terverifikasi** — Sebagian Kabupaten Tangerang menggunakan A, sementara wilayah lain terkait dengan B. Rincian wilayah dan perubahan jumlah kecamatan perlu disesuaikan dengan sumber resmi yang berlaku pada tanggal pemeriksaan.
28. **Draf · usulan label: terverifikasi** — Kota Tangerang Selatan dikaitkan dengan kode B. Perbandingan dengan Kabupaten Tangerang dapat menunjukkan bahwa daerah bertetangga tidak selalu menggunakan kode yang sama.

---

## 7. Sumatera

29. **Draf · usulan label: terverifikasi** — Foto atau dokumen lama disebut memperlihatkan BN untuk Bangka dan BP untuk Belitung. Setiap bukti perlu memiliki tanggal, lokasi, dan asal arsip yang dapat ditelusuri.
30. **Draf · usulan label: terverifikasi** — Pemakaian BP di Kepulauan Riau dapat dibandingkan dengan riwayat pemakaian huruf yang sama di wilayah lain. Perubahan wilayah tidak berarti identitas konten lama boleh digunakan ulang.
31. **Draf · usulan label: terverifikasi** — Sumatera Utara menggunakan BK dan BB. Batas wilayah masing-masing perlu dijelaskan melalui daftar kabupaten/kota yang terverifikasi, bukan hanya sebutan bagian timur atau Tapanuli.

---

## 8. Pola yang Berguna untuk Hafalan

32. **Draf · usulan label: terverifikasi** — BA, BB, BD, BE, BG, BH, BK, BL, BM, BN, dan BP membentuk pola huruf B pada kode di kawasan Sumatera. B tunggal perlu dibedakan dari kelompok dua huruf tersebut.
33. **Draf · usulan label: terverifikasi** — Kode di Kalimantan memperlihatkan pola awal K, dengan DA sebagai pengecualian dalam daftar kerja. Pola huruf membantu mengingat, tetapi tidak menggantikan pemeriksaan data wilayah.
34. **Draf · usulan label: terverifikasi** — Sejumlah kode berawalan D tersebar di Sulawesi, Bali, Nusa Tenggara, dan Maluku. Kelompok ini perlu dibedakan dari EA, EB, dan ED yang juga terdapat di Nusa Tenggara.
35. **Draf · usulan label: terverifikasi** — DK dapat dipelajari bersama kelompok kode berawalan D. Pengelompokan untuk hafalan tidak membuktikan bahwa seluruh kode tersebut memiliki asal-usul sejarah yang sama.
36. **Draf · usulan label: terverifikasi** — Jawa menggunakan kode satu huruf serta beberapa kode dua huruf seperti AA, AB, AD, AE, dan AG. Hindari menyebut rentang AA–AG seolah setiap kombinasi di dalamnya digunakan.
37. **Draf · usulan label: terverifikasi** — Daftar kerja kode Papua memperlihatkan pola awal P. Klaim bahwa seluruhnya ditetapkan pada abad yang sama harus menunggu pemeriksaan tanggal setiap kode.

---

## 9. Regulasi dan Warna Modern

38. **Draf · usulan label: terverifikasi** — Perubahan warna pelat kendaraan pribadi dikaitkan dengan penerapan dasar putih dan tulisan hitam pada 2022. Tanggal awal, tahap penerapan, serta hubungannya dengan ETLE perlu diperiksa.
39. **Draf · usulan label: terverifikasi** — Warna pelat membedakan beberapa kategori kendaraan. Daftar warna dan kategorinya harus mengikuti aturan yang diperiksa pada tanggal penerbitan, bukan digunakan sebagai ringkasan tanpa batas waktu.
40. **Draf · usulan label: terverifikasi** — TCKB digunakan dalam konteks tanda coba kendaraan bermotor. Nama, fungsi, dan warna tandanya perlu mengikuti definisi pada peraturan yang dirujuk.
41. **Draf · usulan label: terverifikasi** — Peraturan Kepolisian Nomor 7 Tahun 2021 menjadi salah satu bahan untuk memeriksa registrasi dan identifikasi kendaraan. Status berlaku dan perubahan setelahnya harus diperiksa sebelum naskah menyebutnya sebagai dasar hukum terkini.
42. **Draf · usulan label: terverifikasi** — Lampiran Perpol 7/2021 huruf B menetapkan empat kode registrasi khusus: CD untuk korps diplomatik, CC untuk korps konsulat, CH untuk konsul kehormatan, dan RI untuk kendaraan dinas Presiden, Wakil Presiden, ketua lembaga tinggi negara, serta pejabat setingkat menteri. Sumber sudah dicatat di `Terka_Kode_Khusus.md` bagian 8.
43. **Draf · usulan label: terverifikasi** — Untuk urusan administrasi kendaraan, arahkan pembaca ke instansi atau layanan resmi yang sesuai. Naskah harus menjelaskan bahwa Terka merupakan alat belajar, bukan bukti asal kendaraan atau panduan prosedur administratif.

---

## 10. Kode Khusus CD dan RI

Butir di bagian ini sudah memiliki sumber yang dicatat pada 24 September 2026 (`Terka_Kode_Khusus.md` bagian 8). Statusnya tetap `draft` sampai editor memeriksa teks dan label sesuai bagian 1.

44. **Draf · usulan label: terverifikasi** — Lampiran Perpol 7/2021 memuat 130 kode negara CD. Daftarnya dimulai dari CD 12 untuk Amerika Serikat dan berakhir di CD 145 untuk IFAD. Nomor 1 sampai 11 tidak dipakai, begitu juga 46, 91, 119, dan 124.
45. **Draf · usulan label: terverifikasi** — Kode CD tidak hanya dimiliki negara. Sebanyak 29 organisasi internasional ikut tercantum, misalnya UNDP (CD 58), WHO (CD 74), Uni Eropa (CD 99), dan ASEAN (CD 100).
46. **Draf · usulan label: terverifikasi** — Dari seluruh nomor RI, Perpol 7/2021 hanya menulis satu secara eksplisit: RI 1 untuk Presiden. Nomor lain dikoordinasikan dengan Kementerian Sekretariat Negara.
47. **Draf · usulan label: terverifikasi** — Sejak Kabinet Merah Putih, sebagian pelat RI memakai nomor kecil di kanan bawah. Korlantas menjelaskan RI 36 dipakai tujuh utusan khusus presiden, dibedakan dengan nomor kecil 1 sampai 7.
48. **Draf · usulan label: terverifikasi** — Pada hari pelantikan Oktober 2024, mobil kepresidenan memakai pelat bertuliskan "Indonesia 1", lalu kembali memakai RI 1 pada acara berikutnya. Sumber saat ini berupa laporan media; foto atau pernyataan resmi Sekretariat Presiden perlu dicari sebelum terbit.
49. **Draf · usulan label: terverifikasi** — Sebagian daftar CD yang beredar di internet tidak cocok dengan lampiran Perpol. Salah satu daftar menyebut Britania Raya CD 14, padahal lampiran mencantumkan Inggris di CD 15; CD 14 milik Prancis.
50. **Draf · usulan label: terverifikasi** — Menurut publikasi Korlantas, RI 1 sampai RI 13 dipakai Presiden, Wakil Presiden, Istri Presiden, Istri Wakil Presiden, Ketua MPR, Ketua DPR, Ketua DPD, Ketua MA, Ketua MK, Ketua BPK, Ketua KY, Gubernur BI, dan Ketua OJK. Fakta ini wajib menyebut bahwa tidak ada sumber valid untuk daftar lengkap kode RI dan alokasinya dapat berubah sewaktu-waktu. Unggahan asli Korlantas perlu diarsipkan sebelum terbit.
