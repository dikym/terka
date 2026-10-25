"use client";

import { useEffect, useState } from "react";
import { registerServiceWorker } from "@/lib/pwa/register";
import { showToast } from "@/lib/toasts";

export function InstallStatus() {
	const [failed, setFailed] = useState(false);
	const [offline, setOffline] = useState(false);

	useEffect(() => {
		if (process.env.NODE_ENV !== "production") return;
		const update = () => setOffline(!navigator.onLine);
		update();
		window.addEventListener("online", update);
		window.addEventListener("offline", update);
		void registerServiceWorker().then((state) => setFailed(state === "installFailed"));
		return () => {
			window.removeEventListener("online", update);
			window.removeEventListener("offline", update);
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
	return null;
}
