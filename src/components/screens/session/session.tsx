"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SessionFrame } from "@/components/shell/session-frame";
import type { PracticeRun, ReviewLog } from "@/core/log/events";
import type { Scope } from "@/core/questions/distractors";
import type { AppState } from "@/core/replay/state";
import { effectiveCard } from "@/core/replay/universe";
import { alsoCorrect } from "@/core/session/feedback";
import { canUndo, closeRun, answerEvent, startRun, voidEvent } from "@/core/session/commands";
import { checkAnswer, type Response } from "@/core/session/check";
import { contentOf, prepare, todayOf } from "@/core/session/context";
import { placementNext, type Stage } from "@/core/session/placement";
import { dailyQueue } from "@/core/session/queue";
import { factViewEvent, pickFact } from "@/core/views/facts";
import { loginPromptDue, noteOffer } from "@/core/views/notices";
import { placementResult } from "@/core/views/placement-result";
import { KILAT_ROUND_MS, TIERS, type Tier } from "@/rules";
import type { LearningEvent } from "@/core/log/events";
import { failedMessage, QUOTA_MESSAGE } from "@/components/screens/app-status";
import { ErrorState } from "@/components/ui/states";
import { showToast } from "@/lib/toasts";
import { lastDayOf, type Runtime, sessionCtx } from "@/lib/app/runtime";
import { useAccount, useAppState, usePrefs, useReady } from "@/lib/app/use-runtime";
import { markNoteOffer, readFlags } from "@/lib/db/flags";
import { LOGIN_PROMPT_DISMISSED, readFlag, writeFlag } from "@/lib/flags";
import { keyAction } from "@/lib/keys";
import type { SessionCard } from "@/lib/session/cards";
import { endView, type EndView, factCard } from "@/lib/session/end";
import { createMeasure, type Measure } from "@/lib/session/measure";
import {
	kilatCards,
	type Mode,
	type Plan,
	type PlanInput,
	type PlanParams,
	placementCards,
	planSession,
	reaskCard,
	reaskPosition
} from "@/lib/session/modes";
import {
	activeQuestion,
	cardLevel,
	cardOptions,
	currentCard,
	initialSession,
	type SessionAction,
	type SessionState,
	sessionReducer,
	sessionTotal,
	submittable,
	type Verdict
} from "@/lib/session/state";
import { dueIn, TIER_NAME } from "@/lib/view/format";
import { scopeGroup, scopeTitle } from "@/lib/view/groups";
import { type BarProps, SessionBar, SessionMeta } from "./session-bar";
import { EndFooter, PlacementEnd, type PlacementEndView, SessionEnd } from "./session-end";
import { SessionLoading } from "./loading";
import { SessionEmpty, SessionPreview } from "./session-preview";
import { Question } from "./question";

const TICK_MS = 100;
// Mode Kilat draws questions in batches; a round of 60 seconds rarely needs more than a few.
const KILAT_BATCH = 20;

/**
 * Runs `onTick` about every TICK_MS while `active`, with the latest callback and the seconds
 * really elapsed: intervals fire late, so counting TICK_MS per tick would run slow.
 */
function useTicker(active: boolean, onTick: (elapsed: number) => void) {
	const latest = useRef(onTick);
	useEffect(() => {
		latest.current = onTick;
	});
	useEffect(() => {
		if (!active) return;
		let last = performance.now();
		const timer = setInterval(() => {
			const now = performance.now();
			latest.current((now - last) / 1000);
			last = now;
		}, TICK_MS);
		return () => clearInterval(timer);
	}, [active]);
}

const verdictOf = (correct: boolean | null): Verdict =>
	correct === null ? "unverified" : correct ? "right" : "wrong";

type Engine = {
	run: PracticeRun | null;
	before: AppState | null;
	answers: ReviewLog[];
	last: ReviewLog | null;
	placement: { codeId: string; stage: Stage; correct: boolean; seeded: boolean }[];
	stage: Stage;
	sizes: Record<Stage, number>;
	noteOffers: Map<string, number[]>;
	writes: Promise<unknown>;
	measure: Measure;
	closed: boolean;
	/** The re-ask card each answer added, so undoing the answer takes it back out. */
	reasks: Map<string, string>;
	reaskSerial: number;
};

function planInput(
	runtime: Runtime,
	state: AppState,
	prefs: NonNullable<ReturnType<typeof usePrefs>>
): PlanInput {
	return {
		state,
		bundle: runtime.bundle,
		dictionary: runtime.dictionary,
		settings: prefs.settings,
		notes: prefs.notes,
		ctx: sessionCtx(runtime)
	};
}

export function Session({ mode, params }: { mode: Mode; params: PlanParams }) {
	const router = useRouter();
	const { status, runtime } = useReady();
	const app = useAppState(runtime);
	const prefs = usePrefs(runtime);
	const account = useAccount();
	const [plan, setPlan] = useState<Plan | null>(null);
	const [state, setState] = useState<SessionState>(() => initialSession(mode, []));
	const [loading, setLoading] = useState(false);
	const [countdown, setCountdown] = useState<number | null>(null);
	const [clock, setClock] = useState(KILAT_ROUND_MS / 1000);
	const [end, setEnd] = useState<EndView | null>(null);
	const [placementEnd, setPlacementEnd] = useState<PlacementEndView | null>(null);
	const engine = useRef<Engine>({
		run: null,
		before: null,
		answers: [],
		last: null,
		placement: [],
		stage: 1,
		sizes: { 1: 0, 2: 0, 3: 0 },
		noteOffers: new Map(),
		writes: Promise.resolve(),
		measure: createMeasure(),
		closed: false,
		reasks: new Map(),
		reaskSerial: 0
	});

	const exit = () => {
		// A run left halfway is closed with what was answered; an unfinished Kilat round or
		// placement test has no score or tier to close with, so it stays open and never counts.
		const run = engine.current.run;
		if (runtime && run && !engine.current.closed && mode !== "kilat" && mode !== "penempatan") {
			engine.current.closed = true;
			const answers = engine.current.answers;
			void write([
				closeRun(run, sessionCtx(runtime), {
					answered: answers.length,
					correct: answers.filter((row) => row.correct === true).length,
					activeMs: answers.reduce((sum, row) => sum + row.msTotal, 0)
				})
			]);
		}
		if (window.history.length > 1) router.back();
		else router.push("/beranda");
	};

	// The plan is made once, from the log as it was when the screen opened.
	if (!plan && runtime && app && prefs) {
		const made = planSession(mode, planInput(runtime, app.log.state, prefs), params);
		setPlan(made);
		if (made.kind === "ready") setState(initialSession(mode, made.cards));
	}
	useEffect(() => {
		if (runtime)
			void readFlags(runtime.db).then(
				(flags) => (engine.current.noteOffers = flags.noteOffers)
			);
	}, [runtime]);

	// Writes go out one at a time, so each one builds on the log the previous one left.
	const write = (events: LearningEvent[]) => {
		const next = engine.current.writes.then(async () => {
			const outcome = await runtime!.store.record(events);
			if (outcome === "quota")
				showToast({
					tone: "danger",
					label: "Penyimpanan",
					icon: "triangle-alert",
					text: QUOTA_MESSAGE,
					key: "quota"
				});
			return outcome;
		});
		engine.current.writes = next.catch(() => {});
		return next;
	};

	// A clock tick and a keypress can land in one frame; both must build on the latest state.
	const latest = useRef(state);
	useEffect(() => {
		latest.current = state;
	}, [state]);
	const act = (action: SessionAction) => {
		const previous = latest.current;
		const next = sessionReducer(previous, action);
		if (next === previous) return;
		latest.current = next;
		const moved = next.index !== previous.index || next.phase !== previous.phase;
		if (moved || action.type === "lowerLevel" || action.type === "restoreLevel") {
			const card = next.cards[next.index];
			const timer = next.phase === "ask" ? activeTimer(next, card) : null;
			setCountdown(timer);
			if (next.phase === "ask") engine.current.measure = createMeasure();
		}
		setState(next);
	};

	const activeTimer = (state: SessionState, card: SessionCard | undefined) => {
		if (!card) return null;
		const limit = activeQuestion(state, card).limit;
		return limit ? limit.ms / 1000 : null;
	};

	const start = async () => {
		if (!runtime || !app || !prefs || plan?.kind !== "ready" || engine.current.run) return;
		setLoading(true);
		const ctx = sessionCtx(runtime);
		const log = runtime.store.getState().log.state;
		const event = startRun(
			plan.run.kind,
			plan.run.scope,
			ctx,
			{ estimatedMs: plan.estimatedMs, plannedCount: plan.cards.length || null },
			lastDayOf(log)
		);
		engine.current.run = event.row as PracticeRun;
		engine.current.before = log;
		void write([event]);
		const input = planInput(runtime, log, prefs);
		if (mode === "kilat")
			act({
				type: "append",
				cards: kilatCards(input, plan.run.scope, event.row.id, 0, KILAT_BATCH)
			});
		if (mode === "penempatan") {
			const first = placementCards(input, event.row.id, 1);
			engine.current.sizes = {
				1: first.length,
				2: placementCards(input, event.row.id, 2).length,
				3: placementCards(input, event.row.id, 3).length
			};
			act({ type: "append", cards: first });
		}
		setLoading(false);
		setClock(KILAT_ROUND_MS / 1000);
		act({ type: "start" });
	};

	// The placement test has no preview: the welcome screen already described it.
	useEffect(() => {
		if (plan?.kind === "ready" && !plan.preview && state.phase === "preview") void start();
	});

	const answer = (response: Response, chosen: string | null, timedOut = false) => {
		const current = latest.current;
		if (!runtime || current.phase !== "ask") return;
		const card = currentCard(current);
		const question = activeQuestion(current, card);
		const { bundle, dictionary } = runtime;
		const ctx = sessionCtx(runtime);
		const checked = checkAnswer(question, response, bundle, dictionary);
		const measurements = engine.current.measure.finish({
			timedOut,
			optionCount: question.choices.length || null
		});
		const log = runtime.store.getState().log.state;
		const event = answerEvent(question, response, checked, measurements, ctx, {
			runId: engine.current.run?.id ?? null,
			contentVersion: bundle.contentRev,
			lastDay: lastDayOf(log)
		});
		const row = event.row as ReviewLog;
		engine.current.answers.push(row);
		engine.current.last = row;
		const verdict = verdictOf(checked.correct);
		const also = alsoCorrect(bundle, question, checked);
		const aliasNote =
			checked.correct && checked.correction
				? checked.matchType === "typo"
					? `Benar · ejaan diperbaiki: ${checked.correction}`
					: `Penulisan baku: ${checked.correction}`
				: also.length
					? `Juga benar: ${also.join(", ")}`
					: undefined;
		act({ type: "grade", verdict, timedOut, chosen, noteOffered: false, aliasNote });
		void write([event]).then((outcome) => {
			if (outcome !== "ok" && outcome !== "outdated") return;
			const after = runtime.store.getState().log.state;
			if (engine.current.answers.includes(row)) reask(row, card, current.index, after);
			const beforeCard = effectiveCard(log, card.question.cardId);
			const afterCard = effectiveCard(after, card.question.cardId);
			if (
				afterCard &&
				beforeCard &&
				afterCard.due !== beforeCard.due &&
				afterCard.due > ctx.now
			)
				act({ type: "review", text: dueIn(afterCard.due - ctx.now) });
			if (verdict !== "wrong") return;
			const codeId = contentOf(card.question.cardId);
			const offeredAt = engine.current.noteOffers.get(codeId) ?? [];
			const offer = noteOffer(after, codeId, prefs?.notes.has(codeId) ?? false, offeredAt);
			if (
				offer &&
				latest.current.phase === "graded" &&
				latest.current.index === current.index
			) {
				engine.current.noteOffers.set(codeId, [...offeredAt, offer]);
				void markNoteOffer(runtime.db, codeId, offer);
				setState((value) => {
					const next = { ...value, noteOffered: true };
					latest.current = next;
					return next;
				});
			}
		});
		if (mode === "penempatan") {
			const placement = engine.current.placement;
			placement.push({
				codeId: contentOf(card.question.cardId),
				stage: engine.current.stage,
				correct: checked.correct === true,
				seeded: checked.correct === true && !timedOut && !measurements.interrupted
			});
			const next = placementNext(placement, engine.current.sizes);
			if ("stage" in next && next.stage !== engine.current.stage) {
				engine.current.stage = next.stage;
				act({
					type: "append",
					cards: placementCards(
						planInput(runtime, log, prefs!),
						engine.current.run!.id,
						next.stage
					)
				});
			}
			if ("done" in next) void finishPlacement(next.done);
			else act({ type: "next" });
		}
		// Reading an introduction without choices is the answer; it moves on by itself.
		if (question.questionType === "intro_read") proceed();
	};

	const reask = (row: ReviewLog, card: SessionCard, index: number, after: AppState) => {
		if (!runtime || !prefs || plan?.kind !== "ready") return;
		const at = reaskPosition(card, index, latest.current.cards.length);
		if (at === null) return;
		const added = reaskCard(
			planInput(runtime, after, prefs),
			mode,
			card.question.cardId,
			plan.run.scope,
			++engine.current.reaskSerial
		);
		if (!added) return;
		engine.current.reasks.set(row.id, added.id);
		act({ type: "insert", card: added, at });
	};

	// Waits for the answer's write, so the re-ask it adds is in place before the session moves on.
	const proceed = () => void engine.current.writes.then(() => act({ type: "next" }));

	const submit = () => {
		const current = latest.current;
		if (current.phase !== "ask") return;
		const card = currentCard(current);
		if (card.form === "perkenalan" && !card.options) return answer({ unknown: true }, null);
		if (!submittable(current)) return;
		if (card.form === "sebutkan") {
			const typed = current.input.trim();
			const items =
				typed && !current.named.includes(typed) ? [...current.named, typed] : current.named;
			return answer({ items }, null);
		}
		answer({ text: current.input }, null);
	};

	const choose = (option: string) => {
		engine.current.measure.choose();
		answer({ choice: option }, option);
	};

	const undo = () => {
		const current = latest.current;
		const last = engine.current.last;
		if (!runtime || mode === "kilat") return;
		const ctx = sessionCtx(runtime);
		if (!canUndo(last, ctx, { voided: false, open: current.phase === "graded" })) return;
		engine.current.answers = engine.current.answers.filter((row) => row !== last);
		engine.current.last = null;
		const added = engine.current.reasks.get(last!.id);
		if (added) act({ type: "drop", id: added });
		if (mode === "penempatan") engine.current.placement.pop();
		void write([voidEvent(last!, ctx)]);
		act({ type: "undo" });
	};

	const close = async (extra: { score?: number; placementLevel?: Tier }) => {
		if (!runtime || !engine.current.run || engine.current.closed) return null;
		engine.current.closed = true;
		const ctx = sessionCtx(runtime);
		const answers = engine.current.answers;
		const events: LearningEvent[] = [
			closeRun(engine.current.run, ctx, {
				answered: answers.length,
				correct: answers.filter((row) => row.correct === true).length,
				activeMs: answers.reduce((sum, row) => sum + row.msTotal, 0),
				score: extra.score ?? null,
				placementLevel: extra.placementLevel ?? null
			})
		];
		await engine.current.writes;
		const log = runtime.store.getState().log.state;
		const fact = pickFact(
			log,
			runtime.bundle,
			answers.map((row) => row.contentId),
			engine.current.run.id
		);
		if (fact) events.push(factViewEvent(fact.id, engine.current.run.id, ctx, lastDayOf(log)));
		await write(events);
		return fact;
	};

	const finishPlacement = async (tier: Tier) => {
		act({ type: "finish" });
		const fact = await close({ placementLevel: tier });
		const result = placementResult(runtime!.bundle, engine.current.placement, tier);
		setPlacementEnd({
			tier: TIER_NAME[tier],
			knownPercent: result.knownPercent,
			seeded: result.seededCount,
			newPerDay: TIERS[tier].newPerDay,
			suggestion: scopeTitle(runtime!.bundle, result.suggestedScope),
			fact: fact ? factCard(runtime!.bundle, fact) : null
		});
		suggestion.current = result.suggestedScope;
	};
	const suggestion = useRef<Scope | null>(null);

	// Every other mode closes its run once the last answer moved on, or Mode Kilat's clock ran out.
	useEffect(() => {
		if (state.phase !== "done" || mode === "penempatan" || !runtime || engine.current.closed)
			return;
		const score =
			mode === "kilat"
				? engine.current.answers.filter((row) => row.correct === true).length
				: undefined;
		const before = engine.current.before ?? runtime.store.getState().log.state;
		const scope = plan?.kind === "ready" ? plan.run.scope : null;
		const record =
			mode === "kilat" && scope
				? (before.kilatRecords.get(
						`${scope.level}|${scope.level === "national" ? "" : scope.id}`
					) ?? null)
				: null;
		void close({ score }).then((fact) => {
			const after = runtime.store.getState().log.state;
			const ctx = sessionCtx(runtime);
			const remaining =
				mode === "hariIni" && prefs
					? dailyQueue(after, runtime.bundle, prefs.settings, ctx).items.filter(
							(item) => item.slot !== "new"
						).length
					: 0;
			setEnd(
				endView({
					mode,
					before,
					after,
					answers: engine.current.answers,
					bundle: runtime.bundle,
					held: plan?.kind === "ready" && plan.held,
					fact,
					kilat: mode === "kilat" && scope ? { score: score ?? 0, record, scope } : null,
					loginPrompt: loginPromptDue(
						prepare(after, ctx),
						account.email !== null,
						readFlag("local", LOGIN_PROMPT_DISMISSED) === "1"
					),
					today: todayOf(ctx),
					predicted: plan?.kind === "ready" ? plan.predicted : undefined,
					remainingDue: remaining
				})
			);
		});
	});

	const card = state.phase === "preview" || state.phase === "done" ? null : currentCard(state);
	const typingStarted =
		!!card &&
		activeQuestion(state, card).limit?.until === "first-input" &&
		state.input.trim() !== "";

	useTicker(countdown !== null && state.phase === "ask" && !typingStarted, (elapsed) => {
		if (countdown === null) return;
		const left = Math.max(0, countdown - elapsed);
		if (left === 0) {
			setCountdown(null);
			const current = latest.current;
			const typed = current.input.trim();
			answer(typed ? { text: current.input } : { unknown: true }, null, true);
		} else setCountdown(left);
	});

	useTicker(
		mode === "kilat" && (state.phase === "ask" || state.phase === "graded"),
		(elapsed) => {
			const left = Math.max(0, clock - elapsed);
			setClock(left);
			if (left === 0) act({ type: "finish" });
		}
	);

	// Mode Kilat answers move straight on: there is no time to read a verdict.
	const kilatNext = () => {
		const current = latest.current;
		if (runtime && prefs && engine.current.run && current.index >= current.cards.length - 2)
			act({
				type: "append",
				cards: kilatCards(
					planInput(runtime, runtime.store.getState().log.state, prefs),
					plan?.kind === "ready" ? plan.run.scope : prefs.settings.scope,
					engine.current.run.id,
					current.cards.length,
					KILAT_BATCH
				)
			});
		act({ type: "next" });
	};
	const latestKilatNext = useRef(kilatNext);
	useEffect(() => {
		latestKilatNext.current = kilatNext;
	});

	const kilatGraded = mode === "kilat" && state.phase === "graded";
	useEffect(() => {
		if (!kilatGraded) return;
		const timer = setTimeout(() => latestKilatNext.current(), 350);
		return () => clearTimeout(timer);
	}, [kilatGraded, state.results.length]);

	useEffect(() => {
		const pointer = (event: PointerEvent) => engine.current.measure.pointer(event.pointerType);
		const hidden = () => {
			if (document.visibilityState === "hidden") engine.current.measure.hidden();
		};
		window.addEventListener("pointerdown", pointer);
		document.addEventListener("visibilitychange", hidden);
		return () => {
			window.removeEventListener("pointerdown", pointer);
			document.removeEventListener("visibilitychange", hidden);
		};
	}, []);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			const action = keyAction(
				{ key: event.key, target: event.target as HTMLElement | null },
				"session"
			);
			if (!action) return;
			if (action === "exit") return exit();
			if (state.phase === "preview") {
				if (loading || plan?.kind !== "ready") return;
				if (action === "confirm") void start();
				return;
			}
			if (state.phase === "done") return;
			const current = currentCard(state);
			const options = cardOptions(state, current);
			if (action === "confirm") {
				event.preventDefault();
				if (state.phase === "graded") proceed();
				else if (current.form === "sebutkan") act({ type: "add" });
				else if (!options) submit();
			} else if (action === "undo") {
				// The question remounts with its field focused; keep the Z out of it.
				event.preventDefault();
				undo();
			} else if (action.startsWith("choose-") && options && state.phase === "ask") {
				const index = Number(action.slice(-1));
				// Two-option screens map F and J to left and right.
				const pick =
					options.length === 2 ? (index === 0 ? 0 : index === 3 ? 1 : -1) : index;
				if (options[pick]) choose(options[pick]);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	const failed = failedMessage(status);
	if (failed)
		return (
			<main className="flex min-h-dvh">
				<ErrorState>{failed}</ErrorState>
			</main>
		);
	if (!plan || loading) return <SessionLoading onExit={exit} />;
	if (plan.kind === "empty")
		return (
			<SessionEmpty
				title={plan.title}
				icon={plan.icon}
				message={plan.message}
				detail={plan.detail}
				onBack={exit}
			/>
		);
	if (state.phase === "preview")
		return plan.preview ? (
			<SessionPreview preview={plan.preview} onBack={exit} onStart={() => void start()} />
		) : (
			<SessionLoading onExit={exit} />
		);

	const finished = state.phase === "done";
	if (finished && mode !== "penempatan" ? !end : finished && !placementEnd)
		return <SessionLoading onExit={exit} />;

	const total = mode === "penempatan" ? Math.max(state.cards.length, 1) : sessionTotal(state);
	const scope = plan.run.scope;
	const bar: BarProps = {
		mode,
		card,
		level: card ? cardLevel(state, card) : null,
		done: finished ? total : Math.min(total, state.index + 1),
		total,
		finished,
		onExit: exit,
		onUndo: undo,
		clock: { seconds: clock, total: KILAT_ROUND_MS / 1000 },
		correct: state.results.filter((result) => result === "right").length,
		scope: {
			label: scopeTitle(runtime!.bundle, scope),
			group: scopeGroup(runtime!.bundle, scope)
		},
		streak: plan.preview?.right.kind === "streak" ? plan.preview.right.days : 0
	};
	return (
		<SessionFrame
			bar={<SessionBar {...bar} />}
			// Mode Kilat and Latihan Terfokus keep their area row on the summary.
			meta={
				finished && mode !== "kilat" && mode !== "terfokus" ? undefined : (
					<SessionMeta {...bar} />
				)
			}
			footer={finished && mode !== "penempatan" ? <EndFooter /> : undefined}
			variant={finished ? "end" : "question"}
		>
			{finished && placementEnd ? (
				<PlacementEnd
					view={placementEnd}
					onAccept={() => {
						if (suggestion.current && prefs)
							void runtime!.saveSettings({
								...prefs.settings,
								scope: suggestion.current
							});
						router.push("/beranda");
					}}
					onChoose={() => router.push("/cakupan")}
				/>
			) : finished && end ? (
				<SessionEnd
					view={end}
					onLogin={() => router.push("/statistik/akun")}
					onDismissLogin={() => {
						writeFlag("local", LOGIN_PROMPT_DISMISSED, "1");
						setEnd({ ...end, loginPrompt: false });
					}}
				/>
			) : (
				<Question
					key={`${state.index}-${state.results.length}`}
					state={state}
					card={card!}
					countdown={countdown}
					onInput={(value) => {
						engine.current.measure.input(value);
						act({ type: "input", value });
					}}
					onSubmit={submit}
					onChoose={choose}
					onNext={proceed}
					onLower={() => act({ type: "lowerLevel" })}
					onRestore={() => act({ type: "restoreLevel" })}
					onAdd={() => act({ type: "add" })}
					onRemove={(value) => act({ type: "remove", value })}
					onDismissNote={() => act({ type: "dismissNote" })}
					onUnknown={() => answer({ unknown: true }, null)}
				/>
			)}
		</SessionFrame>
	);
}
