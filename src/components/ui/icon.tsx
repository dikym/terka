import Image from "next/image";

export const ICON_NAMES = [
	"arrow-left",
	"arrow-right",
	"book-open",
	"brain",
	"calendar-check",
	"calendar-days",
	"check",
	"chevron-down",
	"chevron-right",
	"circle-alert",
	"circle-plus",
	"clock",
	"cloud-check",
	"cloud-upload",
	"crosshair",
	"download",
	"eye",
	"flag",
	"flame",
	"git-compare-arrows",
	"hard-drive",
	"house",
	"info",
	"keyboard",
	"layers",
	"lock",
	"log-out",
	"medal",
	"minus",
	"play",
	"plus",
	"rotate-ccw",
	"search",
	"settings",
	"shield-check",
	"timer",
	"trending-up",
	"triangle-alert",
	"trophy",
	"undo-2",
	"upload",
	"user",
	"x",
	"zap"
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export const FLAG_CODES = ["bg", "ir", "jp", "kh", "my", "tr", "un"] as const;

export type FlagCode = (typeof FLAG_CODES)[number];

type IconProps = {
	name: IconName;
	size?: number;
	/** A `bg-*` class; the glyph is a mask, so its fill is the background. */
	color?: string;
	className?: string;
};

export function Icon({ name, size = 20, color = "bg-black", className = "" }: IconProps) {
	return (
		<span
			aria-hidden="true"
			className={`inline-block shrink-0 ${color} ${className}`}
			style={{
				width: size,
				height: size,
				mask: `url(/icons/${name}.svg) center / contain no-repeat`
			}}
		/>
	);
}

export function Flag({ code, large = false }: { code: FlagCode; large?: boolean }) {
	return (
		<Image
			src={`/flags/${code}.svg`}
			alt=""
			aria-hidden="true"
			width={large ? 32 : 20}
			height={large ? 24 : 15}
			className="block shrink-0 ring-1 ring-ink-200"
		/>
	);
}
