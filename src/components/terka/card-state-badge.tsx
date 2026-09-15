import { cn } from "@/lib/utils";

export type CardState =
	"new" | "learning" | "review" | "relearning" | "mature" | "leech" | "suspended" | "locked";

export const cardStateLabel: Record<CardState, string> = {
	new: "Baru",
	learning: "Sedang Dipelajari",
	review: "Ulang",
	relearning: "Ulang Lagi",
	mature: "Dikuasai",
	leech: "Sulit Dikuasai",
	suspended: "Dinonaktifkan",
	locked: "Terkunci"
};

const stateClass: Record<CardState, string> = {
	new: "text-state-new",
	learning: "text-state-learning",
	review: "text-state-review",
	relearning: "text-state-relearning",
	mature: "text-state-mature",
	leech: "text-state-leech",
	suspended: "text-state-suspended",
	locked: "text-state-locked"
};

export function CardStateBadge({ state, className }: { state: CardState; className?: string }) {
	return (
		<span
			className={cn(
				"rounded-pill bg-paper-50 font-display text-label inline-flex items-center gap-2 px-2.5 py-1 font-semibold uppercase",
				stateClass[state],
				className
			)}
		>
			<span className="size-[7px] shrink-0 rounded-full bg-current" aria-hidden />
			{cardStateLabel[state]}
		</span>
	);
}
