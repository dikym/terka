# TERKA — Data Kode Khusus CD dan Bahan Fakta RI

**Status:** Draf · **Bahasa:** Indonesia
**Dokumen terkait:** PRD 6.8 (Referensi) dan 6.16 (Latihan Kode Khusus) · SRD 2.9 dan 5.3 (aturan soal dan penilaian) · TRD 4.1 (`specials[]` dan `referencePlates[]`) · `special_plates.json` (data siap impor)

> **Slogan:** Lihat pelatnya, terka asalnya.
> **Fokus dokumen ini:** daftar kode negara CD yang menjadi materi latihan, bahan fakta pelat RI, sumber setiap entri, dan batas keandalannya. Pemeriksaan sumber dilakukan pada 24 September 2026.

---

## 1. Ringkasan Temuan

**Daftar CD lengkap dan bersumber primer.** Lampiran Perpol 7/2021 huruf D angka 4 memuat 130 pasangan kode negara dan pemegangnya, dari CD 12 (Amerika Serikat) sampai CD 145 (IFAD). Daftar ini berisi 101 negara dan 29 organisasi internasional. Nomor 46, 91, 119, dan 124 tidak tercantum. JDIH BPK mencatat status peraturan ini **Berlaku** pada tanggal pemeriksaan. Seluruh 130 entri berlabel `high`.

**RI tidak memiliki daftar lengkap yang valid.** Perpol 7/2021 hanya menyebut RI 1 untuk Presiden dan menyatakan nomor lain dikoordinasikan dengan Kementerian Sekretariat Negara. Korlantas mempublikasikan urutan RI 1 sampai RI 13, lalu menyebut RI 14 dan seterusnya hanya sebagai kelompok menteri, wakil menteri, dan pejabat lain. Rincian RI 14 ke atas di media saling bertentangan dan dapat berubah setiap perombakan kabinet. Referensi hanya menampilkan format seri RI dengan keterangan tersebut. Pasangan nomor dan jabatan yang berlabel `high` dipakai sebagai bahan Fakta menarik saja.

**Banyak daftar CD di media keliru.** Beberapa artikel yang sering muncul di hasil pencarian menggeser nomor negara, misalnya menyebut Inggris CD 14 dan Filipina CD 25. Menurut lampiran Perpol, Inggris CD 15 dan Filipina CD 16. Daftar media tidak dipakai sebagai sumber data CD.

## 2. Format Pelat Khusus

| Kode | Pemakai                                                        | Susunan menurut Perpol 7/2021            | Contoh di lampiran | Status di Terka       |
| ---- | -------------------------------------------------------------- | ---------------------------------------- | ------------------ | --------------------- |
| CD   | Korps diplomatik dan perwakilan tetap organisasi internasional | CD + kode negara + nomor urut registrasi | CD 12 5            | Latihan dan Referensi |
| CC   | Korps konsulat                                                 | CC + kode negara + nomor urut registrasi | CC 12 10           | Referensi saja        |
| CH   | Konsul kehormatan                                              | CH + kode negara + nomor urut registrasi | CH 130 1           | Referensi saja        |
| RI   | Presiden, Wakil Presiden, ketua lembaga tinggi negara, pejabat setingkat menteri | RI + nomor urut registrasi, tanpa seri huruf | RI 1 | Referensi (format saja) |

Latihan hanya menanyakan **kode negara** pada CD. Nomor urut registrasi di belakang kode negara, misalnya 05 pada CD 12 05, tidak pernah ditanyakan. Beberapa artikel menyebut nomor urut 01 selalu milik duta besar, tetapi lampiran Perpol tidak memuat aturan itu.

Contoh CC dan CH di lampiran memakai angka yang sama dengan daftar CD (12 untuk Amerika Serikat, 130 untuk Azerbaijan). Ini petunjuk bahwa ketiga seri berbagi kode negara, tetapi lampiran tidak menyatakannya secara eksplisit. CC dan CH tetap berada di Referensi sampai ada sumber yang menegaskannya.

Sejak Kabinet Merah Putih, sebagian pelat RI memakai **nomor kecil** di kanan bawah. Menteri koordinator memakai nomor pokok, misalnya RI 24, sedangkan menteri dan wakil menteri di bawahnya memakai RI 24 dengan nomor kecil 2, 3, dan seterusnya. Korlantas menjelaskan hal yang sama untuk RI 36: tujuh utusan khusus presiden memakai RI 36 dengan nomor kecil 1 sampai 7. Penjelasan ini dapat menjadi bahan Fakta menarik.

## 3. Aturan Label untuk Kode Khusus

Aturan `confidence` di TRD 4.1 ditulis untuk hubungan kode dan kab/kota. Kode khusus memakai aturan turunan berikut, karena sumber resminya berbeda.

- **`high`** jika salah satu terpenuhi: (a) pasangan kode dan pemegang tercantum langsung dalam peraturan yang berlaku pada tanggal pemeriksaan; atau (b) pasangan itu dipublikasikan instansi berwenang (Korlantas, Kemensetneg, atau Kemlu), baik langsung maupun melalui media arus utama dengan atribusi yang jelas, dan dikonfirmasi satu sumber independen lain tanpa kontradiksi. Peraturan cukup satu sumber karena peraturan itulah yang menetapkan kodenya.
- **`medium`** jika sumbernya media arus utama tanpa atribusi ke instansi, atau jika sumber resminya hanya menyebut kelompok jabatan tanpa pasangan nomor yang pasti.
- **`low`** jika sumber saling bertentangan, disusun sebelum perubahan kabinet yang relevan, atau merujuk peraturan yang sudah dicabut.

Sumber jenis `media-mengutip-instansi` wajib dilengkapi tautan unggahan asli instansi (`originalUrl`) sebelum rilis publik. Build menampilkan peringatan jika tautan itu belum ada. Unggahan Instagram Korlantas yang dikutip detikOto belum diarsipkan pada pemeriksaan ini.

## 4. Daftar Kode CD

Sumber seluruh baris: `perpol-7-2021-lampiran`, Lampiran huruf D angka 4, hlm. 99–102. Kolom **Tertulis di lampiran** menyalin ejaan sumber, termasuk salah ketik seperti "Kazakhtan" dan "Inter-Paliamentary". Kolom **Pemegang** memakai nama baku yang ditampilkan aplikasi. Kolom **Alias** berisi nama lain yang diterima saat pengguna mengetik. Kolom **Tipe** memakai label UI; di data nilainya `country` atau `organization`.

| Kode | Pemegang (nama tampil) | Tipe | Tertulis di lampiran | Alias yang diterima |
| ---- | ---------------------- | ---- | -------------------- | ------------------- |
| CD 12 | Amerika Serikat | negara | Amerika Serikat | AS, USA, United States, Amerika |
| CD 13 | India | negara | India | — |
| CD 14 | Prancis | negara | Perancis | Perancis, France |
| CD 15 | Inggris | negara | Inggris | Britania Raya, Kerajaan Inggris, UK, United Kingdom |
| CD 16 | Filipina | negara | Filipina | Philippines |
| CD 17 | Vatikan | negara | Vatikan | Takhta Suci, Tahta Suci, Holy See |
| CD 18 | Australia | negara | Australia | — |
| CD 19 | Norwegia | negara | Norwegia | Norway |
| CD 20 | Irak | negara | Irak | Iraq |
| CD 21 | Pakistan | negara | Pakistan | — |
| CD 22 | Belgia | negara | Belgia | Belgium |
| CD 23 | Myanmar | negara | Myanmar | Burma |
| CD 24 | Uni Emirat Arab | negara | Uni Emirat Arab | UEA, UAE, Emirat Arab |
| CD 25 | Tiongkok | negara | China | China, Cina, RRT, Republik Rakyat Tiongkok, RRC |
| CD 26 | Swedia | negara | Swedia | Sweden |
| CD 27 | Arab Saudi | negara | Saudi Arabia | Saudi Arabia, Saudi |
| CD 28 | Thailand | negara | Thailand | Muangthai |
| CD 29 | Mesir | negara | Mesir | Egypt |
| CD 30 | Italia | negara | Italia | Italy |
| CD 31 | Swiss | negara | Swiss | Switzerland |
| CD 32 | Jerman | negara | Jerman | Germany |
| CD 33 | Sri Lanka | negara | Srilanka | Srilanka |
| CD 34 | Denmark | negara | Denmark | — |
| CD 35 | Kanada | negara | Kanada | Canada |
| CD 36 | Brasil | negara | Brazil | Brazil |
| CD 37 | Rusia | negara | Rusia | Russia, Federasi Rusia |
| CD 38 | Afganistan | negara | Afganistan | Afghanistan |
| CD 39 | Serbia | negara | Serbia | — |
| CD 40 | Ceko | negara | Ceko | Republik Ceko, Czech, Cheko |
| CD 41 | Finlandia | negara | Finlandia | Finland |
| CD 42 | Meksiko | negara | Meksiko | Mexico |
| CD 43 | Hungaria | negara | Hungaria | Hungary |
| CD 44 | Polandia | negara | Polandia | Poland |
| CD 45 | Iran | negara | Iran | — |
| CD 47 | Malaysia | negara | Malaysia | — |
| CD 48 | Turki | negara | Turki | Turkiye, Türkiye, Turkey |
| CD 49 | Jepang | negara | Jepang | Japan |
| CD 50 | Bulgaria | negara | Bulgaria | — |
| CD 51 | Kamboja | negara | Kamboja | Cambodia |
| CD 52 | Argentina | negara | Argentina | — |
| CD 53 | Rumania | negara | Rumania | Romania |
| CD 54 | Yunani | negara | Yunani | Greece |
| CD 55 | Yordania | negara | Yordania | Jordan, Yordan |
| CD 56 | Austria | negara | Austria | — |
| CD 57 | Suriah | negara | Syria | Syria, Siria |
| CD 58 | UNDP | organisasi | United Nations Development Programme (UNDP) | United Nations Development Programme, Program Pembangunan PBB |
| CD 59 | Selandia Baru | negara | Selandia Baru | New Zealand |
| CD 60 | Belanda | negara | Belanda | Netherlands, Nederland |
| CD 61 | Yaman | negara | Yaman | Yemen |
| CD 62 | UPU | organisasi | Universal Postal Union (UPU) | Universal Postal Union, Uni Pos Sedunia |
| CD 63 | Portugal | negara | Portugal | — |
| CD 64 | Aljazair | negara | Aljazair | Algeria |
| CD 65 | Korea Utara | negara | Korea Utara | RRDK, Republik Rakyat Demokratik Korea, DPRK |
| CD 66 | Vietnam | negara | Vietnam | Viet Nam |
| CD 67 | Singapura | negara | Singapura | Singapore |
| CD 68 | Spanyol | negara | Spanyol | Spain |
| CD 69 | Bangladesh | negara | Bangladesh | — |
| CD 70 | Panama | negara | Panama | — |
| CD 71 | UNICEF | organisasi | United Nations International Children's Emergency Fund (UNICEF) | United Nations Children's Fund |
| CD 72 | UNESCO | organisasi | United Nations Educational, Scientific and Cultural Organization (UNESCO) | — |
| CD 73 | FAO | organisasi | Food and Agriculture Organization (FAO) | Food and Agriculture Organization, Organisasi Pangan dan Pertanian |
| CD 74 | WHO | organisasi | World Health Organization (WHO) | World Health Organization, Organisasi Kesehatan Dunia |
| CD 75 | Korea Selatan | negara | Korea Selatan | Republik Korea, South Korea, Korsel |
| CD 76 | ADB | organisasi | Asian Development Bank (ADB) | Asian Development Bank, Bank Pembangunan Asia |
| CD 77 | Bank Dunia | organisasi | International Bank for Reconstruction and Development (IBRD)/Bank Dunia | IBRD, World Bank |
| CD 78 | IMF | organisasi | International Monetary Fund (IMF) | International Monetary Fund, Dana Moneter Internasional |
| CD 79 | ILO | organisasi | International Labour Organisation (ILO) | International Labour Organization, Organisasi Buruh Internasional |
| CD 80 | Papua Nugini | negara | Papua Nugini | Papua New Guinea, PNG |
| CD 81 | Nigeria | negara | Nigeria | — |
| CD 82 | Cile | negara | Chili | Chili, Chile |
| CD 83 | UNHCR | organisasi | United Nations High Commissioner for Refugees (UNHCR) | Badan Pengungsi PBB |
| CD 84 | WFP | organisasi | World Food Programme (WFP) | World Food Programme, Program Pangan Dunia |
| CD 85 | Venezuela | negara | Venezuela | — |
| CD 86 | ESCAP | organisasi | Economic and Social Commission for Asia and the Pacific (ESCAP) | UNESCAP |
| CD 87 | Kolombia | negara | Kolombia | Colombia |
| CD 88 | Brunei Darussalam | negara | Brunei Darussalam | Brunei |
| CD 89 | UNIC | organisasi | United Nations Information Center (UNIC) | United Nations Information Centre, Pusat Informasi PBB |
| CD 90 | IFC | organisasi | International Finance Corporation (IFC) | International Finance Corporation |
| CD 92 | PTRI untuk ASEAN | organisasi | Perutusan Tetap Republik Indonesia (PTRI) ASEAN | PTRI ASEAN, Perutusan Tetap RI untuk ASEAN |
| CD 93 | Fiji | negara | Fiji | — |
| CD 94 | Belarus | negara | Belarus | Belarusia |
| CD 95 | Kazakhstan | negara | Kazakhtan | Kazakhtan, Kazakstan |
| CD 96 | UNIDO | organisasi | United Nations Industrial Development Organization (UNIDO) | — |
| CD 97 | ICRC | organisasi | International Committee of the Red Cross (ICRC) | Komite Internasional Palang Merah |
| CD 98 | Maroko | negara | Maroko | Morocco |
| CD 99 | Uni Eropa | organisasi | Uni Eropa | UE, EU, European Union |
| CD 100 | Sekretariat ASEAN | organisasi | Association of Southeast Asian Nations (ASEAN) | ASEAN |
| CD 101 | Tunisia | negara | Tunisia | — |
| CD 102 | Kuwait | negara | Kuait | Kuait |
| CD 103 | Laos | negara | Laos | Republik Demokratik Rakyat Laos |
| CD 104 | Palestina | negara | Palestina | Palestine |
| CD 105 | Kuba | negara | Kuba | Cuba |
| CD 106 | AIPA | organisasi | ASEAN Inter-Paliamentary Organization (AIPA) | ASEAN Inter-Parliamentary Assembly, ASEAN Inter-Parliamentary Organization |
| CD 107 | Libya | negara | Libya | — |
| CD 108 | Peru | negara | Peru | — |
| CD 109 | Slowakia | negara | Slovakia | Slovakia |
| CD 110 | Sudan | negara | Sudan | — |
| CD 111 | Yayasan ASEAN | organisasi | ASEAN Foundation | ASEAN Foundation |
| CD 112 | Utusan Sekjen PBB | organisasi | Utusan Sekjen PBB | Utusan Sekretaris Jenderal PBB |
| CD 113 | CIFOR | organisasi | Center for International Forestry Research (CIFOR) | Center for International Forestry Research |
| CD 114 | Bosnia dan Herzegovina | negara | Bosnia Herzegovina | Bosnia Herzegovina, Bosnia |
| CD 115 | Lebanon | negara | Lebanon | Libanon |
| CD 116 | Afrika Selatan | negara | Afrika Selatan | South Africa |
| CD 117 | Kroasia | negara | Kroasia | Croatia |
| CD 118 | Ukraina | negara | Ukraina | Ukraine |
| CD 120 | Uzbekistan | negara | Uzbekistan | — |
| CD 121 | Qatar | negara | Qatar | Katar |
| CD 122 | UNFPA | organisasi | United Nations Population Fund (UNFPA) | United Nations Population Fund |
| CD 123 | Mozambik | negara | Mozambique | Mozambique |
| CD 125 | Timor Leste | negara | Timor Leste | Timor-Leste |
| CD 126 | Suriname | negara | Suriname | — |
| CD 127 | Ekuador | negara | Ecuador | Ecuador |
| CD 128 | Zimbabwe | negara | Zimbabwe | — |
| CD 129 | IOM | organisasi | Perwakilan International Organization for Migration (IOM) | International Organization for Migration |
| CD 130 | Azerbaijan | negara | Azerbaijan | — |
| CD 131 | Somalia | negara | Somalia | — |
| CD 132 | Georgia | negara | Georgia | — |
| CD 133 | Paraguay | negara | Paraguay | — |
| CD 134 | Oman | negara | Oman | — |
| CD 135 | Armenia | negara | Armenia | — |
| CD 136 | Bahrain | negara | Bahrain | — |
| CD 137 | Mongolia | negara | Mongolia | — |
| CD 138 | San Marino | negara | San Marino | — |
| CD 139 | Irlandia | negara | Irlandia | Ireland |
| CD 140 | UNORCID | organisasi | United Nations Office for REDD+ Coordination in Indonesia (UNORCID) | — |
| CD 141 | IsDB | organisasi | Islamic Development Bank (IDB) | IDB, Islamic Development Bank, Bank Pembangunan Islam |
| CD 142 | Guinea-Bissau | negara | Guinea Bissau | Guinea Bissau |
| CD 143 | Etiopia | negara | Ethiopia | Ethiopia |
| CD 144 | Kepulauan Solomon | negara | Kep Solomon | Kep Solomon, Solomon Islands, Solomon |
| CD 145 | IFAD | organisasi | International Fund for Agricultural Development (IFAD) | International Fund for Agricultural Development |

**Catatan penamaan.** CD 92 tertulis "Perutusan Tetap Republik Indonesia (PTRI) ASEAN" di lampiran. Istilah itu biasanya merujuk perwakilan Indonesia untuk ASEAN, bukan perwakilan asing, sehingga maknanya perlu dikonfirmasi ke Kemlu sebelum dipakai sebagai soal. Entri ini tetap `high` karena tercantum di peraturan, tetapi diberi penanda `needsReview` di seed. CD 100 ditampilkan sebagai Sekretariat ASEAN dengan alias ASEAN, mengikuti fungsi kantornya di Jakarta.

**Keterbatasan.** Daftar ini berlaku sejak 5 Mei 2021. Perwakilan yang dibuka setelah tanggal itu mungkin sudah mendapat kode dari Kemlu tanpa masuk lampiran. Kode seperti itu tidak boleh ditambahkan dari foto pelat atau artikel media.

## 5. Pelat RI

**Di Referensi.** Referensi hanya menampilkan satu entri untuk seri RI: penjelasan format (RI + nomor urut, tanpa seri huruf, untuk kendaraan dinas Presiden, Wakil Presiden, ketua lembaga tinggi negara, dan pejabat setingkat menteri) beserta keterangan wajib: "Tidak ada sumber valid yang memuat daftar lengkap kode RI, dan alokasi nomornya dapat berubah sewaktu-waktu." Referensi tidak menampilkan daftar nomor RI maupun jabatan per nomor. Pencarian "RI" dengan nomor apa pun membuka entri yang sama.

**Bahan Fakta menarik.** Pasangan nomor dan jabatan berlabel `high` di bawah hanya boleh dipakai sebagai bahan Fakta menarik, melalui proses penyuntingan di `Terka_Facts.md` bagian 1. Label `high` berarti pasangan itu didukung sumber pada tanggal pemeriksaan, bukan bahwa daftar RI sudah lengkap. Pasangan berlabel `medium` atau `low` tidak dipakai di mana pun.

| Kode | Jabatan | Label | Sumber |
| ---- | ------- | ----- | ------ |
| RI 1 | Presiden | `high` | `perpol-7-2021-lampiran`, `korlantas-ig-via-detik-2026` |
| RI 2 | Wakil Presiden | `high` | `korlantas-ig-via-detik-2026`, `kompas-id-2025-ri36` |
| RI 3 | Istri Presiden | `high` | `korlantas-ig-via-detik-2026`, `otomotifnet-2023-ri` |
| RI 4 | Istri Wakil Presiden | `high` | `korlantas-ig-via-detik-2026`, `otomotifnet-2023-ri` |
| RI 5 | Ketua MPR | `high` | `korlantas-ig-via-detik-2026`, `kumparan-2025-ri` |
| RI 6 | Ketua DPR | `high` | `korlantas-ig-via-detik-2026`, `kumparan-2025-ri` |
| RI 7 | Ketua DPD | `high` | `korlantas-ig-via-detik-2026`, `kumparan-2025-ri` |
| RI 8 | Ketua MA | `high` | `korlantas-ig-via-detik-2026`, `otomotifnet-2023-ri` |
| RI 9 | Ketua MK | `high` | `korlantas-ig-via-detik-2026`, `otomotifnet-2023-ri` |
| RI 10 | Ketua BPK | `high` | `korlantas-ig-via-detik-2026`, `otomotifnet-2023-ri` |
| RI 11 | Ketua KY | `high` | `korlantas-ig-via-detik-2026`, `otomotifnet-2023-ri` |
| RI 12 | Gubernur BI | `high` | `korlantas-ig-via-detik-2026`, `kumparan-2025-ri` |
| RI 13 | Ketua OJK | `high` | `korlantas-ig-via-detik-2026`, `otomotifnet-2023-ri` |
| RI 36 | Utusan Khusus Presiden | `high` | `korlantas-cnn-2025-ri36`, `kompas-id-2025-ri36` |

Kolom Jabatan menyebut peruntukan pelat, bukan nama orang yang sedang menjabat. RI 3 dan RI 4 tercantum dalam publikasi Korlantas, tetapi Perpol 7/2021 huruf F hanya menyebut Presiden, Wakil Presiden, ketua lembaga tinggi negara, dan pejabat setingkat menteri. Fakta yang menyebut RI 3 atau RI 4 perlu menyertakan catatan itu.

Daftar RI 14 sampai RI 100 yang beredar luas, misalnya RI 15 untuk Menko Polhukam atau RI 65 untuk Ketua UKP4, berasal dari kabinet-kabinet sebelumnya dan tidak dipakai. Rincian RI 14 ke atas di media juga saling bertentangan, sehingga tidak ada pasangan `high` di atas RI 13 selain RI 36.

## 6. Sumber yang Tidak Dipakai

| Sumber                                                                    | Alasan                                                                      |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Daftar CD di beberapa portal berita (misalnya metro.suara.com, Juli 2023) | Nomor negara bergeser dari lampiran Perpol; ada nomor ganda untuk dua negara |
| Artikel yang merujuk Perkap 5/2012 atau Perkap 4/2006 sebagai dasar CD/RI | Kedua peraturan dicabut oleh Perpol 7/2021                                  |
| Artikel yang merujuk "Perkap 3/2012" atau "Perkap 5/2015" untuk daftar RI | Isi peraturan yang dirujuk tidak dapat ditelusuri memuat daftar nomor RI    |
| Daftar RI 1–RI 100 versi kabinet 2014–2024                                | Alokasi berubah sejak Kabinet Merah Putih                                   |
| Auto2000, "Daftar Plat Mobil RI Lengkap dengan Aturannya" (9 Juli 2026)   | Tanpa rujukan sumber; RI 14 ke atas memakai alokasi kabinet lama (misalnya RI 36 untuk Menkominfo dan RI 65 untuk UKP4); ada duplikasi internal, seperti Gubernur BI di RI 12 dan RI 63 |

## 7. Pemeliharaan

1. Periksa ulang status Perpol 7/2021 di JDIH BPK atau JDIH Polri setiap enam bulan. Jika lampiran diubah, bandingkan daftar CD baris per baris. Kode yang pindah pemegang harus memakai `id` baru.
2. Periksa ulang bahan RI setiap ada perombakan kabinet atau perubahan nomenklatur lembaga, sebelum fakta yang memakainya berstatus `ready`.
3. Ajukan permohonan informasi publik ke PPID Kemensetneg untuk alokasi nomor RI kabinet berjalan, dan ke PPID Kemlu untuk daftar kode negara terbaru, termasuk konfirmasi pemakaian kode yang sama pada CC dan CH serta arti CD 92.
4. Arsipkan unggahan Instagram Korlantas yang dikutip detikOto (18 April 2026) sebelum fakta yang memakainya berstatus `ready`.
5. Setiap perubahan data mencatat tanggal pemeriksaan di `sources[].checkedAt` dan menaikkan `specialsVersion`.

## 8. Daftar Sumber

| ID                       | Sumber                                                                                             | Tanggal    |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ---------- |
| `perpol-7-2021-lampiran` | Lampiran Perpol 7/2021, JDIH BPK: https://peraturan.bpk.go.id/Details/225016/perpol-no-7-tahun-2021 | 5 Mei 2021 |
| `korlantas-ig-via-detik-2026` | detikOto, mengutip Instagram Korlantas: https://oto.detik.com/berita/d-8450080/daftar-pelat-nomor-mobil-dinas-pejabat-ri-dari-presiden-hingga-menteri | 18 Apr 2026 |
| `korlantas-cnn-2025-ri36` | CNN Indonesia, pernyataan Kasubdit STNK Dit Regident Korlantas: https://www.cnnindonesia.com/otomotif/20250116110327-579-1187800/ada-angka-kecil-di-pelat-ri-36-mobil-utusan-presiden-apa-itu | 16 Jan 2025 |
| `kompas-id-2025-ri36` | Kompas.id: https://www.kompas.id/artikel/viral-mobil-ri-36-paksa-terobos-kemacetan-siapa-pejabat-penggunanya | 10 Jan 2025 |
| `kumparan-2025-ri` | kumparanNEWS: https://kumparan.com/kumparannews/daftar-pelat-nomor-terbaru-menteri-dan-pejabat-kabinet-merah-putih-24IM4mCmWt6 | 13 Jan 2025 |
| `otomotifnet-2023-ri` | Otomotifnet: https://otomotifnet.gridoto.com/read/233769440/daftar-42-pelat-nomor-mobil-menteri-dan-pejabat-di-indonesia-istri-presiden-pakai-ri-3 | 26 Apr 2023 |
