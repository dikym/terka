// Run with the dev server on localhost:3000:
// CHROME_BIN=/path/to/chrome-headless-shell bun scripts/check-toast.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const browserPath = process.env.CHROME_BIN;
assert.ok(browserPath, "Set CHROME_BIN to a Chromium executable");
const profile = mkdtempSync(join(tmpdir(), "terka-toast-"));
const browser = spawn(
	browserPath,
	[
		"--remote-debugging-port=0",
		`--user-data-dir=${profile}`,
		"--no-first-run",
		"--no-default-browser-check",
		"about:blank"
	],
	{ stdio: "ignore" }
);
const browserExit = once(browser, "exit");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws;
try {
	let pages;
	for (let i = 0; i < 100; i++) {
		try {
			const port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0];
			pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
			if (pages.length) break;
		} catch {}
		await sleep(100);
	}
	if (!pages?.length) throw new Error("Browser did not start");
	ws = new WebSocket(pages[0].webSocketDebuggerUrl);
	await new Promise((resolve, reject) => {
		ws.onopen = resolve;
		ws.onerror = reject;
	});
	let sequence = 0;
	const pending = new Map();
	const errors = [];
	ws.onmessage = (event) => {
		const data = JSON.parse(event.data);
		if (data.id) {
			const item = pending.get(data.id);
			if (item) {
				pending.delete(data.id);
				if (data.error) item.reject(data.error);
				else item.resolve(data.result);
			}
		} else if (data.method === "Runtime.exceptionThrown")
			errors.push(
				data.params.exceptionDetails.exception?.description ??
					data.params.exceptionDetails.text
			);
	};
	const send = (method, params = {}) =>
		new Promise((resolve, reject) => {
			const id = ++sequence;
			pending.set(id, { resolve, reject });
			ws.send(JSON.stringify({ id, method, params }));
		});
	const evaluate = async (expression) => {
		const data = await send("Runtime.evaluate", {
			expression,
			awaitPromise: true,
			returnByValue: true
		});
		if (data.exceptionDetails)
			throw new Error(
				data.exceptionDetails.exception?.description ?? data.exceptionDetails.text
			);
		return data.result.value;
	};
	const until = async (expression, label, timeout = 25000) => {
		const deadline = Date.now() + timeout;
		while (Date.now() < deadline) {
			try {
				if (await evaluate(expression)) return;
			} catch {}
			await sleep(100);
		}
		throw new Error(`Timeout: ${label}\n${await evaluate("document.body.innerText")}`);
	};
	const text = (value) =>
		until(
			`document.body.innerText.toLowerCase().includes(${JSON.stringify(value.toLowerCase())})`,
			value
		);
	const goto = async (path, label) => {
		await send("Page.navigate", { url: `http://localhost:3000${path}` });
		await text(label);
	};
	await send("Runtime.enable");
	await send("Page.enable");

	await send("Page.addScriptToEvaluateOnNewDocument", {
		source: `StorageManager.prototype.persist = async () => false;
		window.toastAnimations = [];
		document.addEventListener('animationstart', event => {
			if (event.target.classList.contains('toast')) window.toastAnimations.push(event.animationName);
		});`
	});
	const progress = () =>
		evaluate(`document.querySelector('.toast-countdown')?.getAnimations()[0]?.currentTime`);
	const trigger = async () => {
		await until(
			`!!document.querySelector('[role="switch"][aria-label="Penyimpanan permanen peramban"]:not(:disabled)')`,
			"storage toggle"
		);
		await evaluate(
			`document.querySelector('[role="switch"][aria-label="Penyimpanan permanen peramban"]').click()`
		);
		await until(`!!document.querySelector('.toast')`, "toast");
	};
	for (const width of [1800, 390]) {
		await send("Emulation.setDeviceMetricsOverride", {
			width,
			height: 1100,
			deviceScaleFactor: 1,
			mobile: false
		});
		await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
		await goto("/setelan", "Penyimpanan permanen peramban");
		const headingTop = await evaluate(
			`document.querySelector('h1').getBoundingClientRect().top`
		);
		await trigger();
		const rect = await evaluate(
			`(() => { const toast = document.querySelector('.toast'); const rect = toast.getBoundingClientRect(); return {left:rect.left, right:rect.right, top:rect.top, bottom:rect.bottom, width:rect.width}; })()`
		);
		assert.equal(await evaluate(`!!document.querySelector('.toast button')`), false);
		assert.equal(await evaluate(`!!document.querySelector('.toast svg')`), false);
		assert.equal(
			await evaluate(`document.querySelector('h1').getBoundingClientRect().top`),
			headingTop
		);
		assert.ok(rect.right <= width && rect.left >= 0 && rect.bottom <= 1100);
		assert.ok(rect.width <= 420);
		await sleep(1400);
		assert.ok((await progress()) > 1000);
		if (width === 1800) {
			await send("Input.dispatchMouseEvent", {
				type: "mouseMoved",
				x: rect.left + 30,
				y: rect.top + 30
			});
		} else {
			await evaluate(`document.querySelector('.toast').focus()`);
		}
		await sleep(100);
		const pausedAt = await progress();
		await send("Page.captureScreenshot", { format: "png" }).then((result) =>
			writeFileSync(
				join(tmpdir(), `terka-toast-countdown-${width}.png`),
				Buffer.from(result.data, "base64")
			)
		);
		await sleep(6500);
		assert.ok(await evaluate(`!!document.querySelector('.toast')`));
		assert.ok(Math.abs((await progress()) - pausedAt) < 50, "Countdown must pause");
		if (width === 1800) {
			await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
		} else {
			await evaluate(`document.querySelector('.toast').blur()`);
		}
		const resumed = Date.now();
		await until(`!document.querySelector('.toast')`, "automatic dismissal", 5500);
		assert.equal(
			await evaluate(`window.toastAnimations.some(name => name.includes('toast-enter'))`),
			true
		);
		assert.equal(
			await evaluate(`window.toastAnimations.some(name => name.includes('toast-exit'))`),
			true
		);
		assert.ok(Date.now() - resumed > 3000, "Resume should preserve the remaining time");
		await trigger();
		assert.ok((await progress()) < 500, "Identical messages must restart their countdown");
		await until(`!document.querySelector('.toast')`, "fresh countdown completes", 7000);
		console.log(
			`Passed: ${width}px layout, ${width === 1800 ? "hover" : "focus"} pause, resume, expiry, repeat`
		);
	}
	await send("Emulation.setEmulatedMedia", {
		features: [{ name: "prefers-reduced-motion", value: "reduce" }]
	});
	await trigger();
	await until(`!document.querySelector('.toast')`, "reduced-motion dismissal", 7000);
	await send("Page.addScriptToEvaluateOnNewDocument", {
		source: 'IDBFactory.prototype.open = () => { throw new Error("Penyimpanan tidak dapat dibuka."); };'
	});
	await send("Page.navigate", { url: "http://localhost:3000/setelan" });
	await until(`!!document.querySelector('.toast')`, "storage error toast");
	assert.equal(
		await evaluate(`document.querySelector('.toast p').textContent`),
		"Terjadi kesalahan"
	);
	await until(`!document.querySelector('.toast')`, "storage error dismissal", 7000);
	assert.equal(
		await evaluate(
			`!!Array.from(document.querySelectorAll('main button')).find(button => button.textContent.includes('Coba simpan lagi'))`
		),
		true
	);
	assert.equal(
		await evaluate(
			`!!Array.from(document.querySelectorAll('main button')).find(button => button.textContent.includes('Muat ulang progres tersimpan'))`
		),
		true
	);
	console.log("Passed: reduced-motion expiry and persistent storage recovery");
	assert.deepEqual(errors, []);
} finally {
	ws?.close();
	browser.kill();
	await browserExit;
	rmSync(profile, { recursive: true, force: true });
}
