import { describe, expect, test } from "bun:test";
import * as binding from "@open-spaced-repetition/binding";
import { createEmptyCard, default_w, fsrs, Rating } from "ts-fsrs";
import type { Grade } from "../../../src/core/grading/signals";
import { splitByTime, type ReviewSeq } from "../../../src/core/optimizer/items";
import { seeded } from "../../../src/core/random";
import { createTrainer } from "../../../src/lib/optimizer/trainer";

const DAY = 86_400_000;
const truth = default_w.map((weight, index) =>
	index < 4 ? weight * 4 : index === 8 ? weight * 0.6 : weight
);

// Reviews drawn from a known memory model: recall happens with the model's own retrievability.
function synthetic(cards: number, reviews: number): ReviewSeq[] {
	const scheduler = fsrs({ w: truth, enable_short_term: false, enable_fuzz: false });
	const random = seeded("synthetic");
	const items: ReviewSeq[] = [];
	for (let c = 0; c < cards; c++) {
		let at = Date.UTC(2026, 0, 1) + c * DAY;
		let card = scheduler.next(createEmptyCard(new Date(at)), new Date(at), Rating.Good).card;
		const history: ReviewSeq["reviews"] = [{ rating: 3, deltaT: 0 }];
		for (let r = 1; r < reviews; r++) {
			const days = Math.max(1, Math.round(card.scheduled_days * (0.5 + random() * 1.5)));
			at += days * DAY;
			const recalled = random() < scheduler.get_retrievability(card, new Date(at), false);
			const rating: Grade = recalled ? 3 : 1;
			history.push({ rating, deltaT: days });
			items.push({ cardId: `c${c}`, lastAt: at, reviews: [...history] });
			card = scheduler.next(card, new Date(at), rating as unknown as Rating.Good).card;
		}
	}
	return items;
}

describe("createTrainer", () => {
	const trainer = createTrainer(binding);

	test("names the optimizer version it ran", () => {
		expect(trainer.version).toBe("binding@0.6.0-beta.6");
	});

	test("learns weights that predict held-out reviews better than the defaults", async () => {
		const { train, test: held } = splitByTime(synthetic(300, 8));
		const weights = await trainer.train(train);
		expect(weights).toHaveLength(21);
		const learned = await trainer.evaluate(weights, held);
		const defaults = await trainer.evaluate(default_w, held);
		expect(learned.logLoss).toBeLessThan(defaults.logLoss);
	}, 60_000);
});
