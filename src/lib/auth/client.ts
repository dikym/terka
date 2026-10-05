import { createClient } from "@supabase/supabase-js";
import { trackRetryAfter } from "@/lib/sync/errors";

// The callback page exchanges the code itself, so the client never reads the session from the URL.
export function createTerkaClient(url: string, key: string) {
	const tracked = trackRetryAfter();
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
