import type { Metadata } from "next";
import { PRIVACY_POLICY_VERSION } from "@/rules";

export const metadata: Metadata = { title: "Kebijakan privasi · Terka" };

// Static and readable without JavaScript: the Google consent screen links here.
export default function Page() {
	return (
		<article className="flex max-w-prose flex-col gap-4">
			<h1 className="type-screen-title">Kebijakan privasi</h1>
			<p>Versi {PRIVACY_POLICY_VERSION}</p>

			<h2>Tanpa akun</h2>
			<p>
				Terka bisa dipakai penuh tanpa akun. Riwayat latihan hanya tersimpan di browser yang
				dipakai dan tidak dikirim ke server Terka.
			</p>

			<h2>Data yang disimpan saat masuk</h2>
			<p>
				Jika Anda masuk, Terka menyimpan alamat email untuk login, riwayat latihan (jawaban,
				waktu menjawab, dan pengaturan belajar), catatan pengingat yang Anda tulis, serta
				label perangkat. Terka tidak menyimpan nomor pelat kendaraan orang lain dan tidak
				menyimpan lokasi. Pencarian di Referensi hanya mencatat kode depannya.
			</p>

			<h2>Tujuan</h2>
			<p>
				Data dipakai untuk satu tujuan: menyinkronkan progres belajar antarperangkat dan
				menyimpan salinannya di luar perangkat. Data tidak dijual, tidak dipakai untuk
				iklan, dan tidak dibandingkan dengan pengguna lain.
			</p>

			<h2>Lokasi server</h2>
			<p>
				Data akun disimpan di layanan Supabase di wilayah Singapura. Cadangan database
				dienkripsi sebelum disimpan.
			</p>

			<h2>Data dari Google</h2>
			<p>
				Saat masuk dengan Google, Terka hanya meminta email dan profil dasar. Nama dan foto
				dari Google disimpan oleh layanan login, tetapi tidak dibaca dan tidak disalin oleh
				Terka.
			</p>

			<h2>Analitik kunjungan</h2>
			<p>
				Terka menghitung kunjungan halaman tanpa cookie. Isi jawaban, kode pelat, dan
				identitas akun tidak ikut terkirim.
			</p>

			<h2>Hak Anda</h2>
			<p>
				Anda dapat mengekspor seluruh riwayat kapan saja dari halaman Statistik, dan
				menghapus akun beserta seluruh data yang tersinkron. Data di perangkat yang sedang
				dipakai tetap ada sampai Anda menghapusnya.
			</p>

			<h2>Jika terjadi kebocoran data</h2>
			<p>
				Jika ada kebocoran yang menyangkut data Anda, Terka memberi tahu pengguna terdampak
				lewat email, menjelaskan data apa yang terdampak dan langkah yang diambil, serta
				menghentikan sinkronisasi sampai masalahnya ditutup.
			</p>

			<h2>Kontak</h2>
			<p>
				Pertanyaan tentang data pribadi atau laporan data yang keliru:{" "}
				<a href="mailto:contact@terka.my.id">contact@terka.my.id</a>.
			</p>
		</article>
	);
}
