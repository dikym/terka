import { cn } from "@/lib/utils";

type Ring = { value: number; className?: string };

export function RingGauge({
	size = 96,
	viewBoxSize = size,
	strokeWidth = 8,
	gap = 4,
	rings,
	className,
	children
}: {
	size?: number;
	viewBoxSize?: number;
	strokeWidth?: number;
	gap?: number;
	rings: Ring[];
	className?: string;
	children?: React.ReactNode;
}) {
	const center = viewBoxSize / 2;
	return (
		<div
			className={cn("relative inline-flex items-center justify-center", className)}
			style={{ width: size, height: size }}
		>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
				className="-rotate-90"
				aria-hidden
			>
				{rings.map((ring, index) => {
					const radius = center - strokeWidth / 2 - index * (strokeWidth + gap);
					const circumference = 2 * Math.PI * radius;
					return (
						<g key={index}>
							<circle
								cx={center}
								cy={center}
								r={radius}
								fill="none"
								strokeWidth={strokeWidth}
								className="stroke-ink-100"
							/>
							<circle
								cx={center}
								cy={center}
								r={radius}
								fill="none"
								strokeWidth={strokeWidth}
								strokeDasharray={circumference}
								strokeDashoffset={circumference * (1 - ring.value / 100)}
								className={ring.className ?? "stroke-ink-1000"}
							/>
						</g>
					);
				})}
			</svg>
			{children ? (
				<div className="absolute inset-0 flex items-center justify-center">{children}</div>
			) : null}
		</div>
	);
}
