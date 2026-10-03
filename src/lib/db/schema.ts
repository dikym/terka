import Dexie, { type EntityTable, type Table } from "dexie";
import type {
	CardEvent,
	FactView,
	FsrsParams,
	LearningEvent,
	PracticeRun,
	ReviewLog,
	ReviewVoid,
	Sighting
} from "@/core/log/events";
import type { Scope } from "@/core/questions/distractors";
import type { AppState } from "@/core/replay/state";

export type EventTable = LearningEvent["table"];
export type TableName =
	EventTable | "devices" | "privacy_consents" | "user_settings" | "card_notes";

// Keyed by table so the compiler rejects a missing or unknown event table.
const EVENT_TABLE_KEYS: Record<EventTable, true> = {
	practice_runs: true,
	review_logs: true,
	review_voids: true,
	card_events: true,
	sightings: true,
	fact_views: true,
	fsrs_params: true
};
export const EVENT_TABLES = Object.keys(EVENT_TABLE_KEYS) as EventTable[];

export type DeviceRow = {
	id: string;
	label: string;
	platform: string;
	createdAt: number;
	lastSeenAt: number | null;
};
export type ConsentRow = { policyVersion: string; consentedAt: number; receivedAt: number | null };
export type SettingsRow = {
	activeScopeLevel: Scope["level"];
	activeScopeId: string | null;
	specialEnabled: boolean;
	updatedAt: number;
	updatedByDevice: string;
	receivedAt: number | null;
};
export type NoteRow = {
	contentId: string;
	body: string;
	updatedAt: number;
	updatedByDevice: string;
	receivedAt: number | null;
};
export type OutboxRow = {
	seq?: number;
	table: TableName;
	key: string;
	op: "insert" | "close" | "upsert";
};
export type QuarantineRow = {
	seq?: number;
	table: TableName;
	key: string;
	row: Record<string, unknown>;
	error: string;
	quarantinedAt: number;
};
export type DerivedRow = {
	key: "state";
	state: AppState;
	logVersion: number;
	engineVersion: number;
	contentRev: number;
};
export type KeyValue = { key: string; value: unknown };

export class TerkaDb extends Dexie {
	practice_runs!: EntityTable<PracticeRun, "id">;
	review_logs!: EntityTable<ReviewLog, "id">;
	review_voids!: EntityTable<ReviewVoid, "id">;
	card_events!: EntityTable<CardEvent, "id">;
	sightings!: EntityTable<Sighting, "id">;
	fact_views!: EntityTable<FactView, "id">;
	fsrs_params!: EntityTable<FsrsParams, "id">;
	devices!: EntityTable<DeviceRow, "id">;
	privacy_consents!: EntityTable<ConsentRow, "policyVersion">;
	// Out-of-line key "me": the stored row holds exactly the server columns.
	user_settings!: Table<SettingsRow, string>;
	card_notes!: EntityTable<NoteRow, "contentId">;
	outbox!: EntityTable<OutboxRow, "seq">;
	outbox_quarantine!: EntityTable<QuarantineRow, "seq">;
	sync_meta!: EntityTable<KeyValue, "key">;
	derived!: EntityTable<DerivedRow, "key">;
	ui_flags!: EntityTable<KeyValue, "key">;

	// Not "terka": the first release kept its progress there under the same version number, and
	// opening that name with these stores would delete it.
	constructor(name = "terka-v2") {
		super(name);
		this.version(1).stores({
			practice_runs: "id",
			review_logs: "id",
			review_voids: "id",
			card_events: "id",
			sightings: "id, regionId",
			fact_views: "id",
			fsrs_params: "id",
			devices: "id",
			privacy_consents: "policyVersion",
			user_settings: "",
			card_notes: "contentId",
			outbox: "++seq",
			outbox_quarantine: "++seq",
			sync_meta: "key",
			derived: "key",
			ui_flags: "key"
		});
	}
}

export async function readMeta<T>(db: TerkaDb, key: string): Promise<T | undefined> {
	return (await db.sync_meta.get(key))?.value as T | undefined;
}

export const isQuotaError = (error: unknown) => {
	const failure = error as { name?: string; inner?: { name?: string } | null } | null;
	return failure?.name === "QuotaExceededError" || failure?.inner?.name === "QuotaExceededError";
};

export type Quota = { status: "quota" };

export async function unlessQuota<T>(work: () => Promise<T>): Promise<T | Quota> {
	try {
		return await work();
	} catch (error) {
		if (isQuotaError(error)) return { status: "quota" };
		throw error;
	}
}
