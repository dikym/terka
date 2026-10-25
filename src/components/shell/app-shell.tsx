"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { keyAction } from "@/lib/keys";
import { MobileHeader } from "./mobile-header";
import { Sidebar } from "./sidebar";
import { SyncNotices } from "./sync-notices";
import { TabBar } from "./tab-bar";

export const SEARCH_ID = "referensi-search";
/** Opening Referensi with this hash puts the cursor in its search box. */
export const SEARCH_HASH = "cari";

export function AppShell({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			// A modal screen (the welcome) owns the keyboard until it closes.
			if (document.querySelector('[aria-modal="true"]')) return;
			const action = keyAction(
				{ key: event.key, target: event.target as HTMLElement | null },
				"app"
			);
			const search = document.getElementById(SEARCH_ID);
			if (action === "start") router.push("/sesi");
			else if (action === "kilat") router.push("/sesi?mode=kilat");
			else if (action === "search" || (action === "cakupan" && pathname === "/referensi")) {
				event.preventDefault();
				if (search) search.focus();
				else router.push(`/referensi#${SEARCH_HASH}`);
			} else if (action === "cakupan") router.push("/cakupan");
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [router, pathname]);

	return (
		<div className="group flex min-h-dvh flex-col lg:flex-row">
			<Sidebar />
			<MobileHeader />
			<div className="flex min-w-0 flex-1 flex-col">
				{/* Phone padding clears the fixed 60 px top bar and tab bar. */}
				<main className="container flex flex-col gap-5 pt-20 pb-[calc(--spacing(23)+env(safe-area-inset-bottom))] lg:gap-6 lg:pt-8 lg:pb-10">
					{children}
				</main>
			</div>
			<TabBar />
			<SyncNotices />
		</div>
	);
}
