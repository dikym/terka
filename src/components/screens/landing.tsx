import { SITE_WRAP as WRAP, SiteHeader } from "@/components/shell/site-header";
import { Link } from "@/components/ui/app-link";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import type { Bundle } from "@/core/content/schema";
import plates from "@/data/plates.json";
import { demoQuestions } from "@/lib/view/demo";
import { DemoCard } from "./landing-demo";

// Worked out while the static page is built, so the browser gets a few lines, not the plate data.
const DEMO = demoQuestions(plates as unknown as Bundle);

// The landing column is wider than the app's: 1120 px with a 20 px gutter on desktop.
const LABEL = "type-label text-ink-500";
const TITLE =
	"font-display text-title leading-snug font-bold tracking-title text-balance text-ink-1000";

const STEPS: { icon: IconName; title: string; text: string }[] = [
	{
		icon: "layers",
		title: "Mulai dengan tes penempatan",
		text: "Tes singkat menentukan titik mulaimu, dan boleh dilewati. Setelah itu pilih wilayah yang mau dipelajari dulu: satu provinsi, satu kawasan, atau seluruh Indonesia."
	},
	{
		icon: "keyboard",
		title: "Pilih dulu, lalu ketik sendiri",
		text: "Kode baru dimulai dengan pilihan ganda. Makin kuat ingatanmu pada satu kode, makin sering kamu mengetik sendiri jawabannya, dan salah ketik kecil tetap diterima."
	},
	{
		icon: "calendar-days",
		title: "Ulangi sesuai jadwal",
		text: "Jadwal dihitung dari benar-salah dan kecepatan jawabanmu, lalu disesuaikan dengan caramu mengingat setelah riwayatmu cukup. Kode yang sudah melekat jarang muncul, yang masih goyah lebih sering. Kalau soal terjadwal habis, kamu tetap bisa lanjut berlatih; hanya soal yang memang sudah waktunya diulang yang memengaruhi jadwal."
	}
];

const LEVELS = [
	["Level 1", "Kenali. Pilih dari beberapa jawaban."],
	["Level 2", "Ingat. Pilih dari pengecoh yang lebih mirip, lalu ketik sendiri."],
	["Level 3", "Kuasai. Jawab sebelum waktu habis."]
];

const KINDS = [
	["Tebak daerah", "BK dipakai daerah mana?"],
	["Tebak kode", "Kode pelat Kabupaten Tangerang?"],
	["Tebak berwaktu", "Soal yang sama, dijawab sebelum hitung mundur habis."],
	["Benar atau salah", "BK dipakai Kota Medan."],
	["Mana yang bukan", "Mana yang tidak memakai BK?"],
	["Sebutkan sebanyak mungkin", "Sebutkan daerah yang memakai BK."],
	["Tebak diplomat", "CD 49 dipakai perwakilan mana?"]
];

const TOOLS = [
	[
		"Statistik",
		"Peta Penguasaan tiap provinsi, kode yang paling sering belum tepat, dan perkiraan beban pengulangan 14 hari ke depan."
	],
	[
		"Referensi",
		"Cari kode atau nama daerah, termasuk kode diplomat dan format pelat khusus. Tidak ada soal di sini."
	],
	[
		"Catatan pengingat",
		"Tulis kaitan pribadimu untuk kode yang sulit diingat, misalnya “DR: Dari Rinjani”. Tawarannya muncul setelah kode itu beberapa kali gagal diulang."
	],
	[
		"Pintasan keyboard",
		"F, G, H, dan J memilih jawaban, Enter lanjut ke soal berikutnya, dan Z membatalkan jawaban terakhir."
	]
];

const EXTRAS: { bar: string; icon: IconName; title: string; meta: string; text: string }[] = [
	{
		bar: "bg-tangerine-700",
		icon: "calendar-check",
		title: "Tantangan Harian",
		meta: "5 soal, sekali sehari",
		text: "Dari kode yang sudah dipelajari. Menyelesaikannya mencatat Hari Beruntun, sama seperti sesi harian yang tuntas."
	},
	{
		bar: "bg-go-500",
		icon: "zap",
		title: "Mode Kilat",
		meta: "60 detik, jawab sebanyak mungkin",
		text: "Rekor terbaik dicatat terpisah untuk tiap wilayah. Jadwal belajar tidak berubah."
	},
	{
		bar: "bg-grape-500",
		icon: "crosshair",
		title: "Latihan Terfokus",
		meta: "Satu wilayah pilihan",
		text: "Latih kode yang sudah kamu pelajari di satu provinsi atau kawasan, tanpa mengganti Cakupan."
	},
	{
		bar: "bg-caution-500",
		icon: "git-compare-arrows",
		title: "Bandingkan Kode",
		meta: "BE dan BD",
		text: "Dua kode yang sering tertukar muncul berdampingan sekali sehari, sampai kamu benar di lima hari berbeda."
	},
	{
		bar: "bg-tangerine-500",
		icon: "brain",
		title: "Cek Ingatan",
		meta: "20 soal setelah libur panjang",
		text: "Setelah berhenti seminggu lebih dan soal menumpuk, ukur dulu seberapa banyak yang masih kamu ingat."
	},
	{
		bar: "bg-ink-1000",
		icon: "flag",
		title: "Kode diplomat",
		meta: "CD 12 sampai CD 145",
		text: "Jalur tambahan untuk kode negara pada pelat CD. Nonaktif sampai kamu menyalakannya."
	}
];

const PRIVACY: { icon: IconName; title: string; text: string }[] = [
	{
		icon: "user-x",
		title: "Tanpa akun",
		text: "Langsung belajar tanpa akun. Progres tersimpan di perangkat ini."
	},
	{
		icon: "cloud-sync",
		title: "Sinkronisasi kalau perlu",
		text: "Masuk dengan Google atau email untuk memakai riwayat yang sama di perangkat lain. Status sinkronisasi dan daftar perangkat bisa kamu lihat, data bisa diekspor, dan akun bisa dihapus kapan saja."
	},
	{
		icon: "globe-off",
		title: "Tetap jalan saat offline",
		text: "Pasang Terka di layar utama ponsel. Latihan tetap bisa dipakai tanpa sinyal."
	}
];

const FACT_LABELS = [
	["Terverifikasi", "bg-go-100 text-go-700"],
	["Diperdebatkan", "bg-caution-100 text-caution-700"],
	["Mitos", "bg-[oklch(0.955_0.04_298)] text-grape-700"]
];

const FOOTER: { icon: IconName; label: string; href: string }[] = [
	{ icon: "info", label: "Tentang Terka", href: "/tentang" },
	{ icon: "shield-check", label: "Kebijakan privasi", href: "/privasi" },
	{ icon: "mail", label: "Laporkan data yang keliru", href: "mailto:contact@terka.my.id" }
];

function Heading({ label, title }: { label?: string; title: string }) {
	return (
		<>
			{label && <span className={LABEL}>{label}</span>}
			<h2 className={TITLE}>{title}</h2>
		</>
	);
}

function NameRows({ rows }: { rows: string[][] }) {
	return (
		<div className="flex min-w-0 flex-col border-t border-hairline">
			{rows.map(([name, text]) => (
				<div
					key={name}
					className="flex flex-col gap-1 border-b border-hairline py-3 lg:grid lg:grid-cols-[minmax(150px,210px)_minmax(0,1fr)] lg:items-baseline lg:gap-x-5 lg:gap-y-2 lg:py-4"
				>
					<span className="font-display text-body-md leading-[1.3] font-semibold text-ink-1000">
						{name}
					</span>
					<span className="text-body-sm leading-normal text-ink-700 lg:text-body-md">
						{text}
					</span>
				</div>
			))}
		</div>
	);
}

function Hero() {
	return (
		<section className="border-b border-hairline">
			{/* On a phone the demo card sits between the copy and the buttons, so the copy column dissolves into the stack. */}
			<div
				className={`${WRAP} flex flex-col gap-8 pt-10 pb-12 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:pt-16 lg:pb-20`}
			>
				<div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
					<div className="flex flex-col gap-5 lg:gap-6">
						<span className={LABEL}>Latihan hafalan kode pelat nomor Indonesia</span>
						<h1 className="font-display text-[40px] leading-[1.04] font-bold tracking-hero text-balance text-ink-1000 lg:text-[64px] lg:leading-tight">
							Lihat pelatnya, terka asalnya.
						</h1>
						<p className="text-body-lg leading-[1.6] text-ink-700 lg:max-w-[46ch] lg:leading-loose">
							Terka membantu menghafal kode depan pelat kendaraan dan daerah
							pemakainya. Soal muncul lagi sebelum ingatanmu pudar, jadi beberapa
							menit sehari sudah cukup.
						</p>
					</div>
					<div className="flex flex-col gap-3 max-lg:order-last lg:gap-6">
						{/* New learners land on the placement test; returning ones on their home screen. */}
						<div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
							<Button href="/beranda" size="lg" icon="play">
								Mulai belajar
							</Button>
						</div>
						<span className="text-center text-body-sm leading-normal text-ink-500 lg:text-left">
							Gratis, tanpa iklan, dan tanpa akun.
						</span>
					</div>
				</div>
				<DemoCard questions={DEMO} />
			</div>
		</section>
	);
}

function HowItWorks() {
	return (
		<section
			id="cara-kerja"
			className="scroll-mt-15.25 border-b border-hairline bg-paper-50 lg:scroll-mt-17.25"
		>
			<div className={`${WRAP} flex flex-col gap-6 py-12 lg:gap-10 lg:py-16`}>
				<div className="flex max-w-prose flex-col gap-3">
					<Heading
						label="Cara kerja"
						title="Sedikit materi baru setiap hari, diulang sebelum terlupa."
					/>
				</div>
				<div className="grid gap-3 lg:grid-cols-3 lg:gap-5">
					{STEPS.map((step, index) => (
						<article
							key={step.title}
							className="flex flex-col gap-3 rounded-md border border-hairline bg-paper-0 p-4 shadow-lift lg:p-5"
						>
							<div className="flex items-center justify-between">
								<Icon name={step.icon} size={24} />
								<span className="font-mono text-body-sm leading-none font-medium text-ink-500">
									{String(index + 1).padStart(2, "0")}
								</span>
							</div>
							<h3 className="text-ink-1000 type-card-title">{step.title}</h3>
							<p className="text-ink-700 type-body">{step.text}</p>
						</article>
					))}
				</div>
				<div className="grid border-t border-hairline lg:grid-cols-3 lg:gap-5 lg:pt-4">
					{LEVELS.map(([level, text]) => (
						<div
							key={level}
							className="grid grid-cols-[72px_minmax(0,1fr)] items-baseline gap-3 border-b border-hairline py-3 lg:flex lg:flex-col lg:gap-2 lg:border-b-0 lg:py-0"
						>
							<span className="font-display text-body-md leading-[1.3] font-semibold text-ink-1000 lg:leading-none">
								{level}
							</span>
							<span className="text-body-sm leading-normal text-ink-500">{text}</span>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function QuestionKinds() {
	return (
		<section
			id="bentuk-soal"
			className="scroll-mt-15.25 border-b border-hairline lg:scroll-mt-17.25"
		>
			<div
				className={`${WRAP} grid gap-6 py-12 lg:grid-cols-2 lg:items-start lg:gap-10 lg:py-16`}
			>
				<div className="flex flex-col gap-3 lg:max-w-[40ch]">
					<Heading label="Bentuk soal" title="Satu kode, ditanya dari berbagai arah." />
					<p className="text-ink-700 type-body">
						Bentuk soal berganti sesuai seberapa kuat ingatanmu pada kode itu. Soal
						tidak pernah memberi huruf atau angka awal sebagai petunjuk.
					</p>
				</div>
				<NameRows rows={KINDS} />
			</div>
		</section>
	);
}

function Tools() {
	return (
		<section className="border-b border-hairline">
			<div
				className={`${WRAP} grid gap-6 py-12 lg:grid-cols-2 lg:items-start lg:gap-10 lg:py-16`}
			>
				<div className="flex flex-col gap-3 lg:max-w-[40ch]">
					<Heading label="Alat bantu" title="Pantau kemajuan, cari kode kapan saja." />
					<p className="text-ink-700 type-body">
						Statistik dan Referensi tidak memuat soal, jadi membukanya tidak mengubah
						jadwal belajarmu.
					</p>
				</div>
				<NameRows rows={TOOLS} />
			</div>
		</section>
	);
}

function Extras() {
	return (
		<section className="border-b border-hairline bg-paper-50">
			<div className={`${WRAP} flex flex-col gap-6 py-12 lg:gap-10 lg:py-16`}>
				<div className="flex max-w-prose flex-col gap-3">
					<Heading
						label="Di luar sesi harian"
						title="Latihan singkat untuk hari yang longgar."
					/>
				</div>
				<div className="grid gap-3 lg:grid-cols-3 lg:gap-5">
					{EXTRAS.map((extra) => (
						<Card
							key={extra.title}
							bar={extra.bar}
							className="gap-3 max-lg:grid max-lg:grid-cols-[24px_minmax(0,1fr)] max-lg:gap-x-3 max-lg:gap-y-2"
						>
							<Icon name={extra.icon} size={24} />
							<div className="flex flex-col gap-2 lg:contents">
								<h3 className="text-ink-1000 type-card-title">{extra.title}</h3>
								<span className="font-mono text-body-sm leading-[1.3] font-medium text-ink-700">
									{extra.meta}
								</span>
								<p className="text-body-sm leading-normal text-ink-500">
									{extra.text}
								</p>
							</div>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

function Privacy() {
	return (
		<section id="data" className="scroll-mt-15.25 border-b border-hairline lg:scroll-mt-17.25">
			<div
				className={`${WRAP} grid gap-6 py-12 lg:grid-cols-2 lg:items-start lg:gap-10 lg:py-16`}
			>
				<div className="flex flex-col gap-3 lg:max-w-[44ch]">
					<Heading
						label="Data dan privasi"
						title="Progres tersimpan di perangkatmu sampai kamu memilih sinkronisasi."
					/>
					<p className="text-ink-700 type-body">
						Terka membantu belajar kode pelat, bukan rujukan resmi. Data yang belum
						cukup terverifikasi diberi penanda.
					</p>
				</div>
				<div className="flex min-w-0 flex-col gap-6">
					<div className="flex flex-col border-t border-hairline">
						{PRIVACY.map((item) => (
							<div
								key={item.title}
								className="flex gap-3 border-b border-hairline py-4 lg:gap-4"
							>
								<Icon name={item.icon} className="mt-0.5" />
								<div className="flex flex-col gap-1">
									<span className="font-display text-body-md leading-[1.3] font-semibold text-ink-1000">
										{item.title}
									</span>
									<span className="text-body-sm leading-normal text-ink-700">
										{item.text}
									</span>
								</div>
							</div>
						))}
					</div>
					<div className="flex flex-col gap-3">
						<span className={LABEL}>Label pada fakta sejarah</span>
						<div className="flex flex-wrap gap-2">
							{FACT_LABELS.map(([label, tone]) => (
								<span
									key={label}
									className={`inline-flex h-7 items-center rounded-sm px-3 font-display text-body-sm leading-none font-semibold ${tone}`}
								>
									{label}
								</span>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function Closing() {
	return (
		<section className="bg-paper-50">
			<div
				className={`${WRAP} flex flex-col gap-5 py-12 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-6 lg:py-16`}
			>
				<div className="flex flex-col gap-3 lg:max-w-[52ch]">
					<Heading title="Mulai dari tes penempatan" />
					<p className="text-ink-700 type-body">
						Tes singkat menentukan titik awalmu. Kode yang sudah kamu kenal langsung
						diulang, sisanya diperkenalkan bertahap. Belum tahu satu kode pun juga tidak
						apa-apa.
					</p>
				</div>
				<Link href="/beranda" className={buttonClass("primary", "lg", false)}>
					<span>Mulai belajar</span>
					<Icon name="arrow-right" size={18} />
				</Link>
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer className="border-t border-hairline">
			<div
				className={`${WRAP} flex flex-col gap-5 pt-8 pb-10 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:py-8`}
			>
				<div className="flex flex-col items-start gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4">
					<span className="inline-flex items-center gap-[0.3em] rounded-sm border-2 border-ink-1000 px-2 py-0.75 font-plate text-body-lg leading-none font-bold tracking-wider text-ink-1000">
						T<span>3</span>
						<span>RKA</span>
					</span>
					<span className="text-body-sm leading-[1.4] text-ink-500">
						Dikembangkan mandiri.
					</span>
				</div>
				<nav className="flex flex-col lg:flex-row lg:flex-wrap lg:gap-5">
					{FOOTER.map(({ icon, label, href }) => (
						<a
							key={href}
							href={href}
							className="flex min-h-12 items-center gap-3 border-t border-hairline text-body-md leading-none font-medium text-caution-700 hover:text-ink-1000 max-lg:last:border-b lg:min-h-0 lg:gap-2 lg:border-0 lg:text-body-sm"
						>
							<Icon
								name={icon}
								size={null}
								color="bg-current"
								className="size-4.5 lg:size-4"
							/>
							{label}
						</a>
					))}
				</nav>
			</div>
		</footer>
	);
}

export function Landing() {
	return (
		<>
			<SiteHeader home />
			<main className="pt-15.25 lg:pt-17.25">
				<Hero />
				<HowItWorks />
				<QuestionKinds />
				<Extras />
				<Tools />
				<Privacy />
				<Closing />
			</main>
			<Footer />
		</>
	);
}
