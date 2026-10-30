"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { SyncStatus } from "@/lib/sync/status";
import { useAppState, useReady } from "@/lib/app/use-runtime";
import { dismissToast, showToast } from "@/lib/toasts";
import { syncLabel } from "@/lib/view/sync-label";

// States that need the user's eye; synced, pending and staged stay in the sync chip.
const WARN = new Set<SyncStatus["state"]>([
	"sessionEnded",
	"outdated",
	"otherAccount",
	"unreachable",
	"totalLimit",
	"deviceLimit",
	"signupsClosed",
	"consentNeeded"
]);
const INFO = new Set<SyncStatus["state"]>(["offline", "dailyLimit"]);

function subscribeOnline(listener: () => void) {
	window.addEventListener("online", listener);
	window.addEventListener("offline", listener);
	return () => {
		window.removeEventListener("online", listener);
		window.removeEventListener("offline", listener);
	};
}

/** Announces a change of connection or sync state once, as a toast. */
export function SyncNotices() {
	const { runtime } = useReady();
	const sync = useAppState(runtime)?.sync ?? null;
	const online = useSyncExternalStore(
		subscribeOnline,
		() => navigator.onLine,
		() => true
	);
	const shown = useRef<string | null>(null);
	const toast = useRef<number | null>(null);

	useEffect(() => {
		// Without an account there is no sync status; going offline is still worth a word.
		const state = sync?.state ?? (online ? null : "offline");
		if (state === shown.current) return;
		shown.current = state;
		if (!state || (!WARN.has(state) && !INFO.has(state))) {
			// Notices wait for the user; one that no longer holds must not stay behind.
			if (toast.current === null) return;
			dismissToast(toast.current);
			toast.current = null;
			if (sync?.state === "synced")
				showToast({
					tone: "success",
					label: "Sinkronisasi",
					text: syncLabel(sync, true, Date.now()),
					key: "sync"
				});
			return;
		}
		toast.current = showToast({
			tone: WARN.has(state) ? "warn" : "info",
			label: "Sinkronisasi",
			icon: state === "offline" ? "globe" : undefined,
			text: sync
				? syncLabel(sync, true, Date.now())
				: "Sedang offline. Latihan tetap dapat digunakan.",
			key: "sync"
		});
	}, [sync, online]);
	return null;
}
