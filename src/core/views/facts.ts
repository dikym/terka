import { FACT_RECENT_MAX } from "@/rules";
import type { Bundle, Fact } from "../content/schema";
import type { LearningEvent } from "../log/events";
import { seeded } from "../random";
import type { AppState } from "../replay/state";
import type { LastDay } from "../session/commands";
import type { SessionContext } from "../session/context";
import { uuidV7 } from "../session/ids";
import { nextLocalDay } from "../time/day";

// History of facts that are still ready; drafts and deleted facts drop out of the window.
function readyHistory(state: AppState, ready: ReadonlySet<string>): string[] {
	return state.factViews.map((view) => view.factId).filter((id) => ready.has(id));
}

function leastRecent(ready: Fact[], history: string[]): Fact {
	const lastSeen = new Map<string, number>();
	history.forEach((id, index) => lastSeen.set(id, index));
	return [...ready].sort((a, b) => (lastSeen.get(a.id) ?? -1) - (lastSeen.get(b.id) ?? -1))[0];
}

export function pickFact(
	state: AppState,
	bundle: Bundle,
	answeredCodes: readonly string[],
	runId: string
): Fact | null {
	const ready = bundle.facts.filter((fact) => fact.publicationStatus === "ready");
	if (!ready.length) return null;
	const byId = new Map(ready.map((fact) => [fact.id, fact]));
	const history = readyHistory(state, new Set(byId.keys()));
	const window = Math.min(FACT_RECENT_MAX, Math.floor(ready.length / 2));
	const recent = new Set(window ? history.slice(-window) : []);
	const mythNearby = history.slice(-2).some((id) => byId.get(id)?.historyLabel === "mitos");
	const candidates = ready.filter(
		(fact) => !recent.has(fact.id) && !(mythNearby && fact.historyLabel === "mitos")
	);
	if (!candidates.length) return leastRecent(ready, history);
	const related = new Set(
		bundle.regions
			.filter((region) => answeredCodes.includes(region.id))
			.flatMap((region) => region.facts)
	);
	const preferred = candidates.filter((fact) => related.has(fact.id));
	const pool = preferred.length ? preferred : candidates;
	return pool[Math.floor(seeded(runId)() * pool.length)];
}

export function factViewEvent(
	factId: string,
	runId: string | null,
	ctx: SessionContext,
	lastDay?: LastDay
): LearningEvent {
	return {
		table: "fact_views",
		row: {
			id: uuidV7(ctx.now, ctx.random),
			deviceId: ctx.deviceId,
			receivedAt: null,
			serverSeq: null,
			factId,
			runId,
			clientTs: ctx.now,
			localDay: nextLocalDay(ctx.now, ctx.tz, lastDay)
		}
	};
}
