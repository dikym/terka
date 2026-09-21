"use client";

import { createContext, useContext, useEffect, useEffectEvent, useRef, useState } from "react";
import { useStore } from "zustand";
import { usePathname, useRouter } from "next/navigation";
import plates from "@/data/plates.json";
import {
	createLearningStore,
	createRepository,
	type LearningStore,
	type Repository
} from "@/lib/terka/storage";
import { automaticBackup, openLearning } from "@/lib/terka/backup";
import { learnedCards, refreshProgress } from "@/lib/terka/engine";
import { beginPractice, modeDone } from "@/lib/terka/practice";
import type { Content, Progress, Scope, SessionMode } from "@/lib/terka/model";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";

type Command = (progress: Progress, content: Content) => Progress;
type NoticeTone = "warn" | "danger";
type LearningContextValue = {
	client: LearningStore;
	repository: Repository;
	content: Content;
	progress: Progress;
	busy: boolean;
	run: <T>(action: () => Promise<T>, failureTone?: NoticeTone) => Promise<T | undefined>;
	act: (command: Command) => Promise<Progress | undefined>;
	start: (mode: SessionMode, scope?: Scope) => Promise<void>;
	backup: () => Promise<void>;
};
const LearningContext = createContext<LearningContextValue | null>(null);

export function useLearning() {
	const value = useContext(LearningContext);
	if (!value) throw new Error("LearningProvider is required");
	return value;
}

export function isTyping(target: EventTarget | null) {
	return (
		target instanceof HTMLElement &&
		Boolean(target.closest("input, textarea, select, [contenteditable=true]"))
	);
}

export function useNow(interval = 1000) {
	const [now, setNow] = useState(Date.now);
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), interval);
		return () => clearInterval(timer);
	}, [interval]);
	return now;
}

export function LearningProvider({ children }: { children: React.ReactNode }) {
	const [{ client, repository }] = useState(() => {
		const repository = createRepository();
		return { repository, client: createLearningStore(repository, plates) };
	});
	const state = useStore(client.store);
	const [opening, setOpening] = useState(true);
	const [working, setWorking] = useState(false);
	const [message, setMessage] = useState<{ id: string; text: string; tone: NoticeTone } | null>(
		null
	);
	const started = useRef(false);
	const lock = useRef(false);
	const router = useRouter();
	const pathname = usePathname();
	const busy = opening || working || state.status !== "ready";

	useEffect(() => {
		if (started.current) return;
		started.current = true;
		void openLearning(client, repository, Date.now())
			.then((result) => {
				if (result.backup.status === "failed")
					setMessage({
						id: crypto.randomUUID(),
						text: result.backup.message,
						tone: "danger"
					});
			})
			.catch((error: unknown) =>
				setMessage({
					id: crypto.randomUUID(),
					text: error instanceof Error ? error.message : "Progres belum dapat dibuka.",
					tone: "danger"
				})
			)
			.finally(() => setOpening(false));
	}, [client, repository]);

	async function run<T>(
		action: () => Promise<T>,
		failureTone: NoticeTone = "danger"
	): Promise<T | undefined> {
		if (lock.current) return;
		lock.current = true;
		setWorking(true);
		setMessage(null);
		try {
			return await action();
		} catch (error) {
			setMessage({
				id: crypto.randomUUID(),
				text: error instanceof Error ? error.message : "Operasi belum berhasil. Coba lagi.",
				tone: failureTone
			});
		} finally {
			lock.current = false;
			setWorking(false);
		}
	}
	const act = (command: Command) => run(() => client.dispatch(crypto.randomUUID(), command));
	async function start(mode: SessionMode, scope?: Scope) {
		const result = await act((progress, content) =>
			beginPractice(progress, content, mode, Date.now(), crypto.randomUUID(), scope)
		);
		const active = result?.sessions.at(-1)?.mode;
		if (active)
			router.push(
				active === "sprint" ? "/kilat" : active === "challenge" ? "/tantangan" : "/sesi"
			);
	}
	async function backup() {
		await run(async () => {
			const result = await automaticBackup(client, repository, Date.now());
			if (result.status === "failed") throw new Error(result.message);
		});
	}

	useEffect(() => {
		const refresh = () => {
			const current = client.store.getState();
			if (opening || lock.current || current.status !== "ready" || !current.progress) return;
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			if (
				Date.now() < current.progress.clock.nextBoundary &&
				timezone === current.progress.clock.timezone
			)
				return;
			void client
				.dispatch(crypto.randomUUID(), (progress, content) =>
					refreshProgress(progress, content, Date.now(), timezone)
				)
				.catch((error: unknown) =>
					setMessage({
						id: crypto.randomUUID(),
						text:
							error instanceof Error
								? error.message
								: "Jam belajar belum diperbarui.",
						tone: "danger"
					})
				);
		};
		const timer = setInterval(refresh, 1000);
		window.addEventListener("focus", refresh);
		return () => {
			clearInterval(timer);
			window.removeEventListener("focus", refresh);
		};
	}, [client, opening]);

	const startFromKeyboard = useEffectEvent((mode: SessionMode) => {
		if (!state.progress) return void start(mode);
		if (modeDone(state.progress, client.content, mode, Date.now())) return;
		// Challenge draws only from cards already studied, so it stays closed until one exists.
		if (mode === "challenge" && !learnedCards(state.progress, client.content).length) return;
		void start(mode);
	});
	useEffect(() => {
		const routes: Record<string, string> = {
			s: "/sesi",
			t: "/tantangan",
			b: "/kilat",
			c: "/cakupan",
			"/": "/referensi",
			"?": "/pintasan"
		};
		function keyboard(event: KeyboardEvent) {
			if (
				event.defaultPrevented ||
				event.repeat ||
				event.ctrlKey ||
				event.metaKey ||
				event.altKey ||
				isTyping(event.target) ||
				busy
			)
				return;
			if (["/sesi", "/kilat", "/tantangan"].includes(pathname)) return;
			const modes: Record<string, SessionMode> = { s: "daily", t: "challenge", b: "sprint" };
			const mode =
				modes[event.key.toLowerCase()] ??
				(event.key === "Enter" &&
				pathname === "/" &&
				!(event.target instanceof HTMLElement && event.target.closest("button,a"))
					? "daily"
					: undefined);
			if (mode) {
				event.preventDefault();
				startFromKeyboard(mode);
				return;
			}
			const route = routes[event.key.toLowerCase()];
			if (route) {
				event.preventDefault();
				router.push(route);
			}
		}
		window.addEventListener("keydown", keyboard);
		return () => window.removeEventListener("keydown", keyboard);
	}, [pathname, router, busy]);

	const error = state.error ?? message?.text;
	const notice = error ? (
		<Toast
			key={message?.id ?? error}
			message={error}
			tone={state.error ? "danger" : (message?.tone ?? "danger")}
		/>
	) : null;
	return (
		<>
			{notice}
			{!state.progress || opening || state.status === "error" ? (
				<main
					className="p-8"
					role="status"
					data-storage-status={state.status}
					data-opening={String(opening)}
				>
					{state.status === "error" ? (
						<div className="mx-auto flex max-w-lg flex-col gap-4">
							<h1 className="font-display text-heading font-semibold">
								Penyimpanan perlu perhatian
							</h1>
							<p>
								Progres belum dapat dibuka atau disimpan. Data tersimpan tidak
								dihapus.
							</p>
							<p className="text-body-sm text-stop-700">{state.error}</p>
							<div className="flex flex-wrap gap-2">
								<Button
									size="sm"
									disabled={working}
									onClick={() => void run(() => client.retry())}
								>
									Coba simpan lagi
								</Button>
								<Button
									size="sm"
									variant="secondary"
									onClick={() => window.location.reload()}
								>
									Muat ulang progres tersimpan
								</Button>
							</div>
						</div>
					) : (
						"Membuka progres belajar…"
					)}
				</main>
			) : (
				<LearningContext.Provider
					value={{
						client,
						repository,
						content: client.content,
						progress: state.progress,
						busy,
						run,
						act,
						start,
						backup
					}}
				>
					{children}
				</LearningContext.Provider>
			)}
		</>
	);
}
