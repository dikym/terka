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
	"cloud-off",
	"cloud-sync",
	"cloud-upload",
	"crosshair",
	"download",
	"eye",
	"flag",
	"flame",
	"git-compare-arrows",
	"globe",
	"globe-off",
	"hard-drive",
	"house",
	"info",
	"keyboard",
	"layers",
	"lock",
	"log-out",
	"mail",
	"medal",
	"minus",
	"monitor",
	"play",
	"plus",
	"rotate-ccw",
	"search",
	"settings",
	"shield-check",
	"smartphone",
	"tablet",
	"timer",
	"trash",
	"trending-up",
	"triangle-alert",
	"trophy",
	"undo-2",
	"upload",
	"user",
	"user-x",
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

/** Google's mark must keep its four brand colours, so it is inline art rather than a masked icon. */
export function GoogleMark({ size = 16 }: { size?: number }) {
	return (
		<svg aria-hidden="true" viewBox="0 0 48 48" width={size} height={size} className="shrink-0">
			<path
				fill="#EA4335"
				d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
			/>
			<path
				fill="#4285F4"
				d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
			/>
			<path
				fill="#FBBC05"
				d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
			/>
			<path
				fill="#34A853"
				d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
			/>
		</svg>
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
