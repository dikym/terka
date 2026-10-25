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
	"globe",
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

export const FLAG_CODES = [
	"ae",
	"af",
	"am",
	"ar",
	"at",
	"au",
	"az",
	"ba",
	"bd",
	"be",
	"bg",
	"bh",
	"bn",
	"br",
	"by",
	"ca",
	"ch",
	"cl",
	"cn",
	"co",
	"cu",
	"cz",
	"de",
	"dk",
	"dz",
	"ec",
	"eg",
	"es",
	"et",
	"eu",
	"fi",
	"fj",
	"fr",
	"gb",
	"ge",
	"gr",
	"gw",
	"hr",
	"hu",
	"ie",
	"in",
	"iq",
	"ir",
	"it",
	"jo",
	"jp",
	"kh",
	"kp",
	"kr",
	"kw",
	"kz",
	"la",
	"lb",
	"lk",
	"ly",
	"ma",
	"mm",
	"mn",
	"mx",
	"my",
	"mz",
	"ng",
	"nl",
	"no",
	"nz",
	"om",
	"pa",
	"pe",
	"pg",
	"ph",
	"pk",
	"pl",
	"ps",
	"pt",
	"py",
	"qa",
	"ro",
	"rs",
	"ru",
	"sa",
	"sb",
	"sd",
	"se",
	"sg",
	"sk",
	"sm",
	"so",
	"sr",
	"sy",
	"th",
	"tl",
	"tn",
	"tr",
	"ua",
	"un",
	"us",
	"uz",
	"va",
	"ve",
	"vn",
	"ye",
	"za",
	"zw"
] as const;

export type FlagCode = (typeof FLAG_CODES)[number];

type IconProps = {
	name: IconName;
	/** Pixels; `null` leaves the size to a `size-*` class, for sizes that change per breakpoint. */
	size?: number | null;
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
				...(size !== null && { width: size, height: size }),
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
