import { cn } from "@/lib/utils";

type Ring = { value: number; className?: string };

export function RingGauge({
	size = 96,
	stroke = 8,
	gap = 4,
	rings,
	className,
	children
}: {
	size?: number;
	stroke?: number;
	gap?: number;
	rings: Ring[];
	className?: string;
	children?: React.ReactNode;
}) {
	const c = size / 2;
	return (
		<div
			className={cn("relative inline-flex items-center justify-center", className)}
			style={{ width: size, height: size }}
		>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				className="-rotate-90"
				aria-hidden
			>
				{rings.map((ring, i) => {
					const r = c - stroke / 2 - i * (stroke + gap);
					const len = 2 * Math.PI * r;
					return (
						<g key={i}>
							<circle
								cx={c}
								cy={c}
								r={r}
								fill="none"
								strokeWidth={stroke}
								className="stroke-ink-100"
							/>
							<circle
								cx={c}
								cy={c}
								r={r}
								fill="none"
								strokeWidth={stroke}
								strokeDasharray={len}
								strokeDashoffset={len * (1 - ring.value / 100)}
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
