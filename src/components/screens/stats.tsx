import { Link } from "@/components/ui/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CodeLink } from "@/components/ui/code-chip";
import { Pill, ProgressBar, Skeleton, SkeletonText, skeletonWidth } from "@/components/ui/feedback";
import { GROUP_BG } from "@/components/ui/groups";
import { Icon } from "@/components/ui/icon";
import { type MapProvince, MasteryMap } from "@/components/ui/mastery-map";
import { Tooltip } from "@/components/ui/tooltip";
import { type CodeStatus, type Stats, STATUS_LABEL } from "@/lib/view/stats";
import { SIGHTING_WINDOW_DAYS } from "@/rules";
import { SyncChip } from "./sync-chip";

const PILL_TONE = { learning: "learning", leech: "leech", suspended: "off" } as const;

export function StatusPill({ status }: { status: CodeStatus }) {
	return <Pill tone={PILL_TONE[status]}>{STATUS_LABEL[status]}</Pill>;
}

const PILL_SKELETON = "h-[26px] w-[125px] rounded-full";
const CHIP_SKELETON = "h-7 w-10 flex-none rounded-sm";

/** Copy, or a skeleton line sized to that copy while loading. */
const text = (loading: boolean, copy: string | number) =>
	loading ? <SkeletonText width={skeletonWidth(String(copy))} /> : copy;

function Figure({ value, label, loading }: { value: string; label: string; loading: boolean }) {
	return (
		<span className="flex min-w-0 flex-col gap-[3px]">
			<span className="font-mono text-body-md leading-none font-semibold text-ink-1000">
				{text(loading, value)}
			</span>
			<span className="font-sans text-micro leading-[1.2] text-ink-500">
				{text(loading, label)}
			</span>
		</span>
	);
}

const LEGEND = [
	["bg-go-700 border-transparent", "Dikuasai", "100%"],
	["bg-go-500 border-transparent", "Hampir", "67–99%"],
	["bg-go-300 border-transparent", "Separuh", "34–66%"],
	["bg-go-100 border-transparent", "Mulai", "1–33%"],
	["bg-ink-100 border-ink-200", "Belum mulai", "0%"]
];

export function MapLegend() {
	return (
		<div className="grid grid-cols-3 gap-3 lg:flex lg:flex-wrap lg:gap-x-5 lg:gap-y-3">
			{LEGEND.map(([swatch, label, range]) => (
				<span key={label} className="inline-flex items-center gap-2">
					<span
						className={`size-3.5 flex-none rounded-[3px] border lg:size-4.5 ${swatch}`}
					/>
					<span className="flex flex-col gap-0.5 lg:h-4.5 lg:justify-between lg:gap-0">
						<span className="font-sans text-label leading-[1.1] font-medium text-ink-900 lg:text-[9px] lg:leading-none">
							{label}
						</span>
						<span className="font-mono text-micro leading-none text-ink-500 lg:text-[7px]">
							{range}
						</span>
					</span>
				</span>
			))}
			<span className="inline-flex items-center gap-2">
				<span className="size-3.5 flex-none rounded-[3px] border border-ink-200 bg-paper-50 lg:size-4.5" />
				<span className="font-sans text-label leading-[1.1] font-medium text-ink-900 lg:text-body-sm lg:leading-none">
					Belum ada materi
				</span>
			</span>
		</div>
	);
}

// On a phone the hint wraps as running text, so its icons sit on the text line.
const INLINE_ICON = "mr-1 align-[-2px] lg:mr-0";

export function MapHint() {
	return (
		<p className="font-sans text-body-sm leading-[1.3] text-ink-700 lg:inline-flex lg:items-center lg:gap-2">
			<Icon name="info" size={14} className={INLINE_ICON} />
			<span className="lg:hidden">Ketuk provinsi untuk rinciannya. Cubit atau tombol </span>
			<span className="hidden lg:inline">
				Arahkan kursor ke provinsi untuk rinciannya. Gulir atau tombol{" "}
			</span>
			<Icon name="plus" size={12} className={INLINE_ICON} />{" "}
			<Icon name="minus" size={12} className={INLINE_ICON} /> untuk memperbesar.
		</p>
	);
}

function NationalSummary({ s, loading }: { s: Stats; loading: boolean }) {
	return (
		<div className="grid grid-cols-1 items-end gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
			<div className="flex flex-col gap-3">
				<span className="type-label text-ink-500">Penguasaan wilayah nasional</span>
				<span className="type-metric">
					{loading ? <SkeletonText width="1.7em" /> : s.national.percent}
				</span>
				<div className="grid grid-cols-2 gap-4">
					<Figure value={s.national.codes} label="kode dikuasai" loading={loading} />
					<Figure value={s.national.groups} label="kawasan dikuasai" loading={loading} />
				</div>
			</div>
			<div className="flex flex-col gap-3">
				{s.levels.map((level) => (
					<div
						key={level.level}
						className="grid grid-cols-[72px_minmax(0,1fr)_44px] items-center gap-3 lg:grid-cols-[96px_minmax(0,1fr)_44px]"
					>
						<div className="flex flex-col gap-0.75">
							<span className="font-display text-body-sm leading-none font-semibold">
								{text(loading, level.level)}
							</span>
							<span className="font-sans text-micro leading-none text-ink-500">
								{text(loading, level.name)}
							</span>
						</div>
						<div className="flex flex-col gap-1">
							{!loading && (
								<ProgressBar
									value={level.percent}
									className="h-2.5 min-w-0 flex-1"
								/>
							)}
							<span className="font-mono text-micro leading-[1.2] font-medium text-ink-500 tabular-nums">
								{text(loading, level.passed)}
							</span>
						</div>
						<span className="text-right">
							<span className="font-mono text-body-md leading-[1.2] font-medium text-ink-1000 tabular-nums">
								{text(loading, `${level.percent}%`)}
							</span>
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function MapCard({
	loading,
	provinces
}: {
	loading: boolean;
	provinces: Record<string, MapProvince>;
}) {
	return (
		<Card>
			<CardHeader label="Peta Penguasaan" title="Penguasaan tiap provinsi" />
			<div className="-mx-4 border-y border-hairline lg:mx-0 lg:border-0">
				<MasteryMap provinces={provinces} loading={loading} />
			</div>
			<div className="flex flex-col items-start gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6 lg:border-t lg:border-hairline lg:pt-4">
				<div className="flex flex-col gap-3">
					<MapLegend />
					<MapHint />
				</div>
				<Link
					href="/statistik/peta"
					className="inline-flex flex-none items-center gap-1 font-display text-body-sm leading-none font-semibold text-ink-1000 underline underline-offset-[3px]"
				>
					Buka Peta Penguasaan <Icon name="chevron-right" size={16} />
				</Link>
			</div>
		</Card>
	);
}

// A phone fits the four columns into two lines per code: area on top, status and score below.
const WEAK_ROW = "grid grid-cols-[56px_minmax(0,1fr)_auto] items-center";
const WEAK_DESKTOP = "lg:col-span-4 lg:grid-cols-subgrid";
const HEADINGS = [
	["Kode", "row-span-2 pb-1 lg:row-span-1 lg:pb-2"],
	["Daerah", "col-span-2 pb-0.5 lg:col-span-1 lg:pb-2"],
	["Status", "col-start-2 row-start-2 pb-1 lg:col-auto lg:row-auto lg:pb-2"],
	["Benar", "col-start-3 row-start-2 min-w-19 pb-1 lg:col-auto lg:row-auto lg:min-w-0 lg:pb-2"]
];

function Weakest({ s, loading }: { s: Stats; loading: boolean }) {
	const rows = loading ? s.weakest.slice(0, 3) : s.weakest;
	return (
		<Card>
			<CardHeader
				label="Kode terlemah"
				title="Paling sering belum tepat"
				aside={
					<span className="flex-none font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
						{text(loading, "sejak mulai belajar")}
					</span>
				}
			/>
			<div className="flex flex-col lg:grid lg:grid-cols-[72px_minmax(0,1fr)_216px_120px] lg:items-center">
				<div className={`${WEAK_ROW} lg:contents`}>
					{HEADINGS.map(([heading, place]) => (
						<span key={heading} className={`pr-3 lg:pr-4 ${place}`}>
							<span className="type-label text-ink-500">{heading}</span>
						</span>
					))}
				</div>
				{rows.map((row) => (
					<div
						key={row.code}
						className={`${WEAK_ROW} ${WEAK_DESKTOP} border-t border-hairline`}
					>
						<span className="row-span-2 py-2.5 pr-4 lg:row-span-1">
							{loading ? (
								<Skeleton className={CHIP_SKELETON} />
							) : (
								<CodeLink code={row.code} group={row.group} />
							)}
						</span>
						<span className="col-span-2 flex min-w-0 pt-2.5 pb-0.5 text-ink-900 type-body lg:col-span-1 lg:py-2.5 lg:pr-4">
							{loading ? (
								text(loading, row.areas)
							) : (
								// A summary always has more to show; a full list only once it is cut off.
								<Tooltip
									content={row.allAreas}
									align="start"
									focusable
									truncatedOnly={row.allAreas === row.areas}
									className="flex min-w-0"
								>
									<span className="truncate">{row.areas}</span>
								</Tooltip>
							)}
						</span>
						<span className="col-start-2 row-start-2 pt-0.5 pr-3 pb-2.5 lg:col-auto lg:row-auto lg:py-2.5 lg:pr-4">
							{loading ? (
								<Skeleton className={PILL_SKELETON} />
							) : (
								<StatusPill status={row.status} />
							)}
						</span>
						<span className="col-start-3 row-start-2 flex min-w-19 flex-col gap-1 pt-0.5 pb-2.5 lg:col-auto lg:row-auto lg:min-w-0 lg:py-2.5 lg:pr-4">
							<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-1000 tabular-nums">
								{text(loading, `${row.right} dari ${row.of}`)}
							</span>
							{!loading && (
								<ProgressBar
									value={Math.round((row.right / row.of) * 100)}
									color="bg-stop-500"
									className="h-1 min-w-0 flex-1"
								/>
							)}
						</span>
					</div>
				))}
			</div>
		</Card>
	);
}

function Forecast({ s, loading }: { s: Stats; loading: boolean }) {
	// The hold line sits at the top; a busier day than the hold fills the column.
	const scale = Math.max(s.forecast.threshold, 1);
	return (
		<Card>
			{loading ? (
				<header className="flex items-start justify-between gap-3">
					<div className="flex min-w-0 flex-col gap-1">
						<SkeletonText width="11em" />
						<span className="type-card-title">
							<SkeletonText width="17.5em" />
						</span>
					</div>
					<span className="flex-none font-mono text-body-sm leading-[1.2] font-medium text-ink-500">
						soal per hari
					</span>
				</header>
			) : (
				<CardHeader
					label="Perkiraan beban 14 hari"
					title={s.forecast.title}
					aside={
						<span className="flex-none font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
							soal per hari
						</span>
					}
				/>
			)}
			<div className="flex flex-col gap-1.5">
				<div className="relative pt-5.5">
					<div className="absolute top-5.5 right-0 left-0 border-t border-dashed border-stop-500">
						<span className="absolute top-0.5 right-0 font-sans text-micro leading-none font-medium text-stop-700">
							{loading ? (
								<SkeletonText width="12em" />
							) : (
								`Ambang penahanan: ${s.forecast.threshold} soal`
							)}
						</span>
					</div>
					<div className="grid h-40 grid-cols-14 items-end gap-1.5 border-b border-ink-1000">
						{s.forecast.days.map(([day, date, count], index) => (
							<div
								key={`${day}${date}`}
								className="flex h-full flex-col items-center justify-end gap-1"
							>
								<span
									className={`font-mono text-micro leading-none font-semibold ${index === 0 ? "text-ink-1000" : "text-ink-700"}`}
								>
									{loading ? <SkeletonText width="1.2em" /> : count}
								</span>
								<div
									className={`w-full rounded-[2px_2px_0_0] ${loading ? "animate-skl bg-ink-100" : index === 0 ? "bg-ink-1000" : "bg-ink-300"}`}
									style={{ height: Math.round(Math.min(1, count / scale) * 142) }}
								/>
							</div>
						))}
					</div>
				</div>
				<div className="grid grid-cols-14 gap-1.5">
					{s.forecast.days.map(([day, date], index) => (
						<span
							key={`${day}${date}`}
							className={`flex flex-col items-center gap-0.5 font-sans text-[10px] leading-[1.1] ${index === 0 ? "font-semibold text-ink-1000" : "text-ink-500"}`}
						>
							<span>{day}</span>
							<span>
								{index > 0 && loading ? <SkeletonText width="1.2em" /> : date}
							</span>
						</span>
					))}
				</div>
			</div>
			<p className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
				Jumlah soal yang perlu diulang per hari. Selama di bawah ambang, materi baru tetap
				dibuka.
			</p>
		</Card>
	);
}

function ByGroup({ s, loading }: { s: Stats; loading: boolean }) {
	return (
		<Card>
			<CardHeader label="Tingkat penguasaan per kawasan" title="Lolos per level" />
			<div className="flex flex-col">
				<div className="grid grid-cols-[minmax(0,1fr)_repeat(3,58px)] items-end pb-2 lg:grid-cols-[minmax(0,1fr)_repeat(3,76px)]">
					<span className="type-label text-ink-500">Kawasan</span>
					{s.levels.map((level) => (
						<span key={level.level} className="flex flex-col items-end gap-0.5">
							<span className="type-label text-ink-500">
								{text(loading, level.level)}
							</span>
							<span className="font-sans text-micro leading-none text-ink-500">
								{text(loading, level.name)}
							</span>
						</span>
					))}
				</div>
				{s.byGroup.map((row) => (
					<div
						key={row.group}
						className="grid grid-cols-[minmax(0,1fr)_repeat(3,58px)] items-center border-t border-hairline lg:grid-cols-[minmax(0,1fr)_repeat(3,76px)]"
					>
						<span className="flex items-center gap-2 py-2.25 font-sans text-body-sm leading-[1.2] text-ink-900">
							<span
								className={`size-2 rounded-full ${loading ? "bg-ink-100" : GROUP_BG[row.group]}`}
							/>
							{text(loading, row.name)}
						</span>
						{row.levels.map((value, index) => (
							<span
								key={index}
								className={`py-2.25 text-right font-mono text-body-sm leading-[1.2] ${index === 2 ? "font-bold text-ink-1000" : "font-medium text-ink-700"}`}
							>
								{text(loading, value)}
							</span>
						))}
					</div>
				))}
			</div>
			<p className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
				{loading ? (
					<SkeletonText width="24em" />
				) : (
					"Persen soal yang pernah lolos di tiap level. Level 3 adalah syarat Dikuasai, jadi kolom ini yang paling menentukan."
				)}
			</p>
		</Card>
	);
}

function Row({ last, children }: { last?: boolean; children: React.ReactNode }) {
	return (
		<div
			className={`flex items-center justify-between gap-4 py-3 ${last ? "" : "border-b border-hairline"}`}
		>
			{children}
		</div>
	);
}

function Hard({ s, loading }: { s: Stats; loading: boolean }) {
	return (
		<Card>
			<CardHeader
				label="Sulit Dikuasai"
				title={text(loading, `${s.hard.length} kode`)}
				aside={<Icon name="triangle-alert" size={18} color="bg-ink-1000" />}
			/>
			<div className="flex flex-col">
				{s.hard.map((row, index) => (
					<Row key={row.code} last={index === s.hard.length - 1}>
						{loading ? (
							<Skeleton className={CHIP_SKELETON} />
						) : (
							<CodeLink code={row.code} group={row.group} />
						)}
						{loading ? (
							<Skeleton className={PILL_SKELETON} />
						) : (
							<StatusPill status={row.status} />
						)}
					</Row>
				))}
			</div>
			{loading ? (
				<Skeleton className="block h-9 w-full rounded-sm" />
			) : (
				<Button variant="secondary" size="sm" block href="/statistik/sulit">
					Tinjau kode
				</Button>
			)}
		</Card>
	);
}

function NameAll({ s, loading }: { s: Stats; loading: boolean }) {
	return (
		<Card className="gap-3">
			<CardHeader
				label="Sebutkan sebanyak mungkin"
				title={text(loading, `${s.nameAll.length} kode`)}
			/>
			<div className="flex flex-col">
				{s.nameAll.map((row, index) => (
					<div
						key={row.code}
						className={`flex min-h-14 items-center justify-between gap-3 py-2 ${index ? "border-t border-hairline" : ""}`}
					>
						<div className="flex min-w-0 items-center gap-3">
							{loading ? (
								<Skeleton className={CHIP_SKELETON} />
							) : (
								<CodeLink code={row.code} group={row.group} />
							)}
							<span className="flex min-w-0 flex-col gap-0.5">
								<span className="font-display text-body-md leading-[1.2] font-semibold text-ink-1000">
									{text(loading, row.title)}
								</span>
								<span className="font-sans text-body-sm leading-[1.2] text-ink-500">
									{text(loading, row.areas)}
								</span>
							</span>
						</div>
						{row.wait ? (
							<span className="flex-none font-mono text-body-sm leading-[1.2] font-medium whitespace-nowrap text-ink-500">
								{text(loading, row.wait)}
							</span>
						) : loading ? (
							<Skeleton className="h-9 w-[82px] flex-none rounded-sm" />
						) : (
							<Link
								href={`/sesi?mode=sebutkan&code=${row.code}`}
								className="inline-flex h-9 flex-none items-center gap-2 rounded-sm border border-ink-1000 bg-paper-0 px-4 font-display text-body-sm leading-none font-semibold whitespace-nowrap text-ink-1000"
							>
								<Icon name="play" size={14} />
								Mulai
							</Link>
						)}
					</div>
				))}
			</div>
			<p className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
				Sebutkan semua kab/kota yang memakai satu kode. Satu kode per sesi, di luar sesi
				harian.
			</p>
		</Card>
	);
}

function Diplomat({ s, loading }: { s: Stats; loading: boolean }) {
	const { mastered, total } = s.diplomat;
	return (
		<Card>
			<CardHeader
				label="Kode Khusus"
				title="Kode diplomat"
				aside={<Icon name="flag" size={18} />}
			/>
			<div className="flex items-baseline gap-2">
				<span className="font-display text-heading leading-none font-bold">
					{text(loading, mastered)}
				</span>
				<span className="text-ink-900 type-body">
					{loading ? (
						<SkeletonText width="9em" />
					) : (
						<>
							dari <span className="font-bold text-ink-1000">{total}</span> dikuasai
						</>
					)}
				</span>
			</div>
			{loading ? (
				<Skeleton className="block h-2 w-full rounded-xs" />
			) : (
				<ProgressBar
					value={Math.round((mastered / total) * 100)}
					className="h-2 flex-none"
				/>
			)}
			<p className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
				Dihitung terpisah dari penguasaan wilayah.
			</p>
		</Card>
	);
}

function Seen({ s, loading }: { s: Stats; loading: boolean }) {
	const max = Math.max(1, ...s.seen.map((row) => row.count));
	const rows = loading ? s.seen.slice(0, 3) : s.seen;
	return (
		<Card className="gap-3">
			<CardHeader
				label="Pelat Terlihat"
				aside={
					<span className="flex-none font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
						{text(loading, `${SIGHTING_WINDOW_DAYS} hari terakhir`)}
					</span>
				}
			/>
			{rows.map((row) => (
				<div
					key={row.code}
					className="grid grid-cols-[44px_minmax(0,1fr)_28px] items-center gap-3"
				>
					{loading ? (
						<Skeleton className={CHIP_SKELETON} />
					) : (
						<CodeLink code={row.code} group={row.group} />
					)}
					<ProgressBar
						value={loading ? 0 : (row.count / max) * 100}
						color="bg-ink-300"
						className="h-1.5 min-w-0 flex-1"
					/>
					<span className="text-right">
						<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-1000 tabular-nums">
							{text(loading, row.count)}
						</span>
					</span>
				</div>
			))}
			<p className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
				Dari pencarian kode di Referensi. Dipakai mengurutkan materi baru.
			</p>
		</Card>
	);
}

function Account({ s, loading, onExport }: { s: Stats; loading: boolean; onExport: () => void }) {
	const rows = [
		["user", s.account.email ?? "Belum masuk. Progres tersimpan di perangkat ini."],
		["cloud-check", s.account.sync],
		["download", s.account.export]
	] as const;
	return (
		<Card className="gap-3">
			<CardHeader label="Akun dan sinkronisasi" />
			<div className="flex flex-col">
				{rows.map(([icon, label], index) => (
					<Row key={icon} last={index === rows.length - 1}>
						<div className="flex min-w-0 items-start gap-3">
							{/* Level with the first line when the text wraps. */}
							<Icon name={icon} size={16} className="mt-0.75" />
							<span className="text-ink-900 type-body">{text(loading, label)}</span>
						</div>
					</Row>
				))}
			</div>
			<div className="grid grid-cols-2 gap-2">
				{loading ? (
					<>
						<Skeleton className="block h-9 w-full rounded-sm" />
						<Skeleton className="block h-9 w-full rounded-sm" />
					</>
				) : (
					<>
						<Button
							variant="secondary"
							size="sm"
							block
							icon="download"
							onClick={onExport}
						>
							Ekspor data
						</Button>
						<Button
							variant="quiet"
							size="sm"
							block
							href="/statistik/akun"
							className="text-ink-1000"
						>
							{s.account.email ? "Kelola akun" : "Masuk"}
						</Button>
					</>
				)}
			</div>
		</Card>
	);
}

export function StatsScreen({
	data,
	provinces,
	syncLabel,
	menu,
	onExport
}: {
	data: Stats | null;
	provinces: Record<string, MapProvince>;
	syncLabel: string | null;
	/** The account menu beside the sync chip. */
	menu?: React.ReactNode;
	onExport: () => void;
}) {
	const loading = data === null;
	const s = data ?? SKELETON;
	return (
		<>
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<h1 className="type-screen-title">Statistik</h1>
				</div>
				<div className="flex items-center gap-3">
					<SyncChip label={loading ? null : syncLabel} />
					{menu}
				</div>
			</div>
			<NationalSummary s={s} loading={loading} />
			<MapCard loading={loading} provinces={provinces} />
			<div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					{(loading || s.weakest.length > 0) && <Weakest s={s} loading={loading} />}
					<Forecast s={s} loading={loading} />
					<ByGroup s={s} loading={loading} />
				</div>
				<aside className="flex min-w-0 flex-col gap-5">
					{/* An empty list says nothing; its card shows once there is something in it. */}
					{(loading || s.hard.length > 0) && <Hard s={s} loading={loading} />}
					{(loading || s.nameAll.length > 0) && <NameAll s={s} loading={loading} />}
					{(loading || s.diplomat.started) && <Diplomat s={s} loading={loading} />}
					{(loading || s.seen.length > 0) && <Seen s={s} loading={loading} />}
					<Account s={s} loading={loading} onExport={onExport} />
				</aside>
			</div>
		</>
	);
}

// Rows that hold the loaded layout while the statistics load.
const SKELETON: Stats = {
	national: { percent: "26%", codes: "55 dari 61", groups: "1 dari 7" },
	levels: [
		{ level: "Level 1", name: "Kenali", passed: "153 soal lolos", percent: 0 },
		{ level: "Level 2", name: "Ingat", passed: "102 soal lolos", percent: 0 },
		{ level: "Level 3", name: "Kuasai", passed: "55 soal lolos", percent: 0 }
	],
	weakest: ["a", "b", "c"].map((code) => ({
		code,
		group: "jawa",
		areas: "Kota Bengkulu, Rejang Lebong, dan 8 lainnya",
		allAreas: "",
		status: "learning",
		right: 5,
		of: 12
	})),
	forecast: {
		title: "",
		threshold: 40,
		days: Array.from({ length: 14 }, (_, index): [string, string, number] => [
			index ? "Sen" : "Hari",
			index ? String(index) : "ini",
			10
		])
	},
	byGroup: (
		["sumatera", "jawa", "kalimantan", "sulawesi", "balinusra", "maluku", "papua"] as const
	).map((group) => ({ group, name: "Bali & Nusa Tenggara", levels: ["30%", "12%", "4%"] })),
	hard: ["a", "b", "c"].map((code) => ({ code, group: "jawa", status: "leech" })),
	nameAll: ["a", "b"].map((code) => ({
		code,
		group: "jawa",
		title: "Sebutkan daerah BK",
		areas: "15 kab/kota",
		wait: null
	})),
	diplomat: { mastered: 42, total: 130, started: true },
	seen: ["a", "b", "c"].map((code) => ({ code, group: "jawa", count: 1 })),
	account: {
		email: "nama@email.com",
		sync: "Tersinkron 3 menit lalu",
		export: "Ekspor terakhir 12 hari lalu"
	}
};
