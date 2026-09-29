# TERKA — Entity Relationship Diagram (ERD): Data Dictionary and Design Notes

**Bahasa:** Indonesia
**Acuan:** Terka PRD, SRD, TRD · **Diagram:** `Terka_ERD.puml`

Dokumen ini menjadi kamus untuk `Terka_ERD.puml`: fungsi tabel, arti kolom, nilai yang didukung, dan aturan integritasnya. Diagram menunjukkan hubungan antardata, sedangkan uraian ini menjelaskan penerapannya.

**Acuan skema fisik.** Selama `supabase/migrations` belum berisi migration pertama, dokumen ini acuan untuk kunci, foreign key, indeks, grant, dan trigger. Begitu migration pertama masuk repositori, SQL migration jadi satu-satunya acuan skema fisik:

- Diagram dihasilkan dari database hasil migration, bukan digambar tangan. `Terka_ERD.puml` hanya dipertahankan sampai generator diagram terpasang di CI.
- Dokumen ini menyimpan alasan desain dan aturan yang tidak terbaca dari SQL. Daftar kolom di sini dan di TRD bagian 4.2 menjelaskan arti, bukan definisi.
- Jika dokumen dan migration berbeda, migration yang benar. Dokumen diperbaiki di commit yang sama, dan CI memeriksa bahwa setiap tabel dan kolom yang disebut dokumen ada di skema hasil migration (Tests TR-190).

TRD bagian 4.2 menjelaskan arti kolom dari sisi sinkronisasi dan replay, dan selaras dengan dokumen ini.

**Konvensi penamaan:** nama tabel, nama kolom, dan seluruh nilai enum memakai bahasa Inggris. Singkatan hanya dipakai untuk satuan (`_ms`) dan tiga nama pendek yang dipakai konsisten di seluruh dokumen: `client_ts`, `tz`, dan `fsrs`. Penjelasannya tetap berbahasa Indonesia.

### Cara membaca diagram

Diagram digambar **tanpa pengelompokan tabel**, supaya penempatan tabel bebas mengikuti relasinya dan label tidak saling menimpa.

Aturan penggambarannya: **satu garis per pasangan tabel**. Hampir setiap tabel log memiliki `device_id`, dan jika semuanya digambar, `devices` jadi simpul dengan sepuluh garis yang menutupi seluruh diagram. Karena itu hanya `devices → review_logs` yang digambar. Yang tidak digambar tetap ada sebagai kolom:

| Foreign key yang tidak digambar                                                                                             | Perannya                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `device_id` di `practice_runs`, `review_voids`, `card_events`, `sightings`, `fact_views`, `fsrs_params`, `privacy_consents` | Perangkat tempat kejadian itu tercatat. Dipakai sebagai pemecah seri kunci pengurutan (TRD bagian 4.4) dan untuk penelusuran masalah |
| `user_settings.updated_by_device`, `card_notes.updated_by_device`                                                           | Pemecah seri last-write-wins jika `updated_at` sama                                                                                  |

**Dua jenis garis:**

| Garis       | Arti                                                                                                                                                                                                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tegas       | Foreign key sungguhan di Postgres                                                                                                                                                                                                                                                       |
| Putus-putus | Hubungan tanpa foreign key. Dengan kardinalitas: rujukan lunak lewat id teks ke konten `plates.json`, karena kontennya tidak disimpan di database (bagian 7). Tanpa kardinalitas: ketergantungan lewat trigger, yaitu `service_flags` yang dibaca saat perangkat didaftarkan (bagian 6) |

Entitas yang namanya berawalan `content_` bukan tabel database. Ia menggambarkan struktur `plates.json` dalam bentuk ternormalisasi, supaya relasi kode, kab/kota, dan fakta terlihat di satu diagram.

**Label relasi memakai bahasa Inggris**, sama seperti nama tabel dan kolom, dan dibaca dari tabel di sisi kiri relasi ke tabel di sisi kanan. Contohnya `review_logs ||--o| review_voids : "is undone by"` dibaca "satu jawaban dibatalkan oleh paling banyak satu pembatalan".

**Tata letak.** Diagram dibaca dari atas ke bawah dalam lima tingkat: `auth.users` dan katalog global di atas, lalu perangkat, pengaturan, dan sesi, lalu tabel log, lalu konten `plates.json`, dan terakhir tabel pengaman pemakaian. Dua hal di file `.puml` hanya mengatur tata letak, bukan makna:

- Jumlah tanda hubung pada relasi (`--`, `---`, `-----`) menentukan berapa baris jarak antartabel.
- Relasi dari log ke konten ditulis dari sisi log, misalnya `review_logs }o..|| content_regions : "asks about"`, supaya kelompok konten tersusun di bawah log. Kardinalitasnya tetap sama: satu kode dirujuk banyak jawaban.

### Cara membaca notasi

| Notasi                                | Arti                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| `*` di depan kolom                    | Wajib diisi (`NOT NULL`)                                                          |
| Tanpa `*`                             | Boleh kosong                                                                      |
| `<<PK>>`                              | Bagian dari kunci utama. Dua kolom bertanda `<<PK>>` berarti kunci utama gabungan |
| `<<FK>>`                              | Menunjuk baris di tabel lain                                                      |
| `<<UK>>` pada satu kolom              | Nilai kolom itu tidak boleh muncul di dua baris                                   |
| `= nilai`                             | Nilai bawaan jika tidak diisi                                                     |
| Blok setelah pemisah kedua di diagram | Aturan tingkat tabel, bukan kolom                                                 |

Database bisa menolak data ganda dengan dua cara, dan keduanya ditulis di tempat berbeda.

Cara pertama menjaga **satu kolom** dan ditandai `<<UK>>` di baris kolom itu. Skema sekarang tidak memakainya. `server_seq` sengaja tidak diberi `<<UK>>`; alasannya ada di konvensi tipe data di bawah.

Cara kedua menjaga **beberapa kolom sekaligus** dan ditulis sebagai satu kalimat aturan di bawah tabel kolom. `review_voids` memiliki aturan `(user_id, review_id)` unik: satu jawaban hanya bisa dibatalkan sekali, tetapi dua pengguna boleh memiliki id jawaban yang kebetulan sama tanpa saling mengganggu.

### Konvensi tipe data

Seluruh tabel memakai konvensi berikut tanpa kecuali. Campuran tipe yang tidak dijelaskan adalah sumber kesalahan program yang sulit dilacak, terutama di sistem yang menghitung ulang keadaan aplikasi dari log.

| Untuk              | Tipe                                                              | Alasan                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Waktu              | `timestamptz`                                                     | `timestamp` tanpa zona waktu menyimpan jam dinding tanpa keterangan zona, dan artinya bergeser mengikuti pengaturan server. Replay membandingkan waktu dari perangkat di WIB, WITA, dan WIT, jadi zona waktu yang hilang langsung merusak urutan kejadian                                                                                                                                       |
| Tanggal murni      | `date`                                                            | Untuk `local_day` dan `received_day`, yang memang tidak memiliki jam                                                                                                                                                                                                                                                                                                                            |
| Teks               | `text`                                                            | Di Postgres `text` dan `varchar(n)` sama cepatnya. Batas panjang dipasang lewat `CHECK` hanya jika memang ada batas nyata, seperti 120 karakter jawaban atau 280 karakter catatan pengingat                                                                                                                                                                                                     |
| ID event/perangkat | `uuid`                                                            | Dibuat **di klien** sebagai UUID versi 7, yang urut menurut waktu. Id harus dibuat klien karena event lahir saat offline, dan versi 7 membuat baris baru masuk ke ujung indeks alih-alih tersebar. UUID acak (versi 4) membuat indeks tabel besar cepat renggang. `CHECK` UUID v7 hanya untuk ID event/perangkat buatan klien, bukan `user_id` dari Supabase Auth atau kunci alami versi/konten |
| Nomor urut server  | `bigint`                                                          | `server_seq` diisi sequence di server dan tidak pernah dikirim klien. Kolom ini **tidak** diberi unique constraint. Identity dan sequence sudah menjamin nilainya unik, sedangkan unique index global tidak bisa dibuat di tabel yang dipartisi `hash (user_id)`, karena unique index di tabel berpartisi wajib memuat kolom partisi. Pull memakai indeks biasa `(user_id, server_seq)`         |
| Enum               | `text` + `CHECK`; `domain` jika dipakai lebih dari satu kolom     | Tipe enum bawaan Postgres menyulitkan penambahan dan penghapusan nilai. `text` dengan `CHECK` memberi perlindungan yang sama tanpa mengunci tabel. Enum dan format yang dipakai di beberapa kolom ditulis sekali sebagai `domain`, supaya daftar nilainya hanya punya satu tempat (lihat daftar domain di bawah)                                                                                |
| Boolean            | `boolean` dengan nilai bawaan                                     | Boolean yang boleh kosong memaksa setiap pembaca menangani tiga keadaan, padahal maksudnya dua. Pengecualiannya kolom yang memang punya tiga keadaan, seperti `review_logs.correct` (benar, salah, tidak dinilai). Di kolom seperti itu null lebih aman daripada nilai penanda, karena `false` sebagai penanda diam-diam ikut terhitung salah                                                   |
| Angka pecahan      | `numeric(3,1)` untuk `typo_cost`, `float8` untuk metrik optimizer | `typo_cost` hanya bernilai kelipatan 0,5 dan dipakai di perbandingan ambang, jadi harus eksak. Log loss dan RMSE memang bilangan mengambang                                                                                                                                                                                                                                                     |
| Deretan angka      | `smallint[]` untuk `key_gaps_ms`, `float8[]` untuk `weights`      | Keduanya selalu dibaca utuh bersama barisnya, tidak pernah di-query per elemen. Tabel anak untuk isi array hanya menambah join tanpa manfaat. `key_gaps_ms` memakai `smallint` karena jeda di atas 30.000 ms dipotong ke 30.000; dua byte per nilai cukup                                                                                                                                       |
| Nilai turunan      | Tidak disimpan di tabel event                                     | `card_id` dibentuk klien dari `content_id` dan `mode`. Tidak ada query server yang memerlukannya, jadi kolom generated hanya menambah sekitar 22 byte per jawaban                                                                                                                                                                                                                               |

**Daftar domain.** Domain dibuat di migration pertama dan dipakai semua kolom yang disebut:

| Domain        | Dasar  | Isi                                                                           | Dipakai di                                                                                                     |
| ------------- | ------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `uuid_v7`     | `uuid` | `CHECK` versi 7 dan varian RFC 9562                                           | `id` semua tabel event, `devices.id`, semua `device_id`, `run_id`, `review_id`, `updated_by_device`            |
| `scope_level` | `text` | `national`, `group`, `province`                                               | `user_settings.active_scope_level`, `practice_runs.scope_level`                                                |
| `card_mode`   | `text` | `code2region`, `region2code`, `setrecall`, `special2holder`, `holder2special` | `review_logs.mode`, `card_events.mode`                                                                         |
| `content_ref` | `text` | `^[a-z0-9-]{1,32}$`                                                           | `content_id`, `region_id`, `confused_with`, `drill_pair_with`, `accepted_area_id`, `prompt_area_id`, `fact_id` |

Enum yang hanya dipakai satu kolom, seperti `review_logs.context`, tetap `text` + `CHECK` di tabelnya.

**Urutan kolom tabel event.** Postgres menyisipkan padding supaya kolom 8 byte mulai di kelipatan 8. Karena itu kolom di tabel event, terutama `review_logs`, ditulis di migration dengan urutan: `uuid`, lalu `timestamptz` dan `bigint`, lalu `integer` dan `date`, lalu `smallint`, lalu `boolean`, dan terakhir kolom panjang variabel (`text`, array, `jsonb`). Urutan ini tidak mengubah arti data; ia hanya membuang byte kosong di setiap baris.

**Kode angka untuk enum tidak dipakai.** Mengganti enum teks di `review_logs` dengan `smallint` menghemat sekitar 28 byte lagi per jawaban (6%), tetapi setiap query dan sesi debug harus menerjemahkan angka ke arti. Penghematan itu tidak sebanding.

**Mengubah domain.** Menambah nilai: `alter domain … add constraint … not valid`, lalu `validate constraint` terpisah, lalu hapus constraint lama. Tanpa `not valid`, Postgres langsung memindai semua tabel yang memakai domain itu, termasuk `review_logs`, sambil memegang lock. Mengurangi nilai hanya boleh setelah data lama dinormalisasi (TRD bagian 7).

**Satu sumber daftar nilai.** Daftar nilai setiap enum dan domain juga ditulis sekali di kode klien, di satu modul konstanta bersama. CI membandingkan isi `CHECK` dan domain di database hasil migration dengan konstanta itu, dan gagal jika berbeda (Tests TR-189). Kamus di dokumen ini menjelaskan arti nilai, bukan menjadi daftar ketiga yang harus disinkronkan tangan.

### Mengapa `user_id` jadi bagian kunci utama

Tabel event ber-ID memakai kunci utama gabungan `(user_id, id)`, bukan `id` saja; tabel pengaturan, catatan, persetujuan, dan penghitung memakai kunci alami sesuai kamus di bawah, dan setiap foreign key antartabel pengguna ikut membawa `user_id`. Contohnya, `review_voids (user_id, review_id)` menunjuk `review_logs (user_id, id)`.

Alasan utamanya keamanan, bukan kerapian. **Pemeriksaan foreign key di Postgres tidak melewati Row Level Security.** Tanpa `user_id` di foreign key, pengguna A bisa menyisipkan baris `review_voids` yang menunjuk id jawaban milik pengguna B — asalkan id itu ada. Akibatnya dua:

1. **Kebocoran keberadaan data.** Insert yang berhasil atau gagal memberi tahu apakah id itu ada di akun orang lain.
2. **Penolakan layanan.** Karena satu jawaban hanya boleh dibatalkan sekali, dibatalkan palsu milik A akan memblokir B membatalkan jawabannya sendiri.

Dengan `user_id` di foreign key, baris milik A hanya bisa menunjuk baris milik A. Aturan ini dijaga struktur tabel, jadi tetap berlaku walaupun ada policy yang keliru ditulis.

Alasan keduanya skala. Semua query Terka selalu dibatasi satu pengguna. Kunci yang diawali `user_id` membuat indeks kunci utama sekaligus jadi indeks untuk RLS, dan tidak menghalangi partisi per pengguna jika kelak diperlukan (bagian 10).

UUID versi 7 sudah unik secara global, jadi `(user_id, id)` tidak pernah dibutuhkan untuk mencegah bentrok id. Kolom `user_id` di kunci murni untuk dua alasan di atas.

## 1. Lima prinsip yang membentuk skema ini

1. **Riwayat menjadi acuan; keadaan aplikasi dihitung dari riwayat.** Tidak ada tabel status kartu, interval, nilai penjadwalan, pasangan tertukar, Hari Beruntun, atau rekor. Semua itu dihitung ulang dari log di perangkat (TRD bagian 4.4). Tabel yang tidak ada tidak bisa melenceng dari sumbernya.
2. **Server menyimpan dan menjaga, tidak menghitung.** Tidak ada Edge Function yang menilai jawaban. Database hanya menegakkan kepemilikan, bentuk data, dan batas pemakaian.
3. **Pengguna tanpa akun tidak memiliki satu baris pun.** Skema ini hanya berisi data pengguna yang login. Ribuan pengunjung anonim tidak menambah ukuran database sedikit pun.
4. **Kepemilikan dijaga struktur, bukan hanya policy.** RLS menyaring baris, kunci gabungan menutup celah foreign key, dan grant per kolom mencegah klien mengisi kolom milik server.
5. **Perubahan skema dilakukan bertahap.** Tambahan kolom tetap kompatibel dengan data yang ada. Penghapusan data atau kolom dilakukan setelah normalisasi, cadangan, dan penghentian dukungan klien lama sesuai TRD 7.

## 2. Identitas dan Perangkat

### auth.users

Tabel milik Supabase Auth, bukan milik Terka. Terka tidak membuat tabel pengguna sendiri, karena `auth.users` sudah menyimpan email dan identitas login — Google dan email (magic link) — dan menautkan keduanya jika alamatnya sama (TRD bagian 5.1).

| Kolom                | Keterangan                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | Dirujuk semua tabel Terka dengan `on delete cascade`                                                                                               |
| `email`              | Datang dari Google atau dari login email                                                                                                           |
| `raw_user_meta_data` | Diisi Supabase dari Google, termasuk nama dan foto. Terka tidak membacanya dan tidak menyalinnya ke tabel lain. Kebijakan privasi menyebut hal itu |

Satu-satunya fungsi Terka yang menyentuh tabel ini adalah `delete_user()` (TRD bagian 9).

### devices

Satu baris per instalasi Terka di satu browser.

| Kolom          | Keterangan                                                                                                                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | Dibuat klien saat instalasi pertama, disimpan lokal. Tetap sama walaupun pengguna logout lalu login lagi di browser yang sama                                                                                                                                               |
| `label`        | Maks. 40 karakter, misalnya "iPhone"                                                                                                                                                                                                                                        |
| `platform`     | Dari user agent, maks. 200 karakter, hanya untuk penelusuran masalah. Tidak dipakai untuk logika apa pun                                                                                                                                                                    |
| `last_seen_at` | Diisi **server**. Trigger `before insert or update` selalu menulis `now()`, dan nilai dari klien diabaikan. Satu-satunya kolom yang boleh diubah: klien mengirim update sentuhan paling sering sekali per jam, supaya kolom ini tidak menghasilkan satu tulisan per jawaban |

**Aturan batas perangkat:** jumlah perangkat aktif per akun dibatasi; angka batas dan jendela waktunya ada di TRD bagian 9. Perangkat aktif adalah perangkat dengan `last_seen_at` di dalam jendela itu. Trigger `before insert` di `devices` menghitungnya langsung dari baris milik pengguna itu dan menolak perangkat baru dengan kode kesalahan khusus jika batas sudah tercapai. Update sentuhan pada perangkat yang sudah terdaftar tidak pernah ditolak.

Trigger yang sama juga membaca `service_flags.signups_open` (bagian 6). Jika saklar tertutup dan akun belum punya perangkat sama sekali, perangkat baru ditolak dengan kode kesalahan berbeda.

Tiga keputusan di balik aturan ini:

1. **Jendela waktu, bukan batas seumur akun.** Safari menghapus storage situs yang tidak dibuka selama 7 hari, kecuali PWA yang dipasang di layar utama. Setiap kali itu terjadi, browser yang sama mendapat `devices.id` baru. Dengan batas seumur akun, pengguna iPhone yang memakai Terka lewat browser bisa terkunci dari sinkronisasi dalam beberapa bulan, tanpa jalan keluar.
2. **`last_seen_at` diisi server.** Jika nilainya dari klien, klien yang dimodifikasi bisa mendaftarkan perangkat dengan tanggal lama supaya tidak terhitung aktif. Waktu server tidak bisa dipalsukan.
3. **Baris perangkat tidak pernah dihapus satu per satu.** Log merujuk `device_id`, dan pemecah seri kunci pengurutan memakainya. Perangkat lama cukup berhenti terhitung aktif.

Menghitung langsung dari `devices` tetap murah: satu pengguna hanya punya puluhan baris, dan indeks kunci utama `(user_id, id)` sudah membatasinya. Karena itu `usage_totals` tidak lagi menyimpan jumlah perangkat.

### user_settings

Satu baris per pengguna. Pengaturan yang disinkronkan adalah Cakupan aktif dan status Latihan Kode Khusus.

| Kolom                             | Keterangan                                                                                                                                                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `active_scope_level`              | `national`, `group`, `province`                                                                                                                                                                                         |
| `active_scope_id`                 | Kosong jika `national`, wajib terisi untuk dua tingkat lainnya. Dijaga `CHECK ((active_scope_level = 'national') = (active_scope_id IS NULL))`                                                                          |
| `special_enabled`                 | Boolean, bawaan `false`                                                                                                                                                                                                 |
| `updated_at`, `updated_by_device` | Dasar last-write-wins. Trigger `before update` mempertahankan baris lama jika perubahan yang masuk lebih tua (TRD bagian 5.2). `(user_id, updated_by_device)` merujuk `devices` dengan `on delete no action` (bagian 8) |

Target retensi sengaja tidak ada di sini. Nilainya tetap 0,90 dan terikat ke target durasi sesi (SRD bagian 4.3).

## 3. Persetujuan Privasi dan Katalog Zona Waktu

### privacy_policy_versions

Daftar versi kebijakan privasi yang pernah terbit. Diisi pemilik proyek lewat migration, bukan oleh klien.

| Kolom                | Keterangan                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `version`            | Misalnya `2026-10-01`. Kunci utama, karena versinya sendiri sudah unik dan stabil                                              |
| `requires_reconsent` | `true` untuk perubahan material. Versi yang hanya memperbaiki salah ketik bernilai `false` dan tidak meminta persetujuan ulang |
| `summary_url`        | Tautan ke halaman kebijakan versi itu di `terka.my.id`                                                                         |

**Versi yang wajib disetujui** adalah baris terbaru menurut `published_at` yang `requires_reconsent`-nya `true`. Semua pengguna yang login bisa membaca tabel ini; tidak ada yang bisa mengubahnya dari klien.

### privacy_consents

Riwayat persetujuan, satu baris per pengguna per versi. Insert-only.

| Kolom            | Keterangan                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `policy_version` | Foreign key ke `privacy_policy_versions` dengan `on delete restrict`. Versi yang pernah disetujui tidak boleh hilang |
| `consented_at`   | Waktu klien saat pengguna menekan **Setuju dan lanjutkan**                                                           |
| `received_at`    | Waktu server. Dipakai sebagai bukti jika `consented_at` diragukan                                                    |

**Mengapa tabel sendiri, bukan kolom di `user_settings`.** Menyimpan persetujuan sebagai dua kolom yang ditimpa setiap versi baru cukup untuk tahu status sekarang, tetapi menghapus bukti kapan versi lama disetujui. Untuk data pribadi orang lain, riwayat persetujuan adalah catatan yang layak dipertahankan, dan tabel insert-only memberikannya tanpa biaya berarti.

Policy insert di tabel log memeriksa persetujuan lewat fungsi `has_current_consent()` (bagian 9).

### timezones

Katalog nama zona IANA yang diterima di `review_logs.tz`. Diisi migration dari `pg_timezone_names`, tidak bisa diubah klien.

| Kolom  | Keterangan                            |
| ------ | ------------------------------------- |
| `name` | Kunci utama, misalnya `Asia/Makassar` |

**Mengapa tabel katalog, bukan trigger yang membaca `pg_timezone_names`.** View `pg_timezone_names` membaca berkas zona waktu dari disk setiap kali di-query. Jika dipanggil trigger per baris, satu batch 200 jawaban memindai daftar zona 200 kali. Foreign key ke tabel kecil yang ada di memori hanya butuh satu lookup indeks per baris.

**Pemeliharaan.** Setiap upgrade versi Postgres disertai migration yang menambahkan nama zona baru dari `pg_timezone_names`. Baris lama tidak pernah dihapus, karena zona yang sudah tidak dipakai tetap dirujuk riwayat. Tidak ada grant untuk klien; pemeriksaan foreign key berjalan dengan hak pemilik tabel.

## 4. Log Latihan

Semua tabel di bagian ini insert-only, kecuali kolom penutup `practice_runs`. Semuanya memiliki `received_at` dan `server_seq` yang diisi server, dan semuanya ditarik klien dengan cursor `server_seq` (TRD bagian 5.3).

### practice_runs

Satu baris per sesi atau putaran latihan.

| Kolom                                                                      | Keterangan                                                                                           |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `kind`                                                                     | `daily`, `focused`, `challenge`, `kilat`, `placement`, `setrecall`, `special`                        |
| `scope_level`                                                              | `national`, `group`, `province`                                                                      |
| `planned_count`, `estimated_ms`                                            | Dari pratinjau sesi (SRD bagian 4.14). Diisi saat sesi dibuat                                        |
| `ended_at`, `answered`, `correct`, `score`, `placement_level`, `active_ms` | Kolom penutup. Diisi sekali saat sesi selesai                                                        |
| `score`                                                                    | Hanya untuk `kilat`. Null saat terbuka; saat selesai terisi jika dan hanya jika `kind = 'kilat'`     |
| `placement_level`                                                          | Hanya untuk `placement`: `pemula`, `menengah`, `mahir`, `ahli`                                       |
| `server_seq`                                                               | Sequence biasa, bukan identity. Trigger mengganti nilainya dengan `nextval()` baru saat sesi ditutup |

**Aturan penutupan:** trigger `before update` hanya mengizinkan pengisian atomik `ended_at`, `answered`, `correct`, `score`, `placement_level`, dan `active_ms` saat `ended_at` masih kosong. Retry payload yang identik direkonsiliasi sebagai sukses oleh klien tanpa mengubah baris. Sesi baru wajib dimasukkan terbuka. Saat ditutup, ended_at, answered, correct, dan active_ms wajib terisi; score wajib untuk kilat dan null di jenis lain; placement_level wajib untuk placement dan null di jenis lain. Ended_at ≥ started_at dan 0 ≤ correct ≤ answered. Setelah `ended_at` terisi, baris tidak dapat diubah. Sesi yang tidak pernah ditutup tetap kosong dan diabaikan untuk rekor, Hari Beruntun, dan tes penempatan.

**Mengapa `server_seq` diganti saat sesi ditutup.** Penutupan sesi adalah update, dan update tidak membuat baris baru. Jika `server_seq` tetap, perangkat lain yang cursor-nya sudah melewati sesi itu tidak pernah melihat penutupannya, sehingga `practice_runs` harus ditarik utuh setiap pull. Pengguna dengan 2.000 sesi akan menarik ratusan KB setiap 5 menit, padahal egress paket Free terbatas. Dengan nomor baru saat ditutup, penutupan ikut terambil pull berbasis cursor seperti event lain, dan klien menerapkannya sebagai upsert pada `(user_id, id)`. Kolom ini memakai sequence biasa (`default nextval(...)`), karena kolom identity `generated always` tidak dirancang untuk diganti nilainya setelah insert. Trigger boleh mengisinya walaupun klien tidak punya grant pada kolom itu.

### review_logs

Satu baris per jawaban. Tabel terbesar dan terpenting di sistem.

| Kolom                                       | Keterangan                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `content_id`                                | Domain `content_ref`. Berisi `regions[].id` untuk tiga mode wilayah atau `specials[].id` untuk dua mode kode khusus. `CHECK` memvalidasi pasangan jenis id dan mode (bagian 7)                                                                                                                                     |
| `mode`                                      | Domain `card_mode`: `code2region`, `region2code`, `setrecall`, `special2holder`, `holder2special`                                                                                                                                                                                                                  |
| `run_id`                                    | Boleh kosong. FK `(user_id, run_id) → practice_runs (user_id, id)` dengan `on delete set null (run_id)` (bagian 8)                                                                                                                                                                                                 |
| `context`                                   | `intro`, `daily`, `drill`, `focused`, `challenge`, `kilat`, `placement`, `setrecall`, `special`                                                                                                                                                                                                                    |
| `level`                                     | `CHECK (level BETWEEN 1 AND 3)`                                                                                                                                                                                                                                                                                    |
| `level_source`                              | `auto`, `manual_up`, `manual_down`                                                                                                                                                                                                                                                                                 |
| `correct`                                   | Boleh kosong. Null berarti jawaban tidak dinilai: `match_type = 'unverified'` atau `question_type = 'intro_read'`. Dijaga `CHECK ((correct IS NULL) = (match_type = 'unverified' OR question_type = 'intro_read'))`                                                                                                |
| `match_type`                                | `exact`, `variant`, `typo`, `unverified`, `none`                                                                                                                                                                                                                                                                   |
| `typo_cost`                                 | `CHECK (typo_cost >= 0 AND typo_cost <= 3 AND (match_type = 'typo') = (typo_cost > 0))`                                                                                                                                                                                                                            |
| `raw_answer`                                | Jawaban tunggal persis seperti diketik, maks. 120 karakter; null pada jawaban himpunan. Kontrak null mengikuti TRD 4.2                                                                                                                                                                                             |
| `key_gaps_ms`                               | `smallint[]`. `CHECK (cardinality(key_gaps_ms) <= 120)`, dan tiap nilai antara 0 dan 30.000                                                                                                                                                                                                                        |
| `ms_to_first_key`, `ms_total`, `ms_typing`  | Semua ≥ 0. `ms_total` dibatasi 1 jam; nilai di atasnya pasti rusak                                                                                                                                                                                                                                                 |
| `input_mode`                                | `keyboard`, `touch`                                                                                                                                                                                                                                                                                                |
| `set_correct`, `set_threshold`, `set_items` | Terisi bersamaan hanya untuk `mode = 'setrecall' AND context <> 'intro'`; `set_items` array tuple `[raw_answer, accepted_area_id, match_type, typo_cost, confused_with]` maksimal 64 butir sesuai TRD 4.2, divalidasi fungsi `valid_set_items(jsonb)` di `CHECK`, dan `CHECK (pg_column_size(set_items) <= 32768)` |
| `question_type`                             | `intro_read`, `choice`, `truefalse`, `oddoneout`, `typed`, `setrecall`                                                                                                                                                                                                                                             |
| `local_day`                                 | Dihitung klien saat menjawab. `CHECK (local_day <= (received_at AT TIME ZONE 'UTC')::date + 1)`: tidak boleh lebih dari sehari di depan tanggal server                                                                                                                                                             |
| `tz`                                        | Nama zona IANA. Foreign key ke `timezones (name)` (bagian 3), bukan trigger yang membaca `pg_timezone_names` per baris                                                                                                                                                                                             |
| `content_version`, `engine_version`         | `smallint`: `contentRev` dari `plates.json` dan `ENGINE_VERSION` saat menjawab (TRD 4.1 dan 4.4)                                                                                                                                                                                                                   |

**Mengapa tidak ada batas bawah untuk `local_day`.** Jawaban yang dikerjakan offline seminggu wajar datang dengan `local_day` seminggu lalu. Batas atas cukup untuk menangkap jam perangkat yang sangat maju; sisanya ditangani `effective_ts` di replay (TRD bagian 4.4).

**Mengapa `correct` boleh kosong.** Jawaban `unverified` dan soal informasi `intro_read` tidak dinilai. Jika keduanya disimpan sebagai `false`, setiap query statistik — termasuk yang ditulis setahun lagi — harus ingat mengecualikannya, dan yang lupa akan diam-diam menghitungnya sebagai salah. Dengan null, `count(*) filter (where not correct)` otomatis tidak menghitungnya, dan `CHECK` di atas menolak kombinasi yang tidak konsisten. Aturan yang sama berlaku untuk `correct` di tiap objek `set_items`.

**Mengapa `set_items` berbentuk tuple.** Objek berkunci menyimpan nama kunci seperti `"raw_answer"` dan `"accepted_area_id"` di setiap butir. Pada soal himpunan dengan sepuluh butir, nama kunci saja memakan lebih dari separuh ukuran kolom. Tuple memangkas ukuran `set_items` rata-rata dari sekitar 1.590 byte menjadi 680 byte per soal. `correct` per butir juga tidak disimpan, karena sepenuhnya ditentukan `match_type`.

**Data yang dihitung dari riwayat:** nilai penjadwalan, `stability`, `difficulty`, `interval`, dan `due`. Nilai tersebut tidak menjadi kolom sumber di tabel ini.

### review_voids

Pembatalan jawaban terakhir (SRD bagian 4.10). Barisnya membatalkan satu `review_logs` tanpa menghapusnya.

**Aturan:** tidak boleh ada dua baris dengan `(user_id, review_id)` yang sama. Foreign key `(user_id, review_id) → review_logs (user_id, id)` dengan `on delete cascade`.

### card_events

Tindakan manual pada kartu.

| Kolom        | Keterangan                                          |
| ------------ | --------------------------------------------------- |
| `content_id` | Domain `content_ref`, sama seperti di `review_logs` |
| `mode`       | Domain `card_mode`                                  |
| `kind`       | `suspend`, `unsuspend`                              |

Bentuk identitas kartu sama persis dengan `review_logs`, jadi aturan pasangan jenis id dan mode cukup ditulis sekali (bagian 7).

Status yang muncul otomatis — leech, suspended karena `lapses` 8, karena `confidence` turun, atau karena `id` hilang dari data — tidak disimpan di sini. Semuanya bisa diturunkan dari log dan konten.

### sightings

Catatan kode wilayah yang dicari di Referensi (PRD 6.10). Bukan jawaban dan tidak terhubung ke `review_logs`.

| Kolom                    | Keterangan                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `region_id`              | ID kode depan, rujukan lunak ke konten. Domain `content_ref`. Satu-satunya tabel pengguna yang tetap memakai nama `region_id`, karena isinya memang hanya `regions[].id` |
| `client_ts`, `local_day` | Waktu dan hari pencarian yang lolos deduplikasi                                                                                                                          |

Tidak ada `review_id` atau indeks pasangan jawaban. Deduplikasi pencarian dilakukan lokal per perangkat menurut SRD 4.11; idempotensi push tetap memakai `(user_id, id)`. Bila skema lama sudah terpasang, transisi aditif mengikuti TRD 4.2.

### fact_views

Riwayat tampil fakta, untuk rotasi (SRD bagian 4.15).

| Kolom                    | Keterangan                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `fact_id`                | `id` fakta di `plates.json`, rujukan lunak ke konten. Hanya fakta `ready` yang dicatat                                            |
| `run_id`                 | Sesi yang layar akhirnya menampilkan fakta. Boleh kosong. FK `(user_id, run_id)` memakai `on delete set null (run_id)` (bagian 8) |
| `client_ts`, `local_day` | Waktu dan hari fakta tampil                                                                                                       |

Satu baris per layar akhir yang benar-benar menampilkan fakta siap terbit. Tanpa kandidat siap terbit tidak ada baris baru. Riwayat disimpan selamanya.

## 5. Data Pribadi Lain

### card_notes

Catatan pengingat per kode (SRD bagian 6.4).

| Kolom        | Keterangan                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `content_id` | Domain `content_ref`. Bagian kunci utama bersama `user_id`. Satu catatan pengingat per kode wilayah atau kode khusus |
| `body`       | `CHECK (char_length(body) <= 280)`. String kosong berarti catatan pengingat dihapus                                  |

**Menghapus catatan pengingat tidak menghapus baris.** Jika baris dihapus, perangkat lain yang belum tahu soal penghapusan bisa mengirim ulang versi lamanya dan catatan pengingat muncul lagi. Isi kosong berlaku sebagai tanda hapus yang ikut aturan last-write-wins.

### fsrs_params

Riwayat parameter FSRS hasil optimasi (SRD bagian 4.12). Insert-only.

| Kolom                  | Keterangan                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `algorithm`            | `fsrs-6`                                                                                                                                                                               |
| `weights`              | `CHECK (cardinality(weights) = 21)`                                                                                                                                                    |
| `status`               | `active`, `rejected`                                                                                                                                                                   |
| `activated_at`         | `CHECK ((status = 'active') = (activated_at IS NOT NULL))`                                                                                                                             |
| `training_set_hash`    | SHA-256 atas ID jawaban terhitung yang dipakai, diurut leksikografis lalu digabung sebagai 16 byte per ID. `CHECK (octet_length(training_set_hash) = 32)`. Identitas dataset pelatihan |
| `trained_review_count` | Jumlah ID di dataset. `CHECK (trained_review_count > 0)`                                                                                                                               |
| `trained_through_seq`  | Nullable; metadata server opsional. Null jika ada jawaban data latih tanpa sequence                                                                                                    |
| `created_at`           | Waktu hasil dibuat; dasar kunci pengurutan parameter                                                                                                                                   |

**Mengapa hash, bukan daftar ID.** Daftar ID data latih tumbuh bersama riwayat. Pengguna rajin setelah tiga tahun punya sekitar 27.000 jawaban terhitung, jadi satu baris parameter berisi daftar lengkap bisa mencapai sekitar 430 KB. Kuota pemakaian menghitung baris, bukan byte, sehingga kolom seperti itu jadi celah: satu baris `fsrs_params` tetap dihitung satu. Hash berukuran tetap 32 byte dan cukup untuk memastikan dua perangkat memakai dataset yang sama.

Daftar ID lengkap (`training_event_ids`) tetap ada, tetapi hanya di salinan lokal perangkat yang menjalankan optimasi, dan ikut ekspor (TRD bagian 4.3). Replay tidak membutuhkan daftar ID.

Tidak ada kolom "parameter aktif" yang bisa diubah. Parameter yang berlaku untuk satu jawaban adalah baris `active` dengan `activated_at` terbaru yang tidak lebih lambat dari waktu jawaban itu. Jika waktu aktivasi sama, device_id lalu id menjadi pemecah seri; waktu aktivasi efektif tidak boleh melewati received_at untuk baris yang sudah tersinkron (TRD 4.4). Rollback menyisipkan baris `active` baru yang menyalin bobot lama.

## 6. Pengaman Pemakaian

Terka terbuka untuk publik, dan RLS tidak mencegah satu akun mengirim data sebanyak-banyaknya. Dua tabel penghitung di bawah membatasi jumlah baris, dan batas ukuran per baris memastikan jumlah baris memang mencerminkan ukuran data. Batas perangkat tidak memakai penghitung; aturannya ada di bagian 2.

### usage_daily

Satu baris per pengguna per tabel per hari server.

| Kolom          | Keterangan                                                                   |
| -------------- | ---------------------------------------------------------------------------- |
| `received_day` | Tanggal server dalam UTC saat baris diterima. **Bukan** `local_day`          |
| `table_name`   | `review_logs`, `sightings`, `fact_views`, dan tabel insert-only lainnya      |
| `row_count`    | Dinaikkan trigger `after insert` tingkat statement di tiap tabel yang diukur |

**Mengapa hari server, bukan `local_day`.** `local_day` datang dari klien. Jika batas dihitung per `local_day`, penyalahguna cukup menyebar kiriman ke tanggal-tanggal lama untuk melewati batas. Tanggal server tidak bisa dipalsukan. Pengguna wajar yang baru sinkron setelah seminggu offline paling banyak mengirim ratusan jawaban dalam satu hari server — jauh di bawah batas harian di TRD bagian 9.

**Mengapa tabel penghitung, bukan `count(*)`.** Menghitung ulang baris hari ini di setiap insert semakin lambat seiring baris bertambah. Penghitung dinaikkan dengan `insert … on conflict do update set row_count = row_count + excluded.row_count returning row_count`, satu operasi atomik yang tetap benar walaupun dua perangkat mengirim bersamaan.

**Mengapa trigger tingkat statement.** Trigger per baris membuat satu batch 200 jawaban menjalankan 200 upsert ke baris penghitung yang sama, dan setiap upsert mengunci baris itu. Trigger tingkat statement dengan transition table menaikkan penghitung sekali per batch:

```sql
create trigger review_logs_usage
after insert on review_logs
referencing new table as inserted
for each statement execute function bump_usage('review_logs');
```

Fungsi `bump_usage` mengelompokkan `inserted` per `user_id`, lalu menjalankan satu upsert ke `usage_daily` dan satu ke `usage_totals` per pengguna. Baris yang dilewati `on conflict do nothing` tidak masuk transition table, jadi kiriman ulang tidak ikut terhitung.

Jika batas harian terlampaui, trigger memunculkan kesalahan dengan kode khusus. Seluruh statement batal, dan klien membiarkan event itu di antrean kirim sampai hari server berganti (TRD bagian 8). Tidak ada data yang dibuang.

Baris yang lebih tua dari 30 hari dihapus job terjadwal.

### usage_totals

Satu baris per pengguna.

| Kolom       | Keterangan                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `row_count` | Jumlah baris gabungan `practice_runs`, `review_logs`, `review_voids`, `card_events`, `sightings`, `fact_views`, `fsrs_params`; dibandingkan dengan batas total di TRD bagian 9 dan tidak direset harian |

### service_flags

Satu baris untuk seluruh layanan. Dipakai pemilik proyek untuk menahan pertumbuhan database tanpa rilis aplikasi baru (TRD bagian 9).

| Kolom          | Keterangan                                                               |
| -------------- | ------------------------------------------------------------------------ |
| `id`           | `smallint`, kunci utama, `CHECK (id = 1)` supaya hanya ada satu baris    |
| `signups_open` | `boolean`, nilai bawaan `true`. `false` menolak perangkat dari akun baru |
| `updated_at`   | `timestamptz`                                                            |

Tidak ada grant untuk role `anon` maupun `authenticated`. Trigger `devices` membacanya lewat fungsi `security definer` dengan `set search_path = ''`.

### Ukuran per baris

Batas jumlah baris hanya bermakna jika ukuran setiap baris juga terbatas. Tidak ada kolom yang panjangnya mengikuti umur akun:

| Tabel         | Kolom yang bisa panjang | Batas                                                            |
| ------------- | ----------------------- | ---------------------------------------------------------------- |
| `review_logs` | `raw_answer`            | 120 karakter                                                     |
| `review_logs` | `key_gaps_ms`           | 120 nilai `smallint`, tiap nilai maksimal 30.000                 |
| `review_logs` | `set_items`             | 64 tuple, teks tiap butir 120 karakter, `pg_column_size` ≤ 32 KB |
| `fsrs_params` | `weights`               | Tepat 21 nilai                                                   |
| `fsrs_params` | `training_set_hash`     | Tepat 32 byte                                                    |
| `card_notes`  | `body`                  | 280 karakter                                                     |
| `devices`     | `label`, `platform`     | 40 dan 200 karakter                                              |

Angka 32 KB untuk `set_items` titik awal. Angka akhirnya ditetapkan dari payload sah terbesar di data uji ditambah ruang, lalu dikunci di tes (Tests TR-184).

## 7. Konten Bawaan — plates.json

Entitas berawalan `content_` menggambarkan isi `plates.json`. Semuanya dikunci saat build, di-precache service worker, dan **tidak ada di database** (TRD bagian 2).

| Entitas                    | Isi                                                                                                                                 | Sumber di `plates.json` |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `content_regions`          | Kode depan, sekitar 60                                                                                                              | `regions[]`             |
| `content_areas`            | Kabupaten dan kota, sekitar 500                                                                                                     | `areas[]`               |
| `content_region_areas`     | Kab/kota mana memakai kode mana, banyak-ke-banyak                                                                                   | `regions[].areas[]`     |
| `content_facts`            | Kandidat fakta, `history_label`, `publication_status`, sumber, dan tanggal pemeriksaan; hanya `ready` yang dipilih                  | `facts[]`               |
| `content_region_facts`     | Fakta mana terkait kode mana                                                                                                        | `regions[].facts[]`     |
| `content_specials`         | Kode negara CD: nomor, pemegang, alias, label, `needs_review`, dan tanggal pemeriksaan ulang; satu-satunya sumber kartu kode khusus | `specials[]`            |
| `content_reference_plates` | Entri format pelat RI, CC, dan CH untuk Referensi, beserta keterangannya; tanpa alias dan tidak pernah membentuk kartu              | `referencePlates[]`     |
| `content_sources`          | Sumber data kode khusus beserta lokasi di dokumen dan tanggal pemeriksaan                                                           | `sources[]`             |
| `content_special_sources`  | Sumber mana mendukung entri khusus mana                                                                                             | `specials[].sources[]`  |

**Mengapa relasi kode ↔ kab/kota banyak-ke-banyak.** Satu kode memiliki banyak kab/kota, dan satu kab/kota bisa dipakai lebih dari satu kode — sebagian Kabupaten Tangerang memakai A, sebagian B. Model satu-ke-banyak akan memaksa memilih salah satu, dan jawaban benar lainnya jadi ditolak.

**Mengapa `confidence` ada di relasi, bukan di kab/kota.** Yang bisa diragukan bukan keberadaan Binjai, tetapi apakah Binjai memakai BK. Keraguan itu milik pasangan kode dan kab/kota, jadi letaknya di tabel relasi.

**Rujukan lunak dari tabel database.** Kolom seperti `review_logs.content_id`, `accepted_area_id`, `sightings.region_id`, `card_notes.content_id`, `card_events.content_id`, dan `fact_views.fact_id` menunjuk konten lewat id teks, tanpa foreign key. Alasannya: konten berganti versi, sedangkan log harus tetap valid untuk selamanya. Jawaban DK dari 2026 tetap harus tersimpan walaupun satu versi `plates.json` menghapus DK. Jika pakai foreign key, pembaruan konten akan menghapus atau menolak riwayat. Validasinya dibagi dua:

- Database hanya memeriksa **format** id lewat domain `content_ref` (`^[a-z0-9-]{1,32}$`).
- Replay memeriksa **keberadaan** id di konten terpasang, dan menjalankan prosedur pembaruan data jika id hilang (TRD bagian 4.1).

`id` konten yang pernah dipakai tidak boleh dipakai ulang untuk wilayah lain. Aturan ini dicek saat build terhadap daftar id yang tidak digunakan lagi di repositori, karena rujukan lunak tidak bisa menjaganya sendiri.

`content_facts.history_label` bernilai `terverifikasi`, `diperdebatkan`, atau `legenda`, dipetakan dari `historyLabel`. Nama ini menggantikan `status`, yang terlalu umum dan mudah tertukar dengan `publication_status`. `content_facts.publication_status` bernilai `draft` atau `ready`, dipetakan dari `publicationStatus`; `source_checked_at` dipetakan dari `sourceCheckedAt`. Build menolak ready bila `source` kosong atau tanggal pemeriksaan tidak ada. Kumpulan ready kosong sah; aplikasi menyembunyikan blok fakta. Tidak ada perubahan label sejarah otomatis karena status publikasi berubah.

**Identitas kartu.** Klien mengirim `content_id` dan `mode`, dan membentuk `card_id` (`content_id::mode`) di sisi klien. Database tidak menyimpan `card_id`. Domain `card_mode` membatasi mode ke lima nilai. `blindrecall` dilebur ke `code2region`; bentuk berwaktunya kini soal Level 3 biasa. Satu `CHECK` menjaga pasangan jenis id dan mode:

```sql
check ((mode in ('special2holder', 'holder2special'))
       = (content_id ~ '^cd-[0-9]{1,3}-[a-z0-9-]+$'))
```

Mode kode khusus hanya sah dengan id `cd-`, dan tiga mode wilayah tidak boleh memakai awalan itu. Karena itu `regions[].id` tidak boleh diawali `cd-` diikuti angka, dan build memeriksanya. `review_logs` dan `card_events` memakai kolom dan `CHECK` yang sama.

**`content_id` menampung dua jenis konten.** Isinya `regions[].id` untuk kartu wilayah atau `specials[].id` untuk kartu kode khusus. Hal yang sama berlaku untuk `card_notes.content_id` dan `review_logs.confused_with`. Nama sebelumnya, `region_id`, diganti sebelum rilis publik, karena nama itu menyesatkan begitu kolomnya juga berisi kode khusus. `sightings.region_id` tetap memakai nama lama, karena pencarian kode khusus tidak dicatat dan isinya memang hanya kode wilayah.

Skema ini adalah rancangan akhir dan dibuat langsung oleh migration pertama. Perubahan sesudah rilis mengikuti TRD 7.

## 8. Aturan Integritas yang Ditegakkan di Database

Hal-hal berikut tidak cukup dijaga di kode klien. Klien berjalan di perangkat pengguna dan bisa dimodifikasi, dan beberapa perangkat bisa menulis bersamaan.

| Aturan                                                      | Cara                                                                                                                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baris satu pengguna tidak bisa menunjuk baris pengguna lain | Foreign key gabungan yang membawa `user_id` di semua relasi antartabel pengguna                                                                                             |
| Satu jawaban dibatalkan paling banyak sekali                | Unik `review_voids (user_id, review_id)`                                                                                                                                    |
| Kiriman ulang tidak menggandakan data                       | Konflik memakai kunci tabel: `(user_id, id)` untuk event, `(user_id, policy_version)` untuk persetujuan (TRD 5.2)                                                           |
| Riwayat tidak bisa diubah klien                             | Tabel insert-only tidak memiliki policy `update` maupun `delete`, dan tidak memiliki grant `update`                                                                         |
| Kolom milik server tidak bisa diisi klien                   | Grant `insert` per kolom yang tidak menyertakan `received_at`, `server_seq`, dan `devices.last_seen_at`                                                                     |
| Sesi tidak dapat diubah setelah ditutup                     | Trigger `before update` di `practice_runs`                                                                                                                                  |
| Perubahan lama tidak menimpa yang baru                      | Trigger last-write-wins di `user_settings` dan `card_notes`                                                                                                                 |
| Mode cocok dengan jenis konten                              | `CHECK` pasangan `mode` dan awalan `cd-` di `review_logs` dan `card_events` (bagian 7)                                                                                      |
| Nilai enum tidak sembarangan                                | `domain` untuk enum yang dipakai beberapa kolom, `CHECK` untuk sisanya; daftar nilainya dibandingkan dengan konstanta klien di CI                                           |
| Jawaban yang tidak dinilai tidak terhitung salah            | `review_logs.correct` null untuk `unverified` dan `intro_read`, dijaga `CHECK`                                                                                              |
| Nama zona waktu valid                                       | Foreign key `review_logs.tz → timezones (name)`                                                                                                                             |
| Angka waktu tidak negatif                                   | `CHECK (... >= 0)` di semua kolom `_ms`                                                                                                                                     |
| Catatan pencarian hanya berisi kode depan                   | Skema `sightings` tidak memiliki kolom teks pelat; payload dengan kolom di luar skema ditolak                                                                               |
| Ukuran baris dibatasi                                       | `CHECK` panjang teks, kardinalitas array, `valid_set_items`, dan `pg_column_size` untuk `set_items` (bagian 6)                                                              |
| Parameter FSRS utuh                                         | `CHECK (cardinality(weights) = 21)`, `octet_length(training_set_hash) = 32`, dan pasangan `status`–`activated_at`                                                           |
| Batas pemakaian per akun                                    | Trigger `after insert` tingkat statement yang menaikkan `usage_daily` dan `usage_totals`                                                                                    |
| Batas perangkat aktif                                       | Trigger `before insert` di `devices` yang menghitung perangkat aktif menurut jendela di TRD bagian 9; `last_seen_at` selalu diisi server                                    |
| Pendaftaran bisa ditutup untuk akun baru                    | Trigger `before insert` di `devices` membaca `service_flags.signups_open`; akun yang sudah punya perangkat tidak terpengaruh                                                |
| Tidak ada log latihan baru tanpa persetujuan terbaru        | Policy insert log, sesi, dan parameter memanggil `has_current_consent()`; insert persetujuan sendiri dikecualikan                                                           |
| Versi kebijakan yang pernah disetujui tidak hilang          | `privacy_consents.policy_version` memakai `on delete restrict`                                                                                                              |
| Hapus akun menghapus semuanya                               | Semua `user_id` merujuk `auth.users (id)` dengan `on delete cascade`, dan tidak ada foreign key di dalam data pengguna yang bisa menghentikan cascade (tabel aksi di bawah) |
| Setiap foreign key memiliki indeks                          | Postgres tidak membuatnya otomatis. Karena hampir semua foreign key diawali `user_id`, indeks kunci utama gabungan sudah menutup sebagian besar kebutuhan                   |
| Perilaku penghapusan ditulis eksplisit                      | Tiap foreign key menyatakan `on delete` sesuai tabel aksi di bawah                                                                                                          |

### Aksi `on delete` per foreign key

| Foreign key                                                                         | `on delete`         | Alasan                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `user_id → auth.users (id)` di semua tabel pengguna                                 | `cascade`           | Hapus akun menghapus seluruh data                                                                                                                                                                                                                                                                                                                                                    |
| `(user_id, run_id) → practice_runs (user_id, id)` di `review_logs` dan `fact_views` | `set null (run_id)` | Jawaban dan tampilan fakta tetap sah tanpa sesi. **Daftar kolom wajib ditulis.** `set null` tanpa daftar mengosongkan semua kolom foreign key, termasuk `user_id` yang `NOT NULL`. Saat hapus akun, cascade bisa menghapus `practice_runs` lebih dulu, lalu set null ke `user_id` ditolak dan seluruh penghapusan akun batal. Sintaks daftar kolom butuh Postgres 15 atau lebih baru |
| `(user_id, review_id) → review_logs (user_id, id)` di `review_voids`                | `cascade`           | Pembatalan tidak berarti tanpa jawabannya                                                                                                                                                                                                                                                                                                                                            |
| `(user_id, device_id)` dan `(user_id, updated_by_device) → devices (user_id, id)`   | `no action`         | Perangkat tidak pernah dihapus satu per satu. `no action` diperiksa di akhir statement, jadi cascade hapus akun yang menghapus perangkat dan log dalam statement yang sama tetap lolos                                                                                                                                                                                               |
| `review_logs.tz → timezones (name)`                                                 | `no action`         | Katalog global. Baris zona tidak pernah dihapus                                                                                                                                                                                                                                                                                                                                      |
| `privacy_consents.policy_version → privacy_policy_versions (version)`               | `restrict`          | Katalog global di luar data pengguna. Versi yang pernah disetujui tidak boleh hilang                                                                                                                                                                                                                                                                                                 |

**Aturan umum:** di dalam data satu pengguna tidak ada `restrict`. `restrict` diperiksa langsung per baris, sehingga hasil cascade bergantung pada urutan penghapusan yang tidak dijamin Postgres. `restrict` hanya dipakai untuk foreign key yang menunjuk katalog global, yang memang tidak ikut terhapus saat hapus akun. Tes hapus akun memakai akun yang mengisi semua tabel sekaligus (Tests TR-180).

## 9. Keamanan Baris dan Hak Akses

**Satu bentuk policy untuk semua tabel pengguna:** `user_id = (select auth.uid())`. Bentuk `select` di dalam kurung membuat Postgres menghitung `auth.uid()` sekali per statement, bukan sekali per baris.

**Policy insert di tabel log latihan, `practice_runs`, dan `fsrs_params`** menambah satu syarat: `(select has_current_consent())`. Fungsi ini `stable` dan `security definer` dengan `set search_path = ''`. Ia memeriksa apakah ada baris `privacy_consents` milik pengguna untuk versi yang wajib disetujui. Karena dibungkus `select`, fungsi dijalankan sekali per statement — satu batch 200 baris tetap satu pemeriksaan. `privacy_consents` hanya memerlukan pemilik yang sesuai dan versi kebijakan yang valid; tidak boleh mensyaratkan persetujuan yang justru sedang dibuat.

| Kelompok tabel                                                                                                          | Grant ke `authenticated`                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Insert-only: `review_logs`, `review_voids`, `card_events`, `sightings`, `fact_views`, `fsrs_params`, `privacy_consents` | `select`; `insert` per kolom, tanpa `received_at`, `server_seq`, dan kolom generated `card_id`                                 |
| `practice_runs`                                                                                                         | `select`; `insert` per kolom; `update` hanya kolom penutup                                                                     |
| `devices`                                                                                                               | `select`; `insert` per kolom tanpa `last_seen_at`; `update` hanya `last_seen_at`, yang nilainya ditimpa trigger dengan `now()` |
| `user_settings`, `card_notes`                                                                                           | `select`, `insert`, `update` per kolom, tanpa `received_at`                                                                    |
| `privacy_policy_versions`                                                                                               | `select` saja                                                                                                                  |
| `timezones`                                                                                                             | Tidak ada. Foreign key diperiksa dengan hak pemilik tabel                                                                      |
| `usage_daily`, `usage_totals`                                                                                           | Tidak ada. Hanya trigger `security definer` tingkat statement yang menulis ke sini                                             |

Role `anon` tidak diberi grant apa pun di tabel mana pun. Supabase sedang berpindah ke default baru yang tidak otomatis membuka tabel baru lewat Data API, jadi setiap migration yang membuat tabel wajib menyertakan grant-nya sendiri (TRD bagian 9).

## 10. Pertumbuhan Data dan Indeks

Satu tabel tumbuh jauh lebih cepat dari yang lain, mengikuti jumlah jawaban:

| Tabel                                    | Perkiraan                                                                                                              | Indeks yang menahan beban                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `review_logs`                            | Terukur sekitar 435 byte per jawaban termasuk indeks, dengan 5% jawaban himpunan; pengguna rajin 9.000 baris per tahun | `(user_id, id)` sebagai kunci utama; `(user_id, server_seq)` untuk pull dan overlap |
| `practice_runs`, tabel event ber-ID lain | Jauh lebih kecil                                                                                                       | `(user_id, server_seq)`; persetujuan memakai kunci alaminya dan pull utuh           |
| `fsrs_params`                            | Beberapa baris per pengguna per tahun, masing-masing di bawah 1 KB                                                     | `(user_id, activated_at desc)` untuk baris `active`                                 |

**Tidak ada indeks `(user_id, received_at)`.** Overlap pull untuk transaksi yang commit tidak berurutan memakai riwayat cursor `server_seq` di klien (TRD bagian 5.3), bukan query berdasarkan `received_at`. Hasilnya setara, dan tabel terbesar berkurang satu indeks yang harus diperbarui di setiap insert. Kolom `received_at` tetap ada, karena dipakai `effective_ts` dan sebagai bukti waktu terima.

**Kapasitas paket Free.** Proyeksi kapasitas, alarm ukuran, dan pemicu pindah ke Pro ada di TRD bagian 6 dan 9.

**Partisi belum direncanakan.** Semua query Terka dibatasi satu pengguna, dan indeks B-tree yang diawali `user_id` tetap menjangkau baris satu pengguna dalam beberapa langkah walaupun tabel berisi puluhan juta baris. Pada 50 juta baris, `review_logs` sekitar 22 GB — besar untuk paket Free, tetapi biasa untuk Postgres. Partisi `hash (user_id)` lebih membantu pemeliharaan, seperti vacuum dan rebuild indeks per partisi, daripada kecepatan query. Partisi baru dipertimbangkan jika autovacuum `review_logs` terbukti tidak mampu mengikuti laju tulis, atau ukuran tabel mendekati 100 GB.

Jika kelak diperlukan, perlu dicatat tiga hal:

- **Tidak bisa dilakukan di tempat.** Postgres tidak bisa mengubah tabel biasa menjadi tabel berpartisi. Jalurnya: buat tabel berpartisi baru, salin data per batch, lalu tukar nama dalam jendela pemeliharaan. Rencana waktu henti atau tulis ganda disusun saat itu.
- **Yang sudah tidak menghalangi:** kunci utama diawali `user_id`, dan tidak ada unique constraint yang tidak memuat `user_id` — `server_seq` sengaja tanpa unique constraint (bagian konvensi tipe data).
- **`server_seq` tetap identity.** Postgres 17 mendukung kolom identity di tabel berpartisi, dan semua partisi berbagi satu sequence. Di versi yang lebih lama, identity diganti `default nextval()` dari satu sequence bersama; nilai dan urutannya tetap sama bagi klien.

**Job terjadwal** lewat `pg_cron`:

| Job                         | Jadwal | Isi                                    |
| --------------------------- | ------ | -------------------------------------- |
| Bersihkan penghitung harian | Harian | Hapus `usage_daily` lebih dari 30 hari |

Riwayat belajar tidak dihapus dalam pembersihan rutin. Penghapusan akun mengikuti TRD 5.1 dan bukan pekerjaan pembersihan berkala.

## 11. Jalur Perluasan

| Kebutuhan                                         | Yang berubah di skema                                                                                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login Apple atau penyedia lain                    | Tidak ada. Identitas baru masuk ke Supabase Auth                                                                                                                                        |
| Papan peringkat atau fitur kompetitif             | Tabel baru yang diisi server, misalnya hasil Tantangan Harian yang divalidasi. Tabel log yang ada tidak disentuh, karena isinya tetap data klien yang tidak diverifikasi (TRD bagian 2) |
| Konten dikelola lewat dashboard, bukan repositori | Entitas `content_` jadi tabel sungguhan dengan nama yang sama. Rujukan lunak tetap tanpa foreign key, dengan alasan yang sama seperti bagian 7                                          |
| Partisi `review_logs`                             | Bagian 10; belum dijadwalkan                                                                                                                                                            |

## 12. Yang Masih Terbuka

- **Pustaka UUID versi 7 di klien.** Browser belum memiliki fungsi bawaan untuk versi 7. Pustakanya perlu dipilih dan dikunci versinya, karena id yang salah format akan ditolak domain `uuid_v7` dan masuk karantina.
- **Versi Postgres proyek Supabase.** Minimal 15, karena `on delete set null (run_id)` memakai sintaks daftar kolom. Versi dicek saat proyek dibuat dan dicatat di migration pertama.
- **Batas byte `set_items`.** Angka 32 KB titik awal. Angka akhirnya ditetapkan dari payload sah terbesar di data uji (bagian 6).

Keputusan yang sudah diambil dan tidak lagi terbuka: kolom `region_id` di `review_logs` dan `card_notes` diganti `content_id` sebelum rilis publik, dan `card_events` memakai pasangan `content_id` + `mode` yang sama (bagian 7), dan jumlah partisi awal tidak lagi relevan karena partisi belum direncanakan (bagian 10).
