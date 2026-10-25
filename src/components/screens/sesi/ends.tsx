import { Button } from "@/components/ui/button";
import { CodeChip } from "@/components/ui/code-chip";
import { Callout } from "@/components/ui/feedback";
import { GROUP_TEXT } from "@/components/ui/groups";
import { Icon } from "@/components/ui/icon";
import type { EndView, FactCardView } from "@/lib/session/end";
import type { Mode } from "@/lib/session/modes";

const FACT_LABEL = {
	Terverifikasi: { tone: "text-go-700", icon: "shield-check" },
	Diperdebatkan: { tone: "text-caution-700", icon: "circle-alert" },
	Mitos: { tone: "text-stop-700", icon: "triangle-alert" }
} as const;

function FactCard({ fact }: { fact: FactCardView }) {
	const label = FACT_LABEL[fact.label];
	return (
		<article className="flex flex-col overflow-hidden rounded-md border border-hairline bg-paper-0 lg:shadow-lift">
			<header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
				<span className="inline-flex items-center gap-2 type-label text-ink-500">
					<Icon name="book-open" size={16} color="bg-current" />
					Fun Facts
				</span>
				<span className={`inline-flex items-center gap-2 type-label ${label.tone}`}>
					<Icon name={label.icon} size={16} color="bg-current" />
					{fact.label}
				</span>
			</header>
			<div
				className={`flex flex-col items-start gap-3 p-4 lg:gap-4 lg:pb-5 ${fact.code ? "lg:grid lg:grid-cols-[auto_minmax(0,1fr)]" : ""}`}
			>
				{fact.code && (
					<CodeChip
						code={fact.code.code}
						group={fact.code.group}
						size="md"
						className="max-lg:h-7.5 max-lg:w-11 max-lg:text-body-md"
					/>
				)}
				<p className="max-w-prose text-pretty text-ink-900 type-prose max-lg:text-body-md max-lg:leading-[1.6]">
					{fact.text}
				</p>
			</div>
			{fact.source && (
				<footer className="flex flex-col gap-1 border-t border-hairline bg-paper-50 px-4 py-3 lg:flex-row lg:items-baseline lg:gap-3">
					<span className="flex-none type-label text-ink-500">Sumber</span>
					<cite className="font-sans text-body-sm leading-[1.4] text-ink-700 not-italic">
						{fact.source}
					</cite>
				</footer>
			)}
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
					className={`font-display font-bold tracking-hero tabular-nums ${size === "display" ? "text-[32px] leading-none lg:text-display lg:leading-tight" : "text-heading leading-tight"} ${tone}`}
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

const TITLE: Record<Mode, string> = {
	hariIni: "Sesi selesai",
	harian: "Tantangan hari ini selesai",
	kilat: "Waktu habis",
	terfokus: "Latihan selesai",
	diplomat: "Sesi selesai",
	sebutkan: "Sesi selesai",
	penempatan: "Tes selesai"
};

const percent = (value: number | null) => (value === null ? "–" : `${value}%`);

function LoginPrompt({ onLogin, onDismiss }: { onLogin: () => void; onDismiss: () => void }) {
	return (
		<div className="flex flex-col gap-3 rounded-md border border-hairline bg-paper-0 p-4">
			<span className="text-ink-900 type-body">
				Progres ini hanya tersimpan di perangkat ini. Masuk untuk menyimpannya di akun.
			</span>
			<div className="flex items-center gap-3">
				<Button variant="outline" className="w-fit" onClick={onLogin}>
					Masuk
				</Button>
				<Button variant="quiet" className="w-fit bg-transparent" onClick={onDismiss}>
					Nanti saja
				</Button>
			</div>
		</div>
	);
}

export function SessionEnd({
	view,
	onLogin,
	onDismissLogin
}: {
	view: EndView;
	onLogin: () => void;
	onDismissLogin: () => void;
}) {
	let body: React.ReactNode;
	if (view.mode === "harian")
		body = (
			<div className="grid grid-cols-2 items-end gap-4 lg:items-stretch lg:gap-5">
				<Metric
					value={view.streak}
					unit="hari"
					label="Hari Beruntun"
					tone="text-tangerine-700"
				/>
				<Metric
					value={
						<>
							{view.correct}{" "}
							<span className="font-mono text-body-sm font-medium tracking-normal text-ink-500">
								dari
							</span>{" "}
							<span className="font-mono text-body-sm tracking-normal">
								{view.answered}
							</span>
						</>
					}
					label="Jawaban benar"
					size="heading"
				/>
			</div>
		);
	else if (view.mode === "kilat")
		body = (
			<>
				<Metric value={view.correct} label="Jawaban benar" />
				{view.kilatLine && (
					<div
						className={`flex items-center gap-3 rounded-md border bg-paper-0 px-4 py-3 ${view.kilatNew ? "border-ink-1000" : "border-hairline"}`}
					>
						<Icon name="trophy" size={18} color="bg-ink-1000" />
						<span className="font-display text-body-md leading-[1.3] font-semibold text-ink-1000">
							{view.kilatLine}
						</span>
					</div>
				)}
			</>
		);
	else if (view.mode === "terfokus")
		body = (
			<div className="grid grid-cols-2 items-end gap-4 lg:items-stretch lg:gap-5">
				<Metric value={view.answered} label="Soal dijawab" />
				<Metric
					value={percent(view.accuracy)}
					label="Akurasi"
					size="heading"
					tone="text-go-500"
				/>
			</div>
		);
	else
		body = (
			<>
				<div className="grid grid-cols-2 items-end gap-4 lg:items-stretch lg:gap-5">
					<Metric value={percent(view.accuracy)} label="Akurasi" tone="text-go-500" />
					<Metric
						value={view.latency ?? "–"}
						unit="detik"
						label="Rata-rata waktu respons"
					/>
					{view.mastery ? (
						<Metric
							value={view.mastery.delta}
							unit={view.mastery.name}
							label="Penguasaan wilayah"
							size="heading"
							tone={GROUP_TEXT[view.mastery.group]}
						/>
					) : (
						<Note label="Penguasaan wilayah">
							<span className="text-ink-500 type-body">
								Penguasaan wilayah belum berubah pada sesi ini.
							</span>
						</Note>
					)}
					<Metric value={view.answered} label="Soal dijawab" size="heading" />
				</div>
				<Note label="Kode yang perlu dibedakan">
					{view.pair ? (
						<div className="flex items-center gap-3">
							<CodeChip code={view.pair.a} group={view.pair.group} />
							<span className="text-ink-500 type-body">sering tertukar dengan</span>
							<CodeChip code={view.pair.b} group={view.pair.group} />
						</div>
					) : (
						<span className="text-ink-500 type-body">
							Tidak ada kode baru yang sering tertukar.
						</span>
					)}
				</Note>
				{view.mode === "hariIni" && (
					<Callout tone="success" label="Jadwal hari ini">
						{view.remainingDue
							? `${view.remainingDue} soal masih perlu diulang hari ini.`
							: "Jadwal hari ini sudah beres."}
					</Callout>
				)}
				{view.held && (
					<Callout label="Materi baru">
						Materi baru dijeda hari ini agar sesi tetap ringan.
					</Callout>
				)}
			</>
		);
	return (
		<>
			<h1 className="flex items-center gap-3 font-display text-[28px] leading-[1.1] font-bold tracking-hero lg:text-display lg:leading-[1.05]">
				<span>{TITLE[view.mode]}</span>
			</h1>
			{body}
			{view.fact && <FactCard fact={view.fact} />}
			{view.loginPrompt && <LoginPrompt onLogin={onLogin} onDismiss={onDismissLogin} />}
			<Button block href="/beranda" className="max-lg:hidden">
				Kembali ke beranda
			</Button>
		</>
	);
}

export type PlacementEndView = {
	tier: string;
	knownPercent: number;
	seeded: number;
	newPerDay: number;
	suggestion: string;
	fact: FactCardView | null;
};

/** The placement result: the tier, what moved to reviews and the suggested Cakupan. */
export function PlacementEnd({
	view,
	onAccept,
	onChoose
}: {
	view: PlacementEndView;
	onAccept: () => void;
	onChoose: () => void;
}) {
	return (
		<>
			<h1 className="flex items-center gap-3 font-display text-[28px] leading-[1.1] font-bold tracking-hero lg:text-display lg:leading-[1.05]">
				<span>{TITLE.penempatan}</span>
			</h1>
			<div className="flex flex-col gap-2">
				<span className="font-display text-heading leading-tight font-bold">
					Tingkat: {view.tier}
				</span>
				<span className="text-ink-900 type-body">
					Sekitar {view.knownPercent}% kode sudah dikenal. {view.seeded} kode langsung
					masuk pengulangan. Materi lainnya dibuka bertahap, hingga {view.newPerDay} per
					hari.
				</span>
			</div>
			<Callout tone="info" label={<span className="text-sky-700">Cakupan</span>}>
				Cakupan yang disarankan: {view.suggestion}
			</Callout>
			<div className="grid grid-cols-2 gap-3">
				<Button block onClick={onAccept}>
					Pakai saran ini
				</Button>
				<Button variant="secondary" block onClick={onChoose}>
					Pilih sendiri
				</Button>
			</div>
			{view.fact && <FactCard fact={view.fact} />}
		</>
	);
}

/** The summary's action in the phone's bottom bar. */
export function EndFooter() {
	return (
		<Button block href="/beranda" className="max-lg:h-13">
			Kembali ke beranda
		</Button>
	);
}
