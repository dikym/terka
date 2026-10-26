import { Link } from "@/components/ui/app-link";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Plate, Wordmark } from "@/components/ui/plate";

// The landing column is wider than the app's: 1120 px with a 20 px gutter on desktop.
const WRAP = "container max-w-280 lg:px-5";
const LABEL = "type-label text-ink-500";
const TITLE =
	"font-display text-title leading-snug font-bold tracking-title text-balance text-ink-1000";

const STEPS: { icon: IconName; title: string; text: string }[] = [
	{
		icon: "layers",
		title: "Pilih Cakupan",
		text: "Mulai dari satu provinsi, satu kawasan, atau langsung seluruh Indonesia. Materi baru dibuka bertahap dari wilayah yang kamu pilih."
	},
	{
		icon: "keyboard",
		title: "Jawab dengan mengetik",
		text: "Pilihan ganda hanya dipakai saat berkenalan dengan kode baru. Setelah itu kamu mengetik sendiri jawabannya, dan salah ketik kecil tetap diterima."
	},
	{
		icon: "calendar-days",
		title: "Ulangi sesuai jadwal",
		text: "Jadwal pengulangan dihitung dari benar-salah dan kecepatan jawabanmu. Kode yang sudah melekat jarang muncul, kode yang masih goyah muncul lebih sering."
	}
];

const LEVELS = [
	["Level 1", "Kenali. Pilih dari beberapa jawaban."],
	["Level 2", "Ingat. Ketik jawabanmu sendiri."],
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

const EXTRAS: { bar: string; icon: IconName; title: string; meta: string; text: string }[] = [
	{
		bar: "bg-tangerine-700",
		icon: "calendar-check",
		title: "Tantangan Harian",
		meta: "5 soal, sekali sehari",
		text: "Dari kode yang sudah dipelajari. Hari yang terisi tercatat sebagai Hari Beruntun."
	},
	{
		bar: "bg-go-500",
		icon: "zap",
		title: "Mode Kilat",
		meta: "60 detik, jawab sebanyak mungkin",
		text: "Rekor terbaik dicatat terpisah untuk tiap wilayah. Jadwal belajar tidak berubah."
	},
	{
		bar: "bg-caution-500",
		icon: "git-compare-arrows",
		title: "Bandingkan Kode",
		meta: "BE dan BD",
		text: "Dua kode yang sering tertukar dilatih berdampingan sampai bisa dibedakan."
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
		icon: "hard-drive",
		title: "Tanpa akun",
		text: "Langsung belajar tanpa akun. Progres tersimpan di perangkat ini."
	},
	{
		icon: "cloud-check",
		title: "Sinkronisasi kalau perlu",
		text: "Masuk dengan Google atau email untuk memakai riwayat yang sama di perangkat lain. Data bisa diekspor dan akun bisa dihapus kapan saja."
	},
	{
		icon: "download",
		title: "Tetap jalan saat offline",
		text: "Pasang Terka di layar utama ponsel. Latihan tetap bisa dipakai tanpa sinyal."
	}
];

const FACT_LABELS = [
	["Terverifikasi", "bg-go-100 text-go-700"],
	["Diperdebatkan", "bg-caution-100 text-caution-700"],
	["Mitos", "bg-[oklch(0.955_0.04_298)] text-grape-700"]
];

const NAV = [
	["Cara kerja", "#cara-kerja"],
	["Bentuk soal", "#bentuk-soal"],
	["Data", "#data"]
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

function Header() {
	return (
		<header className="fixed inset-x-0 top-0 z-30 border-b border-hairline bg-paper-0">
			<div
				className={`${WRAP} flex min-h-15 items-center justify-between gap-3 py-2 lg:gap-4 lg:py-4`}
			>
				<Link href="/" aria-label="Terka">
					<Wordmark />
				</Link>
				<nav className="flex items-center gap-5">
					{NAV.map(([label, href]) => (
						<a
							key={href}
							href={href}
							className="font-display text-body-sm leading-none font-semibold text-ink-700 max-lg:hidden"
						>
							{label}
						</a>
					))}
					<Button href="/beranda" variant="secondary" size="sm" className="max-lg:h-11">
						Buka aplikasi
					</Button>
				</nav>
			</div>
		</header>
	);
}

function DemoCard() {
	return (
		<div className="flex w-full flex-col gap-4 rounded-md border border-ink-1000 bg-paper-0 p-5 shadow-block lg:max-w-110 lg:gap-5 lg:justify-self-center lg:p-6">
			<div className="flex items-center justify-between gap-3">
				<span className={LABEL}>Tebak daerah</span>
				<span className="font-mono text-body-sm leading-none font-medium text-ink-500">
					7/24
				</span>
			</div>
			<div className="flex flex-col items-start gap-3 lg:gap-4">
				<Plate
					code="DK"
					number="1234"
					suffix="AB"
					size="md"
					highlight="code"
					className="lg:px-5 lg:py-3 lg:text-[56px]"
				/>
				<p className="font-display text-heading leading-snug font-bold tracking-title text-ink-1000">
					DK dipakai daerah mana?
				</p>
			</div>
			<div className="flex h-12 items-center rounded-sm border border-ink-1000 bg-paper-0 px-4 text-body-lg leading-none text-ink-500">
				Ketik jawaban…
			</div>
			<span className="inline-flex items-center gap-2 text-body-sm leading-none text-ink-500 max-lg:hidden">
				<kbd className="rounded-xs border border-ink-300 px-[5px] py-[3px] font-mono text-micro leading-none font-medium text-ink-900">
					Enter
				</kbd>
				untuk lanjut
			</span>
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
							pemakainya. Soal muncul lagi tepat saat ingatanmu mulai pudar, jadi
							beberapa menit sehari sudah cukup.
						</p>
					</div>
					<div className="flex flex-col gap-3 max-lg:order-last lg:gap-6">
						<div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
							<Button href="/sesi" size="lg" icon="play">
								Mulai belajar
							</Button>
							<Link
								href="/beranda"
								className="inline-flex h-12 items-center justify-center rounded-sm border border-transparent px-4 font-display text-body-md leading-none font-semibold whitespace-nowrap text-ink-1000 transition-colors duration-90 hover:bg-paper-50 lg:h-14 lg:px-5"
							>
								Ikut tes penempatan
							</Link>
						</div>
						<span className="text-center text-body-sm leading-normal text-ink-500 lg:text-left">
							Gratis, tanpa iklan, dan tanpa akun.
						</span>
					</div>
				</div>
				<DemoCard />
			</div>
		</section>
	);
}

function HowItWorks() {
	return (
		<section
			id="cara-kerja"
			className="scroll-mt-[61px] border-b border-hairline bg-paper-50 lg:scroll-mt-[69px]"
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
							className="grid grid-cols-[72px_minmax(0,1fr)] items-baseline gap-3 border-b border-hairline py-3 last:border-b-0 lg:flex lg:flex-col lg:gap-2 lg:border-b-0 lg:py-0"
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
			className="scroll-mt-[61px] border-b border-hairline lg:scroll-mt-[69px]"
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
				<div className="flex min-w-0 flex-col border-t border-hairline">
					{KINDS.map(([name, example]) => (
						<div
							key={name}
							className="flex flex-col gap-1 border-b border-hairline py-3 lg:grid lg:grid-cols-[minmax(150px,210px)_minmax(0,1fr)] lg:items-baseline lg:gap-x-5 lg:gap-y-2 lg:py-4"
						>
							<span className="font-display text-body-md leading-[1.3] font-semibold text-ink-1000">
								{name}
							</span>
							<span className="text-body-sm leading-normal text-ink-700 lg:text-body-md">
								{example}
							</span>
						</div>
					))}
				</div>
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
				<div className="grid gap-3 lg:grid-cols-4 lg:gap-5">
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
		<section
			id="data"
			className="scroll-mt-[61px] border-b border-hairline lg:scroll-mt-[69px]"
		>
			<div
				className={`${WRAP} grid gap-6 py-12 lg:grid-cols-2 lg:items-start lg:gap-10 lg:py-16`}
			>
				<div className="flex flex-col gap-3 lg:max-w-[44ch]">
					<Heading label="Data dan privasi" title="Progresmu tetap di tanganmu." />
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
					<Heading title="Sudah tahu sebagian kode pelat?" />
					<p className="text-ink-700 type-body">
						Tes penempatan memindahkan kode yang sudah kamu kenal langsung ke
						pengulangan. Boleh dilewati.
					</p>
				</div>
				<Link href="/sesi" className={buttonClass("primary", "lg", false)}>
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
					<span className="inline-flex items-center gap-[0.3em] rounded-sm border-2 border-ink-1000 px-2 py-[3px] font-plate text-[16px] leading-none font-bold tracking-[0.05em] text-ink-1000">
						T<span>3</span>
						<span>RKA</span>
					</span>
					<span className="text-body-sm leading-[1.4] text-ink-500">
						Dikembangkan mandiri, gratis, dan tanpa iklan.
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

export function Mulai() {
	return (
		<>
			<Header />
			<main className="pt-[61px] lg:pt-[69px]">
				<Hero />
				<HowItWorks />
				<QuestionKinds />
				<Extras />
				<Privacy />
				<Closing />
			</main>
			<Footer />
		</>
	);
}
