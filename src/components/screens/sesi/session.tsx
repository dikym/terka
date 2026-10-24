"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SessionFrame } from "@/components/shell/session-frame";
import { CHALLENGE_DONE, DAILY_RUNS, readFlag, writeFlag } from "@/dummy/flags";
import { keyAction } from "@/dummy/keys";
import { PREVIEWS } from "@/dummy/previews";
import { KILAT_SECONDS, type Mode, QUEUES } from "@/dummy/session";
import {
	cardLevel,
	cardOptions,
	currentCard,
	initialSession,
	type SessionAction,
	type SessionState,
	sessionReducer
} from "@/dummy/session-reducer";
import { SessionBar } from "./bar";
import { SessionEnd } from "./ends";
import { SessionLoading } from "./loading";
import { SessionPreview } from "./preview";
import { Question } from "./question";

const LOADING_MS = 600;
const TICK_MS = 100;

/** Runs `onTick` every TICK_MS while `active`, with the latest callback. */
function useTicker(active: boolean, onTick: () => void) {
	const latest = useRef(onTick);
	useEffect(() => {
		latest.current = onTick;
	});
	useEffect(() => {
		if (!active) return;
		const timer = setInterval(() => latest.current(), TICK_MS);
		return () => clearInterval(timer);
	}, [active]);
}

export function Session({ mode }: { mode: Mode }) {
	const router = useRouter();
	const [state, setState] = useState<SessionState>(() => initialSession(mode));
	const [loading, setLoading] = useState(false);
	const [held, setHeld] = useState(false);
	const [countdown, setCountdown] = useState<number | null>(null);
	const [clock, setClock] = useState(KILAT_SECONDS);

	const exit = () => (window.history.length > 1 ? router.back() : router.push("/"));

	// A clock tick and a keypress can land in one frame; both must build on the latest state.
	const latest = useRef(state);
	const act = (action: SessionAction) => {
		const state = latest.current;
		const next = sessionReducer(state, action);
		if (next === state) return;
		latest.current = next;
		if (next.phase === "done" && state.phase !== "done") {
			if (mode === "harian") writeFlag("session", CHALLENGE_DONE, "1");
			if (mode === "hariIni") {
				const runs = Number(readFlag("session", DAILY_RUNS, "0") ?? "0");
				// A second daily session in one tab finds the queue already empty.
				setHeld(runs >= 1);
				writeFlag("session", DAILY_RUNS, String(runs + 1));
			}
		}
		if (
			next.index !== state.index ||
			next.phase !== state.phase ||
			action.type === "lowerLevel"
		) {
			const card = QUEUES[mode][next.index];
			setCountdown(next.phase === "ask" && card.timer ? card.timer.seconds : null);
		}
		setState(next);
	};

	const start = () => {
		setLoading(true);
		setTimeout(() => {
			setLoading(false);
			setClock(KILAT_SECONDS);
			act({ type: "start" });
		}, LOADING_MS);
	};

	const card = state.phase === "preview" ? null : currentCard(state);
	const typingStarted = card?.timer?.kind === "start" && state.input.trim() !== "";

	useTicker(countdown !== null && state.phase === "ask" && !typingStarted, () => {
		if (countdown === null) return;
		const left = Math.max(0, countdown - TICK_MS / 1000);
		if (left === 0) {
			setCountdown(null);
			act({ type: "timeout" });
		} else setCountdown(left);
	});

	useTicker(mode === "kilat" && (state.phase === "ask" || state.phase === "graded"), () => {
		const left = Math.max(0, clock - TICK_MS / 1000);
		setClock(left);
		if (left === 0) act({ type: "timeout" });
	});

	const latestAct = useRef(act);
	useEffect(() => {
		latestAct.current = act;
	});

	// Mode Kilat answers move straight on: there is no time to read a verdict.
	const kilatGraded = mode === "kilat" && state.phase === "graded";
	useEffect(() => {
		if (!kilatGraded) return;
		const timer = setTimeout(() => latestAct.current({ type: "next" }), 350);
		return () => clearTimeout(timer);
	}, [kilatGraded, state.results.length]);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			const action = keyAction(
				{ key: event.key, target: event.target as HTMLElement | null },
				"session"
			);
			if (!action) return;
			if (state.phase === "preview") {
				if (loading) return;
				if (action === "confirm") start();
				if (action === "exit") exit();
				return;
			}
			if (action === "exit") return exit();
			if (state.phase === "done") return;
			const current = currentCard(state);
			const options = cardOptions(state, current);
			if (action === "confirm") {
				event.preventDefault();
				if (state.phase === "graded") act({ type: "next" });
				else if (current.form === "sebutkan") act({ type: "add" });
				else if (!options) act({ type: "submit" });
			} else if (action === "undo") {
				// The question remounts with its field focused; keep the Z out of it.
				event.preventDefault();
				act({ type: "undo" });
			} else if (action.startsWith("choose-") && options && state.phase === "ask") {
				const index = Number(action.slice(-1));
				// Two-option screens map F and J to left and right.
				const pick =
					options.length === 2 ? (index === 0 ? 0 : index === 3 ? 1 : -1) : index;
				if (options[pick]) act({ type: "choose", option: options[pick] });
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	if (loading) return <SessionLoading onExit={exit} />;
	if (state.phase === "preview")
		return <SessionPreview preview={PREVIEWS[mode]} onBack={exit} onStart={start} />;

	const total = QUEUES[mode].length;
	const finished = state.phase === "done";
	const answered = state.results.length;
	return (
		<SessionFrame
			bar={
				<SessionBar
					mode={mode}
					card={card}
					level={card ? cardLevel(state, card) : null}
					done={finished ? total : Math.min(total, state.index + 1)}
					total={total}
					finished={finished}
					onExit={exit}
					onUndo={() => act({ type: "undo" })}
					clock={{ seconds: Math.ceil(clock), total: KILAT_SECONDS }}
					correct={state.results.filter((result) => result === "right").length}
				/>
			}
		>
			{finished ? (
				<SessionEnd state={state} held={held} />
			) : (
				<Question
					key={`${state.index}-${answered}`}
					state={state}
					card={card!}
					countdown={countdown}
					onInput={(value) => act({ type: "input", value })}
					onSubmit={() => act({ type: "submit" })}
					onChoose={(option) => act({ type: "choose", option })}
					onNext={() => act({ type: "next" })}
					onLower={() => act({ type: "lowerLevel" })}
					onRestore={() => act({ type: "restoreLevel" })}
					onAdd={() => act({ type: "add" })}
					onRemove={(value) => act({ type: "remove", value })}
					onDismissNote={() => act({ type: "dismissNote" })}
				/>
			)}
		</SessionFrame>
	);
}
