"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { keyAction } from "@/dummy/keys";
import { ShortcutsOverlay } from "./shortcuts";
import { Sidebar } from "./sidebar";

export const SEARCH_ID = "referensi-search";
/** Opening Referensi with this hash puts the cursor in its search box. */
export const SEARCH_HASH = "cari";

export function AppShell({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	// Tied to the page it was opened on, so following a sidebar link closes it.
	const [shortcutsOn, setShortcutsOn] = useState<string | null>(null);
	const shortcuts = shortcutsOn === pathname;
	const closeShortcuts = useCallback(() => setShortcutsOn(null), []);

	useEffect(() => {
		if (shortcuts) return;
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
	}, [shortcuts, router, pathname]);

	return (
		<div className="flex min-h-dvh">
			<Sidebar
				shortcuts={shortcuts}
				onShortcuts={() => setShortcutsOn(shortcuts ? null : pathname)}
			/>
			<div className="flex min-w-0 flex-1 flex-col">
				<main className="container flex flex-col gap-6 pt-8 pb-10">{children}</main>
			</div>
			{shortcuts && <ShortcutsOverlay onClose={closeShortcuts} />}
		</div>
	);
}
