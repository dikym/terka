import { Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SessionShell } from "@/components/layout/session-shell";
import { chipVariants } from "@/components/terka/code-chip";
import { LevelChip } from "./sesi-tanya";

const question = {
	heading: "Mana yang Bengkulu?",
	sub: "BE dan BD sering tertukar. Bedakan keduanya.",
	options: ["BD", "BE"]
};

export function ModeBadge({
	tone,
	className,
	children
}: React.PropsWithChildren<{ tone: string; className?: string }>) {
	return (
		<Badge dot className={cn("shrink-0 whitespace-nowrap", tone, className)}>
			{children}
		</Badge>
	);
}

export function Bandingkan() {
	return (
		<SessionShell
			current={9}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge tone="bg-grape-100 text-state-leech">Bandingkan Kode</ModeBadge>
					<LevelChip level={3} label="Kuasai" filled={3} icon={Medal} />
				</span>
			}
		>
			<h2 className="font-display text-title text-ink-1000 font-bold">{question.heading}</h2>
			<p className="text-body-md text-ink-900">{question.sub}</p>
			<div className="grid grid-cols-2 gap-3">
				{question.options.map((code) => (
					<button key={code} type="button" className={chipVariants({})}>
						{code}
					</button>
				))}
			</div>
		</SessionShell>
	);
}
