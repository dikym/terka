import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { cn } from "../src/lib/utils";
import { RingGauge } from "../src/components/ui/ring-gauge";
import { Toast } from "../src/components/ui/toast";

test("custom Tailwind sizes, colors and responsive overrides merge independently", () => {
	assert.equal(
		cn("text-body-md text-ink-900", "text-heading text-go-700"),
		"text-heading text-go-700"
	);
	assert.equal(cn("shadow-lift", "shadow-block"), "shadow-block");
	assert.equal(
		cn("grid-cols-1 lg:grid-cols-[minmax(0,1fr)_var(--spacing-panel)]", "lg:grid-cols-2"),
		"grid-cols-1 lg:grid-cols-2"
	);
});

test("toast preserves severity and exposes a focusable countdown without close controls", () => {
	for (const tone of ["warn", "danger"] as const) {
		const markup = renderToStaticMarkup(<Toast message="Pesan pengujian" tone={tone} />);
		assert.ok(markup.includes(tone === "warn" ? "Perlu perhatian" : "Terjadi kesalahan"));
		assert.ok(markup.includes(`data-tone="${tone}"`));
		assert.ok(markup.indexOf("toast-countdown") < markup.indexOf("Pesan pengujian"));
		assert.ok(markup.includes('tabindex="0"'));
		assert.ok(markup.includes("toast-countdown"));
		assert.ok(!markup.includes("<button"));
		assert.ok(!markup.includes("<svg"));
	}
});

test("ring geometry uses viewBox dimensions independently of display size", () => {
	const markup = renderToStaticMarkup(
		<RingGauge
			size={76}
			viewBoxSize={88}
			strokeWidth={6}
			gap={2}
			rings={[{ value: 100 }, { value: 0 }]}
		/>
	);
	assert.ok(markup.includes('viewBox="0 0 88 88"'));
	assert.ok(markup.includes('width="76"'));
	assert.ok(markup.includes('r="41"'));
	assert.ok(markup.includes('r="33"'));
	assert.ok(markup.includes('stroke-dashoffset="0"'));
	assert.ok(markup.includes(`stroke-dashoffset="${2 * Math.PI * 33}"`));
});
