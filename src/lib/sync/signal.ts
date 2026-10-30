import type { SupabaseClient } from "@supabase/supabase-js";

const EVENT = "changed";

export type SyncSignal = {
	/** Calls onChange when another device of the account says it sent something. */
	listen: (onChange: () => void) => () => void;
	/** Tells the account's other devices that this one sent something. */
	announce: () => void;
};

// The message carries no data, only a nudge to pull. The topic is private: the server lets only
// the account itself listen or send on it.
export const signalTopic = (userId: string) => `sync:${userId}`;

export function syncSignal(client: SupabaseClient, userId: string): SyncSignal {
	const channel = client.channel(signalTopic(userId), { config: { private: true } });
	return {
		listen(onChange) {
			let joined = false;
			channel
				.on("broadcast", { event: EVENT }, () => onChange())
				.subscribe((status) => {
					if (status !== "SUBSCRIBED") return;
					// Nudges sent while the socket was down are lost, so a rejoin pulls in case it missed one.
					if (joined) onChange();
					joined = true;
				});
			return () => void client.removeChannel(channel);
		},
		announce() {
			const sent =
				channel.state === "joined"
					? channel.send({ type: "broadcast", event: EVENT, payload: {} })
					: channel.httpSend(EVENT, {});
			// A lost nudge only delays the other devices until their next interval or return.
			void sent.catch(() => {});
		}
	};
}
