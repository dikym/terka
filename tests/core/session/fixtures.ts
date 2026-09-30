import { buildDictionary } from "../../../src/core/answers/dictionary";
import { NATIONAL, type Scope } from "../../../src/core/questions/distractors";
import { seeded } from "../../../src/core/random";
import type { SessionContext, SessionSettings } from "../../../src/core/session/context";
import { ruleBundle, WITA } from "../replay/fixtures";

export const ctxAt = (now: number, deviceId = "device-a"): SessionContext => ({
	now,
	tz: WITA,
	deviceId,
	random: seeded(`ctx-${deviceId}-${now}`)
});
export const SETTINGS: SessionSettings = { scope: NATIONAL, specialEnabled: false };
export const SUMATERA: Scope = { level: "group", id: "sumatera" };
export const dictionary = buildDictionary(ruleBundle());
