export type InstallState = "none" | "ready" | "updating" | "installFailed";

const settled = (worker: ServiceWorker) =>
	new Promise<boolean>((resolve) => {
		const check = () => {
			if (worker.state === "activated") resolve(true);
			else if (worker.state === "redundant") resolve(false);
		};
		worker.addEventListener("statechange", check);
		check();
	});

// A waiting version takes over only here, at page start, so a running session never switches assets.
export async function registerServiceWorker(): Promise<InstallState> {
	if (!("serviceWorker" in navigator)) return "none";
	const container = navigator.serviceWorker;
	const controlled = container.controller !== null;
	let registration: ServiceWorkerRegistration;
	try {
		registration = await container.register("/sw.js");
	} catch {
		return controlled ? "ready" : "installFailed";
	}
	if (controlled && registration.waiting) {
		container.addEventListener("controllerchange", () => location.reload(), { once: true });
		registration.waiting.postMessage("SKIP_WAITING");
		return "updating";
	}
	if (controlled || registration.active) return "ready";
	const installing = registration.installing ?? registration.waiting;
	return installing && (await settled(installing)) ? "ready" : "installFailed";
}

export async function checkForUpdate(): Promise<void> {
	const registration = await navigator.serviceWorker?.getRegistration();
	await registration?.update().catch(() => {});
}
