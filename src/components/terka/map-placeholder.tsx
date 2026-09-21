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
				"flex aspect-[2/1] w-full items-center justify-center rounded-sm border border-dashed border-ink-300 p-4 text-center bg-hatch",
				className
			)}
		>
			<span className="font-mono text-body-sm whitespace-pre-line text-ink-500">{note}</span>
		</div>
	);
}
