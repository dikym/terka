import { describe, expect, test } from "bun:test";
import { cspFor, inlineScriptHashes, withCsp } from "../../scripts/build/csp";

const page =
	'<html><head><title>t</title></head><body><script src="/a.js"></script><script>self.x=1</script><script>self.x=1</script><script>self.y=2</script></body></html>';

describe("page content security policy", () => {
	const csp = cspFor(["'sha256-abc'"]);

	test("scripts run only from the site, listed hashes, WebAssembly and the captcha", () => {
		expect(csp).toContain("default-src 'self'");
		expect(csp).toMatch(
			/script-src 'self' 'sha256-abc' 'wasm-unsafe-eval' https:\/\/challenges\.cloudflare\.com;/
		);
		expect(csp).not.toMatch(/script-src [^;]*'unsafe-inline'/);
		expect(csp).toContain("object-src 'none'");
	});

	test("the policy allows the sync server, its realtime socket and the email captcha", () => {
		expect(csp).toMatch(/connect-src [^;]*https:\/\/eviyqszgwjhekywqmhwv\.supabase\.co/);
		expect(csp).toMatch(/connect-src [^;]*wss:\/\/eviyqszgwjhekywqmhwv\.supabase\.co/);
		expect(csp).not.toContain("*.supabase.co");
		expect(csp).toMatch(/frame-src [^;]*https:\/\/challenges\.cloudflare\.com/);
	});

	test("every distinct inline script is hashed once and external scripts are not", () => {
		expect(inlineScriptHashes(page)).toHaveLength(2);
	});

	test("the policy is the first thing in the head", () => {
		const html = withCsp(page)!;
		expect(html).toStartWith('<html><head><meta http-equiv="Content-Security-Policy"');
		expect(html).toContain("'sha256-");
	});

	test("the policy follows a leading charset, before any script", () => {
		const html = withCsp(
			'<html><head><meta charSet="utf-8"/><script>self.x=1</script></head></html>'
		)!;
		expect(html).toStartWith(
			'<html><head><meta charSet="utf-8"/><meta http-equiv="Content-Security-Policy"'
		);
		expect(html.indexOf("Content-Security-Policy")).toBeLessThan(html.indexOf("<script>"));
	});

	test("a page without a head is refused", () => {
		expect(withCsp("<html></html>")).toBeNull();
	});
});
