import { BarButton, TopBar } from "@/components/shell/session-frame";
import { Icon } from "@/components/ui/icon";
import type { DummyCard, Level, Mode } from "@/dummy/session";
import { LevelMark, StatusPill, TimeBar } from "./parts";

function Progress({ done, total }: { done: number; total: number }) {
	return (
		<>
			<div className="flex flex-1 flex-col gap-2">
				<div
					role="progressbar"
					aria-valuenow={done}
					aria-valuemin={0}
					aria-valuemax={total}
					className="h-1.5 w-full overflow-hidden rounded-xs bg-ink-100"
				>
					<span
						className="block h-full bg-ink-1000 transition-[width] duration-240 ease-out"
						style={{ width: `${(done / total) * 100}%` }}
					/>
				</div>
			</div>
			<span className="min-w-10 flex-none text-right font-mono text-body-sm leading-none font-medium text-ink-500 lg:min-w-0 lg:text-left">
				{done}/{total}
			</span>
		</>
	);
}

export type BarProps = {
	mode: Mode;
	card: DummyCard | null;
	level: Level | null;
	done: number;
	total: number;
	finished: boolean;
	onExit: () => void;
	onUndo?: () => void;
	/** Seconds left, fractional, so the bar can move every tick. */
	clock?: { seconds: number; total: number };
	correct?: number;
};

/** Keeps the phone bar's right edge when there is no undo button. */
const SPACER = <span className="w-3 flex-none lg:hidden" />;

/**
 * The bar's second row: mode, streak or area on the left, level on the right. Desktop
 * shows it inside the bar; a phone shows it at the top of the question column.
 */
export function SessionMeta({
	mode,
	card,
	level,
	finished,
	correct,
	className = "flex"
}: BarProps & { className?: string }) {
	const row = `${className} min-h-6 flex-wrap items-center justify-between gap-x-3 gap-y-2 lg:min-h-0 lg:flex-nowrap lg:gap-3`;
	if (mode === "kilat")
		return (
			<div className={row}>
				<span className="inline-flex flex-none items-center gap-2 font-sans text-body-sm leading-none font-medium text-ink-900">
					<span
						aria-hidden="true"
						className="size-2.5 flex-none rounded-full bg-ink-1000"
					/>
					Seluruh Indonesia
				</span>
				<span className="ml-auto inline-flex flex-none items-center gap-3">
					<Icon name="zap" size={16} color="bg-current" />
					{!finished && (
						<span className="font-mono text-body-md leading-none font-semibold text-ink-1000">
							{correct ?? 0} benar
						</span>
					)}
				</span>
			</div>
		);
	const left =
		(mode === "harian" && !finished) || mode === "terfokus" || (card?.pill && !finished);
	return (
		<div className={row}>
			{/* Desktop keeps the empty span: its gap is part of the bar's spacing. */}
			<span
				className={`min-w-0 flex-wrap items-center gap-3 ${left ? "inline-flex" : "hidden lg:inline-flex"}`}
			>
				{mode === "harian" && !finished && (
					<div className="flex items-center gap-2">
						<Icon name="flame" size={16} color="bg-tangerine-700" />
						<span className="type-label text-tangerine-700">17 Hari Beruntun</span>
					</div>
				)}
				{mode === "terfokus" && (
					<span className="inline-flex items-center gap-2 font-sans text-body-sm leading-none font-medium text-ink-900">
						<span
							aria-hidden="true"
							className="size-2.5 flex-none rounded-full bg-group-maluku"
						/>
						Kawasan Maluku
					</span>
				)}
				{card?.pill && !finished && (
					<StatusPill tone={card.pill.tone === "go" ? "fresh" : card.pill.tone}>
						{card.pill.label}
					</StatusPill>
				)}
			</span>
			{/* Alone on a phone, the level sits on the left. */}
			<span
				className={`inline-flex flex-none items-center gap-3 ${left ? "ml-auto" : "lg:ml-auto"}`}
			>
				{mode === "harian" && (
					<span
						role="img"
						aria-label="Tantangan Harian"
						title="Tantangan Harian"
						className="inline-flex flex-none items-center text-ink-1000"
					>
						<Icon name="calendar-check" size={16} color="bg-current" />
					</span>
				)}
				{mode === "terfokus" && <Icon name="crosshair" size={16} color="bg-ink-1000" />}
				{mode === "diplomat" && <Icon name="flag" size={16} color="bg-ink-1000" />}
				{level && !finished && <LevelMark level={level} />}
			</span>
		</div>
	);
}

export function SessionBar(props: BarProps) {
	const { mode, done, total, finished, onExit, onUndo, clock } = props;
	const exit = (
		<BarButton icon="arrow-left" phoneIcon="x" large label="Keluar sesi" onClick={onExit} />
	);
	if (mode === "kilat")
		return (
			<TopBar>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 lg:gap-3">
						{exit}
						<TimeBar
							seconds={clock?.seconds ?? 0}
							total={clock?.total ?? 1}
							running={!finished}
							label={finished ? "Selesai" : `${Math.ceil(clock?.seconds ?? 0)} detik`}
							className="flex min-w-0 flex-1 px-1 lg:px-0"
						/>
						{SPACER}
					</div>
				</div>
				<SessionMeta {...props} className="hidden lg:flex" />
			</TopBar>
		);

	return (
		<TopBar>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2 lg:gap-3">
					{exit}
					<Progress done={done} total={total} />
					{!finished ? (
						<BarButton icon="undo-2" large label="Batalkan jawaban" onClick={onUndo} />
					) : (
						<>
							{/* The finished screen keeps undo on desktop only. */}
							{(mode === "harian" || mode === "terfokus") && (
								<span className="contents max-lg:hidden">
									<BarButton
										icon="undo-2"
										label="Batalkan jawaban"
										onClick={onUndo}
									/>
								</span>
							)}
							{SPACER}
						</>
					)}
				</div>
			</div>
			<SessionMeta {...props} className="hidden lg:flex" />
		</TopBar>
	);
}
