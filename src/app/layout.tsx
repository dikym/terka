import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";
import { InstallStatus } from "./install-status";
import { OptimizerOnIdle } from "./optimizer-on-idle";
import { PageViews } from "./page-views";
import { ToastHost } from "@/components/ui/toast";
import { WELCOME_SEEN } from "@/lib/flag-keys";

export const metadata: Metadata = {
	title: "Terka",
	description: "Lihat pelatnya, terka asalnya."
};

export const viewport: Viewport = { themeColor: "#0f172a" };

// The static /beranda page holds the home skeleton. For someone who has not seen the welcome yet,
// mark the page before the first paint so the welcome skeleton covers it until React decides. No
// time limit: on a slow connection the scripts can take many seconds, and the page is unusable
// without them anyway.
// Someone who has already been through the welcome skips the landing page. The page is hidden while
// the redirect loads so it never flashes; a link with a hash, such as /#data, still opens it.
const FIRST_VISIT = `try{var seen=localStorage.getItem("${WELCOME_SEEN}");var at=location.pathname;if(at==="/beranda"&&!seen){document.documentElement.dataset.welcome="pending"}else if(at==="/"&&seen&&!location.hash){document.documentElement.dataset.returning="1";location.replace("/beranda")}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		// Chrome on iOS adds `__gcrremoteframetoken` to <html> before hydration.
		<html lang="id" className={fontVariables} suppressHydrationWarning>
			<head>
				{/* Inline, not in the stylesheet: it must apply before the first paint, also in dev. */}
				<style>{`html[data-welcome="pending"] [data-welcome-skeleton]{display:flex}html[data-returning]{display:none}`}</style>
				<script dangerouslySetInnerHTML={{ __html: FIRST_VISIT }} />
			</head>
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
