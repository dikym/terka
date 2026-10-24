/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: (string | { url: string; revision: string | null })[];
};

// Query strings never pick a different page: /auth/callback?code=… must open offline too.
precacheAndRoute(self.__WB_MANIFEST, { cleanURLs: true, ignoreURLParametersMatching: [/.*/] });
cleanupOutdatedCaches();

// No skipWaiting on install: a running session keeps its version until the page asks.
self.addEventListener("message", (event) => {
	if (event.data === "SKIP_WAITING") void self.skipWaiting();
});
