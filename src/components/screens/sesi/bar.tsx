import { BarButton, TopBar } from "@/components/shell/session-frame";
import { Icon } from "@/components/ui/icon";
import type { DummyCard, Level, Mode } from "@/dummy/session";
import { LevelMark, StatusPill } from "./parts";

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
			<span className="flex-none font-mono text-body-sm leading-none font-medium text-ink-500">
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
	clock?: { seconds: number; total: number };
	correct?: number;
};

export function SessionBar({
	mode,
	card,
	level,
	done,
	total,
	finished,
	onExit,
	onUndo,
	clock,
	correct
}: BarProps) {
	if (mode === "kilat")
		return (
			<TopBar>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-3">
						<BarButton icon="arrow-left" label="Keluar sesi" onClick={onExit} />
						<div className="flex min-w-0 flex-1 items-center gap-3">
							<Icon name="timer" size={16} />
							<div className="h-1.5 flex-1 overflow-hidden rounded-xs bg-ink-100">
								<div
									className="h-full bg-caution-500"
									style={{
										width: `${clock ? (clock.seconds / clock.total) * 100 : 0}%`
									}}
								/>
							</div>
							<span className="flex-none font-mono text-body-lg leading-none font-bold text-ink-1000 tabular-nums">
								{finished ? "Selesai" : `${clock?.seconds ?? 0} detik`}
							</span>
						</div>
					</div>
				</div>
				<div className="flex items-center justify-between gap-3">
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
			</TopBar>
		);

	return (
		<TopBar>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-3">
					<BarButton icon="arrow-left" label="Keluar sesi" onClick={onExit} />
					<Progress done={done} total={total} />
					{(!finished || mode === "harian" || mode === "terfokus") && (
						<BarButton icon="undo-2" label="Batalkan jawaban" onClick={onUndo} />
					)}
				</div>
			</div>
			<div className="flex items-center justify-between gap-3">
				<span className="inline-flex min-w-0 flex-wrap items-center gap-3">
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
				<span className="ml-auto inline-flex flex-none items-center gap-3">
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
		</TopBar>
	);
}
