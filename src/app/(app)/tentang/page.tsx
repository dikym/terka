import type { Metadata } from "next";
import { Link } from "@/components/ui/app-link";
import { PageTitle } from "@/components/ui/page-title";

export const metadata: Metadata = { title: "Tentang · Terka" };

const LINK = "underline underline-offset-[3px]";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="border-b border-ink-1000 pb-2 type-label text-ink-1000">{title}</h2>
			<div className="flex flex-col gap-3 text-pretty text-ink-900">{children}</div>
		</section>
	);
}

export default function Page() {
	return (
		<div className="mx-auto flex w-full max-w-prose flex-col gap-5 lg:gap-6">
			<PageTitle title="Tentang Terka" back="/setelan" />
			<article className="flex flex-col gap-8">
				<div className="flex flex-col gap-3">
					<p className="font-display text-subhead leading-snug font-semibold text-ink-1000">
						Lihat pelatnya, terka asalnya.
					</p>
					<p className="text-pretty text-ink-900">
						Terka adalah aplikasi latihan untuk menghafal kode depan pelat kendaraan
						Indonesia beserta kabupaten/kota yang memakainya. Latihan diulang pada waktu
						yang sesuai, meminta jawaban tanpa bantuan secara bertahap, dan membantu
						membedakan kode yang mirip, seperti BE, BD, BH, dan BG.
					</p>
				</div>

				<Section title="Bukan rujukan resmi">
					<p>
						Terka membantu belajar kode pelat, bukan rujukan resmi untuk administrasi
						kendaraan. Satu kode bisa dipakai beberapa kabupaten/kota, jadi Terka tidak
						menebak satu daerah dari pelat lengkap.
					</p>
				</Section>

				<Section title="Sumber dan pembaruan data">
					<p>
						Setiap hubungan kode dan daerah diperiksa terhadap sumbernya sebelum masuk
						latihan. Kode diplomat CD hanya diambil dari Lampiran Peraturan Kepolisian
						Negara RI Nomor 7 Tahun 2021; daftar dari media tidak dipakai.
					</p>
					<p>
						Data diperbarui per versi. Versi yang sedang dipakai dan daftar perubahannya
						ada di{" "}
						<Link href="/beranda?perubahan=1" className={LINK}>
							Perubahan data
						</Link>
						.
					</p>
				</Section>

				<Section title="Label data">
					<p>
						Kode berlabel <b className="font-semibold">Terverifikasi</b> sudah cukup
						didukung sumber dan bisa dilatih. Kode{" "}
						<b className="font-semibold">Belum terverifikasi penuh</b> ditandai warna
						kuning: tetap tampil di Referensi, tetapi belum masuk latihan.
					</p>
				</Section>

				<Section title="Tanpa akun dan dengan akun">
					<p>
						Terka bisa dipakai penuh tanpa akun. Progres tersimpan di browser yang
						dipakai, jadi browser lain di perangkat yang sama memulai dari awal. Riwayat
						tetap bisa diekspor kapan saja dari Statistik.
					</p>
					<p>
						Dengan akun, progres disinkronkan antarperangkat. Data apa yang disimpan dan
						untuk apa dijelaskan di{" "}
						<Link href="/privasi" className={LINK}>
							Kebijakan privasi
						</Link>
						.
					</p>
				</Section>

				<Section title="Laporkan data yang keliru">
					<p>
						Menemukan kode atau daerah yang keliru? Kirim ke{" "}
						<a href="mailto:contact@terka.my.id" className={LINK}>
							contact@terka.my.id
						</a>
						, sertakan kodenya dan sumber yang bisa diperiksa.
					</p>
				</Section>

				<Section title="Pembuat">
					<p>
						Terka dibuat secara mandiri oleh{" "}
						<a href="https://dikym.me" className={LINK}>
							Diky
						</a>
						. Gratis dan tanpa iklan.
					</p>
				</Section>

				<Section title="Atribusi">
					<ul className="flex list-disc flex-col gap-2 pl-5">
						<li>
							Peta provinsi dari{" "}
							<a href="https://www.geoboundaries.org" className={LINK}>
								geoBoundaries
							</a>{" "}
							gbHumanitarian IDN (OCHA ROAP), lisensi CC BY 3.0 IGO.
						</li>
						<li>
							Bendera negara dari{" "}
							<a href="https://github.com/lipis/flag-icons" className={LINK}>
								flag-icons
							</a>{" "}
							karya Panayiotis Lipiridis, lisensi MIT.
						</li>
						<li>
							Penjadwalan latihan memakai{" "}
							<a
								href="https://github.com/open-spaced-repetition/ts-fsrs"
								className={LINK}
							>
								ts-fsrs
							</a>{" "}
							dari Open Spaced Repetition, lisensi MIT.
						</li>
					</ul>
				</Section>
			</article>
		</div>
	);
}
