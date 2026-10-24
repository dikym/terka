import { Link } from "@/components/ui/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CodeChip } from "@/components/ui/code-chip";
import { Pill, ProgressBar, Skeleton, SkeletonText, skeletonWidth } from "@/components/ui/feedback";
import { GROUP_BG } from "@/components/ui/groups";
import { Icon } from "@/components/ui/icon";
import { MasteryMap } from "@/components/ui/mastery-map";
import { provinces } from "@/dummy/map";
import { type CodeStatus, STATUS_LABEL, type Stats, stats as STATS } from "@/dummy/stats";
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
		<div className="flex flex-wrap gap-x-5 gap-y-3">
			{LEGEND.map(([swatch, label, range]) => (
				<span key={label} className="inline-flex items-center gap-2">
					<span className={`size-4.5 flex-none rounded-[3px] border ${swatch}`} />
					<span className="flex h-4.5 flex-col justify-between">
						<span className="font-sans text-[9px] leading-none font-medium text-ink-900">
							{label}
						</span>
						<span className="font-mono text-[7px] leading-none text-ink-500">
							{range}
						</span>
					</span>
				</span>
			))}
			<span className="inline-flex items-center gap-2">
				<span className="size-4.5 rounded-[3px] border border-ink-200 bg-paper-50" />
				<span className="font-sans text-body-sm leading-none font-medium text-ink-900">
					Belum ada materi
				</span>
			</span>
		</div>
	);
}

export function MapHint() {
	return (
		<span className="inline-flex items-center gap-2 font-sans text-body-sm leading-[1.3] text-ink-700">
			<Icon name="info" size={14} />
			Arahkan kursor ke provinsi untuk rinciannya. Gulir atau tombol{" "}
			<Icon name="plus" size={12} /> <Icon name="minus" size={12} /> untuk memperbesar.
		</span>
	);
}

function NationalSummary({ s, loading }: { s: Stats; loading: boolean }) {
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_360px] items-end gap-8">
			<div className="flex flex-col gap-3">
				<span className="type-label text-ink-500">Penguasaan wilayah nasional</span>
				<span className="type-metric">
					{loading ? <SkeletonText width="1.7em" /> : s.national.percent}
				</span>
				<div className="grid grid-cols-2 gap-4">
					<Figure value={s.national.codes} label="kode Dikuasai" loading={loading} />
					<Figure value={s.national.groups} label="kawasan dikuasai" loading={loading} />
				</div>
			</div>
			<div className="flex flex-col gap-3">
				{s.levels.map((level) => (
					<div
						key={level.level}
						className="grid grid-cols-[96px_minmax(0,1fr)_44px] items-center gap-3"
					>
						<div className="flex flex-col gap-[3px]">
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

function MapCard() {
	return (
		<Card>
			<CardHeader label="Peta Penguasaan" title="Penguasaan tiap provinsi" />
			<MasteryMap provinces={provinces} />
			<div className="flex items-end justify-between gap-6 border-t border-hairline pt-4">
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

const CELL = "py-2.5 pr-4";

function Weakest({ s, loading }: { s: Stats; loading: boolean }) {
	const rows = loading ? s.weakest.slice(0, 3) : s.weakest;
	return (
		<Card>
			<CardHeader
				label="Kode terlemah"
				title="Paling sering belum tepat"
				aside={
					<span className="flex-none font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
						{text(loading, "30 hari terakhir")}
					</span>
				}
			/>
			<div className="grid grid-cols-[72px_minmax(0,1fr)_216px_120px] items-center">
				{["Kode", "Daerah", "Status", "Benar"].map((heading) => (
					<span key={heading} className="pr-4 pb-2">
						<span className="type-label text-ink-500">{heading}</span>
					</span>
				))}
				{rows.map((row) => (
					<div
						key={row.code}
						className="col-span-4 grid grid-cols-subgrid items-center border-t border-hairline"
					>
						<span className={CELL}>
							{loading ? (
								<Skeleton className={CHIP_SKELETON} />
							) : (
								<CodeChip code={row.code} group={row.group} />
							)}
						</span>
						<span className={`${CELL} truncate text-ink-900 type-body`}>
							{text(loading, row.areas)}
						</span>
						<span className={CELL}>
							{loading ? (
								<Skeleton className={PILL_SKELETON} />
							) : (
								<StatusPill status={row.status} />
							)}
						</span>
						<span className={`${CELL} flex flex-col gap-1`}>
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
									style={{ height: Math.round(count * 3.55) }}
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
				<div className="grid grid-cols-[minmax(0,1fr)_repeat(3,76px)] items-end pb-2">
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
						className="grid grid-cols-[minmax(0,1fr)_repeat(3,76px)] items-center border-t border-hairline"
					>
						<span className="flex items-center gap-2 py-[9px] font-sans text-body-sm leading-[1.2] text-ink-900">
							<span
								className={`size-2 rounded-full ${loading ? "bg-ink-100" : GROUP_BG[row.group]}`}
							/>
							{text(loading, row.name)}
						</span>
						{row.levels.map((value, index) => (
							<span
								key={index}
								className={`py-[9px] text-right font-mono text-body-sm leading-[1.2] ${index === 2 ? "font-bold text-ink-1000" : "font-medium text-ink-700"}`}
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
							<CodeChip code={row.code} group={row.group} />
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
								<CodeChip code={row.code} group={row.group} />
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
	const max = Math.max(...s.seen.map((row) => row.count));
	const rows = loading ? s.seen.slice(0, 3) : s.seen;
	return (
		<Card className="gap-3">
			<CardHeader
				label="Pelat Terlihat"
				aside={
					<span className="flex-none font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
						{text(loading, "30 hari terakhir")}
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
						<CodeChip code={row.code} group={row.group} />
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

function Account({ s, loading }: { s: Stats; loading: boolean }) {
	const rows = [
		["user", s.account.email],
		["cloud-check", s.account.sync],
		["download", s.account.export]
	] as const;
	return (
		<Card className="gap-3">
			<CardHeader label="Akun dan sinkronisasi" />
			<div className="flex flex-col">
				{rows.map(([icon, label], index) => (
					<Row key={icon} last={index === rows.length - 1}>
						<div className="flex min-w-0 items-center gap-3">
							<Icon name={icon} size={16} />
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
						<Button variant="secondary" size="sm" block icon="download">
							Ekspor data
						</Button>
						<Button
							variant="quiet"
							size="sm"
							block
							href="/statistik/akun"
							className="text-ink-1000"
						>
							Kelola akun
						</Button>
					</>
				)}
			</div>
		</Card>
	);
}

export function Statistik({ data }: { data: Stats | null }) {
	const loading = data === null;
	const s = data ?? STATS;
	return (
		<>
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<h1 className="type-screen-title">Statistik</h1>
				</div>
				<SyncChip label={loading ? null : s.syncLabel} />
			</div>
			<NationalSummary s={s} loading={loading} />
			<MapCard />
			<div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					<Weakest s={s} loading={loading} />
					<Forecast s={s} loading={loading} />
					<ByGroup s={s} loading={loading} />
				</div>
				<aside className="flex min-w-0 flex-col gap-5">
					<Hard s={s} loading={loading} />
					<NameAll s={s} loading={loading} />
					<Diplomat s={s} loading={loading} />
					<Seen s={s} loading={loading} />
					<Account s={s} loading={loading} />
				</aside>
			</div>
		</>
	);
}
