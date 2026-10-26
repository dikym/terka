"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { Plate } from "@/components/ui/plate";
import { DEMO_LENGTH, type DemoQuestion, demoRound } from "@/lib/view/demo-round";

// The same keys the app's four-choice questions use.
const KEYS = ["F", "G", "H", "J"];
const subscribeNever = () => () => {};

/** A three-question taste of Tebak daerah on the landing page; nothing is saved. */
export function DemoCard({ questions }: { questions: DemoQuestion[] }) {
	// The static page renders round 0; after hydration each visit plays its own round.
	const mounted = useSyncExternalStore(
		subscribeNever,
		() => true,
		() => false
	);
	const [seed, setSeed] = useState(() => Math.random());
	const round = demoRound(questions, mounted ? seed : 0);
	const [step, setStep] = useState(0);
	const [picked, setPicked] = useState<string | null>(null);
	const [answers, setAnswers] = useState<boolean[]>([]);
	const right = answers.filter(Boolean).length;
	const next = useRef<HTMLButtonElement>(null);

	const done = step === DEMO_LENGTH;
	const question = round[Math.min(step, DEMO_LENGTH - 1)];

	useEffect(() => {
		if (picked) next.current?.focus();
	}, [picked]);

	const pick = (choice: string) => {
		if (picked) return;
		setPicked(choice);
		setAnswers((list) => [...list, choice === question.answer]);
	};
	const advance = () => {
		setPicked(null);
		setStep((value) => value + 1);
	};
	const again = () => {
		setSeed(Math.random());
		setStep(0);
		setPicked(null);
		setAnswers([]);
	};

	return (
		<div
			className="flex w-full flex-col gap-4 rounded-md border border-ink-1000 bg-paper-0 p-5 shadow-block lg:max-w-110 lg:gap-5 lg:justify-self-center lg:p-6"
			onKeyDown={(event) => {
				const index = KEYS.indexOf(event.key.toUpperCase());
				if (done || picked || index < 0 || event.metaKey || event.ctrlKey) return;
				event.preventDefault();
				pick(question.choices[index]);
			}}
		>
			<div className="flex items-center justify-between gap-3">
				<span className="type-label text-ink-500">Coba tebak daerah</span>
				<span className="font-mono text-body-sm leading-none font-medium text-ink-500">
					{done ? "Selesai" : `${step + 1}/${DEMO_LENGTH}`}
				</span>
			</div>
			{/* The result sits over the last question, kept in place, so the card never resizes. */}
			<div className="grid">
				<div
					aria-hidden={done || undefined}
					className={`flex flex-col gap-4 [grid-area:1/1] ${done ? "invisible" : ""}`}
				>
					<div className="flex flex-col items-start gap-3">
						<Plate
							code={question.code}
							size="md"
							highlight="code"
							className="lg:px-5 lg:py-3 lg:text-[56px]"
						/>
						<p className="font-display text-heading leading-snug font-bold tracking-title text-ink-1000">
							{question.code} dipakai daerah mana?
						</p>
					</div>
					<div className="grid grid-cols-2 gap-2">
						{question.choices.map((choice, index) => {
							const tone = !picked
								? "border-ink-1000 bg-paper-0"
								: choice === question.answer
									? "border-go-500 bg-go-100"
									: choice === picked
										? "border-stop-500 bg-stop-100"
										: "border-hairline bg-paper-0";
							return (
								<button
									key={choice}
									type="button"
									disabled={!!picked}
									aria-keyshortcuts={KEYS[index]}
									onClick={() => pick(choice)}
									className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border px-3 text-left font-sans text-body-md leading-[1.2] font-medium text-ink-1000 disabled:cursor-default ${tone}`}
								>
									<Kbd>{KEYS[index]}</Kbd>
									<span>{choice}</span>
								</button>
							);
						})}
					</div>
					{/* The button is there before the answer too, so the card keeps one height. */}
					<div className="flex flex-col gap-3" aria-live="polite">
						<p
							className={`min-h-[2lh] type-body max-lg:min-h-[3lh] ${picked ? "text-ink-900" : "text-ink-500"}`}
						>
							{picked ? (
								<>
									<b className="font-semibold">
										{picked === question.answer
											? "Benar."
											: `Belum tepat, ini ${question.answer}.`}
									</b>{" "}
									{question.code} dipakai {question.areas}.
								</>
							) : (
								"Pilih provinsi yang memakai kode ini. Jawabannya langsung terlihat."
							)}
						</p>
						<button
							ref={next}
							type="button"
							disabled={!picked}
							onClick={advance}
							className={buttonClass("primary", "md", true)}
						>
							{step === DEMO_LENGTH - 1 ? "Lihat hasil" : "Soal berikutnya"}
						</button>
					</div>
				</div>
				{/* Always laid out, so the card is as tall as its taller face from the first question. */}
				<div
					aria-hidden={!done || undefined}
					className={`flex flex-col justify-between gap-4 [grid-area:1/1] ${done ? "" : "invisible"}`}
				>
					<div className="flex flex-col gap-4">
						<p className="font-display text-heading leading-snug font-bold tracking-title text-ink-1000">
							{right} dari {DEMO_LENGTH} benar.
						</p>
						<p className="text-ink-700 type-body">
							Di Terka, kode yang belum hafal muncul lagi sebelum terlupa, sampai kamu
							bisa mengetiknya sendiri.
						</p>
						<ul className="flex flex-col border-t border-hairline">
							{round.map((item, index) => (
								<li
									key={item.code}
									className="flex items-center gap-3 border-b border-hairline py-2"
								>
									<span className="w-8 font-plate text-body-md leading-none font-bold text-ink-1000">
										{item.code}
									</span>
									<span className="flex-1 text-ink-900 type-body">
										{item.answer}
									</span>
									<Icon
										name={answers[index] ? "check" : "x"}
										size={16}
										color={answers[index] ? "bg-go-700" : "bg-stop-700"}
									/>
									<span className="sr-only">
										{answers[index] ? "benar" : "salah"}
									</span>
								</li>
							))}
						</ul>
					</div>
					<button
						type="button"
						onClick={again}
						className={buttonClass("secondary", "md", true)}
					>
						Coba kode lain
					</button>
				</div>
			</div>
		</div>
	);
}
