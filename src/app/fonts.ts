import {
	Barlow_Semi_Condensed,
	IBM_Plex_Mono,
	IBM_Plex_Sans,
	Space_Grotesk
} from "next/font/google";

const display = Space_Grotesk({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	display: "swap",
	variable: "--font-space-grotesk"
});

const body = IBM_Plex_Sans({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	display: "swap",
	variable: "--font-plex-sans"
});

const mono = IBM_Plex_Mono({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	display: "swap",
	variable: "--font-plex-mono"
});

const plate = Barlow_Semi_Condensed({
	subsets: ["latin"],
	weight: ["500", "600", "700"],
	display: "swap",
	variable: "--font-barlow-sc"
});

export const fontVariables = [display, body, mono, plate].map((font) => font.variable).join(" ");
