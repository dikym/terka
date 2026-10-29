import type { Metadata } from "next";
import { LegalFrame } from "@/components/shell/legal-frame";
import { PRIVACY_POLICY_VERSION } from "@/rules";

export const metadata: Metadata = { title: "Kebijakan privasi · Terka" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="border-b border-ink-1000 pb-2 type-label text-ink-1000">{title}</h2>
			<p className="text-ink-900">{children}</p>
		</section>
	);
}

// Static and readable without JavaScript: the Google consent screen links here.
export default function Page() {
	return (
		<LegalFrame title="Kebijakan privasi">
			<article className="flex flex-col gap-8">
				<p className="font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
					Versi {PRIVACY_POLICY_VERSION}
				</p>

				<Section title="Tanpa akun">
					Terka bisa dipakai penuh tanpa akun. Riwayat latihan hanya tersimpan di browser
					yang dipakai dan tidak dikirim ke server Terka.
				</Section>

				<Section title="Data yang disimpan saat masuk">
					Jika Anda masuk, Terka menyimpan alamat email untuk login, riwayat latihan
					(jawaban, waktu menjawab, dan pengaturan belajar), catatan pengingat yang Anda
					tulis, serta label perangkat. Terka tidak menyimpan nomor pelat kendaraan orang
					lain dan tidak menyimpan lokasi. Pencarian di Referensi hanya mencatat kode
					depannya.
				</Section>

				<Section title="Tujuan">
					Data dipakai untuk satu tujuan: menyinkronkan progres belajar antarperangkat dan
					menyimpan salinannya di luar perangkat. Data tidak dijual, tidak dipakai untuk
					iklan, dan tidak dibandingkan dengan pengguna lain.
				</Section>

				<Section title="Lokasi server">
					Data akun disimpan di layanan Supabase di wilayah Singapura. Cadangan database
					dienkripsi sebelum disimpan.
				</Section>

				<Section title="Data dari Google">
					Saat masuk dengan Google, Terka hanya meminta email dan profil dasar. Nama dan
					foto dari Google disimpan oleh layanan login, tetapi tidak dibaca dan tidak
					disalin oleh Terka.
				</Section>

				<Section title="Analitik kunjungan">
					Terka menghitung kunjungan halaman tanpa cookie. Isi jawaban, kode pelat, dan
					identitas akun tidak ikut terkirim.
				</Section>

				<Section title="Hak Anda">
					Anda dapat mengekspor seluruh riwayat kapan saja dari halaman Statistik, dan
					menghapus akun beserta seluruh data yang tersinkron. Data di perangkat yang
					sedang dipakai tetap ada sampai Anda menghapusnya.
				</Section>

				<Section title="Jika terjadi kebocoran data">
					Jika ada kebocoran yang menyangkut data Anda, Terka memberi tahu pengguna
					terdampak lewat email, menjelaskan data apa yang terdampak dan langkah yang
					diambil, serta menghentikan sinkronisasi sampai masalahnya ditutup.
				</Section>

				<Section title="Kontak">
					Pertanyaan tentang data pribadi atau laporan data yang keliru:{" "}
					<a
						href="mailto:contact@terka.my.id"
						className="underline underline-offset-[3px]"
					>
						contact@terka.my.id
					</a>
					.
				</Section>
			</article>
		</LegalFrame>
	);
}
