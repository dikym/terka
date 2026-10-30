import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CodeChip } from "@/components/ui/code-chip";
import { FadeScroll } from "@/components/ui/fade-scroll";
import { Skeleton, SkeletonText, skeletonWidth } from "@/components/ui/feedback";
import { GROUP_BG, GROUP_NAME } from "@/components/ui/groups";
import { Flag, Icon } from "@/components/ui/icon";
import { SpecialPlate } from "@/components/ui/plate";
import { Tooltip } from "@/components/ui/tooltip";
import { DotLabel, Tag } from "@/components/ui/tag";
import type { Area, DiplomatEntry, diplomatList, RegionDetail } from "@/lib/view/reference";

export const REFERENCE_ONLY = "Tersedia di Referensi, belum masuk latihan.";

export function Hint({ children }: { children: React.ReactNode }) {
	return <p className="font-sans text-body-sm leading-normal text-ink-500">{children}</p>;
}

export function Divider({ label }: { label: React.ReactNode }) {
	return (
		<div className="flex items-center gap-3">
			<span className="type-label text-ink-500">{label}</span>
			<span className="h-px flex-1 bg-hairline" />
		</div>
	);
}

function Figure({ value, label }: { value: React.ReactNode; label: React.ReactNode }) {
	return (
		<span className="flex min-w-0 flex-col gap-0.75">
			<span className="font-mono text-body-md leading-none font-semibold text-ink-1000">
				{value}
			</span>
			<span className="font-sans text-micro leading-[1.2] text-ink-500">{label}</span>
		</span>
	);
}

export function UnverifiedLegend({ note }: { note?: string }) {
	return (
		// With a note, a phone stacks it under the label.
		<div
			className={`flex lg:items-center lg:gap-2 ${note ? "items-start gap-3" : "items-center gap-2"}`}
		>
			<span
				aria-hidden="true"
				className={`inline-block h-3.5 w-5 flex-none rounded-xs border border-ink-200 bg-caution-100 ${note ? "mt-0.5 lg:mt-0" : ""}`}
			/>
			<div className="flex flex-col gap-0.5 lg:contents">
				<span
					className={`font-sans text-body-sm leading-[1.3] lg:font-medium lg:text-ink-900 ${note ? "font-semibold text-ink-1000" : "font-medium text-ink-900"}`}
				>
					Belum terverifikasi penuh.
				</span>
				{note && (
					<p className="font-sans text-body-sm leading-[1.4] text-ink-500 lg:leading-normal">
						{note}
					</p>
				)}
			</div>
		</div>
	);
}

function AreaGroup({ label, areas, loading }: { label: string; areas: Area[]; loading: boolean }) {
	if (!loading && !areas.length) return null;
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-baseline gap-2">
				<span className="type-label text-ink-500">{label}</span>
				<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
					{loading ? <SkeletonText width="1.2em" /> : areas.length}
				</span>
			</div>
			<div className="flex flex-wrap gap-2">
				{areas.map((area) =>
					area.unverified ? (
						<Tag key={area.name} tone="unverified" title="Belum terverifikasi penuh">
							{area.name}
						</Tag>
					) : (
						<Tag key={area.name}>
							{loading ? (
								<SkeletonText width={skeletonWidth(area.name)} />
							) : (
								area.name
							)}
						</Tag>
					)
				)}
			</div>
		</div>
	);
}

export function RegionCard({ detail, loading }: { detail: RegionDetail; loading: boolean }) {
	const total = detail.kota.length + detail.kabupaten.length;
	const unverified = [...detail.kota, ...detail.kabupaten].some((area) => area.unverified);
	// While loading, three tags per section are enough to hold the layout.
	const kota = loading ? detail.kota.slice(0, 3) : detail.kota;
	const kabupaten = loading ? detail.kabupaten.slice(0, 3) : detail.kabupaten;
	return (
		<Card bar={loading ? "animate-skl bg-ink-100" : GROUP_BG[detail.group]}>
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-4">
					{loading ? (
						<Skeleton className="h-13 w-16 flex-none rounded-sm" />
					) : (
						<CodeChip code={detail.code} group={detail.group} size="lg" />
					)}
					<div className="flex flex-col gap-2">
						<span className="font-display text-heading leading-[1.1] font-bold">
							{loading ? <SkeletonText width="7.7em" /> : detail.province}
						</span>
						<div className="grid grid-cols-2 gap-4">
							<Figure
								value={
									loading ? (
										<SkeletonText width="4.4em" />
									) : (
										GROUP_NAME[detail.group]
									)
								}
								label={loading ? <SkeletonText width="3.5em" /> : "kawasan"}
							/>
							<Figure
								value={loading ? <SkeletonText width="1.2em" /> : total}
								label={loading ? <SkeletonText width="3.5em" /> : "kab/kota"}
							/>
						</div>
					</div>
				</div>
			</div>
			{total === 0 && !loading ? (
				<Hint>Rincian kab/kota kode ini belum ada di data contoh.</Hint>
			) : (
				<>
					<AreaGroup label="Kota" areas={kota} loading={loading} />
					<AreaGroup label="Kabupaten" areas={kabupaten} loading={loading} />
				</>
			)}
			{detail.note && (
				<div className="flex items-start gap-2 border-t border-hairline pt-3">
					{/* Level with the first line when the note wraps. */}
					<Icon name="info" size={14} className="mt-[3px]" />
					<Hint>{loading ? <SkeletonText width="22em" /> : detail.note}</Hint>
				</div>
			)}
			{unverified && <UnverifiedLegend />}
		</Card>
	);
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 border-b border-hairline py-2 lg:grid-cols-[120px_minmax(0,1fr)]">
			<span className="type-label text-ink-500">{label}</span>
			<span className="text-ink-900 type-body">{children}</span>
		</div>
	);
}

function Verified() {
	return (
		<span className="inline-flex items-center gap-2 self-start type-label whitespace-nowrap text-go-700">
			<Icon name="shield-check" size={16} color="bg-current" />
			Terverifikasi
		</span>
	);
}

const PRACTICE_NOTE =
	"Latih kode negara pada pelat CD. Jadwal dan materi barunya terpisah dari latihan wilayah.";

function PracticeButton({ className = "" }: { className?: string }) {
	return (
		<Button
			variant="secondary"
			size="sm"
			icon="flag"
			href="/sesi?mode=diplomat"
			className={className}
		>
			Latih kode diplomat
		</Button>
	);
}

/** The practice offer for a list of diplomat cards: once, in the side panel. */
export function DiplomatPractice() {
	return (
		<Card className="gap-3">
			<CardHeader label="Latihan Kode diplomat" />
			<Hint>{PRACTICE_NOTE}</Hint>
			<PracticeButton className="flex w-full" />
		</Card>
	);
}

export function SpecialCard({
	entry,
	practice = true
}: {
	entry: DiplomatEntry;
	/** Off in a list of cards, where the side panel offers it once. */
	practice?: boolean;
}) {
	const { number } = entry;
	return (
		<Card bar="bg-ink-1000">
			<div className="flex flex-wrap items-center justify-between gap-4 lg:flex-nowrap">
				<div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center lg:gap-5">
					<SpecialPlate parts={["CD", number, ""]} size="lg" />
					<div className="flex flex-col gap-2">
						<span className="flex items-center gap-3">
							{entry.flag && <Flag code={entry.flag} large />}
							<span className="font-display text-title leading-[1.1] font-bold">
								{entry.name}
							</span>
						</span>
						<div className="grid grid-cols-2 gap-4">
							<Figure value={`CD ${number}`} label="kode negara" />
							<Figure value={entry.type} label="tipe" />
						</div>
					</div>
				</div>
				<Verified />
			</div>
			<div>
				<DetailRow label="Jenis">
					{entry.type === "negara"
						? "Kode negara korps diplomatik"
						: "Kode organisasi internasional"}
				</DetailRow>
				<DetailRow label="Sumber">{entry.source}</DetailRow>
				{entry.checked && <DetailRow label="Diperiksa">{entry.checked}</DetailRow>}
				<DetailRow label="Alias">{entry.alias}</DetailRow>
			</div>
			{practice && (
				<div className="flex flex-col gap-3 rounded-sm border border-ink-200 bg-paper-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
					<div className="flex min-w-0 flex-col gap-1">
						<span className="type-label text-ink-700">Latihan Kode diplomat</span>
						<span className="text-ink-900 type-body">{PRACTICE_NOTE}</span>
					</div>
					<div className="flex-none">
						<PracticeButton className="max-lg:flex max-lg:w-full" />
					</div>
				</div>
			)}
		</Card>
	);
}

const CC_TEXT =
	"CC dipakai korps konsulat, CH dipakai konsul kehormatan. Tersedia di Referensi, belum masuk latihan.";
const RI_TEXT =
	"Pelat RI dipakai kendaraan dinas Presiden, Wakil Presiden, ketua lembaga tinggi negara, dan pejabat setingkat menteri.";
const RI_CAVEAT =
	"Tidak ada sumber valid yang memuat daftar lengkap kode RI, dan alokasi nomornya dapat berubah sewaktu-waktu.";

export function FormatCards() {
	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card className="gap-3">
				<CardHeader
					label="CC dan CH"
					aside={<DotLabel hint={REFERENCE_ONLY}>Referensi saja</DotLabel>}
				/>
				<SpecialPlate parts={["CC", "12", "10"]} size="md" />
				<p className="font-sans text-body-sm leading-normal text-ink-900">{CC_TEXT}</p>
			</Card>
			<Card className="gap-3">
				<CardHeader label="RI" aside={<DotLabel>Hanya format</DotLabel>} />
				<SpecialPlate parts={["RI", "1", ""]} size="md" />
				<p className="font-sans text-body-sm leading-normal text-ink-900">{RI_TEXT}</p>
				<Hint>{RI_CAVEAT}</Hint>
			</Card>
		</div>
	);
}

export function FormatCard({ kind }: { kind: "cc" | "ri" }) {
	const cc = kind === "cc";
	return (
		<Card bar="bg-ink-1000">
			<div className="flex flex-wrap items-start justify-between gap-4 lg:flex-nowrap">
				<div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center lg:gap-5">
					<SpecialPlate parts={cc ? ["CC", "12", "10"] : ["RI", "1", ""]} size="lg" />
					<div className="flex flex-col gap-2">
						<span className="type-label text-ink-500">Kode Khusus</span>
						<span className="font-display text-title leading-[1.1] font-bold">
							{cc ? "Korps konsulat" : "Pejabat negara"}
						</span>
					</div>
				</div>
				<span className="self-start max-lg:flex">
					<DotLabel hint={cc ? REFERENCE_ONLY : undefined}>
						{cc ? "Referensi saja" : "Hanya format"}
					</DotLabel>
				</span>
			</div>
			<p className="max-w-prose text-ink-900 type-body">{cc ? CC_TEXT : RI_TEXT}</p>
			{!cc && <p className="max-w-prose text-ink-900 type-body">{RI_CAVEAT}</p>}
			<div>
				{cc && <DetailRow label="Kode sejenis">CH, konsul kehormatan</DetailRow>}
				<DetailRow label="Latihan">{cc ? "Belum tersedia" : "Tidak tersedia"}</DetailRow>
			</div>
		</Card>
	);
}

export function NoResult({ query }: { query: string }) {
	return (
		<section className="flex min-h-67.5 flex-col items-center justify-center gap-5 rounded-md border border-hairline bg-paper-0 px-6 py-8 text-center shadow-lift">
			<div className="relative inline-flex">
				<SpecialPlate parts={["", "?", ""]} size="lg" empty />
			</div>
			<div className="flex flex-col items-center gap-2">
				<h2 className="font-display text-title leading-[1.2] font-bold tracking-title">
					Tidak ada hasil untuk &ldquo;{query}&rdquo;.
				</h2>
			</div>
		</section>
	);
}

export function DiplomatList({
	list,
	current,
	onPick
}: {
	list: ReturnType<typeof diplomatList>;
	current: string;
	onPick: (query: string) => void;
}) {
	return (
		<Card className="gap-3">
			<CardHeader label="Kode diplomat" />
			<div className="grid grid-cols-3 gap-4">
				<Figure value={list.summary.entries} label="entri" />
				<Figure value={list.summary.first} label="kode pertama" />
				<Figure value={list.summary.last} label="kode terakhir" />
			</div>
			<FadeScroll centerOn={`[data-number="${current}"]`} className="-mx-2 max-h-96 px-2">
				{list.entries.map((entry) => (
					<button
						key={entry.number}
						type="button"
						data-number={entry.number}
						aria-current={entry.number === current ? "true" : undefined}
						onClick={() => onPick(`CD ${entry.number}`)}
						// Fixed columns keep every code, flag and name on the same line down the list.
						className={`-mx-2 grid min-h-11 w-[calc(100%+1rem)] cursor-pointer grid-cols-[64px_20px_minmax(0,1fr)_auto] items-center gap-3 border-b border-hairline px-2 text-left ${entry.number === current ? "bg-paper-50 font-semibold" : ""}`}
					>
						<span className="font-mono text-body-md leading-[1.2] font-medium text-ink-1000 tabular-nums">
							CD {entry.number}
						</span>
						{entry.flag && (
							<span className="flex">
								<Flag code={entry.flag} />
							</span>
						)}
						{/* Without a flag the name starts where the flag would be. */}
						<Tooltip
							content={entry.name}
							align="start"
							truncatedOnly
							className={`flex min-w-0 ${entry.flag ? "" : "col-span-2"}`}
						>
							<span className="truncate text-ink-900 type-body">{entry.name}</span>
						</Tooltip>
						<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
							{entry.type}
						</span>
					</button>
				))}
			</FadeScroll>
		</Card>
	);
}
