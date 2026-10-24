import { Button } from "@/components/ui/button";
import { CodeChip } from "@/components/ui/code-chip";
import { Callout } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import type { Mode } from "@/dummy/session";
import type { SessionState } from "@/dummy/session-reducer";

function FactCard() {
	return (
		<article className="flex flex-col overflow-hidden rounded-md border border-hairline bg-paper-0 shadow-lift">
			<header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
				<span className="inline-flex items-center gap-2 type-label text-ink-500">
					<Icon name="book-open" size={16} color="bg-current" />
					Fakta menarik
				</span>
				<span className="inline-flex items-center gap-2 type-label text-go-700">
					<Icon name="shield-check" size={16} color="bg-current" />
					Terverifikasi
				</span>
			</header>
			<div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 px-4 pt-4 pb-5">
				<CodeChip code="DA" group="kalimantan" size="md" />
				<p className="max-w-prose text-pretty text-ink-900 type-prose">
					Wilayah Zuider en Ooster Afdeeling van Borneo memakai satu kode tunggal, DA.
					Kalimantan Selatan adalah wilayah pertama di Kalimantan yang memakai pelat
					nomor.
				</p>
			</div>
			<footer className="flex items-baseline gap-3 border-t border-hairline bg-paper-50 px-4 py-3">
				<span className="flex-none type-label text-ink-500">Sumber</span>
				<cite className="font-sans text-body-sm leading-[1.4] text-ink-700 not-italic">
					Handboek voor automobilisten, Java Motor Club, 1920
				</cite>
			</footer>
		</article>
	);
}

function Metric({
	value,
	unit,
	label,
	size = "display",
	tone = ""
}: {
	value: React.ReactNode;
	unit?: string;
	label: string;
	size?: "display" | "heading";
	tone?: string;
}) {
	return (
		<div className="flex flex-col items-start gap-1">
			<div className="flex items-baseline gap-2">
				<span
					className={`font-display leading-tight font-bold tracking-hero tabular-nums ${size === "display" ? "text-display" : "text-heading"} ${tone}`}
				>
					{value}
				</span>
				{unit && (
					<span className="font-mono text-body-sm leading-none font-medium text-ink-500">
						{unit}
					</span>
				)}
			</div>
			<span className="type-label text-ink-500">{label}</span>
		</div>
	);
}

function Note({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col items-start gap-2">
			<span className="type-label text-ink-500">{label}</span>
			{children}
		</div>
	);
}

const accuracy = (state: SessionState) => {
	const right = state.results.filter((result) => result === "right").length;
	return state.results.length ? Math.round((right / state.results.length) * 100) : 0;
};

const TITLE: Record<Mode, string> = {
	hariIni: "Sesi selesai",
	harian: "Tantangan hari ini selesai",
	kilat: "Waktu habis",
	terfokus: "Latihan selesai",
	diplomat: "Sesi selesai",
	sebutkan: "Sesi selesai"
};

export function SessionEnd({ state, held }: { state: SessionState; held: boolean }) {
	const right = state.results.filter((result) => result === "right").length;
	const answered = state.results.length;
	let body: React.ReactNode;
	if (state.mode === "harian")
		body = (
			<div className="grid grid-cols-2 gap-5">
				<Metric value="17" unit="hari" label="Hari Beruntun" tone="text-tangerine-700" />
				<Metric
					value={
						<>
							{right}{" "}
							<span className="font-mono text-body-sm font-medium tracking-normal text-ink-500">
								dari
							</span>{" "}
							<span className="font-mono text-body-sm tracking-normal">
								{answered}
							</span>
						</>
					}
					label="Jawaban benar"
					size="heading"
				/>
			</div>
		);
	else if (state.mode === "kilat")
		body = (
			<>
				<Metric value={right} label="Jawaban benar" />
				<div className="flex items-center gap-3 rounded-md border border-ink-1000 bg-paper-0 px-4 py-3">
					<Icon name="trophy" size={18} color="bg-ink-1000" />
					<span className="font-display text-body-md leading-[1.3] font-semibold text-ink-1000">
						Rekor baru di Seluruh Indonesia
					</span>
				</div>
			</>
		);
	else if (state.mode === "terfokus")
		body = (
			<div className="grid grid-cols-2 gap-5">
				<Metric value={answered} label="Soal dijawab" />
				<Metric
					value={`${accuracy(state)}%`}
					label="Akurasi"
					size="heading"
					tone="text-go-500"
				/>
			</div>
		);
	else
		body = (
			<>
				<div className="grid grid-cols-2 gap-5">
					<Metric value={`${accuracy(state)}%`} label="Akurasi" tone="text-go-500" />
					<Metric
						value={held ? "2,4" : "2,1"}
						unit="detik"
						label="Rata-rata waktu respons"
					/>
					{held ? (
						<Note label="Penguasaan wilayah">
							<span className="text-ink-500 type-body">
								Penguasaan wilayah belum berubah pada sesi ini.
							</span>
						</Note>
					) : (
						<Metric
							value="+6%"
							unit="Bali & Nusra"
							label="Penguasaan wilayah"
							size="heading"
							tone="text-group-balinusra"
						/>
					)}
					<Metric value={answered} label="Soal dijawab" size="heading" />
				</div>
				<Note label="Kode yang perlu dibedakan">
					{held ? (
						<span className="text-ink-500 type-body">
							Tidak ada kode baru yang sering tertukar.
						</span>
					) : (
						<div className="flex items-center gap-3">
							<CodeChip code="BE" group="sumatera" />
							<span className="text-ink-500 type-body">sering tertukar dengan</span>
							<CodeChip code="BD" group="sumatera" />
						</div>
					)}
				</Note>
				<Callout tone="success" label="Jadwal hari ini">
					{held
						? "Tidak ada soal yang perlu diulang hari ini."
						: "Jadwal hari ini sudah beres."}
				</Callout>
				{held && (
					<Callout label="Materi baru">
						Materi baru dijeda hari ini agar sesi tetap ringan.
					</Callout>
				)}
			</>
		);
	return (
		<>
			<h1 className="flex items-center gap-3 font-display text-display leading-[1.05] font-bold tracking-hero">
				<span>{TITLE[state.mode]}</span>
			</h1>
			{body}
			<FactCard />
			<Button block href="/">
				Kembali ke beranda
			</Button>
		</>
	);
}
