import { createClient } from "@supabase/supabase-js";
import { trackRetryAfter, withTimeout } from "@/lib/sync/errors";

const REQUEST_TIMEOUT_MS = 30_000;

// The callback page exchanges the code itself, so the client never reads the session from the URL.
export function createTerkaClient(url: string, key: string) {
	const tracked = trackRetryAfter(withTimeout(fetch, REQUEST_TIMEOUT_MS));
	const client = createClient(url, key, {
		auth: {
			flowType: "pkce",
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: false
		},
		// Bun's fetch type adds preconnect, which supabase-js never calls.
		global: { fetch: tracked.fetch as typeof fetch }
	});
	return { client, retryAfter: tracked.retryAfter };
}
