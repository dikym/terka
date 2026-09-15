import { cn } from "@/lib/utils";

export function MapPlaceholder({
	note = "peta Indonesia — SVG statis\nid elemen = id cakupan",
	className
}: {
	note?: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"border-ink-300 bg-hatch flex aspect-[2/1] w-full items-center justify-center rounded-sm border border-dashed p-4 text-center",
				className
			)}
		>
			<span className="text-body-sm text-ink-500 font-mono whitespace-pre-line">{note}</span>
		</div>
	);
}
