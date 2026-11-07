import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "@/components/ui/button";

describe("Button loading", () => {
	test("is announced as busy and unavailable, and stays focusable", () => {
		const html = renderToStaticMarkup(<Button loading>Simpan</Button>);
		expect(html).toContain('aria-busy="true"');
		expect(html).toContain('aria-disabled="true"');
		expect(html).not.toContain('disabled=""');
	});

	test("loading wins over disabled, so focus is not dropped mid-action", () => {
		const html = renderToStaticMarkup(
			<Button loading disabled>
				Simpan
			</Button>
		);
		expect(html).not.toContain('disabled=""');
	});

	test("keeps the label, so the width and accessible name hold", () => {
		expect(renderToStaticMarkup(<Button loading>Simpan</Button>)).toContain("Simpan");
	});

	test("says what is happening, with three dots hidden from screen readers", () => {
		const html = renderToStaticMarkup(
			<Button loading busyLabel="Mengirim">
				Kirim
			</Button>
		);
		expect(html).toContain("Mengirim");
		expect(html.match(/animate-busy-dot/g)).toHaveLength(3);
		expect(html).not.toContain("data-spinner");
	});

	test("shows only the busy label while loading", () => {
		const html = renderToStaticMarkup(
			<Button loading busyLabel="Mengirim">
				Kirim
			</Button>
		);
		expect(html).toContain("Mengirim");
		expect(html).not.toContain("Kirim");
	});

	test("an idle button is only as wide as its own label", () => {
		const html = renderToStaticMarkup(<Button busyLabel="Menghapus">Hapus</Button>);
		expect(html).toContain("Hapus");
		expect(html).not.toContain("Menghapus");
		expect(html).not.toContain("invisible");
	});

	test("cannot be followed as a link", () => {
		const html = renderToStaticMarkup(
			<Button loading href="/beranda">
				Buka
			</Button>
		);
		expect(html).toStartWith("<button");
		expect(html).not.toContain("href");
	});

	test("an idle button is not busy", () => {
		const html = renderToStaticMarkup(<Button>Simpan</Button>);
		expect(html).not.toContain('aria-busy="true"');
		expect(html).not.toContain('disabled=""');
	});
});
