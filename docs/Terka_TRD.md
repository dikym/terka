# TERKA — Technical Requirements Document (TRD)

**Versi:** 2.1 (MVP) · **Status:** Draft · **Bahasa:** Indonesia
**Acuan:** Dokumen Kode Plat Nomor Kendaraan Indonesia (sumber data)
**Dokumen terkait:** PRD (produk dan alur pengguna) · SRD (aturan perilaku sistem)

> **Tagline:** Lihat platnya, terka asalnya.
> **Fokus dokumen ini:** arsitektur, model data, penyimpanan dan backup, serta pipeline build.

---

## 1. Purpose and Scope

Dokumen ini menetapkan arsitektur, model data, penyimpanan, backup, dan pipeline build Terka. Isinya menjawab dengan apa sistemnya dibangun dan bagaimana datanya dikelola.

Aturan perilaku — penjadwalan, penilaian jawaban, status kartu — ada di SRD. Konteks produk, alur pengguna, dan microcopy ada di PRD.

---

## 2. Architecture Overview

Terka berjalan penuh di perangkat pengguna. Satu bundel statis berisi UI, engine spaced repetition, dan `plates.json`; seluruh state pengguna tersimpan di IndexedDB perangkat itu. Tidak ada permintaan jaringan yang dibutuhkan setelah instalasi pertama.

Tidak memakai backend adalah keputusan arsitektur, bukan penyederhanaan sementara. Menambah backend membawa akun, migrasi data, biaya bulanan, dan beban pemeliharaan, sementara produknya cuma untuk satu pengguna di perangkat yang sama. Kombinasi File System Access API dan folder tersinkron cloud sudah memberi backup yang memadai tanpa kode server.

Membentuk hierarki cakupan langsung dari data, bukan memeliharanya sebagai struktur terpisah, mencegah data dan struktur cakupan jadi tidak sinkron. Contohnya, kode baru bisa saja ditambahkan ke `plates.json` tetapi lupa dimasukkan ke kawasannya, sehingga tidak pernah masuk antrean mana pun tanpa error yang langsung kelihatan.

Konsekuensi yang mengikat seluruh dokumen ini: tidak ada tempat pemulihan di server. Backup lokal ke folder tersinkron cloud adalah satu-satunya jaring pengaman, jadi bagian 5 memperlakukannya sebagai kebutuhan wajib, bukan fitur pelengkap.

---

## 3. Tech Stack

- **Frontend:** React + Vite + TypeScript, Tailwind CSS
- **State management:** Zustand (ringan dan cukup untuk satu pengguna)
- **Persistensi:** IndexedDB via Dexie, dengan `navigator.storage.persist()` dipanggil saat pertama kali dibuka
- **Backup:** File System Access API dengan directory handle permanen ke folder yang tersinkron ke layanan cloud (iCloud Drive atau Google Drive versi desktop); kalau browser-nya belum mendukung, pakai unduhan manual sebagai jalur cadangan
- **Data:** `plates.json` statis, dihasilkan dari dokumen referensi saat build; hierarki cakupan dibentuk dari properti `group` dan `province`, bukan ditulis sebagai struktur terpisah
- **PWA:** vite-plugin-pwa dengan Workbox dan strategi precache penuh
- **Peta:** SVG statis wilayah Indonesia, diwarnai lewat CSS variable, dengan `id` elemen yang sama persis dengan `id` cakupan
- **Deployment:** Vercel, situs statis tanpa server function
- **Backend:** tidak ada. Tanpa API, tanpa database, tanpa autentikasi, tanpa analitik.

---

## 4. Data Model and Source of Truth

Seluruh konten berasal dari satu file JSON yang dihasilkan dari dokumen referensi dan dikunci saat build. Progres pengguna tersimpan terpisah dan terhubung lewat ID stabil, jadi pembaruan data tidak menghapus atau merusak riwayat belajar.

```
plates.json
{
  "version": "2026.09.01",
  "regions": [
    {
      "id": "dk",                    ← ID stabil, tidak pernah berubah
      "code": "DK",
      "region": "Bali",
      "group": "bali-nusra",         ← kawasan
      "province": "bali",            ← provinsi utama untuk hierarki
      "spans": [],                   ← provinsi lain yang ikut tercakup
      "confidence": "high",
      "aliases": ["Denpasar", "Pulau Bali"],   ← diterima penuh saat dinilai
      "facts": ["f-blok-d", "f-dk-karesidenan"],
      "suffixes": [
        { "pattern": "A**", "area": "Denpasar", "confidence": "high" }
      ]
    }
  ],
  "facts": [
    {
      "id": "f-da-bukan-singkatan",
      "status": "terverifikasi",     ← terverifikasi | diperdebatkan | legenda
      "text": "...",
      "source": "Handboek voor automobilisten, Java Motor Club, 1920"
    }
  ]
}

```

Progres pengguna tersimpan di file terpisah:

```
progress.json (IndexedDB, terpisah)
{
  "activeScope": { "level": "group", "id": "bali-nusra" },
  "cards": [
    {
      "cardId": "dk::code2region",   ← regionId :: mode
      "state": "review",
      "stability": 12.4,          ← S, dalam hari
      "difficulty": 5.1,          ← D, skala 1-10
      "interval": 12,
      "due": "2026-09-20",
      "reps": 8,
      "lapses": 1,
      "avgMs": 2140
    }
  ],
  "confusions": [
    { "pair": ["be", "bd"], "count": 4, "lastSeen": "2026-09-06" }
  ]
}
```

**Satu mode, satu kartu.** `cardId` berbentuk `regionId::mode`, dan setiap mode punya jadwal, nilai D dan S, serta riwayat sendiri. Empat mode menghasilkan kartu: `code2region`, `region2code`, `blindrecall`, dan `setrecall`, ditambah `platfull` dan `suffix` untuk wilayah yang punya data kode belakang. Bentuk benar/salah kilat, bukan-yang-mana, dan fakta → kode bukan kartu tersendiri — ketiganya cara menyajikan `code2region` di Level 1 dan 2. Pembedaan inilah yang membuat jumlah kartu di PRD bagian 5 bisa dihitung, bukan ditebak.

**Properti `aliases` wajib ada**, meski isinya array kosong. Langkah 2 di SRD bagian 5.1 bergantung penuh pada properti ini. Kalau satu wilayah tidak punya nama alternatif terdaftar, semua sebutan sehari-hari yang beda dari nama bakunya akan ditolak.

Perhatikan bahwa `activeScope` tersimpan di file progres, bukan di file data. Cakupan adalah bagian dari state pengguna, bukan sifat bawaan materi. Pemisahan ini memastikan pembaruan `plates.json` tidak mengganggu pilihan cakupan, dan sebaliknya.

**Prosedur pembaruan data.** Saat `plates.json` dibuat ulang dengan versi baru, aturan berikut jalan otomatis:

1. Kode yang `id`-nya masih ada → riwayat kartu dipertahankan utuh, meski nama wilayah, provinsi, atau kawasannya berubah. Ganti nama tidak pernah menghapus progres, karena yang dihafal adalah kaitan kode dengan wilayah, dan kaitan itu masih ada.
2. Kode yang `id`-nya hilang dari data → seluruh kartunya berubah ke status `suspended`, bukan dihapus. Riwayatnya tetap tersimpan supaya bisa dipulihkan kalau ternyata hilangnya karena kesalahan data.
3. Kode baru → masuk sebagai kartu `new`, otomatis terdaftar ke kawasannya karena hierarki cakupan dibentuk otomatis dari data.
4. Entri yang `confidence`-nya turun dari `high` → kartunya berubah jadi `suspended` otomatis, dan pengguna diberi tahu di layar penutup sesi berikutnya.
5. Fakta yang statusnya berubah, misalnya dari `terverifikasi` jadi `diperdebatkan` → kartu terdampak tetap aktif, tetapi Fakta Singkat terkait menampilkan status terbaru.

`id` yang pernah dipakai tidak boleh dipakai ulang untuk wilayah lain, bahkan bertahun-tahun setelah tidak aktif. Kasus BP yang pindah dari Belitung ke Kepulauan Riau menunjukkan satu kode bisa berpindah wilayah sepenuhnya. Kalau `id` lama dipakai ulang, riwayat belajar wilayah sebelumnya bisa nyambung ke wilayah baru tanpa terlihat.

**Aturan `confidence` (final).** Entri berlabel `high` hanya kalau memenuhi ketiganya: (1) dikonfirmasi minimal dua sumber independen; (2) salah satunya sumber resmi — Korlantas, Polda, Bapenda, atau Samsat provinsi terkait; (3) tidak ada kontradiksi antar sumber pada wilayah maupun tanggal. Kalau satu syarat gagal, entri turun ke `medium`; kalau hanya bersumber dari agregator daring tanpa konfirmasi resmi, `low`.

Hanya entri `high` yang masuk sistem hafalan. Sisanya tetap tampil di halaman Referensi dengan penanda yang sesuai. Aturan ini bukan formalitas: dokumen referensi Terka pernah memuat dua tanggal berbeda untuk kode DP dan DW dari dua sumber yang sama-sama tampak resmi, dan bedanya baru selesai setelah dasar hukumnya ditelusuri. Menghafal informasi yang salah lebih mahal daripada belum menghafalnya, karena asosiasi keliru harus dibongkar belakangan.

---

## 5. Storage, Backup, and Recovery

**Penyimpanan utama.** Seluruh progres tersimpan di IndexedDB lewat Dexie, dengan struktur seperti di bagian 4. `navigator.storage.persist()` dipanggil saat aplikasi pertama kali dibuka supaya datanya tidak ikut terbuang saat browser membersihkan penyimpanan sementara.

**Backup otomatis.** Sistem menulis salinan progres mingguan ke folder yang tersinkron ke layanan cloud, lewat File System Access API dengan directory handle permanen. Handle-nya disimpan supaya pengguna tidak perlu memilih folder tiap kali.

**Jalur cadangan.** Kalau browser belum mendukung File System Access API, sistem beralih ke unduhan manual dan menyampaikannya secara eksplisit, bukan diam-diam berhenti mencadangkan.

**Pengingat.** Kalau backup terakhir lewat 14 hari, layar penutup sesi menampilkan pengingat. Kalau izin folder terputus, sistem meminta pengguna memilih folder lagi. Teks untuk kedua keadaan ada di PRD bagian 7.2.

**Pemulihan.** File cadangan bisa dimuat kembali untuk menimpa state lokal. Karena kartu terhubung ke data lewat `id` stabil, cadangan lama tetap kompatibel dengan `plates.json` versi baru menurut prosedur di bagian 4.

**Kebutuhan penyimpanan tambahan.** Undo di SRD bagian 4.10 menuntut tiap kartu menyimpan satu salinan state sebelumnya, dan penentuan grade di SRD bagian 4.5 menuntut seluruh data jawaban mentah disimpan, bukan cuma hasil pemetaannya. Keduanya menambah ukuran state, dan keduanya wajib.

Risiko yang melatarbelakangi seluruh bagian ini ada di PRD bagian 10.

---

## 6. Build and Deployment

Yang dikerjakan saat build:

- `plates.json` dihasilkan dari dokumen referensi kode plat dan dikunci dengan nomor versi bertanggal.
- Hierarki cakupan dibentuk dari properti `group` dan `province`, bukan ditulis sebagai struktur terpisah.
- Jumlah pilihan di tiap tingkat cakupan dihitung dari data, bukan ditulis manual di kode (SRD bagian 2.1).
- Tes otomatis memastikan setiap kode punya minimal satu soal Level 3 yang sah (SRD bagian 8, AC-1). Build gagal kalau ada kode yang tidak lolos.
- Service worker dibangun dengan vite-plugin-pwa dan Workbox memakai strategi precache penuh, supaya aplikasi jalan tanpa koneksi sejak kunjungan kedua.
- SVG peta dipasang dengan `id` elemen yang sama persis dengan `id` cakupan, sehingga pewarnaan Peta Penguasaan tidak butuh tabel pemetaan terpisah.

Deployment-nya situs statis di Vercel tanpa server function. Tidak ada environment variable rahasia, tidak ada proses migrasi saat rilis, dan rollback cukup dengan mengembalikan deployment sebelumnya.

Saat `plates.json` versi baru ikut terkirim, prosedur pembaruan data di bagian 4 jalan otomatis di perangkat pengguna saat aplikasi dibuka. Riwayat belajar tidak pernah dihapus oleh rilis.

---

## 7. Failure Handling

Sistem memperlakukan kegagalan sebagai keadaan yang harus dijelaskan, bukan dibiarkan senyap. Teks lengkapnya ada di PRD bagian 7.2.

| Kondisi | Perilaku sistem |
| --- | --- |
| IndexedDB gagal dibaca | Sesi tidak dimulai; pengguna diminta memuat ulang aplikasi. Tidak ada penulisan baru sebelum data terbaca, supaya state yang rusak tidak tertimpa |
| `plates.json` gagal dimuat | Aplikasi berhenti di layar pesan, bukan berjalan dengan data kosong yang bisa menandai kartu sebagai hilang |
| `navigator.storage.persist()` ditolak | Aplikasi tetap jalan, tetapi status cadangan ditonjolkan karena risiko kehilangan data naik |
| Penulisan gagal tetapi aman diulang | Perubahan tidak ditandai tersimpan; pengguna bisa mencoba lagi tanpa efek ganda |
| Tidak ada koneksi | Bukan kegagalan. Seluruh latihan tetap jalan dari precache; sinkronisasi cadangan menyusul saat folder cloud-nya online |
| Izin folder cadangan terputus | Backup otomatis berhenti dan pengguna diminta memilih folder lagi, bukan dibiarkan mengira cadangannya masih berjalan |
