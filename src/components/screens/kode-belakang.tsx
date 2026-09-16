import { cn } from "@/lib/utils";
import { SessionShell } from "@/components/layout/session-shell";
import { LabelText } from "@/components/ui/label-text";
import { PlateTile } from "@/components/terka/plate-tile";
import { FactCard } from "@/components/terka/fact-card";
import { VerdictLine } from "@/components/terka/verdict-line";
import { LevelChip } from "./sesi-tanya";
import { ModeBadge } from "./bandingkan";

const plate = { code: "B", number: "1234", suffix: "xUx" };

const fact = {
	source: "Dokumen Kode Plat Nomor Kendaraan Indonesia",
	body: "Sebagian besar Kabupaten Tangerang memakai pelat A (Banten), bukan B, dengan kode belakang V/W/X/Y/Z — awalnya 7 kecamatan, lalu 19 kecamatan sejak 2016."
};

export function GradedAnswer({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"border-go-500 bg-go-100 text-ink-1000 h-control text-body-lg flex w-full items-center rounded-sm border-2 px-4",
				className
			)}
			{...props}
		/>
	);
}

export function KodeBelakang() {
	return (
		<SessionShell
			current={16}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge tone="bg-caution-100 text-ink-1000">Kode belakang</ModeBadge>
					<LevelChip level={2} label="Ingat" filled={2} />
				</span>
			}
		>
			<div className="flex flex-col items-start gap-4">
				<LabelText>kabupaten mana yang memakai pola ini?</LabelText>
				<PlateTile
					code={plate.code}
					number={plate.number}
					suffix={plate.suffix}
					emphasize="suffix"
				/>
			</div>
			<div className="flex flex-col gap-2">
				<GradedAnswer>Bekasi</GradedAnswer>
				<span className="text-body-sm text-ink-500">
					Awalan “Kota”, “Kabupaten”, “Kab.” diabaikan saat dinilai.
				</span>
			</div>
			<FactCard confidence="terverifikasi" source={fact.source}>
				{fact.body}
			</FactCard>
			<VerdictLine verdict="right" label="Benar" detail="diulang lagi dalam 20 hari" />
		</SessionShell>
	);
}
