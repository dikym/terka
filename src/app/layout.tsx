import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";
import { InstallStatus } from "./install-status";
import { OptimizerOnIdle } from "./optimizer-on-idle";
import { PageViews } from "./page-views";
import { ToastHost } from "@/components/ui/toast";

export const metadata: Metadata = {
	title: "Terka",
	description: "Lihat pelatnya, terka asalnya."
};

export const viewport: Viewport = { themeColor: "#0f172a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		// Chrome on iOS adds `__gcrremoteframetoken` to <html> before hydration.
		<html lang="id" className={fontVariables} suppressHydrationWarning>
			<body>
				<InstallStatus />
				{children}
				<ToastHost />
				<OptimizerOnIdle />
				<PageViews />
			</body>
		</html>
	);
}
