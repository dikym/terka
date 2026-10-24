import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The local stack started by `bun run db:start`.
const DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:54322/postgres";
const scripts = join(import.meta.dir, "../../scripts/ops");
const dir = await mkdtemp(join(tmpdir(), "terka-ops-"));
afterAll(() => rm(dir, { recursive: true, force: true }));

const run = (command: string[], env: Record<string, string> = {}) =>
	Bun.spawnSync(command, { env: { ...process.env, ...env } });

describe("weekly backup", () => {
	test("writes an encrypted dump that the private key restores", async () => {
		const key = join(dir, "key.txt");
		expect(run(["age-keygen", "-o", key]).exitCode).toBe(0);
		const recipient = (await readFile(key, "utf8")).match(/public key: (age1\w+)/)![1];
		const output = join(dir, "backup.dump.age");

		const backup = run(["bash", join(scripts, "backup.sh"), output], {
			DATABASE_URL,
			BACKUP_AGE_RECIPIENT: recipient
		});
		expect(backup.stderr.toString()).toBe("");
		expect(backup.exitCode).toBe(0);

		const encrypted = await readFile(output);
		expect(encrypted.subarray(0, 5).toString()).not.toBe("PGDMP");
		const plain = join(dir, "backup.dump");
		expect(run(["age", "-d", "-i", key, "-o", plain, output]).exitCode).toBe(0);
		const listing = run(["pg_restore", "--list", plain]).stdout.toString();
		expect(listing).toContain("TABLE public review_logs");
		expect(listing).toContain("TABLE public fsrs_params");
	}, 120_000);

	test("refuses to run without a recipient", () => {
		const backup = run(["bash", join(scripts, "backup.sh"), join(dir, "none.age")], {
			DATABASE_URL,
			BACKUP_AGE_RECIPIENT: ""
		});
		expect(backup.exitCode).not.toBe(0);
	});
});

describe("database size alarm", () => {
	test("passes under the limit and prints the size", () => {
		// The local database holds earlier test data, so it is checked against a generous limit.
		const check = run(["bash", join(scripts, "db-size.sh")], {
			DATABASE_URL,
			DB_SIZE_LIMIT: String(10 * 1024 ** 3)
		});
		expect(check.exitCode).toBe(0);
		expect(check.stdout.toString()).toMatch(/^\d+ bytes/);
	});

	test("fails above the limit", () => {
		const check = run(["bash", join(scripts, "db-size.sh")], {
			DATABASE_URL,
			DB_SIZE_LIMIT: "1"
		});
		expect(check.exitCode).toBe(1);
	});

	test("uses the documented 150 MB alarm by default", async () => {
		const { DB_SIZE_ALARM_BYTES } = await import("../../src/rules");
		const script = await readFile(join(scripts, "db-size.sh"), "utf8");
		expect(script).toContain(`DB_SIZE_LIMIT:-${DB_SIZE_ALARM_BYTES}`);
	});
});
