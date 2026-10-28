"use client";

import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar, Skeleton, SkeletonText } from "@/components/ui/feedback";
import { PageTitle } from "@/components/ui/page-title";
import { DotLabel } from "@/components/ui/tag";
import type { ParamsHistoryRow, ParamsView, ProgressLine } from "@/lib/view/params";

const NOTE = "font-sans text-body-sm leading-normal text-ink-500";

/** Two lines of body-sized placeholder text, the second shorter. */
function NoteSkeleton() {
	return (
		<div className="flex flex-col gap-2 py-1">
			<Skeleton className="block h-3 w-full rounded-[3px]" />
			<Skeleton className="block h-3 w-3/5 rounded-[3px]" />
		</div>
	);
}

function StatusCard({ status }: { status: ParamsView["status"] | null }) {
	return (
		<Card>
			<CardHeader
				label="Parameter aktif"
				title={status ? status.title : <SkeletonText width="9em" />}
			/>
			{status ? <p className={NOTE}>{status.note}</p> : <NoteSkeleton />}
			<p className={NOTE}>
				Parameter ini mengatur seberapa cepat ingatan memudar dan seberapa jauh jeda ulangan
				setelah tiap jawaban.
			</p>
		</Card>
	);
}

function ProgressRow({ line }: { line: ProgressLine | null }) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-baseline justify-between gap-3">
				<span className="text-ink-900 type-body">
					{line ? line.label : <SkeletonText width="12em" />}
				</span>
				<span className="flex-none font-mono text-body-sm leading-[1.2] font-medium whitespace-nowrap text-ink-500 tabular-nums">
					{line ? `${line.have} / ${line.need}` : <SkeletonText width="5.5em" />}
				</span>
			</div>
			{line ? (
				<ProgressBar
					value={line.percent}
					color={line.done ? "bg-go-500" : "bg-ink-1000"}
					className="h-1.5 w-full"
				/>
			) : (
				<Skeleton className="block h-1.5 w-full rounded-xs" />
			)}
		</div>
	);
}

function ProgressCard({ progress }: { progress: ParamsView["progress"] }) {
	return (
		<Card>
			<CardHeader
				label="Optimasi berikutnya"
				title={progress ? progress.title : <SkeletonText width="11em" />}
			/>
			<div className="flex flex-col gap-4">
				{progress ? (
					progress.lines.map((line) => <ProgressRow key={line.label} line={line} />)
				) : (
					<>
						<ProgressRow line={null} />
						<ProgressRow line={null} />
					</>
				)}
			</div>
			{progress ? <p className={NOTE}>{progress.note}</p> : <NoteSkeleton />}
		</Card>
	);
}

function HistoryItem({ row }: { row: ParamsHistoryRow }) {
	return (
		<li className="flex flex-col gap-2 border-b border-hairline py-4 first:pt-0 last:border-b-0 last:pb-0">
			<div className="flex items-start justify-between gap-3">
				<span className="font-display text-body-md leading-[1.2] font-semibold">
					{row.title}
				</span>
				<DotLabel tone={row.outcome === "accepted" ? "go" : "muted"}>{row.label}</DotLabel>
			</div>
			<span className={NOTE}>
				{row.date} · {row.detail}
			</span>
			{row.metrics && (
				<dl className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-body-sm leading-[1.2] tabular-nums">
					{row.metrics.map((metric) => (
						<div key={metric.name} className="flex gap-2">
							<dt className="text-ink-500">{metric.name}</dt>
							<dd>
								{metric.before} → {metric.after}
							</dd>
						</div>
					))}
				</dl>
			)}
			<p className={NOTE}>{row.note}</p>
		</li>
	);
}

function HistorySkeleton() {
	return (
		<li className="flex flex-col gap-2 border-b border-hairline py-4 first:pt-0 last:border-b-0 last:pb-0">
			<div className="flex items-start justify-between gap-3">
				<SkeletonText width="14em" className="h-[1.1em]" />
				<SkeletonText width="4.5em" />
			</div>
			<SkeletonText width="11em" />
			<SkeletonText width="13em" />
		</li>
	);
}

function HistoryCard({ history }: { history: ParamsHistoryRow[] | null }) {
	return (
		<Card>
			<CardHeader label="Riwayat" />
			{history === null ? (
				<ul className="flex flex-col">
					<HistorySkeleton />
					<HistorySkeleton />
					<HistorySkeleton />
				</ul>
			) : history.length === 0 ? (
				<p className={NOTE}>
					Belum ada optimasi. Riwayat muncul setelah optimasi pertama berjalan.
				</p>
			) : (
				<ul className="flex flex-col">
					{history.map((row) => (
						<HistoryItem key={row.id} row={row} />
					))}
				</ul>
			)}
		</Card>
	);
}

/** `data` is null while the history is read, and its `progress` while the answers are counted. */
export function ParamsScreen({ data }: { data: ParamsView | null }) {
	return (
		<>
			<PageTitle title="Parameter jadwal" back="/setelan" />
			<div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					<StatusCard status={data?.status ?? null} />
					<ProgressCard progress={data?.progress ?? null} />
				</div>
				<HistoryCard history={data?.history ?? null} />
			</div>
		</>
	);
}
