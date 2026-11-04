import { buildDictionary } from "@/core/answers/dictionary";
import { NATIONAL, type Scope } from "@/core/questions/distractors";
import { seeded } from "@/core/random";
import type { SessionContext, SessionSettings } from "@/core/session/context";
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
