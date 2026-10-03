# TERKA — Special Codes

**Status:** Draf · **Bahasa:** Indonesia
**Data pendamping:** `../data/Terka_Special_Codes.json`
**Dokumen terkait:** PRD 6.8 (Referensi) dan 6.16 (Latihan Kode Khusus) · SRD 2.9 dan 5.3 (aturan soal dan penilaian) · TRD 4.1 (`specials[]` dan `referencePlates[]`) · Fun Facts (`Terka_Fun_Facts.md`, fakta 35–39 dan 41) · `plates.json` (hasil build dari dokumen ini)

> **Slogan:** Lihat pelatnya, terka asalnya.
> **Fokus dokumen ini:** data kode khusus — daftar kode negara CD yang menjadi materi latihan, bahan fakta pelat RI, sumber setiap entri, dan batas keandalannya. Pemeriksaan sumber dilakukan pada 24 September 2026.

---

## 1. Ringkasan Temuan

**Daftar CD lengkap dan bersumber primer.** Lampiran Perpol 7/2021 huruf D angka 4 memuat 130 pasangan kode negara dan pemegangnya, dari CD 12 (Amerika Serikat) sampai CD 145 (IFAD). Daftar ini berisi 101 negara dan 29 organisasi internasional. Nomor 46, 91, 119, dan 124 tidak tercantum. JDIH BPK mencatat status peraturan ini **Berlaku** pada tanggal pemeriksaan. Seluruh 130 entri berlabel `high`.

**RI tidak memiliki daftar lengkap yang valid.** Perpol 7/2021 hanya menyebut RI 1 untuk Presiden dan menyatakan nomor lain dikoordinasikan dengan Kementerian Sekretariat Negara. Korlantas mempublikasikan urutan RI 1 sampai RI 13, lalu menyebut RI 14 dan seterusnya hanya sebagai kelompok menteri, wakil menteri, dan pejabat lain. Rincian RI 14 ke atas di media saling bertentangan dan dapat berubah setiap perombakan kabinet. Referensi hanya menampilkan format seri RI dengan keterangan tersebut. Pasangan nomor dan jabatan yang berlabel `high` dipakai sebagai bahan Fun Facts saja.

**Banyak daftar CD di media keliru.** Beberapa artikel yang sering muncul di hasil pencarian menggeser nomor negara, misalnya menyebut Inggris CD 14 dan Filipina CD 25. Menurut lampiran Perpol, Inggris CD 15 dan Filipina CD 16. Daftar media tidak dipakai sebagai sumber data CD.

## 2. Format Pelat Khusus

| Kode | Pemakai | Susunan menurut Perpol 7/2021 | Contoh di lampiran | Status di Terka | Sumber | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| CD | Korps diplomatik dan perwakilan tetap organisasi internasional | CD + kode negara + nomor urut registrasi | CD 12 5 | Latihan dan Referensi | `perpol-7-2021-lampiran` | — |
| CC | Korps konsulat | CC + kode negara + nomor urut registrasi | CC 12 10 | Referensi saja | `perpol-7-2021-lampiran` | — |
| CH | Konsul kehormatan | CH + kode negara + nomor urut registrasi | CH 130 1 | Referensi saja | `perpol-7-2021-lampiran` | — |
| RI | Presiden, Wakil Presiden, ketua lembaga tinggi negara, pejabat setingkat menteri | RI + nomor urut registrasi, tanpa seri huruf | RI 1 | Referensi (format saja) | `perpol-7-2021-lampiran` | Tidak ada sumber valid yang memuat daftar lengkap kode RI, dan alokasi nomornya dapat berubah sewaktu-waktu. |

Latihan hanya menanyakan **kode negara** pada CD. Nomor urut registrasi di belakang kode negara, misalnya 05 pada CD 12 05, tidak pernah ditanyakan. Beberapa artikel menyebut nomor urut 01 selalu milik duta besar, tetapi lampiran Perpol tidak memuat aturan itu.

Contoh CC dan CH di lampiran memakai angka yang sama dengan daftar CD (12 untuk Amerika Serikat, 130 untuk Azerbaijan). Ini tanda bahwa ketiga seri berbagi kode negara, tetapi lampiran tidak menyatakannya secara eksplisit. CC dan CH tetap berada di Referensi sampai ada sumber yang menegaskannya.

Sejak Kabinet Merah Putih, sebagian pelat RI memakai **nomor kecil** di kanan bawah. Menteri koordinator memakai nomor pokok, misalnya RI 24, sedangkan menteri dan wakil menteri di bawahnya memakai RI 24 dengan nomor kecil 2, 3, dan seterusnya. Korlantas menjelaskan hal yang sama untuk RI 36: tujuh utusan khusus presiden memakai RI 36 dengan nomor kecil 1 sampai 7. Penjelasan ini dipakai sebagai bahan Fun Facts (fakta 39).

## 3. Aturan Label untuk Kode Khusus

Aturan `confidence` di TRD 4.1 ditulis untuk hubungan kode dan kab/kota. Kode khusus memakai aturan turunan berikut, karena sumber resminya berbeda.

- **`high`** jika salah satu terpenuhi: (a) pasangan kode dan pemegang tercantum langsung dalam peraturan yang berlaku pada tanggal pemeriksaan; atau (b) pasangan itu dipublikasikan instansi berwenang (Korlantas, Kemensetneg, atau Kemlu), baik langsung maupun melalui media arus utama dengan atribusi yang jelas, dan dikonfirmasi satu sumber independen lain tanpa kontradiksi. Peraturan cukup satu sumber karena peraturan itulah yang menetapkan kodenya.
- **`medium`** jika sumbernya media arus utama tanpa atribusi ke instansi, atau jika sumber resminya hanya menyebut kelompok jabatan tanpa pasangan nomor yang pasti.
- **`low`** jika sumber saling bertentangan, disusun sebelum perubahan kabinet yang relevan, atau merujuk peraturan yang sudah dicabut.

Sumber jenis `media-mengutip-instansi` wajib dilengkapi tautan unggahan asli instansi (`originalUrl`) sebelum rilis publik. Build menampilkan peringatan jika tautan itu belum ada. Unggahan Instagram Korlantas yang dikutip detikOto belum diarsipkan pada pemeriksaan ini.

## 4. Daftar Kode CD

Sumber seluruh baris: `perpol-7-2021-lampiran`, Lampiran huruf D angka 4, hlm. 99–102. Kolom **Tertulis di lampiran** menyalin ejaan sumber, termasuk salah ketik seperti "Kazakhtan" dan "Inter-Paliamentary". Kolom **Pemegang** memakai nama baku yang ditampilkan aplikasi. Kolom **Alias** berisi nama lain yang diterima saat pengguna mengetik. Kolom **Tipe** memakai label UI; di data nilainya `country` atau `organization`.

| Kode | Pemegang (nama tampil) | Tipe | Tertulis di lampiran | Alias yang diterima | Label | Tinjau |
| --- | --- | --- | --- | --- | --- | --- |
| CD 12 | Amerika Serikat | negara | Amerika Serikat | AS, USA, United States, Amerika | `high` | — |
| CD 13 | India | negara | India | — | `high` | — |
| CD 14 | Prancis | negara | Perancis | Perancis, France | `high` | — |
| CD 15 | Inggris | negara | Inggris | Britania Raya, Kerajaan Inggris, UK, United Kingdom | `high` | — |
| CD 16 | Filipina | negara | Filipina | Philippines | `high` | — |
| CD 17 | Vatikan | negara | Vatikan | Takhta Suci, Tahta Suci, Holy See | `high` | — |
| CD 18 | Australia | negara | Australia | — | `high` | — |
| CD 19 | Norwegia | negara | Norwegia | Norway | `high` | — |
| CD 20 | Irak | negara | Irak | Iraq | `high` | — |
| CD 21 | Pakistan | negara | Pakistan | — | `high` | — |
| CD 22 | Belgia | negara | Belgia | Belgium | `high` | — |
| CD 23 | Myanmar | negara | Myanmar | Burma | `high` | — |
| CD 24 | Uni Emirat Arab | negara | Uni Emirat Arab | UEA, UAE, Emirat Arab | `high` | — |
| CD 25 | Tiongkok | negara | China | China, Cina, RRT, Republik Rakyat Tiongkok, RRC | `high` | — |
| CD 26 | Swedia | negara | Swedia | Sweden | `high` | — |
| CD 27 | Arab Saudi | negara | Saudi Arabia | Saudi Arabia, Saudi | `high` | — |
| CD 28 | Thailand | negara | Thailand | Muangthai | `high` | — |
| CD 29 | Mesir | negara | Mesir | Egypt | `high` | — |
| CD 30 | Italia | negara | Italia | Italy | `high` | — |
| CD 31 | Swiss | negara | Swiss | Switzerland | `high` | — |
| CD 32 | Jerman | negara | Jerman | Germany | `high` | — |
| CD 33 | Sri Lanka | negara | Srilanka | Srilanka | `high` | — |
| CD 34 | Denmark | negara | Denmark | — | `high` | — |
| CD 35 | Kanada | negara | Kanada | Canada | `high` | — |
| CD 36 | Brasil | negara | Brazil | Brazil | `high` | — |
| CD 37 | Rusia | negara | Rusia | Russia, Federasi Rusia | `high` | — |
| CD 38 | Afganistan | negara | Afganistan | Afghanistan | `high` | — |
| CD 39 | Serbia | negara | Serbia | — | `high` | — |
| CD 40 | Ceko | negara | Ceko | Republik Ceko, Czech, Cheko | `high` | — |
| CD 41 | Finlandia | negara | Finlandia | Finland | `high` | — |
| CD 42 | Meksiko | negara | Meksiko | Mexico | `high` | — |
| CD 43 | Hungaria | negara | Hungaria | Hungary | `high` | — |
| CD 44 | Polandia | negara | Polandia | Poland | `high` | — |
| CD 45 | Iran | negara | Iran | — | `high` | — |
| CD 47 | Malaysia | negara | Malaysia | — | `high` | — |
| CD 48 | Turki | negara | Turki | Turkiye, Türkiye, Turkey | `high` | — |
| CD 49 | Jepang | negara | Jepang | Japan | `high` | — |
| CD 50 | Bulgaria | negara | Bulgaria | — | `high` | — |
| CD 51 | Kamboja | negara | Kamboja | Cambodia | `high` | — |
| CD 52 | Argentina | negara | Argentina | — | `high` | — |
| CD 53 | Rumania | negara | Rumania | Romania | `high` | — |
| CD 54 | Yunani | negara | Yunani | Greece | `high` | — |
| CD 55 | Yordania | negara | Yordania | Jordan, Yordan | `high` | — |
| CD 56 | Austria | negara | Austria | — | `high` | — |
| CD 57 | Suriah | negara | Syria | Syria, Siria | `high` | — |
| CD 58 | UNDP | organisasi | United Nations Development Programme (UNDP) | United Nations Development Programme, Program Pembangunan PBB | `high` | — |
| CD 59 | Selandia Baru | negara | Selandia Baru | New Zealand | `high` | — |
| CD 60 | Belanda | negara | Belanda | Netherlands, Nederland | `high` | — |
| CD 61 | Yaman | negara | Yaman | Yemen | `high` | — |
| CD 62 | UPU | organisasi | Universal Postal Union (UPU) | Universal Postal Union, Uni Pos Sedunia | `high` | — |
| CD 63 | Portugal | negara | Portugal | — | `high` | — |
| CD 64 | Aljazair | negara | Aljazair | Algeria | `high` | — |
| CD 65 | Korea Utara | negara | Korea Utara | RRDK, Republik Rakyat Demokratik Korea, DPRK | `high` | — |
| CD 66 | Vietnam | negara | Vietnam | Viet Nam | `high` | — |
| CD 67 | Singapura | negara | Singapura | Singapore | `high` | — |
| CD 68 | Spanyol | negara | Spanyol | Spain | `high` | — |
| CD 69 | Bangladesh | negara | Bangladesh | — | `high` | — |
| CD 70 | Panama | negara | Panama | — | `high` | — |
| CD 71 | UNICEF | organisasi | United Nations International Children's Emergency Fund (UNICEF) | United Nations Children's Fund | `high` | — |
| CD 72 | UNESCO | organisasi | United Nations Educational, Scientific and Cultural Organization (UNESCO) | — | `high` | — |
| CD 73 | FAO | organisasi | Food and Agriculture Organization (FAO) | Food and Agriculture Organization, Organisasi Pangan dan Pertanian | `high` | — |
| CD 74 | WHO | organisasi | World Health Organization (WHO) | World Health Organization, Organisasi Kesehatan Dunia | `high` | — |
| CD 75 | Korea Selatan | negara | Korea Selatan | Republik Korea, South Korea, Korsel | `high` | — |
| CD 76 | ADB | organisasi | Asian Development Bank (ADB) | Asian Development Bank, Bank Pembangunan Asia | `high` | — |
| CD 77 | Bank Dunia | organisasi | International Bank for Reconstruction and Development (IBRD)/Bank Dunia | IBRD, World Bank | `high` | — |
| CD 78 | IMF | organisasi | International Monetary Fund (IMF) | International Monetary Fund, Dana Moneter Internasional | `high` | — |
| CD 79 | ILO | organisasi | International Labour Organisation (ILO) | International Labour Organization, Organisasi Buruh Internasional | `high` | — |
| CD 80 | Papua Nugini | negara | Papua Nugini | Papua New Guinea, PNG | `high` | — |
| CD 81 | Nigeria | negara | Nigeria | — | `high` | — |
| CD 82 | Cile | negara | Chili | Chili, Chile | `high` | — |
| CD 83 | UNHCR | organisasi | United Nations High Commissioner for Refugees (UNHCR) | Badan Pengungsi PBB | `high` | — |
| CD 84 | WFP | organisasi | World Food Programme (WFP) | World Food Programme, Program Pangan Dunia | `high` | — |
| CD 85 | Venezuela | negara | Venezuela | — | `high` | — |
| CD 86 | ESCAP | organisasi | Economic and Social Commission for Asia and the Pacific (ESCAP) | UNESCAP | `high` | — |
| CD 87 | Kolombia | negara | Kolombia | Colombia | `high` | — |
| CD 88 | Brunei Darussalam | negara | Brunei Darussalam | Brunei | `high` | — |
| CD 89 | UNIC | organisasi | United Nations Information Center (UNIC) | United Nations Information Centre, Pusat Informasi PBB | `high` | — |
| CD 90 | IFC | organisasi | International Finance Corporation (IFC) | International Finance Corporation | `high` | — |
| CD 92 | PTRI untuk ASEAN | organisasi | Perutusan Tetap Republik Indonesia (PTRI) ASEAN | PTRI ASEAN, Perutusan Tetap RI untuk ASEAN | `high` | ya |
| CD 93 | Fiji | negara | Fiji | — | `high` | — |
| CD 94 | Belarus | negara | Belarus | Belarusia | `high` | — |
| CD 95 | Kazakhstan | negara | Kazakhtan | Kazakhtan, Kazakstan | `high` | — |
| CD 96 | UNIDO | organisasi | United Nations Industrial Development Organization (UNIDO) | — | `high` | — |
| CD 97 | ICRC | organisasi | International Committee of the Red Cross (ICRC) | Komite Internasional Palang Merah | `high` | — |
| CD 98 | Maroko | negara | Maroko | Morocco | `high` | — |
| CD 99 | Uni Eropa | organisasi | Uni Eropa | UE, EU, European Union | `high` | — |
| CD 100 | Sekretariat ASEAN | organisasi | Association of Southeast Asian Nations (ASEAN) | ASEAN | `high` | — |
| CD 101 | Tunisia | negara | Tunisia | — | `high` | — |
| CD 102 | Kuwait | negara | Kuait | Kuait | `high` | — |
| CD 103 | Laos | negara | Laos | Republik Demokratik Rakyat Laos | `high` | — |
| CD 104 | Palestina | negara | Palestina | Palestine | `high` | — |
| CD 105 | Kuba | negara | Kuba | Cuba | `high` | — |
| CD 106 | AIPA | organisasi | ASEAN Inter-Paliamentary Organization (AIPA) | ASEAN Inter-Parliamentary Assembly, ASEAN Inter-Parliamentary Organization | `high` | — |
| CD 107 | Libya | negara | Libya | — | `high` | — |
| CD 108 | Peru | negara | Peru | — | `high` | — |
| CD 109 | Slowakia | negara | Slovakia | Slovakia | `high` | — |
| CD 110 | Sudan | negara | Sudan | — | `high` | — |
| CD 111 | Yayasan ASEAN | organisasi | ASEAN Foundation | ASEAN Foundation | `high` | — |
| CD 112 | Utusan Sekjen PBB | organisasi | Utusan Sekjen PBB | Utusan Sekretaris Jenderal PBB | `high` | — |
| CD 113 | CIFOR | organisasi | Center for International Forestry Research (CIFOR) | Center for International Forestry Research | `high` | — |
| CD 114 | Bosnia dan Herzegovina | negara | Bosnia Herzegovina | Bosnia Herzegovina, Bosnia | `high` | — |
| CD 115 | Lebanon | negara | Lebanon | Libanon | `high` | — |
| CD 116 | Afrika Selatan | negara | Afrika Selatan | South Africa | `high` | — |
| CD 117 | Kroasia | negara | Kroasia | Croatia | `high` | — |
| CD 118 | Ukraina | negara | Ukraina | Ukraine | `high` | — |
| CD 120 | Uzbekistan | negara | Uzbekistan | — | `high` | — |
| CD 121 | Qatar | negara | Qatar | Katar | `high` | — |
| CD 122 | UNFPA | organisasi | United Nations Population Fund (UNFPA) | United Nations Population Fund | `high` | — |
| CD 123 | Mozambik | negara | Mozambique | Mozambique | `high` | — |
| CD 125 | Timor Leste | negara | Timor Leste | Timor-Leste | `high` | — |
| CD 126 | Suriname | negara | Suriname | — | `high` | — |
| CD 127 | Ekuador | negara | Ecuador | Ecuador | `high` | — |
| CD 128 | Zimbabwe | negara | Zimbabwe | — | `high` | — |
| CD 129 | IOM | organisasi | Perwakilan International Organization for Migration (IOM) | International Organization for Migration | `high` | — |
| CD 130 | Azerbaijan | negara | Azerbaijan | — | `high` | — |
| CD 131 | Somalia | negara | Somalia | — | `high` | — |
| CD 132 | Georgia | negara | Georgia | — | `high` | — |
| CD 133 | Paraguay | negara | Paraguay | — | `high` | — |
| CD 134 | Oman | negara | Oman | — | `high` | — |
| CD 135 | Armenia | negara | Armenia | — | `high` | — |
| CD 136 | Bahrain | negara | Bahrain | — | `high` | — |
| CD 137 | Mongolia | negara | Mongolia | — | `high` | — |
| CD 138 | San Marino | negara | San Marino | — | `high` | — |
| CD 139 | Irlandia | negara | Irlandia | Ireland | `high` | — |
| CD 140 | UNORCID | organisasi | United Nations Office for REDD+ Coordination in Indonesia (UNORCID) | — | `high` | — |
| CD 141 | IsDB | organisasi | Islamic Development Bank (IDB) | IDB, Islamic Development Bank, Bank Pembangunan Islam | `high` | — |
| CD 142 | Guinea-Bissau | negara | Guinea Bissau | Guinea Bissau | `high` | — |
| CD 143 | Etiopia | negara | Ethiopia | Ethiopia | `high` | — |
| CD 144 | Kepulauan Solomon | negara | Kep Solomon | Kep Solomon, Solomon Islands, Solomon | `high` | — |
| CD 145 | IFAD | organisasi | International Fund for Agricultural Development (IFAD) | International Fund for Agricultural Development | `high` | — |

**Catatan penamaan.** CD 92 tertulis "Perutusan Tetap Republik Indonesia (PTRI) ASEAN" di lampiran. Istilah itu biasanya merujuk perwakilan Indonesia untuk ASEAN, bukan perwakilan asing, sehingga maknanya perlu dikonfirmasi ke Kemlu sebelum dipakai sebagai soal. Entri ini tetap `high` karena tercantum di peraturan, tetapi ditandai `ya` di kolom **Tinjau**. CD 100 ditampilkan sebagai Sekretariat ASEAN dengan alias ASEAN, mengikuti fungsi kantornya di Jakarta.

**Keterbatasan.** Daftar ini berlaku sejak 5 Mei 2021. Perwakilan yang dibuka setelah tanggal itu mungkin sudah mendapat kode dari Kemlu tanpa masuk lampiran. Kode seperti itu tidak boleh ditambahkan dari foto pelat atau artikel media.

## 5. Pelat RI

**Di Referensi.** Referensi hanya menampilkan satu entri untuk seri RI: penjelasan format (RI + nomor urut, tanpa seri huruf, untuk kendaraan dinas Presiden, Wakil Presiden, ketua lembaga tinggi negara, dan pejabat setingkat menteri) beserta keterangan wajib: "Tidak ada sumber valid yang memuat daftar lengkap kode RI, dan alokasi nomornya dapat berubah sewaktu-waktu." Referensi tidak menampilkan daftar nomor RI maupun jabatan per nomor. Pencarian "RI" dengan nomor apa pun membuka entri yang sama.

**Bahan Fun Facts.** Pasangan nomor dan jabatan berlabel `high` di bawah hanya boleh dipakai sebagai bahan Fun Facts, melalui proses penyuntingan di `Terka_Fun_Facts.md` bagian 2. Label `high` berarti pasangan itu didukung sumber pada tanggal pemeriksaan, bukan bahwa daftar RI sudah lengkap. Pasangan berlabel `medium` atau `low` tidak dipakai di mana pun.

| Kode  | Jabatan                | Label  | Sumber                                                  |
| ----- | ---------------------- | ------ | ------------------------------------------------------- |
| RI 1  | Presiden               | `high` | `perpol-7-2021-lampiran`, `korlantas-ig-via-detik-2026` |
| RI 2  | Wakil Presiden         | `high` | `korlantas-ig-via-detik-2026`, `kompas-id-2025-ri36`    |
| RI 3  | Istri Presiden         | `high` | `korlantas-ig-via-detik-2026`, `otomotifnet-2023-ri`    |
| RI 4  | Istri Wakil Presiden   | `high` | `korlantas-ig-via-detik-2026`, `otomotifnet-2023-ri`    |
| RI 5  | Ketua MPR              | `high` | `korlantas-ig-via-detik-2026`, `kumparan-2025-ri`       |
| RI 6  | Ketua DPR              | `high` | `korlantas-ig-via-detik-2026`, `kumparan-2025-ri`       |
| RI 7  | Ketua DPD              | `high` | `korlantas-ig-via-detik-2026`, `kumparan-2025-ri`       |
| RI 8  | Ketua MA               | `high` | `korlantas-ig-via-detik-2026`, `otomotifnet-2023-ri`    |
| RI 9  | Ketua MK               | `high` | `korlantas-ig-via-detik-2026`, `otomotifnet-2023-ri`    |
| RI 10 | Ketua BPK              | `high` | `korlantas-ig-via-detik-2026`, `otomotifnet-2023-ri`    |
| RI 11 | Ketua KY               | `high` | `korlantas-ig-via-detik-2026`, `otomotifnet-2023-ri`    |
| RI 12 | Gubernur BI            | `high` | `korlantas-ig-via-detik-2026`, `kumparan-2025-ri`       |
| RI 13 | Ketua OJK              | `high` | `korlantas-ig-via-detik-2026`, `otomotifnet-2023-ri`    |
| RI 36 | Utusan Khusus Presiden | `high` | `korlantas-cnn-2025-ri36`, `kompas-id-2025-ri36`        |

Kolom Jabatan menyebut peruntukan pelat, bukan nama orang yang sedang menjabat. RI 3 dan RI 4 tercantum dalam publikasi Korlantas, tetapi Perpol 7/2021 huruf F hanya menyebut Presiden, Wakil Presiden, ketua lembaga tinggi negara, dan pejabat setingkat menteri. Fakta yang menyebut RI 3 atau RI 4 perlu menyertakan catatan itu.

Daftar RI 14 sampai RI 100 yang beredar luas, misalnya RI 15 untuk Menko Polhukam atau RI 65 untuk Ketua UKP4, berasal dari kabinet-kabinet sebelumnya dan tidak dipakai. Rincian RI 14 ke atas di media juga saling bertentangan, sehingga tidak ada pasangan `high` di atas RI 13 selain RI 36.

## 6. Sumber yang Tidak Dipakai

| Sumber                                                                    | Alasan                                                                                                                                                                                  |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Daftar CD di beberapa portal berita (misalnya metro.suara.com, Juli 2023) | Nomor negara bergeser dari lampiran Perpol; ada nomor ganda untuk dua negara                                                                                                            |
| Artikel yang merujuk Perkap 5/2012 atau Perkap 4/2006 sebagai dasar CD/RI | Kedua peraturan dicabut oleh Perpol 7/2021                                                                                                                                              |
| Artikel yang merujuk "Perkap 3/2012" atau "Perkap 5/2015" untuk daftar RI | Isi peraturan yang dirujuk tidak dapat ditelusuri memuat daftar nomor RI                                                                                                                |
| Daftar RI 1–RI 100 versi kabinet 2014–2024                                | Alokasi berubah sejak Kabinet Merah Putih                                                                                                                                               |
| Auto2000, "Daftar Plat Mobil RI Lengkap dengan Aturannya" (9 Juli 2026)   | Tanpa rujukan sumber; RI 14 ke atas memakai alokasi kabinet lama (misalnya RI 36 untuk Menkominfo dan RI 65 untuk UKP4); ada duplikasi internal, seperti Gubernur BI di RI 12 dan RI 63 |

## 7. Pemeliharaan

1. Periksa ulang status Perpol 7/2021 di JDIH BPK atau JDIH Polri setiap enam bulan. Jika lampiran diubah, bandingkan daftar CD baris per baris. Kode yang pindah pemegang harus memakai `id` baru.
2. Periksa ulang bahan RI setiap ada perombakan kabinet atau perubahan nomenklatur lembaga. Fakta yang memakainya (fakta 38–41 di `Terka_Fun_Facts.md`) diturunkan ke `draft` jika tidak lagi sesuai.
3. Ajukan permohonan informasi publik ke PPID Kemensetneg untuk alokasi nomor RI kabinet berjalan, dan ke PPID Kemlu untuk daftar kode negara terbaru, termasuk konfirmasi pemakaian kode yang sama pada CC dan CH serta arti CD 92.
4. Arsipkan unggahan Instagram Korlantas yang dikutip detikOto (18 April 2026) dan isi `originalUrl` sumber `korlantas-ig-via-detik-2026` sebelum rilis publik, sesuai bagian 3. Fakta 41 di `Terka_Fun_Facts.md` memakai sumber ini.
5. Setiap perubahan data mencatat tanggal pemeriksaan di `sources[].checkedAt`. Perubahan itu ikut menaikkan `contentRev` di `plates.json` (TRD bagian 4.1).

## 8. Daftar Sumber

| ID | Judul | Penerbit | Jenis | Tanggal | Diperiksa | URL | URL asli | Lokasi |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `perpol-7-2021-lampiran` | Lampiran Peraturan Kepolisian Negara RI Nomor 7 Tahun 2021 tentang Registrasi dan Identifikasi Kendaraan Bermotor | Polri; salinan JDIH BPK | peraturan | 2021-05-05 | 2026-09-24 | https://peraturan.bpk.go.id/Details/225016/perpol-no-7-tahun-2021 | https://peraturan.bpk.go.id/Download/219644/Perpol%20No.%207%20th%202021%20ttg%20regident_lampiran.pdf | Lampiran huruf B (kode registrasi), huruf D angka 4 (kode negara CD, hlm. 99–102), huruf F (TNKB khusus RI, hlm. 103–104) |
| `korlantas-ig-via-detik-2026` | Daftar Pelat Nomor Mobil Dinas Pejabat RI dari Presiden hingga Menteri (mengutip Instagram Korlantas Polri) | detikOto | media-mengutip-instansi | 2026-04-18 | 2026-09-24 | https://oto.detik.com/berita/d-8450080/daftar-pelat-nomor-mobil-dinas-pejabat-ri-dari-presiden-hingga-menteri | — | Daftar RI 1–RI 13; unggahan Instagram asli Korlantas belum diarsipkan |
| `korlantas-cnn-2025-ri36` | Ada Angka Kecil di Pelat RI 36 Mobil Utusan Presiden, Apa Itu? (pernyataan Kasubdit STNK Dit Regident Korlantas Polri) | CNN Indonesia | media-mengutip-instansi | 2025-01-16 | 2026-09-24 | https://www.cnnindonesia.com/otomotif/20250116110327-579-1187800/ada-angka-kecil-di-pelat-ri-36-mobil-utusan-presiden-apa-itu | — | RI 36 nomor kecil 1–7 untuk utusan khusus presiden; penomoran RI dikoordinasikan dengan Kemensetneg |
| `kompas-id-2025-ri36` | Viral Mobil RI 36 Paksa Terobos Kemacetan, Siapa Pejabat Penggunanya? | Kompas.id | media | 2025-01-10 | 2026-09-24 | https://www.kompas.id/artikel/viral-mobil-ri-36-paksa-terobos-kemacetan-siapa-pejabat-penggunanya | — | Skema nomor kecil (RI 24 dan turunannya); RI 36.1–36.7 |
| `kumparan-2025-ri` | Daftar Pelat Nomor Terbaru Menteri dan Pejabat Kabinet Merah Putih | kumparanNEWS | media | 2025-01-13 | 2026-09-24 | https://kumparan.com/kumparannews/daftar-pelat-nomor-terbaru-menteri-dan-pejabat-kabinet-merah-putih-24IM4mCmWt6 | — | Menyatakan belum ada aturan resmi; daftar tidak lengkap dan ada lompatan nomor |
| `otomotifnet-2023-ri` | Daftar 42 Pelat Nomor Mobil Menteri dan Pejabat di Indonesia, Istri Presiden Pakai RI 3 | Otomotifnet (GridOto) | media | 2023-04-26 | 2026-09-24 | https://otomotifnet.gridoto.com/read/233769440/daftar-42-pelat-nomor-mobil-menteri-dan-pejabat-di-indonesia-istri-presiden-pakai-ri-3 | — | RI 1–RI 13 era kabinet sebelumnya; nomor 14 ke atas sudah tidak berlaku |

## 9. Struktur Data JSON

`../data/Terka_Special_Codes.json` berisi data yang dibaca build. Build tidak membaca tabel di dokumen ini.

| Bagian JSON         | Isi                                                                                                         | Masuk `plates.json` |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------- |
| `summary`           | Jumlah entri, sebaran label, entri yang perlu ditinjau, rentang nomor, dan nomor kosong                     | Tidak               |
| `confidenceLabels`  | Arti `high`, `medium`, dan `low` menurut bagian 3                                                           | Tidak               |
| `sources[]`         | Sumber di bagian 8, dengan properti yang sama seperti `sources[]` di `../data/Terka_Fun_Facts.json` (TRD 4.1)       | Ya                  |
| `specials[]`        | 130 entri CD di bagian 4, dengan properti menurut TRD 4.1                                                   | Ya                  |
| `referencePlates[]` | Entri format RI, CC, dan CH di bagian 2, termasuk `example` dan `note`                                      | Ya                  |
| `riPairs[]`         | Pasangan RI di bagian 5 beserta `usedByFacts`, yaitu `id` fakta di `../data/Terka_Fun_Facts.json` yang memakainya   | Tidak               |
| `rejectedSources`   | Sumber yang tidak dipakai di bagian 6 beserta alasannya                                                     | Tidak               |

`id` sumber yang juga dipakai `../data/Terka_Fun_Facts.json` wajib berisi data yang sama di kedua berkas; jika berbeda, build gagal.

