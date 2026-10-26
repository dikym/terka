"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { recheckOffer } from "@/core/session/recheck";
import { sessionCtx } from "@/lib/app/runtime";
import { useAppState, useReady } from "@/lib/app/use-runtime";
import { keyAction } from "@/lib/keys";
import { DAILY_SESSION } from "@/lib/session/modes";
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
	const { runtime } = useReady();
	const state = useAppState(runtime)?.log.state;

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
			// Same target as the Mulai belajar button; checked on the key press, since it replays the day.
			if (action === "start")
				router.push(
					runtime && state && recheckOffer(state, sessionCtx(runtime))
						? "/sesi?mode=cek"
						: DAILY_SESSION
				);
			else if (action === "kilat") router.push("/sesi?mode=kilat");
			else if (action === "search" || (action === "cakupan" && pathname === "/referensi")) {
				event.preventDefault();
				if (search) search.focus();
				else router.push(`/referensi#${SEARCH_HASH}`);
			} else if (action === "cakupan") router.push("/cakupan");
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [router, pathname, runtime, state]);

	return (
		<div className="group flex min-h-dvh flex-col lg:flex-row">
			<Sidebar />
			<MobileHeader />
			<div className="flex min-w-0 flex-1 flex-col">
				{/* Phone padding clears the fixed 60 px top bar and tab bar. */}
				<main className="container flex flex-1 flex-col gap-5 pt-20 pb-[calc(--spacing(23)+env(safe-area-inset-bottom))] lg:gap-6 lg:pt-8 lg:pb-10">
					{children}
				</main>
			</div>
			<TabBar />
			<SyncNotices />
		</div>
	);
}
