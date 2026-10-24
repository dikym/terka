"use client";

import { useEffect, useState } from "react";
import { registerServiceWorker } from "@/lib/pwa/register";

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

	if (!failed || !offline) return null;
	return (
		<p role="status">Pemasangan pertama memerlukan koneksi internet. Coba lagi saat online.</p>
	);
}
