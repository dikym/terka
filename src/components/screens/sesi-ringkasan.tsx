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

const stats: Stat[] = [
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

const confused = { a: "BE", b: "BD" };

export function SesiRingkasan() {
	return (
		<SessionShell current={24} total={24} undo={false}>
			<h1 className="font-display text-display text-ink-1000 font-bold">Sesi selesai</h1>
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
			<div className="flex flex-col items-start gap-2">
				<LabelText>Kode yang perlu dibedakan</LabelText>
				<div className="flex items-center gap-3">
					<CodeChip size="sm" className="border-group-sumatera">
						{confused.a}
					</CodeChip>
					<span className="text-body-md text-ink-500 font-body">
						sering tertukar dengan
					</span>
					<CodeChip size="sm" className="border-group-sumatera">
						{confused.b}
					</CodeChip>
				</div>
			</div>
			<div className="border-ink-200 bg-go-100 text-ink-1000 flex flex-col gap-2 rounded-md border p-4">
				<LabelText className="text-go-700">Jadwal hari ini</LabelText>
				<p className="text-body-md text-ink-1000">Jadwal hari ini sudah beres.</p>
			</div>
			<Link href="/" className={buttonVariants({ block: true })}>
				Kembali ke beranda
			</Link>
		</SessionShell>
	);
}
