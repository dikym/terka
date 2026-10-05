import { readMeta, type TerkaDb } from "@/lib/db/schema";
import { CONSENT_PENDING_MS } from "@/rules";

export type PendingConsent = { version: string; consentedAt: number };

// Kept until a session exists, because the consent row needs an account to be sent to.
export async function acceptPolicy(db: TerkaDb, version: string, now: number): Promise<void> {
	await db.sync_meta.put({
		key: "pendingConsent",
		value: { version, consentedAt: now } satisfies PendingConsent
	});
}

export async function freshConsent(db: TerkaDb, now: number): Promise<PendingConsent | undefined> {
	const pending = await readMeta<PendingConsent>(db, "pendingConsent");
	return pending && now - pending.consentedAt < CONSENT_PENDING_MS ? pending : undefined;
}

export async function recordConsent(db: TerkaDb, now: number): Promise<void> {
	await db.transaction("rw", [db.sync_meta, db.privacy_consents, db.outbox], async () => {
		const pending = await freshConsent(db, now);
		const deviceId = await readMeta<string>(db, "deviceId");
		if (!pending) await db.sync_meta.delete("pendingConsent");
		if (!pending || !deviceId) return;
		await db.privacy_consents.put({
			policyVersion: pending.version,
			deviceId,
			consentedAt: pending.consentedAt,
			receivedAt: null
		});
		await db.outbox.add({ table: "privacy_consents", key: pending.version, op: "insert" });
		await db.sync_meta.delete("pendingConsent");
	});
}
