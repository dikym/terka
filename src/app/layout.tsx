import type { Metadata } from "next";
import {
	Barlow_Semi_Condensed,
	IBM_Plex_Mono,
	IBM_Plex_Sans,
	Space_Grotesk
} from "next/font/google";
import "./globals.css";
import { LearningProvider } from "@/components/learning/learning-provider";

const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	variable: "--font-space-grotesk"
});
const plexSans = IBM_Plex_Sans({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	style: ["normal", "italic"],
	variable: "--font-ibm-plex-sans"
});
const plexMono = IBM_Plex_Mono({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	variable: "--font-ibm-plex-mono"
});
const barlow = Barlow_Semi_Condensed({
	subsets: ["latin"],
	weight: ["500", "600", "700"],
	variable: "--font-barlow-semi-condensed"
});

export const metadata: Metadata = {
	title: "Terka",
	description: "Lihat platnya, terka asalnya."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="id"
			className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable} ${barlow.variable}`}
		>
			<body>
				<LearningProvider>{children}</LearningProvider>
			</body>
		</html>
	);
}
