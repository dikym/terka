import { Link } from "@/components/ui/app-link";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CodeLink } from "@/components/ui/code-chip";
import { ProgressBar, Skeleton, SkeletonText } from "@/components/ui/feedback";
import { GROUP_BG } from "@/components/ui/groups";
import { Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";
import { type ReactNode, useEffect, useState } from "react";
import { DRILL_CLEAR_STREAK } from "@/rules";
import { countdownTo } from "@/lib/view/format";
import type { Scope } from "@/core/questions/distractors";
import type { DayMark, Home } from "@/lib/view/home";
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
		<div className="grid min-w-0 grid-cols-[112px_minmax(0,1fr)] items-start gap-x-4 gap-y-1 border-b border-hairline p-4 last:border-b-0 lg:flex lg:flex-col lg:items-stretch lg:gap-2 lg:border-r lg:border-b-0 lg:last:border-r-0">
			<span className="type-label text-ink-500">{label}</span>
			<div className="col-start-1 flex items-baseline gap-2">
				<span className="font-display text-heading leading-none font-bold tabular-nums">
					{value}
				</span>
				<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
					{unit}
				</span>
			</div>
			<div className="col-start-2 row-span-2 row-start-1">{children}</div>
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
		missed: "terlewat",
		today: "hari ini, belum selesai"
	};
	const circle = loading
		? `animate-skl bg-ink-100 ${mark.state === "today" ? "border-2 border-ink-1000" : "border border-ink-200"}`
		: {
				done: "border border-tangerine-700 bg-tangerine-100",
				tolerance: "border border-dashed border-ink-500 bg-paper-0",
				missed: "border border-ink-200 bg-paper-0",
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

const DONE_TODAY = "Sudah selesai untuk hari ini";

const TILE =
	"flex aspect-square flex-col items-start justify-between gap-2 rounded-sm border p-3 text-left font-display text-body-sm leading-[1.2] font-semibold text-balance text-ink-1000";
const TILE_PRESS =
	"border-ink-1000 shadow-block transition-[box-shadow,translate] duration-90 ease-out focus-visible:shadow-none active:translate-0.5 active:shadow-none";

/** The phone's square shortcut under Mulai belajar; a skeleton keeps its size while loading. */
function Tile({
	icon,
	label,
	href,
	color,
	loading,
	children
}: {
	icon: "calendar-check" | "zap" | "flag";
	label: string;
	href: string;
	color: string;
	loading: boolean;
	children?: React.ReactNode;
}) {
	const content = (
		<>
			<Icon name={icon} size={18} className={loading ? "invisible" : ""} />
			<span className="flex flex-col gap-1">
				<span>{label}</span>
				{children}
			</span>
		</>
	);
	if (loading)
		return (
			<span
				data-skeleton
				aria-hidden="true"
				className={`${TILE} animate-skl border-transparent bg-ink-100 text-transparent`}
			>
				{content}
			</span>
		);
	return (
		<Link href={href} className={`${TILE} ${TILE_PRESS} ${color}`}>
			{content}
		</Link>
	);
}

function Countdown({ to }: { to: number }) {
	const [now, setNow] = useState(Date.now);
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);
	return countdownTo(now, to);
}

function PhoneActions({
	loading,
	challengeDone,
	countdown,
	start
}: {
	loading: boolean;
	challengeDone: boolean;
	countdown: ReactNode;
	start: string;
}) {
	const time = (
		<span className="font-mono text-label leading-none font-semibold tabular-nums">
			{countdown}
		</span>
	);
	return (
		<div className="flex flex-col gap-3 lg:hidden">
			{loading ? (
				<Skeleton className="block h-14 w-full rounded-sm" />
			) : (
				<Button size="lg" block icon="play" href={start}>
					Mulai belajar
				</Button>
			)}
			<div className="grid grid-cols-3 gap-2">
				{challengeDone && !loading ? (
					<Tooltip content={DONE_TODAY} className="flex">
						<button
							type="button"
							disabled
							aria-disabled="true"
							className={`${TILE} flex-1 cursor-not-allowed border-ink-200 bg-stop-500 opacity-40`}
						>
							<Icon name="calendar-check" size={18} />
							<span className="flex flex-col gap-1">
								<span>Tantangan Harian</span>
								{time}
							</span>
						</button>
					</Tooltip>
				) : (
					<Tile
						icon="calendar-check"
						label="Tantangan Harian"
						href="/sesi?mode=harian"
						color="bg-stop-500"
						loading={loading}
					>
						{loading && time}
					</Tile>
				)}
				<Tile
					icon="zap"
					label="Mode Kilat"
					href="/sesi?mode=kilat"
					color="bg-go-500"
					loading={loading}
				/>
				<Tile
					icon="flag"
					label="Kode diplomat"
					href="/sesi?mode=diplomat"
					color="bg-paper-0"
					loading={loading}
				/>
			</div>
		</div>
	);
}

function ChallengeButton({ done, countdown }: { done: boolean; countdown: ReactNode }) {
	if (done)
		return (
			<Tooltip content={DONE_TODAY} className="flex">
				<button
					type="button"
					disabled
					aria-disabled="true"
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
			</Tooltip>
		);
	return (
		<Button variant="stop" block icon="calendar-check" href="/sesi?mode=harian">
			Tantangan Harian
		</Button>
	);
}

export function Beranda({
	data,
	onScope
}: {
	data: Home | null;
	onScope?: (scope: Scope) => void;
}) {
	const d = data;
	// After a long break, the main button opens Cek ingatan; its preview links on to the usual session.
	const start = d?.summary.recheck ? "/sesi?mode=cek" : "/sesi";
	const challengeDone = d?.challengeDone ?? false;
	const scopeBar = d?.scope.group ? GROUP_BG[d.scope.group] : "bg-ink-1000";
	const week = (d ?? SKELETON_HOME).week;
	const scopeRows = d?.scope.rows ?? SKELETON_ROWS;
	return (
		<>
			<div className="flex items-center justify-between gap-3">
				<span className="type-label text-ink-500">
					{d ? d.dateLabel : <SkeletonText width="13.8em" />}
				</span>
				<SyncChip label={d ? d.syncLabel : null} />
			</div>
			<div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
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
							{(!d || d.duration) && (
								<span className="inline-flex items-center gap-1.5 font-sans text-body-sm leading-[1.3] text-ink-700">
									<Icon name="clock" size={14} />
									{d ? d.duration : <SkeletonText width="16.0em" />}
								</span>
							)}
						</div>
						{d?.note && <Note>{d.note}</Note>}
					</div>

					<PhoneActions
						loading={!d}
						challengeDone={challengeDone}
						countdown={d ? <Countdown to={d.challengeResetAt} /> : SKELETON_COUNTDOWN}
						start={start}
					/>

					<section className="grid grid-cols-1 overflow-hidden rounded-md border border-hairline bg-paper-0 shadow-lift lg:grid-cols-3">
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
							unit={
								d ? (
									<>
										dari{" "}
										<span className="font-bold text-ink-1000">
											{d.newLimit}
										</span>
									</>
								) : (
									<SkeletonText width="3.9em" />
								)
							}
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
											<CodeLink code={pair.a} group={pair.group} />
										) : (
											<Skeleton className={CHIP_SKELETON} />
										)}
										<Icon
											name="git-compare-arrows"
											size={14}
											color={d ? "bg-ink-500" : "bg-ink-100"}
										/>
										{d ? (
											<CodeLink code={pair.b} group={pair.group} />
										) : (
											<Skeleton className={CHIP_SKELETON} />
										)}
										{d ? (
											<span className="font-mono text-xs text-ink-500">
												{pair.streak}/{DRILL_CLEAR_STREAK}
											</span>
										) : (
											<SkeletonText width="1.6em" />
										)}
									</span>
								))}
							</div>
						</Stat>
					</section>

					<Card bar={d ? scopeBar : "animate-skl bg-ink-100"}>
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
						<div className="@container flex flex-col">
							{scopeRows.map((row, index) => (
								<div
									key={row.name}
									className="grid min-h-12 grid-cols-[minmax(0,1fr)_64px_40px] items-center gap-x-3 gap-y-2 border-b border-hairline py-3 last:border-b-0 @xl:grid-cols-[minmax(7.5rem,auto)_minmax(0,1fr)_180px_44px] @xl:gap-4 @xl:py-2"
								>
									<span className="row-start-1 text-ink-900 type-body @xl:row-auto">
										{d ? (
											row.name
										) : (
											<SkeletonText width={SKELETON_ROW_WIDTHS[index]} />
										)}
									</span>
									{/* Beside the name, four 2.5rem chips and their gaps: at most four codes per line. */}
									<span className="col-span-full row-start-2 flex flex-wrap gap-1 @xl:col-auto @xl:row-auto @xl:max-w-[10.75rem] @xl:justify-end @xl:justify-self-end">
										{row.codes.map((code) =>
											d ? (
												<CodeLink
													key={code}
													code={code}
													group={d.scope.group ?? "jawa"}
												/>
											) : (
												<Skeleton key={code} className={CHIP_SKELETON} />
											)
										)}
									</span>
									{d ? (
										<ProgressBar
											value={row.percent}
											color={scopeBar}
											className="row-start-1 h-1.5 min-w-0 flex-1 @xl:row-auto"
										/>
									) : (
										<div
											data-skeleton
											className="row-start-1 h-1.5 min-w-0 flex-1 animate-skl overflow-hidden rounded-xs bg-ink-100 @xl:row-auto"
										/>
									)}
									<span className="row-start-1 text-right @xl:row-auto">
										<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-1000 tabular-nums">
											{d ? `${row.percent}%` : <SkeletonText width="2.2em" />}
										</span>
									</span>
								</div>
							))}
						</div>
						<div className="grid grid-cols-3 gap-4">
							{[
								[d?.scope.mastered, "kemajuan", "1.7em", "6em"],
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
						{d?.nextScope && (
							<div className="flex flex-col gap-3 border-t border-hairline pt-4 lg:flex-row lg:items-center lg:justify-between">
								<span className="type-body-sm text-ink-700">
									Materi di {d.scope.title} sudah dikenalkan semua.
								</span>
								<button
									type="button"
									className={buttonClass("secondary", "md", false)}
									onClick={() => onScope?.(d.nextScope!.scope)}
								>
									<span>Lanjut ke {d.nextScope.label}</span>
									<Icon name="arrow-right" size={16} />
								</button>
							</div>
						)}
					</Card>

					<Card className="gap-5">
						<header className="flex items-center gap-3">
							<Icon
								name="flame"
								size={null}
								className="-mt-0.5 size-5.5 lg:mt-0 lg:size-6"
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
								Dihitung dari sesi harian yang tuntas atau Tantangan Harian.
							</span>
						</footer>
					</Card>
				</div>

				<aside className="hidden min-w-0 flex-col gap-3 lg:flex">
					{d ? (
						<>
							<Button size="lg" block icon="play" kbd="S" href={start}>
								Mulai belajar
							</Button>
							<ChallengeButton
								done={challengeDone}
								countdown={<Countdown to={d.challengeResetAt} />}
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
								{d.summary.specialDue
									? ` · ${d.summary.specialDue} perlu diulang`
									: ""}
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

const SKELETON_COUNTDOWN = "06:42:18";

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
		{ a: "a", b: "b", group: "sumatera" as const, streak: 0 },
		{ a: "c", b: "d", group: "jawa" as const, streak: 0 }
	]
};
