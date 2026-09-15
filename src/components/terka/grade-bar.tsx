import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";

const grades = [
	{ label: "Lagi", key: "1", className: "bg-grade-again" },
	{ label: "Sulit", key: "2", className: "bg-grade-hard" },
	{ label: "Bagus", key: "3", className: "bg-grade-good" },
	{ label: "Mudah", key: "4", className: "bg-grade-easy" }
] as const;

export function GradeBar({ className }: { className?: string }) {
	return (
		<div
			className={cn("grid grid-cols-4 gap-3", className)}
			role="group"
			aria-label="Nilai jawaban"
		>
			{grades.map((g) => (
				<button
					key={g.key}
					type="button"
					className={cn(
						"h-control border-ink-1000 font-display text-body-md text-ink-1000 shadow-block flex items-center justify-center gap-2 rounded-sm border leading-none font-semibold active:translate-[2px_2px] active:shadow-none",
						g.className
					)}
				>
					{g.label}
					<Kbd>{g.key}</Kbd>
				</button>
			))}
		</div>
	);
}
