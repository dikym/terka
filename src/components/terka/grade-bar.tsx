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
			{grades.map((grade) => (
				<button
					key={grade.key}
					type="button"
					className={cn(
						"flex h-control items-center justify-center gap-2 rounded-sm border border-ink-1000 font-display text-body-md leading-none font-semibold text-ink-1000 shadow-block active:translate-0.5 active:shadow-none",
						grade.className
					)}
				>
					{grade.label}
					<Kbd>{grade.key}</Kbd>
				</button>
			))}
		</div>
	);
}
