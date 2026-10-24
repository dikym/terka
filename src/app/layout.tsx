import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";
import { InstallStatus } from "./install-status";
import { OptimizerOnIdle } from "./optimizer-on-idle";
import { PageViews } from "./page-views";

export const metadata: Metadata = {
	title: "Terka",
	description: "Lihat pelatnya, terka asalnya."
};

export const viewport: Viewport = { themeColor: "#0f172a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="id" className={fontVariables}>
			<body>
				<InstallStatus />
				{children}
				<OptimizerOnIdle />
				<PageViews />
			</body>
		</html>
	);
}
