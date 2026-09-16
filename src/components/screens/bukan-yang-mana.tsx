import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionShell } from "@/components/layout/session-shell";
import { Callout } from "@/components/ui/callout";
import { LevelChip } from "./sesi-tanya";
import { ModeBadge } from "./bandingkan";

const options = [
	{ name: "Medan" },
	{ name: "Binjai" },
	{ name: "Pematang Siantar" },
	{ name: "Bukittinggi", tag: "BA", emphasized: true }
];

export function BukanYangMana() {
	return (
		<SessionShell
			current={6}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge tone="bg-stop-100 text-ink-1000">Mana yang bukan</ModeBadge>
					<LevelChip level={1} label="Kenali" filled={1} icon={Eye} />
				</span>
			}
		>
			<h2 className="font-display text-title text-ink-1000 font-bold">
				Mana yang{" "}
				<span className="underline decoration-2 underline-offset-[3px]">BUKAN</span> wilayah
				BK?
			</h2>
			<div className="flex flex-col gap-2">
				{options.map((option) => (
					<div
						key={option.name}
						className={cn(
							"bg-paper-0 flex min-h-11 items-center gap-3 rounded-sm border px-4 py-3",
							option.emphasized ? "border-ink-1000 shadow-block" : "border-ink-200"
						)}
					>
						<span className="text-body-lg text-ink-1000 flex-1 leading-[1.3]">
							{option.name}
						</span>
						{option.tag ? (
							<span className="text-micro text-ink-500 font-mono">{option.tag}</span>
						) : null}
					</div>
				))}
			</div>
			<Callout tone="sky" title="Pengecoh level 1">
				Pengecoh diambil dari kawasan lain, jadi mudah dieliminasi. Level 3 memakai pengecoh
				dari daftar kode yang sering tertukar dengan kartu ini sendiri.
			</Callout>
		</SessionShell>
	);
}
