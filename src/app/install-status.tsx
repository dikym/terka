"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
	applyWaiting,
	checkForUpdate,
	registerServiceWorker,
	updateAction,
	watchWaiting
} from "@/lib/pwa/register";
import { showToast } from "@/lib/toasts";

// A phone resumes its tabs all the time; one check a minute is plenty.
const CHECK_EVERY_MS = 60_000;

const isTyping = (element: EventTarget | null) =>
	element instanceof HTMLInputElement ||
	element instanceof HTMLTextAreaElement ||
	(element instanceof HTMLElement && element.isContentEditable);

export function InstallStatus() {
	const [failed, setFailed] = useState(false);
	const [offline, setOffline] = useState(false);
	const [waiting, setWaiting] = useState(false);
	const [typing, setTyping] = useState(false);
	const inSession = usePathname().startsWith("/sesi");
	const lastCheck = useRef(0);

	useEffect(() => {
		if (process.env.NODE_ENV !== "production") return;
		const update = () => setOffline(!navigator.onLine);
		update();
		// A phone app resumed from the background does not reload, so it looks for a new version here.
		const check = () => {
			if (
				document.visibilityState !== "visible" ||
				Date.now() - lastCheck.current < CHECK_EVERY_MS
			)
				return;
			lastCheck.current = Date.now();
			void checkForUpdate();
		};
		const online = () => {
			update();
			check();
		};
		window.addEventListener("online", online);
		window.addEventListener("offline", update);
		document.addEventListener("visibilitychange", check);
		const focusIn = (event: FocusEvent) => setTyping(isTyping(event.target));
		const focusOut = () => setTyping(false);
		document.addEventListener("focusin", focusIn);
		document.addEventListener("focusout", focusOut);
		void registerServiceWorker().then((state) => setFailed(state === "installFailed"));
		const stop = watchWaiting(setWaiting);
		return () => {
			stop();
			window.removeEventListener("online", online);
			window.removeEventListener("offline", update);
			document.removeEventListener("visibilitychange", check);
			document.removeEventListener("focusin", focusIn);
			document.removeEventListener("focusout", focusOut);
		};
	}, []);

	useEffect(() => {
		if (failed && offline)
			showToast({
				tone: "warn",
				icon: "globe",
				text: "Pemasangan pertama memerlukan koneksi internet. Coba lagi saat online.",
				key: "install"
			});
	}, [failed, offline]);

	useEffect(() => {
		if (updateAction({ waiting, inSession, typing }) === "apply") void applyWaiting();
	}, [waiting, inSession, typing]);
	return null;
}
