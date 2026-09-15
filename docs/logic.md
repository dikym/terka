# Logic Terka

Logic berada di `src/lib/terka/`. Seluruh operasi belajar berjalan lokal dan
tidak menggunakan React, API server, Supabase, akun, atau koneksi jaringan.
Halaman aplikasi dan pemasangan PWA belum termasuk implementasi ini.

## Perintah

```sh
bun run content:build  # konversi Markdown, validasi struktur dan soal Level 3
bun run test          # aturan belajar serta transaksi IndexedDB dengan fake-indexeddb
bun run check         # pemeriksaan TypeScript
bun run build:logic   # bundel browser di build/logic/index.js
bun run content:check # gate kelengkapan konten untuk rilis
```

`bun run build` memanggil gate konten sebelum build Next.js. Integrasi tampilan
dan PWA berada di luar cakupan perubahan logic ini; `build:logic` dapat dijalankan
tanpa frontend.

## Status konten

`scripts/build-content.ts` membaca `docs/Kode_Plat_Nomor_Indonesia.md`, fakta dari
PRD, serta `data/plate-curation.json`, kemudian menghasilkan `src/data/plates.json`.
Ada 61 kode wilayah, termasuk PG, tiga kode khusus, dan 43 fakta dari dokumen.
Hierarki serta jumlah materi diturunkan dari data, bukan angka perkiraan di PRD.

**Saat ini belum ada entri yang memenuhi metadata verifikasi `high`.** Sumber
tidak mencantumkan dua sumber independen per entri dengan satu sumber resmi.
Karena itu seluruh 61 kode tersedia sebagai referensi, tetapi kartu latihan
produksi belum diaktifkan. Tes menggunakan fixture sintetis yang terpisah.

Kekurangan konten yang disengaja tetap terlihat:

- PB: sumber menyebut 2016, PRD menyebut 29 April 2013. Entri PB membawa konflik
  dan fakta tanggal terkait ditandai diperdebatkan dalam hasil konversi.
- Suffix terverifikasi DK, B, L, D, AD belum tersedia. Contoh plat dalam sumber
  tidak diperluas menjadi pola atau tabel kabupaten yang tidak diberikan.
- Fakta mempertahankan status dan asal dokumennya. Curation menyediakan template
  fakta → kode untuk KU dan BP; template lain dapat ditambahkan pada properti
  `facts` dengan `question` dan satu `answerRegionId` yang tidak ambigu.
  Jangan menjadikan narasi legenda sebagai premis faktual soal.

Untuk mengaktifkan materi, lengkapi curation dengan `sources` berisi `ref`,
`publisher`, dan `official`, selesaikan `issues`, lalu tetapkan `confidence: high`.
Publisher harus mewakili sumber independen. Label saja tidak cukup: validator
menolak `high` tanpa dua publisher, satu sumber resmi, dan tanpa konflik.
Suffix memiliki `id`, `areaId`, `pattern` (huruf kapital dan `*`), `confidence`,
`sources`, serta `issues`; `areaId` merujuk ID wilayah administratif hasil konversi.
Pertahankan ID saat nama berubah dan jangan gunakan kembali untuk wilayah lain.

`content:check` **akan gagal pada kondisi konten saat ini**. Ini kegagalan gate
kelengkapan rilis, bukan kegagalan tes engine. Jangan melewati gate dengan
mempublikasikan fixture atau menaikkan confidence tanpa bukti.

## Integrasi tanpa UI

```ts
import {
  plates, createRepository, createLearningStore, openLearning,
  startSession, nextQuestion, applyAnswer, undoAnswer,
  selectScope, scopeStats, automaticBackup, manualBackup
} from "@/lib/terka";

const repository = createRepository();
const client = createLearningStore(repository, plates);
await openLearning(client, repository, Date.now());

// Subscribe dengan API Zustand vanilla. Progres baru dipublikasikan setelah commit.
const unsubscribe = client.store.subscribe(({ progress, status, error }) => {
  console.log({ progress, status, error });
});

await client.dispatch(crypto.randomUUID(), (progress, content) =>
  selectScope(progress, content, { level: "group", id: "bali-nusra" })
);

// Ketika materi high tersedia:
const sessionId = crypto.randomUUID();
await client.dispatch(crypto.randomUUID(), (progress, content) =>
  startSession(progress, content, { id: sessionId, mode: "daily", now: Date.now() })
);
await client.dispatch(crypto.randomUUID(), (progress, content) =>
  nextQuestion(progress, content, { id: crypto.randomUUID(), now: Date.now() })
);

const question = client.store.getState().progress!.currentQuestion;
// null berarti tidak ada soal siap sekarang; langkah belajar bisa jatuh tempo nanti.
// Saat pengguna menjawab, isi submission dari jawaban dan waktu ketukan pertama.
if (question) {
  const submission = {
    id: crypto.randomUUID(), sessionId, questionId: question.id,
    now: question.shownAt + 2000, msToFirstKey: 800, answers: ["jawaban pengguna"]
  };
  await client.dispatch(submission.id, (progress, content) =>
    applyAnswer(progress, content, submission)
  );
  // Hanya jawaban terakhir dapat dibatalkan, sampai jawaban berikutnya masuk.
  await client.dispatch(crypto.randomUUID(), (progress) => undoAnswer(progress));
}

const progress = client.store.getState().progress!;
const summary = scopeStats(progress, client.content, progress.activeScope);
const download = manualBackup(progress); // Blob untuk unduhan manual oleh pemanggil.
await automaticBackup(client, repository, Date.now()); // juga panggil seusai sesi.
unsubscribe();
```

`console.log` pada contoh hanya menunjukkan payload API, bukan analitik bawaan.
Gunakan waktu nyata untuk `shownAt`, `now`, dan ketukan pertama. Setelah reload,
soal aktif dipertahankan dengan waktu semula; jangan memulai ulang timer diam-diam.

## Kontrak penting

| API | Perilaku |
| --- | --- |
| `dailyQueue` / `refreshProgress` | Prioritas, kuota global, penahanan materi baru, dan batas hari terlindungi. Persist `refreshProgress` saat kembali aktif atau zona waktu berubah. |
| `startSession` | Mode `daily`, `focused`, `set`, `challenge`, `sprint`; resume memakai ID sesi yang sama. |
| `nextQuestion` | Mengembalikan state dengan deskripsi soal; parameter `level` dapat mengganti level soal aktif memakai ID/waktu tampil baru. |
| `applyAnswer` | Memeriksa identitas soal/sesi, timing dan input; caller tidak mengirim grade atau klaim benar/salah. |
| `finishSession` | Sesi harian boleh diakhiri; challenge harus selesai lima soal dan sprint berlangsung 60 detik. |
| `undoAnswer` | Memulihkan efek jawaban, termasuk unlock dan confusion; waktu perangkat tidak dimundurkan. |
| `setCardSuspended` | Penonaktifan manual atau reaktivasi setelah konten memenuhi syarat. |
| `gradeAnswer` | Grade selalu berasal dari jawaban mentah dan riwayat sebelumnya. |
| `scopeStats`, `weakCards`, `forecast`, `masteryMap` | Selector statistik tanpa mutasi. Nilai akurasi tanpa sampel adalah `null`. |
| `searchReference`, `factContext` | Referensi semua confidence dan konteks dengan label fakta. |
| `client.retry` | Mengulang payload transaksi yang gagal dengan ID sama. Jangan membuat submission baru untuk retry. |
| `client.initialize` | Memuat ulang state terbaru setelah konflik tab; command yang belum tersimpan perlu ditinjau ulang. |
| `client.restore` | Memvalidasi backup, merekonsiliasi data, lalu menimpa state lewat transaksi. |

Snapshot terakhir untuk undo tidak bertingkat. Penyimpanan memakai satu snapshot
progres atomik dengan revision check; histori berukuran beberapa tahun mungkin
kelak memerlukan tabel review terindeks, sesuai komentar `ponytail:` pada repository.

### Interpretasi aturan dokumen

- FSRS menghitung D/S dan interval harian maksimal sekali per kartu per hari.
  Learning steps 1 dan 10 menit menggunakan waktu tayang terpisah; jawaban langkah
  berikutnya tetap dicatat dan memajukan fase tanpa menghitung D/S lagi hari itu.
- Satu kartu memiliki jadwal sendiri. Keberhasilan Level 3 tidak dipindahkan ke
  kartu saudaranya. Mode khusus boleh mencatat kelulusan level tetapi tidak
  mengubah due, interval, D/S, reps, atau lapses.
- Kartu reverse dan set recall dibuat setelah interval utama ≥7 dan ≥14 hari.
  Set recall tidak masuk antrean harian; targetnya `min(5, jumlah anggota)`.
- Anggota set senama yang ambigu harus diperjelas; alias tidak dihitung sebagai
  anggota baru. Jawaban kota dan kabupaten eksplisit dapat dibedakan.
- Grade fuzzy maksimal 2. Jawaban benar non-fuzzy >60 detik memakai grade 3 dan
  tidak masuk distribusi persentil; salah/timeout tetap grade 1.
- Batas hari awal 04:00 lokal. Urutan hari disimpan monoton; perubahan zona atau
  jam perangkat mundur tidak memajukan batas hari atau due yang masih akan datang.
  Setelah perjalanan ke timur, tanggal lokal yang membuat hari berikutnya terlalu
  pendek dilewati; reset berikutnya kembali mengikuti 04:00 lokal. DST tetap
  mengikuti panjang hari lokal (23 atau 25 jam).

## Pengujian regresi

Jalankan `bun test --coverage tests`. Suite mencakup batas persentil dan timeout,
learning/relearning, semua mode sesi, perubahan konten, statistik, tahun kabisat,
DST, garis tanggal internasional, undo setelah perubahan zona waktu, serta
restore backup lintas instalasi dengan riwayat belajar yang terisi.

Pemeriksaan lanjutan memperbaiki enam bug: reset hari berulang setelah perjalanan,
tertukarnya kota/kabupaten pada target tunggal, undo yang memundurkan penundaan due,
waktu akhir sesi yang tidak valid, penggunaan ulang ID jawaban dengan payload
berbeda, dan nomor hari riwayat backup yang tertimpa nomor hari instalasi tujuan.
Tes penyimpanan juga memeriksa reopen, konflik transaksi antar-tab, kegagalan
write/close, izin dicabut, backup mingguan, serta acknowledgement unduhan manual.

## Backup dan verifikasi browser

`openLearning` memuat progres, meminta persistent storage sekali, lalu memeriksa
backup mingguan. `connectBackupFolder` harus dipanggil sebagai akibat tindakan
pengguna karena browser memerlukan user activation untuk pemilih folder.
Directory handle disimpan di IndexedDB terpisah dari payload JSON backup.

Backup otomatis menulis `terka-progress.json` hanya ketika aplikasi sedang aktif.
Izin hilang menghasilkan pesan memilih folder ulang. `manualBackup` menghasilkan
Blob untuk jalur unduhan browser; membuat Blob belum berarti file berhasil disimpan,
sehingga tidak mengubah `lastBackupAt` secara otomatis.
Setelah pengguna memastikan file tersimpan, panggil `acknowledgeManualBackup`
untuk memperbarui tanggal cadangan dan pengingat.

Tes transaksi menggunakan IndexedDB tiruan; tes writer memeriksa kegagalan write,
penolakan izin dan round-trip JSON. Izin folder, unduhan, pemulihan setelah browser
ditutup, serta `navigator.storage.persist()` masih perlu smoke test pada browser
nyata saat UI diintegrasikan. Precache/PWA dan deployment statis belum dipasang.

API library diperiksa terhadap dokumentasi resmi
[ts-fsrs](https://open-spaced-repetition.github.io/ts-fsrs/),
[Dexie](https://dexie.org/docs/API-Reference), dan
[Zustand vanilla](https://zustand.docs.pmnd.rs/reference/index).
