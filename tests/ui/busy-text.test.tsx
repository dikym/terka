import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BusyText } from "@/components/ui/feedback";

describe("BusyText", () => {
	test("turns a trailing ellipsis into three pulsing dots hidden from screen readers", () => {
		for (const text of ["Menyinkronkan…", "Menyinkronkan..."]) {
			const html = renderToStaticMarkup(<BusyText>{text}</BusyText>);
			expect(html.startsWith('Menyinkronkan<span aria-hidden="true">')).toBe(true);
			expect(html.match(/animate-busy-dot/g)).toHaveLength(3);
			expect(html).not.toContain("…");
		}
	});

	test("leaves other text as it is", () => {
		expect(renderToStaticMarkup(<BusyText>Tersinkron baru saja</BusyText>)).toBe(
			"Tersinkron baru saja"
		);
		expect(renderToStaticMarkup(<BusyText>Kode lain di … sini</BusyText>)).toBe(
			"Kode lain di … sini"
		);
	});
});
