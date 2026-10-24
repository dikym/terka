import type { FsrsParams } from "../../../src/core/log/events";
import type { CountedAnswer } from "../../../src/core/optimizer/counted";
import { addDays } from "../../../src/core/time/day";
import { DAY, NOW } from "../replay/fixtures";

export { DAY, NOW };

// `count` counted answers spread over `cards` cards, one per hour from `from`.
export function answers(
	count: number,
	cards: number,
	options: { from?: number; correct?: (index: number) => boolean; settled?: boolean } = {}
): CountedAnswer[] {
	const from = options.from ?? NOW;
	return Array.from({ length: count }, (_, index) => {
		const at = from + index * 3_600_000;
		return {
			id: `00000000-0000-7000-8000-${String(index).padStart(12, "0")}`,
			cardId: `c${index % cards}::code2region`,
			at,
			localDay: addDays("2026-09-21", Math.floor((at - NOW) / DAY)),
			grade: 3,
			settled: options.settled ?? true,
			correct: options.correct ? options.correct(index) : true,
			serverSeq: index + 1,
			msTotal: 4000
		};
	});
}

export function paramsRow(overrides: Partial<FsrsParams> = {}): FsrsParams {
	return {
		id: "row-1",
		deviceId: "device-a",
		receivedAt: null,
		serverSeq: null,
		algorithm: "fsrs-6",
		libraryVersion: "test",
		weights: Array.from({ length: 21 }, (_, index) => index / 10),
		status: "active",
		activatedAt: NOW,
		trainedReviewCount: 1000,
		trainedThroughSeq: null,
		trainingSetHash: "00",
		createdAt: NOW,
		logloss: 0.3,
		rmse: 0.05,
		baselineLogloss: 0.32,
		baselineRmse: 0.06,
		...overrides
	};
}
