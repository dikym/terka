import { Link } from "@/components/ui/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CodeChip } from "@/components/ui/code-chip";
import { ProgressBar, Skeleton, SkeletonText } from "@/components/ui/feedback";
import { GROUP_BG } from "@/components/ui/groups";
import { Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import type { DayMark, Home } from "@/dummy/home";
import { SyncChip } from "./sync-chip";

const CHIP_SKELETON = "h-7 w-10 flex-none rounded-sm";

function Stat({
	label,
	value,
	unit,
	children
}: {
	label: string;
	value: React.ReactNode;
	unit: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-2 border-r border-hairline p-4 last:border-r-0">
			<span className="type-label text-ink-500">{label}</span>
			<div className="flex items-baseline gap-2">
				<span className="font-display text-heading leading-none font-bold tabular-nums">
					{value}
				</span>
				<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
					{unit}
				</span>
			</div>
			{children}
		</div>
	);
}

function Note({ children }: { children: React.ReactNode }) {
	return (
		<p className="font-sans text-body-sm leading-normal text-pretty text-ink-500">{children}</p>
	);
}

function Day({ mark, loading }: { mark: DayMark; loading: boolean }) {
	const label = {
		done: "selesai",
		tolerance: "toleransi dipakai",
		today: "hari ini, belum selesai"
	};
	const circle = loading
		? `animate-skl bg-ink-100 ${mark.state === "today" ? "border-2 border-ink-1000" : "border border-ink-200"}`
		: {
				done: "border border-tangerine-700 bg-tangerine-100",
				tolerance: "border border-dashed border-ink-500 bg-paper-0",
				today: "border-2 border-ink-1000 bg-paper-0"
			}[mark.state];
	const icon =
		mark.state === "done" ? "check" : mark.state === "tolerance" ? "shield-check" : null;
	const iconColor = loading
		? "bg-ink-100"
		: mark.state === "done"
			? "bg-tangerine-700"
			: "bg-ink-500";
	return (
		<div
			className="flex flex-col items-center gap-2"
			role="img"
			aria-label={`${mark.day}, ${label[mark.state]}`}
		>
			<span
				className={`inline-flex size-9 items-center justify-center rounded-full ${circle}`}
			>
				{icon && <Icon name={icon} size={16} color={iconColor} />}
			</span>
			<span
				className={`text-micro leading-none ${mark.state === "today" ? "font-display font-semibold text-ink-1000" : "font-sans font-medium text-ink-500"}`}
			>
				{mark.day}
			</span>
		</div>
	);
}

function ChallengeButton({ done, countdown }: { done: boolean; countdown: string }) {
	if (done)
		return (
			<button
				type="button"
				disabled
				aria-disabled="true"
				title="Sudah selesai untuk hari ini"
				className="flex h-12 w-full cursor-not-allowed items-center justify-between gap-3 rounded-sm border border-ink-200 bg-stop-500 px-4 text-ink-1000 opacity-40"
			>
				<span className="inline-flex items-center gap-2 font-display text-body-md leading-none font-semibold text-ink-1000">
					<Icon name="calendar-check" size={16} />
					Tantangan Harian
				</span>
				<span className="font-mono text-body-md leading-none font-semibold text-ink-1000 tabular-nums">
					{countdown}
				</span>
			</button>
		);
	return (
		<Button variant="stop" block icon="calendar-check" href="/sesi?mode=harian">
			Tantangan Harian
		</Button>
	);
}

export function Beranda({ data, challengeDone }: { data: Home | null; challengeDone: boolean }) {
	const d = data;
	const week = (d ?? SKELETON_HOME).week;
	const scopeRows = d?.scope.rows ?? SKELETON_ROWS;
	return (
		<>
			<div className="flex items-center justify-between">
				<span className="type-label text-ink-500">Minggu, 27 September 2026</span>
				<SyncChip label={d ? d.syncLabel : null} />
			</div>
			<div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					<div className="flex flex-col gap-3">
						<span className="type-label text-ink-500">Perlu diulang hari ini</span>
						<div className="flex items-baseline gap-3">
							<span className="type-metric">
								{d ? d.summary.due : <SkeletonText width="1.2em" />}
							</span>
							<span className="font-display text-subhead leading-none font-semibold text-ink-900">
								{d ? "soal perlu diulang" : <SkeletonText width="7.5em" />}
							</span>
						</div>
						<div className="flex flex-wrap items-center gap-x-5 gap-y-2">
							<span className="inline-flex items-center gap-1.5 font-sans text-body-sm leading-[1.3] text-ink-700">
								<Icon name="circle-plus" size={14} />
								{d ? (
									`${d.summary.newAvailable} materi baru tersedia`
								) : (
									<SkeletonText width="12.1em" />
								)}
							</span>
							<span className="inline-flex items-center gap-1.5 font-sans text-body-sm leading-[1.3] text-ink-700">
								<Icon name="clock" size={14} />
								{d ? d.duration : <SkeletonText width="16.0em" />}
							</span>
						</div>
					</div>

					<section className="grid grid-cols-3 overflow-hidden rounded-md border border-hairline bg-paper-0 shadow-lift">
						<Stat
							label="Pengulangan"
							value={d ? d.summary.due : <SkeletonText width="1.2em" />}
							unit={d ? "soal" : <SkeletonText width="2.5em" />}
						>
							<Note>
								{d ? (
									`${d.reviewsOutsideScope} soal dari luar Cakupan karena sudah waktunya diulang.`
								) : (
									<SkeletonText width="22.0em" />
								)}
							</Note>
						</Stat>
						<Stat
							label="Materi baru"
							value={d ? d.summary.newAvailable : <SkeletonText width="1.2em" />}
							unit={d ? `dari ${d.newLimit}` : <SkeletonText width="3.9em" />}
						>
							<Note>
								{d ? (
									"Batas harian, berlaku untuk semua Cakupan."
								) : (
									<SkeletonText width="17em" />
								)}
							</Note>
						</Stat>
						<Stat
							label="Bandingkan Kode"
							value={d ? d.pairs.length : <SkeletonText width="1.2em" />}
							unit={d ? "pasangan" : <SkeletonText width="4.5em" />}
						>
							<div className="flex flex-wrap gap-2">
								{(d?.pairs ?? SKELETON_HOME.pairs).map((pair) => (
									<span key={pair.a} className="inline-flex items-center gap-1.5">
										{d ? (
											<CodeChip code={pair.a} group={pair.group} />
										) : (
											<Skeleton className={CHIP_SKELETON} />
										)}
										<Icon
											name="git-compare-arrows"
											size={14}
											color={d ? "bg-ink-500" : "bg-ink-100"}
										/>
										{d ? (
											<CodeChip code={pair.b} group={pair.group} />
										) : (
											<Skeleton className={CHIP_SKELETON} />
										)}
									</span>
								))}
							</div>
						</Stat>
					</section>

					<Card bar={d ? GROUP_BG[d.scope.group] : "animate-skl bg-ink-100"}>
						<CardHeader
							label="Cakupan"
							title={d ? d.scope.title : <SkeletonText width="15.4em" />}
							aside={
								<Link
									href="/cakupan"
									aria-label="Buka Cakupan"
									className="flex flex-none items-center gap-2"
								>
									<Kbd>C</Kbd>
									<Icon name="chevron-right" size={18} />
								</Link>
							}
						/>
						<div className="flex flex-col">
							{scopeRows.map((row, index) => (
								<div
									key={row.name}
									className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto_180px_44px] items-center gap-4 border-b border-hairline last:border-b-0"
								>
									<span className="text-ink-900 type-body">
										{d ? (
											row.name
										) : (
											<SkeletonText width={SKELETON_ROW_WIDTHS[index]} />
										)}
									</span>
									<span className="flex gap-1">
										{row.codes.map((code) =>
											d ? (
												<CodeChip
													key={code}
													code={code}
													group={d.scope.group}
												/>
											) : (
												<Skeleton key={code} className={CHIP_SKELETON} />
											)
										)}
									</span>
									{d ? (
										<ProgressBar
											value={row.percent}
											color={GROUP_BG[d.scope.group]}
										/>
									) : (
										<div
											data-skeleton
											className="h-1.5 min-w-0 flex-1 animate-skl overflow-hidden rounded-xs bg-ink-100"
										/>
									)}
									<span className="text-right">
										<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-1000 tabular-nums">
											{d ? `${row.percent}%` : <SkeletonText width="2.2em" />}
										</span>
									</span>
								</div>
							))}
						</div>
						<div className="grid grid-cols-3 gap-4">
							{[
								[d?.scope.mastered, "materi Dikuasai", "1.7em", "6em"],
								[d?.scope.newInScope, "materi baru tersedia", "1.2em", "7.5em"],
								[d?.scope.newOutside, "materi baru di luar Cakupan", "1.7em", "9em"]
							].map(([value, label, valueWidth, labelWidth]) => (
								<span key={label} className="flex min-w-0 flex-col gap-[3px]">
									<span className="font-mono text-body-md leading-none font-semibold text-ink-1000">
										{d ? value : <SkeletonText width={valueWidth as string} />}
									</span>
									<span className="font-sans text-micro leading-[1.2] text-ink-500">
										{d ? label : <SkeletonText width={labelWidth as string} />}
									</span>
								</span>
							))}
						</div>
					</Card>

					<Card className="gap-5">
						<header className="flex items-center gap-3">
							<Icon
								name="flame"
								size={24}
								color={d ? "bg-tangerine-700" : "bg-ink-100"}
							/>
							<span className="font-display text-title leading-none font-bold tracking-title tabular-nums">
								{d ? (
									d.summary.streak
								) : (
									<SkeletonText width="1.2em" className="-translate-y-[3px]" />
								)}
							</span>
							<span className="type-label text-tangerine-700">
								{d ? (
									"Hari Beruntun"
								) : (
									<SkeletonText width="8em" className="-translate-y-[2px]" />
								)}
							</span>
						</header>
						<div className="flex justify-between gap-2">
							{week.map((mark) => (
								<Day key={mark.day} mark={mark} loading={!d} />
							))}
						</div>
						<footer className="flex flex-col gap-2 border-t border-hairline pt-4">
							<span className="inline-flex items-center gap-2 font-sans text-body-sm leading-[1.3] text-ink-700">
								<Icon
									name="shield-check"
									size={16}
									color={d ? "bg-ink-500" : "bg-ink-100"}
								/>
								{d ? d.tolerance : <SkeletonText width="22.0em" />}
							</span>
							<span className="font-sans text-body-sm leading-[1.4] text-ink-500">
								Dihitung dari Tantangan Harian.
							</span>
						</footer>
					</Card>
				</div>

				<aside className="flex min-w-0 flex-col gap-3">
					{d ? (
						<>
							<Button size="lg" block icon="play" kbd="S" href="/sesi">
								Mulai belajar
							</Button>
							<ChallengeButton
								done={challengeDone}
								countdown={d.challengeCountdown}
							/>
							<Button
								variant="confirm"
								block
								icon="zap"
								kbd="B"
								href="/sesi?mode=kilat"
							>
								Mode Kilat
							</Button>
							<div className="my-2 h-px bg-hairline" />
							<Button
								variant="secondary"
								block
								icon="flag"
								href="/sesi?mode=diplomat"
							>
								Kode diplomat
							</Button>
						</>
					) : (
						<>
							<Skeleton className="block h-14 w-full rounded-sm" />
							<Skeleton className="block h-12 w-full rounded-sm" />
							<Skeleton className="block h-12 w-full rounded-sm" />
							<div className="my-2 h-px bg-hairline" />
							<Skeleton className="block h-12 w-full rounded-sm" />
						</>
					)}
				</aside>
			</div>
		</>
	);
}

// Placeholder rows that keep the loaded layout: same rows, same chip counts.
const SKELETON_ROWS = [
	{ name: "a", codes: ["a"], percent: 0 },
	{ name: "b", codes: ["a", "b"], percent: 0 },
	{ name: "c", codes: ["a", "b", "c"], percent: 0 }
];
const SKELETON_ROW_WIDTHS = ["2.2em", "10.5em", "10.5em"];
const SKELETON_HOME = {
	week: [
		{ day: "Sen", state: "done" },
		{ day: "Sel", state: "done" },
		{ day: "Rab", state: "done" },
		{ day: "Kam", state: "tolerance" },
		{ day: "Jum", state: "done" },
		{ day: "Sab", state: "done" },
		{ day: "Min", state: "today" }
	] satisfies DayMark[],
	pairs: [
		{ a: "a", b: "b", group: "sumatera" as const },
		{ a: "c", b: "d", group: "jawa" as const }
	]
};
