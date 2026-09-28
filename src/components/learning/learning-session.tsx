"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionShell } from "@/components/layout/session-shell";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { SessionQuestionScreen } from "@/components/screens/session-question";
import { SessionGradedScreen } from "@/components/screens/session-graded";
import { SessionSummaryScreen } from "@/components/screens/session-summary";
import { TimedGuessScreen } from "@/components/screens/timed-guess";
import { OddOneOutScreen } from "@/components/screens/odd-one-out";
import { TrueFalseScreen } from "@/components/screens/true-false";
import { CompareScreen } from "@/components/screens/compare";
import { CompareAnsweredScreen } from "@/components/screens/compare-answered";
import { AnswerUndoneScreen } from "@/components/screens/answer-undone";
import { SetRecallScreen } from "@/components/screens/set-recall";
import { SprintScreen } from "@/components/screens/sprint";
import { DailyChallengeScreen } from "@/components/screens/daily-challenge";
import { isTyping, useLearning, useNow } from "./learning-provider";
import { SessionViewContext, type SessionView } from "./session-view";
import { answerPractice, modeNames, practiceFeedback, undoPractice } from "@/lib/terka/practice";
import { dailyQueue, finishSession, nextQuestion } from "@/lib/terka/engine";
import { evaluateQuestion } from "@/lib/terka/questions";
import { sessionSummary } from "@/lib/terka/statistics";
import type { Level, SessionMode } from "@/lib/terka/model";

export function LearningSession({ initialMode = "daily" }: { initialMode?: SessionMode }) {
	const { progress, content, busy, act, start, backup } = useLearning();
	const router = useRouter();
	const now = useNow(100);
	const [draft, setDraft] = useState({
		key: "",
		value: "",
		items: [] as string[]
	});
	const [summaryId, setSummaryId] = useState<string | null>(null);
	const [restoredKey, setRestoredKey] = useState<string | null>(null);
	const [challengeQuestion, setChallengeQuestion] = useState<string | null>(null);
	const firstKey = useRef<{ key: string; ms: number } | null>(null);
	const [typedKey, setTypedKey] = useState<{ key: string; ms: number } | null>(null);
	const booted = useRef(false);
	const session = progress.sessions.at(-1);
	const feedback = practiceFeedback(progress);
	const question = progress.currentQuestion ?? feedback?.question ?? null;
	const key = question ? `${question.id}:${question.shownAt}` : "";
	const restoredPreview = restoredKey === key;
	const value = draft.key === key ? draft.value : "";
	const items = draft.key === key ? draft.items : [];
	const completed = Boolean(session && session.completedAt !== null);
	const showSummary =
		session &&
		(summaryId === session.id || (completed && (!feedback || session.mode === "sprint")));
	const challengePreview =
		session?.mode === "challenge" && progress.currentQuestion && challengeQuestion !== key;
	const canUndo = Boolean(
		progress.undo &&
		session &&
		progress.undo.before.sessions.at(-1)?.id === session.id &&
		!(session.mode === "sprint" && now >= session.startedAt + 60000) &&
		!(session.mode === "challenge" && session.day !== progress.clock.sequence)
	);
	function edit(next: string) {
		if (question && firstKey.current?.key !== key) {
			firstKey.current = { key, ms: Math.max(0, Date.now() - question.shownAt) };
			setTypedKey(firstKey.current);
		}
		setDraft({ key, value: next, items });
	}
	async function submit(answers?: string[]) {
		if (busy || !progress.currentQuestion || !session) return;
		const values =
			answers ??
			(question?.answerKind === "set"
				? [
						...items,
						...value
							.split(/[,;]+/)
							.map((item) => item.trim())
							.filter(Boolean)
					]
				: [value]);
		const submittedAt = Date.now();
		const delay =
			firstKey.current?.key === key
				? firstKey.current.ms
				: answers?.length
					? Math.max(0, submittedAt - progress.currentQuestion.shownAt)
					: null;
		const result = await act((current, data) => {
			const answered = answerPractice(
				current,
				data,
				values,
				delay,
				submittedAt,
				crypto.randomUUID()
			);
			return session.mode === "sprint" && answered.sessions.at(-1)?.completedAt === null
				? nextQuestion(answered, data, { id: crypto.randomUUID(), now: submittedAt })
				: answered;
		});
		if (result && result.sessions.at(-1)?.completedAt !== null) await backup();
	}
	async function next() {
		if (!session || busy) return;
		if (challengePreview || restoredPreview) {
			const result = await act((current) => ({
				...current,
				currentQuestion: current.currentQuestion
					? { ...current.currentQuestion, shownAt: Date.now() }
					: null
			}));
			if (result?.currentQuestion) {
				setRestoredKey(null);
				setChallengeQuestion(
					`${result.currentQuestion.id}:${result.currentQuestion.shownAt}`
				);
			}
			return;
		}
		if (completed) {
			setSummaryId(session.id);
			return;
		}
		const result = await act((current, data) => {
			const next = nextQuestion(current, data, { id: crypto.randomUUID(), now: Date.now() });
			return !next.currentQuestion &&
				next.sessions.at(-1)?.completedAt === null &&
				next.sessions.at(-1)?.mode === "daily"
				? finishSession(next, Date.now())
				: next;
		});
		if (result?.sessions.at(-1)?.completedAt && !result.currentQuestion) {
			setSummaryId(session.id);
			await backup();
		}
	}
	async function undo() {
		if (!canUndo || busy) return;
		const result = await act((current) => undoPractice(current, Date.now()));
		if (result) {
			setSummaryId(null);
			setRestoredKey(
				result.currentQuestion
					? `${result.currentQuestion.id}:${result.currentQuestion.shownAt}`
					: null
			);
			setChallengeQuestion(
				result.currentQuestion
					? `${result.currentQuestion.id}:${result.currentQuestion.shownAt}`
					: null
			);
		}
	}
	async function lower() {
		if (
			busy ||
			!progress.currentQuestion ||
			!question ||
			question.level <= 1 ||
			question.format === "set" ||
			question.drillPair ||
			session?.mode === "sprint"
		)
			return;
		await act((current, data) =>
			nextQuestion(current, data, {
				id: crypto.randomUUID(),
				now: Date.now(),
				level: (question.level - 1) as Level
			})
		);
	}
	const bootstrap = useEffectEvent(() => {
		if (booted.current) return;
		booted.current = true;
		if (!session || (initialMode !== "daily" && completed)) void start(initialMode);
	});
	const tick = useEffectEvent(() => {
		if (busy || !session || completed) return;
		if (session.mode === "sprint" && Date.now() >= session.startedAt + 60000) {
			void act((current) => finishSession(current, Date.now())).then(async (result) => {
				if (result) {
					setSummaryId(session.id);
					await backup();
				}
			});
			return;
		}
		if (
			!challengePreview &&
			!restoredPreview &&
			progress.currentQuestion?.limitMs !== null &&
			progress.currentQuestion &&
			(progress.currentQuestion.format === "truefalse" || firstKey.current?.key !== key) &&
			Date.now() > progress.currentQuestion.shownAt + progress.currentQuestion.limitMs!
		)
			void submit([]);
	});
	const keyboard = useEffectEvent((event: KeyboardEvent) => {
		if (
			event.defaultPrevented ||
			event.repeat ||
			event.ctrlKey ||
			event.metaKey ||
			event.altKey
		)
			return;
		if (event.key === "Escape") {
			event.preventDefault();
			router.push("/");
			return;
		}
		if (busy) return;
		if (
			event.key === "Enter" &&
			!(event.target instanceof HTMLElement && event.target.closest("button,a,select"))
		) {
			event.preventDefault();
			if (feedback || challengePreview || restoredPreview) void next();
			else if (question?.answerKind === "set") add();
			else if (!question?.choices.length) void submit();
			return;
		}
		if (isTyping(event.target)) return;
		if (challengePreview || restoredPreview || showSummary) return;
		if (event.key.toLowerCase() === "z") {
			event.preventDefault();
			void undo();
		}
		if (event.key.toLowerCase() === "l") {
			event.preventDefault();
			void lower();
		}
		const index = Number(event.key) - 1;
		if (question?.choices[index] && /^[1-4]$/.test(event.key)) {
			event.preventDefault();
			void submit([question.choices[index]]);
		}
		if (question?.format === "truefalse" && ["f", "j"].includes(event.key.toLowerCase())) {
			event.preventDefault();
			void submit([event.key.toLowerCase() === "f" ? "Benar" : "Salah"]);
		}
	});
	function add() {
		if (value.trim())
			setDraft({
				key,
				value: "",
				items: [...new Set([...items, value.trim()])].slice(0, 200)
			});
	}
	useEffect(() => {
		bootstrap();
		const timer = setInterval(tick, 100);
		const listener = (event: KeyboardEvent) => keyboard(event);
		window.addEventListener("keydown", listener);
		return () => {
			clearInterval(timer);
			window.removeEventListener("keydown", listener);
		};
	}, []);
	if (!session)
		return (
			<SessionShell current={0} total={0} undo={false}>
				<Callout title={modeNames[initialMode]}>
					Mode ini menggunakan materi yang sudah tersedia dalam progres Anda.
				</Callout>
				<Button disabled={busy} onClick={() => void start(initialMode)}>
					Mulai sesi
				</Button>
			</SessionShell>
		);
	const region = content.regions.find((region) => region.id === question?.regionId);
	const started = typedKey?.key === key && question?.format !== "truefalse";
	const remaining = question?.limitMs
		? Math.max(
				0,
				started
					? question.limitMs - typedKey!.ms
					: question.shownAt + question.limitMs - now
			)
		: 0;
	const view: SessionView = {
		progress,
		content,
		session,
		question,
		review: feedback?.review ?? null,
		summary: showSummary ? sessionSummary(progress, content, session.id) : null,
		masteryTest: Boolean(
			question?.level === 3 &&
			question.limitMs &&
			!feedback &&
			progress.cards.find((card) => card.cardId === question.cardId)?.state !== "mature"
		),
		busy,
		current: session.answered,
		total:
			session.mode === "daily"
				? session.answered + dailyQueue(progress, content, now).length
				: session.mode === "sprint"
					? session.answered + 1
					: session.cardIds.length,
		value,
		plate: { code: question?.answerKind === "code" && !feedback ? "?" : (region?.code ?? "") },
		timer: {
			value: question?.limitMs ? (remaining / question.limitMs) * 100 : 0,
			time: `${(remaining / 1000).toFixed(1)} s`
		},
		secondsLeft: Math.max(0, Math.ceil((session.startedAt + 60000 - now) / 1000)),
		items: items.map((name, index) => ({
			name,
			correct: question
				? (evaluateQuestion(content, question, items.slice(0, index + 1)).setCorrect ?? 0) >
					(evaluateQuestion(content, question, items.slice(0, index)).setCorrect ?? 0)
				: false
		})),
		setValue: edit,
		submit: (answers) => void submit(answers),
		add,
		next: () => void next(),
		lower: () => void lower(),
		undo: () => void undo(),
		canUndo
	};
	let screen;
	if (showSummary) screen = <SessionSummaryScreen />;
	else if (restoredPreview) screen = <AnswerUndoneScreen />;
	else if (feedback)
		screen = question?.format === "drill" ? <CompareAnsweredScreen /> : <SessionGradedScreen />;
	else if (challengePreview) screen = <DailyChallengeScreen />;
	else if (!progress.currentQuestion)
		screen = (
			<SessionShell current={session.answered} total={session.answered} undo={false}>
				<Callout title="Belum ada soal siap">
					Kartu berikutnya mengikuti jadwal pengulangan.
				</Callout>
				<Button disabled={busy} onClick={() => void next()}>
					Selesaikan sesi
				</Button>
			</SessionShell>
		);
	else if (session.mode === "sprint") screen = <SprintScreen />;
	else if (question?.format === "drill") screen = <CompareScreen />;
	else if (question?.format === "truefalse") screen = <TrueFalseScreen />;
	else if (question?.choices.length) screen = <OddOneOutScreen />;
	else if (question?.format === "set") screen = <SetRecallScreen />;
	else if (question?.level === 3 && question.limitMs) screen = <TimedGuessScreen />;
	else screen = <SessionQuestionScreen />;
	return <SessionViewContext.Provider value={view}>{screen}</SessionViewContext.Provider>;
}
