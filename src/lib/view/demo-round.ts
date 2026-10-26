import { seeded, shuffle } from "@/core/random";

// Kept apart from the build-time question list so the landing page's client code stays this small.
export const DEMO_LENGTH = 3;

export type DemoQuestion = { code: string; answer: string; choices: string[]; areas: string };

// Three codes from three different provinces, so a short round never repeats an answer.
export function demoRound(questions: DemoQuestion[], seed: number): DemoQuestion[] {
	const random = seeded(`demo-${seed}`);
	const round: DemoQuestion[] = [];
	for (const question of shuffle(questions, random)) {
		if (round.length === DEMO_LENGTH) break;
		if (round.some((picked) => picked.answer === question.answer)) continue;
		round.push({ ...question, choices: shuffle(question.choices, random) });
	}
	return round;
}
