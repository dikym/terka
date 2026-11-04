import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SUPABASE = "eviyqszgwjhekywqmhwv.supabase.co";
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
const HEAD_OPEN = "<head>";

// frame-ancestors is ignored in a meta tag, so vercel.json sends it as a header.
export function cspFor(scriptHashes: string[]): string {
	return [
		"default-src 'self'",
		`script-src 'self' ${scriptHashes.join(" ")} 'wasm-unsafe-eval' https://challenges.cloudflare.com`,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data:",
		"font-src 'self'",
		`connect-src 'self' https://${SUPABASE} wss://${SUPABASE} https://challenges.cloudflare.com`,
		"frame-src https://challenges.cloudflare.com",
		"worker-src 'self'",
		"manifest-src 'self'",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'"
	].join("; ");
}

export function inlineScriptHashes(html: string): string[] {
	const hashes = new Set<string>();
	for (const [, body] of html.matchAll(INLINE_SCRIPT))
		hashes.add(`'sha256-${createHash("sha256").update(body).digest("base64")}'`);
	return [...hashes];
}

export function withCsp(html: string): string | null {
	if (!html.includes(HEAD_OPEN)) return null;
	const tag = `<meta http-equiv="Content-Security-Policy" content="${cspFor(inlineScriptHashes(html))}"/>`;
	return html.replace(HEAD_OPEN, `${HEAD_OPEN}${tag}`);
}

// Next.js emits inline scripts, so each page allows exactly the ones it contains instead of 'unsafe-inline'.
export async function injectCsp(outDir: string): Promise<string[]> {
	const problems: string[] = [];
	const entries = await readdir(outDir, { recursive: true, withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
		const path = join(entry.parentPath, entry.name);
		const html = await readFile(path, "utf8");
		const result = withCsp(html);
		if (result === null) problems.push(`${path} has no <head> to hold the policy`);
		else await writeFile(path, result);
	}
	return problems;
}
