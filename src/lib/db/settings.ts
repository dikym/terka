import { NATIONAL } from "@/core/questions/distractors";
import type { SessionContext, SessionSettings } from "@/core/session/context";
import { NOTE_MAX_CHARS } from "@/rules";
import { type Quota, type TerkaDb, unlessQuota } from "./schema";

type Writer = Pick<SessionContext, "now" | "deviceId">;

export async function loadSettings(db: TerkaDb): Promise<SessionSettings> {
	const row = await db.user_settings.get("me");
	if (!row) return { scope: NATIONAL, specialEnabled: false };
	return {
		scope:
			row.activeScopeId === null
				? NATIONAL
				: { level: row.activeScopeLevel, id: row.activeScopeId },
		specialEnabled: row.specialEnabled
	};
}

export function saveSettings(
	db: TerkaDb,
	settings: SessionSettings,
	ctx: Writer
): Promise<{ status: "ok" } | Quota> {
	const { scope } = settings;
	return unlessQuota(() =>
		db.transaction("rw", [db.user_settings, db.outbox], async () => {
			await db.user_settings.put(
				{
					activeScopeLevel: scope.level,
					activeScopeId: scope.level === "national" ? null : scope.id,
					specialEnabled: settings.specialEnabled,
					updatedAt: ctx.now,
					updatedByDevice: ctx.deviceId,
					receivedAt: null
				},
				"me"
			);
			await db.outbox.add({ table: "user_settings", key: "me", op: "upsert" });
			return { status: "ok" as const };
		})
	);
}

export async function loadNotes(db: TerkaDb): Promise<Map<string, string>> {
	const rows = await db.card_notes.toArray();
	return new Map(rows.filter((row) => row.body !== "").map((row) => [row.contentId, row.body]));
}

// An empty body is the delete marker: the row stays so an older copy elsewhere cannot win.
export function saveNote(
	db: TerkaDb,
	contentId: string,
	body: string,
	ctx: Writer
): Promise<{ status: "ok" } | Quota> {
	// Counted in code points, like char_length on the server.
	if ([...body].length > NOTE_MAX_CHARS)
		throw new Error(`a note holds at most ${NOTE_MAX_CHARS} characters`);
	return unlessQuota(() =>
		db.transaction("rw", [db.card_notes, db.outbox], async () => {
			await db.card_notes.put({
				contentId,
				body,
				updatedAt: ctx.now,
				updatedByDevice: ctx.deviceId,
				receivedAt: null
			});
			await db.outbox.add({ table: "card_notes", key: contentId, op: "upsert" });
			return { status: "ok" as const };
		})
	);
}
