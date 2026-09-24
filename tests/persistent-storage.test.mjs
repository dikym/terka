import { test, mock } from "bun:test";
import assert from "node:assert/strict";
import { Children, createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("settings explain denied or unavailable storage and still allow a successful retry", async () => {
	let pending;
	let message;
	let tone;
	let progress = { lastBackupAt: null, cards: [], storagePersistent: false };
	mock.module("next/navigation", () => ({ useRouter: () => ({}) }));
	mock.module("../src/components/learning/backup-actions", () => ({
		useBackupActions: () => ({ folder: null, supported: false })
	}));
	mock.module("../src/components/learning/learning-provider", () => ({
		useLearning: () => ({
			progress,
			content: { version: "test" },
			busy: false,
			run: (action, failureTone = "danger") => {
				message = undefined;
				pending = action().catch((error) => {
					message = error.message;
					tone = failureTone;
				});
				return pending;
			},
			act: async (update) => {
				progress = update(progress);
			}
		})
	}));
	const { SettingsScreen } = await import("../src/components/screens/settings");
	function findToggle(children) {
		for (const child of Children.toArray(children)) {
			if (!isValidElement(child)) continue;
			if (child.props.label === "Penyimpanan permanen peramban") return child;
			const found = findToggle(child.props.children);
			if (found) return found;
		}
	}
	// Hooks need a real render; capture the returned tree to reach the toggle's handlers.
	function render() {
		let tree;
		renderToStaticMarkup(createElement(() => ((tree = SettingsScreen()), null)));
		return tree;
	}
	const original = Object.getOwnPropertyDescriptor(navigator, "storage");
	try {
		for (const granted of [false, undefined, true]) {
			Object.defineProperty(navigator, "storage", {
				configurable: true,
				value: granted === undefined ? undefined : { persist: async () => granted }
			});
			findToggle(render()).props.onClick();
			await pending;
			await Promise.resolve();
			if (granted === false)
				assert.match(message, /belum mengizinkan.*tanpa menampilkan dialog/);
			if (granted === undefined) assert.match(message, /tidak tersedia/);
			if (granted !== true) assert.equal(tone, "warn");
			if (granted === true) assert.equal(message, undefined);
			assert.equal(progress.storagePersistent, granted === true);
		}
		assert.equal(findToggle(render()).props.checked, true);
	} finally {
		if (original) Object.defineProperty(navigator, "storage", original);
		else delete navigator.storage;
		mock.restore();
	}
});
