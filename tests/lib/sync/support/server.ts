import type { SupabaseClient } from "@supabase/supabase-js";

export type Row = Record<string, unknown>;
type Op = "select" | "insert" | "upsert" | "update";
type PgError = { code: string; message: string };
type Result = { data: Row[] | Row | null; error: PgError | null; status: number };
type Options = { onConflict?: string; ignoreDuplicates?: boolean };

export type Rule = {
	table?: string;
	op?: Op;
	times?: number;
	status?: number;
	code?: string;
	message?: string;
	// The server applies the request, then the response is lost on the way back.
	commit?: boolean;
	when?: (payload: unknown) => boolean;
};

const LOG_TABLES = [
	"practice_runs",
	"review_logs",
	"review_voids",
	"card_events",
	"sightings",
	"fact_views",
	"fsrs_params"
];
const DAILY_TABLES = ["review_logs", "sightings", "fact_views"];
const CLOSING = ["ended_at", "answered", "correct", "active_ms", "score", "placement_level"];
const SERVER_FILLED = ["received_at", "server_seq", "last_seen_at"];
const UPDATABLE: Record<string, string[]> = {
	practice_runs: CLOSING,
	devices: ["last_seen_at"],
	user_settings: [],
	card_notes: []
};
const RUN_KINDS = ["daily", "focused", "challenge", "kilat", "placement", "setrecall", "special"];

const failure = (status: number, code: string, message: string): Result => ({
	data: null,
	error: { code, message },
	status
});
const time = (value: unknown) => Date.parse(String(value));

export class FakeServer {
	clock = { now: Date.parse("2026-10-28T12:00:00Z") };
	// What the database accepts; recheck needs a migration that an older server lacks.
	allowedKinds = new Set([...RUN_KINDS, "recheck"]);
	limits = { daily: 1000, total: 50_000, devices: 20 };
	signupsOpen = true;
	// A server may return fewer rows than asked for; a short page is not the end of a table.
	rowCap = Infinity;
	policyVersions: Row[] = [
		{ version: "v1", published_at: "2026-01-01T00:00:00Z", requires_reconsent: true }
	];
	calls: { table: string; op: Op; user: string | null }[] = [];
	// Runs before every request is handled, for actions that must land in the middle of a round.
	beforeRequest: ((call: { table: string; op: Op }) => Promise<void> | void) | null = null;

	private tables = new Map<string, Row[]>();
	private rules: (Rule & { left: number })[] = [];
	private runSeq = 0;
	private identity = new Map<string, number>();
	private daily = new Map<string, number>();
	private total = new Map<string, number>();

	fail(rule: Rule) {
		this.rules.push({ ...rule, left: rule.times ?? 1 });
	}

	rows(table: string, user = "user-1"): Row[] {
		return (this.tables.get(table) ?? []).filter((row) => row.user_id === user);
	}

	ids(table: string, user = "user-1"): string[] {
		return this.rows(table, user)
			.map((row) => String(row.id))
			.sort();
	}

	rowOf(table: string, id: string, user = "user-1"): Row | undefined {
		return this.rows(table, user).find((row) => row.id === id);
	}

	// Takes a sequence number now and stores the row later, as a commit that finishes out of order.
	reserveSeq(table: string): number {
		return this.nextSeq(table);
	}

	storeWithSeq(table: string, row: Row, seq: number, user = "user-1") {
		this.list(table).push({
			...row,
			user_id: user,
			server_seq: seq,
			received_at: new Date(this.clock.now).toISOString()
		});
	}

	client(auth: { userId: string | null; refreshFails?: boolean; expired?: boolean }) {
		return {
			auth: {
				getSession: async () => ({
					data: {
						session: auth.userId && !auth.expired ? { user: { id: auth.userId } } : null
					},
					error: null
				}),
				signOut: async () => {
					auth.userId = null;
					return { error: null };
				},
				refreshSession: async () => {
					if (auth.refreshFails)
						return { data: {}, error: { message: "refresh refused" } };
					auth.expired = false;
					return { data: {}, error: null };
				}
			},
			from: (table: string) => new Query(this, table, auth)
		} as unknown as SupabaseClient;
	}

	takeRule(table: string, op: Op, payload: unknown) {
		const rule = this.rules.find(
			(item) =>
				item.left > 0 &&
				(!item.table || item.table === table) &&
				(!item.op || item.op === op) &&
				(!item.when || item.when(payload))
		);
		if (rule) rule.left--;
		return rule;
	}

	list(table: string): Row[] {
		let rows = this.tables.get(table);
		if (!rows) this.tables.set(table, (rows = []));
		return rows;
	}

	nextSeq(table: string): number {
		if (table === "practice_runs") return ++this.runSeq;
		const next = (this.identity.get(table) ?? 0) + 1;
		this.identity.set(table, next);
		return next;
	}

	// The newest version that asks for consent again is the one every account must have accepted.
	hasConsent(user: string): boolean {
		const required = this.policyVersions
			.filter((row) => row.requires_reconsent)
			.sort((a, b) => time(b.published_at) - time(a.published_at))[0];
		return (
			!!required &&
			this.rows("privacy_consents", user).some(
				(row) => row.policy_version === required.version
			)
		);
	}

	private exists(table: string, user: string, column: string, value: unknown) {
		return this.rows(table, user).some((row) => row[column] === value);
	}

	// Foreign keys the database enforces on a row about to be stored.
	private referenceError(
		table: string,
		row: Row,
		user: string,
		staged: Row[] = []
	): PgError | null {
		const missing = (parent: string, column: string, value: unknown) =>
			value !== null &&
			value !== undefined &&
			!this.exists(parent, user, column, value) &&
			!staged.some((other) => other.id === value)
				? {
						code: "23503",
						message: `insert or update on table "${table}" violates foreign key constraint "${table}_${parent}_fkey"`
					}
				: null;
		if (table === "review_logs" || table === "fact_views")
			return missing("practice_runs", "id", row.run_id);
		if (table === "review_voids") return missing("review_logs", "id", row.review_id);
		if (table === "user_settings") return missing("devices", "id", row.updated_by_device);
		if (table !== "devices" && "device_id" in row)
			return missing("devices", "id", row.device_id);
		return null;
	}

	insert(table: string, user: string, payload: Row[], options: Options): Result {
		const columns = (options.onConflict ?? "user_id,id").split(",");
		const keyOf = (row: Row) =>
			columns.map((column) => (column === "user_id" ? user : row[column]));
		for (const row of payload)
			for (const column of SERVER_FILLED)
				if (column in row)
					return failure(
						403,
						"42501",
						`permission denied for column ${column} of ${table}`
					);
		if (LOG_TABLES.includes(table) && !this.hasConsent(user))
			return failure(400, "TK005", "the current privacy policy has not been accepted");
		if (table === "devices") {
			const own = this.rows("devices", user);
			const fresh = payload.filter((row) => !own.some((other) => other.id === row.id));
			if (fresh.length && !own.length && !this.signupsOpen)
				return failure(400, "TK004", "signups are closed");
			if (fresh.length && own.length >= this.limits.devices)
				return failure(400, "TK003", "active device limit reached");
		}
		const staged: Row[] = [];
		for (const row of payload) {
			const same = (other: Row) =>
				keyOf(row).every(
					(value, index) => keyOf({ ...other, user_id: user })[index] === value
				);
			const existing = [...this.rows(table, user), ...staged].find(same);
			if (existing) {
				if (options.ignoreDuplicates) continue;
				return failure(
					409,
					"23505",
					`duplicate key value violates unique constraint on ${table}`
				);
			}
			const refused = this.checkRow(table, row, user, staged);
			if (refused) return refused;
			const stored: Row = {
				...row,
				user_id: user,
				received_at: new Date(this.clock.now).toISOString()
			};
			if (table === "practice_runs") {
				for (const column of CLOSING) stored[column] ??= null;
				stored.server_seq = this.nextSeq(table);
			} else if (table === "devices")
				stored.last_seen_at = new Date(this.clock.now).toISOString();
			else if (LOG_TABLES.includes(table)) stored.server_seq = this.nextSeq(table);
			staged.push(stored);
		}
		const limit = this.usage(table, user, staged.length);
		if (limit) return limit;
		this.list(table).push(...staged);
		return { data: staged, error: null, status: 201 };
	}

	private checkRow(table: string, row: Row, user: string, staged: Row[]): Result | null {
		if (table === "practice_runs") {
			if (!this.allowedKinds.has(String(row.kind)))
				return failure(
					400,
					"23514",
					'new row violates check constraint "practice_runs_kind_check"'
				);
			if (CLOSING.some((column) => row[column] !== null && row[column] !== undefined))
				return failure(400, "TK006", "a session is inserted open and closed by an update");
		}
		if (
			table === "review_logs" &&
			row.context === "recheck" &&
			!this.allowedKinds.has("recheck")
		)
			return failure(
				400,
				"23514",
				'new row violates check constraint "review_logs_context_check"'
			);
		const broken = this.referenceError(table, row, user, staged);
		return broken ? failure(409, broken.code, broken.message) : null;
	}

	private usage(table: string, user: string, added: number): Result | null {
		if (!LOG_TABLES.includes(table) || !added) return null;
		const day = new Date(this.clock.now).toISOString().slice(0, 10);
		const dailyKey = `${user}|${day}|${table}`;
		const daily = (this.daily.get(dailyKey) ?? 0) + added;
		const total = (this.total.get(user) ?? 0) + added;
		if (DAILY_TABLES.includes(table) && daily > this.limits.daily)
			return failure(400, "TK001", `daily row limit reached for ${table}`);
		if (total > this.limits.total) return failure(400, "TK002", "total row limit reached");
		this.daily.set(dailyKey, daily);
		this.total.set(user, total);
		return null;
	}

	upsert(table: string, user: string, payload: Row[], options: Options): Result {
		const columns = (options.onConflict ?? "user_id").split(",");
		const out: Row[] = [];
		for (const row of payload) {
			for (const column of SERVER_FILLED)
				if (column in row)
					return failure(
						403,
						"42501",
						`permission denied for column ${column} of ${table}`
					);
			const broken = this.referenceError(table, row, user);
			if (broken) return failure(409, broken.code, broken.message);
			const existing = this.rows(table, user).find((other) =>
				columns.every((column) => column === "user_id" || other[column] === row[column])
			);
			if (!existing) {
				const stored = {
					...row,
					user_id: user,
					received_at: new Date(this.clock.now).toISOString()
				};
				this.list(table).push(stored);
				out.push(stored);
				continue;
			}
			// An older edit leaves the stored row as it is.
			const older =
				time(row.updated_at) < time(existing.updated_at) ||
				(time(row.updated_at) === time(existing.updated_at) &&
					String(row.updated_by_device) < String(existing.updated_by_device));
			if (!older)
				Object.assign(existing, row, {
					received_at: new Date(this.clock.now).toISOString()
				});
			out.push(existing);
		}
		return { data: out, error: null, status: 201 };
	}

	update(table: string, user: string, values: Row, matches: (row: Row) => boolean): Result {
		const allowed = UPDATABLE[table] ?? [];
		for (const column of Object.keys(values))
			if (!allowed.includes(column))
				return failure(403, "42501", `permission denied for column ${column} of ${table}`);
		const changed: Row[] = [];
		for (const row of this.rows(table, user).filter(matches)) {
			if (table === "practice_runs") {
				if (row.ended_at !== null)
					return failure(400, "TK006", "the session is already closed");
				const kind = String(row.kind);
				if (
					values.ended_at === null ||
					values.answered === null ||
					values.correct === null ||
					values.active_ms === null ||
					(kind === "kilat") !== (values.score !== null) ||
					(kind === "placement") !== (values.placement_level !== null)
				)
					return failure(400, "TK006", "closing columns do not match the session kind");
				if (time(values.ended_at) < time(row.started_at))
					return failure(
						400,
						"23514",
						'new row violates check constraint "practice_runs_check"'
					);
				Object.assign(row, values, { server_seq: this.nextSeq(table) });
			} else if (table === "devices")
				row.last_seen_at = new Date(this.clock.now).toISOString();
			changed.push(row);
		}
		return { data: changed, error: null, status: 200 };
	}
}

class Query implements PromiseLike<Result> {
	private kind: Op = "select";
	private columns = "*";
	private returning: string | null = null;
	private payload: Row[] = [];
	private values: Row = {};
	private options: Options = {};
	private filters: ((row: Row) => boolean)[] = [];
	private sortColumn: string | null = null;
	private size = Infinity;
	private one = false;

	constructor(
		private server: FakeServer,
		private table: string,
		private auth: { userId: string | null; expired?: boolean }
	) {}

	select(columns = "*") {
		if (this.kind === "select") this.columns = columns;
		else this.returning = columns;
		return this;
	}
	upsert(rows: Row | Row[], options: Options = {}) {
		this.kind = options.ignoreDuplicates ? "insert" : "upsert";
		this.payload = Array.isArray(rows) ? rows : [rows];
		this.options = options;
		return this;
	}
	update(values: Row) {
		this.kind = "update";
		this.values = values;
		return this;
	}
	gt(column: string, value: number) {
		this.filters.push((row) => Number(row[column]) > value);
		return this;
	}
	eq(column: string, value: unknown) {
		this.filters.push((row) => row[column] === value);
		return this;
	}
	in(column: string, values: unknown[]) {
		this.filters.push((row) => values.includes(row[column]));
		return this;
	}
	order(column: string) {
		this.sortColumn = column;
		return this;
	}
	limit(size: number) {
		this.size = size;
		return this;
	}
	retry() {
		return this;
	}
	single() {
		this.one = true;
		return this;
	}

	then<T1 = Result, T2 = never>(
		onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
		onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
	) {
		return this.run().then(onfulfilled, onrejected);
	}

	private pick(rows: Row[], columns: string | null): Row[] {
		if (!columns || columns === "*") return rows.map((row) => ({ ...row }));
		const names = columns.split(",").map((name) => name.trim());
		return rows.map((row) => Object.fromEntries(names.map((name) => [name, row[name]])));
	}

	private async run(): Promise<Result> {
		const server = this.server;
		const user = this.auth.userId && !this.auth.expired ? this.auth.userId : null;
		server.calls.push({ table: this.table, op: this.kind, user });
		if (server.beforeRequest) await server.beforeRequest({ table: this.table, op: this.kind });
		if (!user) return failure(401, "PGRST301", "JWT expired");
		const payload = this.kind === "update" ? this.values : this.payload;
		const rule = server.takeRule(this.table, this.kind, payload);
		if (rule && !rule.commit)
			return failure(rule.status ?? 500, rule.code ?? "", rule.message ?? "server error");
		const result = this.execute(user);
		if (rule?.commit) return failure(0, "", "TypeError: Failed to fetch");
		return result;
	}

	private execute(user: string): Result {
		const server = this.server;
		if (this.kind === "select") {
			if (this.table === "privacy_policy_versions")
				return {
					data: this.pick(server.policyVersions, this.columns),
					error: null,
					status: 200
				};
			let rows = server
				.rows(this.table, user)
				.filter((row) => this.filters.every((test) => test(row)));
			const column = this.sortColumn;
			if (column) rows = [...rows].sort((a, b) => Number(a[column]) - Number(b[column]));
			rows = rows.slice(0, Math.min(this.size, server.rowCap));
			const data = this.pick(rows, this.columns);
			if (this.one)
				return data.length === 1
					? { data: data[0], error: null, status: 200 }
					: failure(
							406,
							"PGRST116",
							"JSON object requested, multiple (or no) rows returned"
						);
			return { data, error: null, status: 200 };
		}
		const result =
			this.kind === "insert"
				? server.insert(this.table, user, this.payload, this.options)
				: this.kind === "upsert"
					? server.upsert(this.table, user, this.payload, this.options)
					: server.update(this.table, user, this.values, (row) =>
							this.filters.every((test) => test(row))
						);
		if (result.error || !this.returning) return { ...result, data: null };
		return { ...result, data: this.pick(result.data as Row[], this.returning) };
	}
}
