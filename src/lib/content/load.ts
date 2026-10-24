import { type Bundle, bundleSchema } from "@/core/content/schema";

// An empty bundle would mark every card as missing content, so any failure stops the app.
export async function loadBundle(
	fetcher: typeof fetch = fetch
): Promise<{ status: "ok"; bundle: Bundle } | { status: "failed" }> {
	try {
		const response = await fetcher("/plates.json", { cache: "no-cache" });
		if (!response.ok) return { status: "failed" };
		const parsed = bundleSchema.safeParse(await response.json());
		return parsed.success ? { status: "ok", bundle: parsed.data } : { status: "failed" };
	} catch {
		return { status: "failed" };
	}
}
