"use client";
import { useNow } from "@/components/learning/learning-provider";
import { useSessionView } from "@/components/learning/session-view";
import { percent, scopeName } from "@/lib/terka/practice";
import { dailyQueue } from "@/lib/terka/engine";
import Link from "next/link";
import { SessionShell } from "@/components/layout/session-shell";
import { LabelText } from "@/components/ui/label-text";
import { StatBlock } from "@/components/ui/stat-block";
import { buttonVariants } from "@/components/ui/button";
import { CodeChip } from "@/components/terka/code-chip";

type Stat = {
	value: string;
	unit?: string;
	label: string;
	size?: "display" | "heading";
	valueClassName?: string;
	unitClassName?: string;
};

const previewStats: Stat[] = [
	{ value: "94%", label: "Akurasi", valueClassName: "text-go-500" },
	{
		value: "2,1",
		unit: "detik",
		label: "Rata-rata waktu respons",
		unitClassName: "font-mono text-body-sm text-ink-500"
	},
	{
		value: "+6%",
		unit: "Bali & Nusra",
		label: "Penguasaan wilayah",
		size: "heading",
		valueClassName: "text-group-balinusra",
		unitClassName: "font-mono text-body-sm text-ink-500"
	},
	{ value: "24", label: "Soal dijawab", size: "heading" }
];

const previewConfusedCodes = { first: "BE", second: "BD" };

export function SessionSummaryScreen() {
	const view = useSessionView();
	const now = useNow();
	const summary = view?.summary;
	const stats: Stat[] = summary
		? [
				{ ...previewStats[0], value: percent(summary.accuracy) },
				{
					...previewStats[1],
					value:
						summary.avgMs === null
							? "—"
							: (summary.avgMs / 1000).toLocaleString("id-ID", {
									maximumFractionDigits: 1
								})
				},
				{
					...previewStats[2],
					value:
						summary.masteryChange === null
							? "—"
							: `${summary.masteryChange >= 0 ? "+" : ""}${Math.round(summary.masteryChange * 100)}%`,
					unit: scopeName(view!.content, summary.session.scope)
				},
				{ ...previewStats[3], value: String(summary.answered) }
			]
		: previewStats;
	const pair = summary?.confusions[0]?.pair;
	const confusedCodes = view
		? pair
			? {
					first: view.content.regions.find((region) => region.id === pair[0])?.code,
					second: view.content.regions.find((region) => region.id === pair[1])?.code
				}
			: null
		: previewConfusedCodes;
	const remaining = view ? dailyQueue(view.progress, view.content, now).length : 0;

	return (
		<SessionShell current={24} total={24} undo={false}>
			<h1 className="font-display text-display font-bold text-ink-1000">Sesi selesai</h1>
			<div className="grid grid-cols-2 gap-5">
				{stats.map((stat) => (
					<StatBlock
						key={stat.label}
						value={stat.value}
						unit={stat.unit}
						label={stat.label}
						size={stat.size}
						valueClassName={stat.valueClassName}
						unitClassName={stat.unitClassName}
					/>
				))}
			</div>
			{confusedCodes && (
				<div className="flex flex-col items-start gap-2">
					<LabelText>Kode yang perlu dibedakan</LabelText>
					<div className="flex items-center gap-3">
						<CodeChip size="sm" className="border-group-sumatera">
							{confusedCodes.first}
						</CodeChip>
						<span className="font-body text-body-md text-ink-500">
							sering tertukar dengan
						</span>
						<CodeChip size="sm" className="border-group-sumatera">
							{confusedCodes.second}
						</CodeChip>
					</div>
				</div>
			)}
			<div className="flex flex-col gap-2 rounded-md border border-ink-200 bg-go-100 p-4 text-ink-1000">
				<LabelText className="text-go-700">Jadwal hari ini</LabelText>
				<p className="text-body-md text-ink-1000">
					{remaining
						? `${remaining} soal masih tersedia untuk hari ini.`
						: "Jadwal hari ini sudah beres."}
				</p>
			</div>
			<Link href="/" className={buttonVariants({ block: true })}>
				Kembali ke beranda
			</Link>
		</SessionShell>
	);
}
