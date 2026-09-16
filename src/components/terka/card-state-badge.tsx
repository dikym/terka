import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
		<Badge dot tone="neutral" className={cn(stateClass[state], className)}>
			{cardStateLabel[state]}
		</Badge>
	);
}
