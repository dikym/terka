import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BusyText, SyncLabel } from "@/components/ui/feedback";
import { Toast } from "@/components/ui/toast";
import { SYNCING_LABEL } from "@/lib/view/sync-label";

const dots = (html: string) => html.match(/animate-busy-dot/g)?.length ?? 0;

describe("BusyText", () => {
	test("adds three pulsing dots hidden from screen readers", () => {
		const html = renderToStaticMarkup(<BusyText>Menyelesaikan masuk</BusyText>);
		expect(html.startsWith('Menyelesaikan masuk<span aria-hidden="true">')).toBe(true);
		expect(dots(html)).toBe(3);
	});
});

describe("SyncLabel", () => {
	test("pulses only the syncing label", () => {
		const html = renderToStaticMarkup(<SyncLabel label={SYNCING_LABEL} />);
		expect(dots(html)).toBe(3);
		expect(html).not.toContain("…");
	});

	test("leaves any other label alone, even one ending in an ellipsis", () => {
		for (const label of ["Tersinkron baru saja", "Sebagian belum terkirim…"])
			expect(renderToStaticMarkup(<SyncLabel label={label} />)).toBe(label);
	});
});

describe("a toast's dots", () => {
	const html = (text: string, busy?: boolean) =>
		renderToStaticMarkup(
			<Toast toast={{ id: 1, tone: "info", text, busy }} onClose={() => {}} />
		);

	test("pulse when it says it is waiting", () => {
		expect(dots(html("Mengimpor data", true))).toBe(3);
	});

	test("do not appear for a message that only ends in an ellipsis", () => {
		const plain = html("Kode lain di…");
		expect(dots(plain)).toBe(0);
		expect(plain).toContain("Kode lain di…");
	});
});
