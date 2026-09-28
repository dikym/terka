import type { LucideIcon } from "lucide-react";

export function Icon({
	name: Glyph,
	size = 20,
	className
}: {
	name: LucideIcon;
	size?: 16 | 20 | 24;
	className?: string;
}) {
	return <Glyph size={size} strokeWidth={2} aria-hidden="true" className={className} />;
}
