/// <reference lib="webworker" />
import type { Trainer } from "@/core/optimizer/items";
import { optimizeLog } from "@/core/optimizer/decide";
import type { Optimize } from "./run";
import { createTrainer, VERSION } from "./trainer";

let loaded: Promise<Trainer> | null = null;

// The WebAssembly loads only when a run actually trains; single-threaded, so no COOP/COEP.
function load(): Promise<Trainer> {
	loaded ??= (async () => {
		const { instantiate } =
			await import("@open-spaced-repetition/binding-wasm32-wasip1/workerd");
		const response = await fetch("/optimizer/fsrs.wasm");
		if (!response.ok) throw new Error(`optimizer wasm: HTTP ${response.status}`);
		const compiled = await WebAssembly.compile(await response.arrayBuffer());
		return createTrainer(await instantiate(compiled));
	})();
	return loaded;
}

const lazy: Trainer = {
	version: VERSION,
	train: async (items) => (await load()).train(items),
	evaluate: async (weights, items) => (await load()).evaluate(weights, items),
	steps: async (revlog, decay) => (await load()).steps!(revlog, decay)
};

self.onmessage = async (message: MessageEvent<Parameters<Optimize>[0]>) => {
	try {
		self.postMessage({ ok: true, ...(await optimizeLog(message.data, lazy)) });
	} catch (cause) {
		self.postMessage({
			ok: false,
			reason: cause instanceof Error ? cause.message : String(cause)
		});
	}
};
