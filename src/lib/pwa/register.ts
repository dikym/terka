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

const activate = (registration: ServiceWorkerRegistration) => {
	navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), {
		once: true
	});
	registration.waiting?.postMessage("SKIP_WAITING");
};

// A waiting version takes over at page start, so a running session never switches assets.
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
		activate(registration);
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

/** Calls `change` whenever a new version starts or stops waiting behind the running one. */
export function watchWaiting(change: (waiting: boolean) => void): () => void {
	let registration: ServiceWorkerRegistration | undefined;
	let closed = false;
	const report = () => {
		if (!closed)
			change(navigator.serviceWorker.controller !== null && registration?.waiting != null);
	};
	const track = (worker: ServiceWorker | null) => worker?.addEventListener("statechange", report);
	const onFound = () => track(registration?.installing ?? null);
	void navigator.serviceWorker?.getRegistration().then((found) => {
		if (closed || !found) return;
		registration = found;
		found.addEventListener("updatefound", onFound);
		track(found.installing);
		report();
	});
	return () => {
		closed = true;
		registration?.removeEventListener("updatefound", onFound);
	};
}

export async function applyWaiting(): Promise<void> {
	const registration = await navigator.serviceWorker?.getRegistration();
	if (registration?.waiting) activate(registration);
}

/**
 * A waiting version is installed on its own, silently, as soon as nothing is in progress.
 * During a session or while the user is typing it waits, so no answer or input is lost to a reload.
 */
export const updateAction = (input: {
	waiting: boolean;
	inSession: boolean;
	typing: boolean;
}): "none" | "apply" | "wait" =>
	!input.waiting ? "none" : input.inSession || input.typing ? "wait" : "apply";
