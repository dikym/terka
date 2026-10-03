import { describe, expect, test } from "bun:test";
import type { ContentDraft } from "../../../src/core/content/draft";
import { consistencyRules } from "../../../src/core/content/rules/consistency";
import { errorCodes, validDraft } from "./fixtures";

function withMarkdown(): ContentDraft {
	const draft = validDraft();
	draft.markdown = {
		specials: {
			sources: draft.specials.sources.map((source) => ({ ...source })),
			specials: draft.specials.specials.map((entry) => ({ ...entry })),
			formats: [{ series: "RI", example: "RI 1", sources: ["perpol"] }]
		},
		facts: {
			sources: [],
			facts: draft.funFacts.facts.map((fact, index) => ({
				ref: fact.ref,
				line: index + 1,
				historyLabel: fact.historyLabel,
				publicationStatus: fact.publicationStatus,
				text: fact.text,
				source: [...fact.source],
				sourceCheckedAt: fact.sourceCheckedAt
			}))
		}
	};
	return draft;
}
const messages = (draft: ContentDraft) => consistencyRules(draft).map((message) => message.message);

describe("Markdown and JSON consistency", () => {
	test("identical twins pass, and a draft without Markdown is not compared", () => {
		expect(errorCodes(consistencyRules(withMarkdown()))).toEqual([]);
		expect(consistencyRules(validDraft())).toEqual([]);
	});
	test("a fact text that differs fails and names the ref and field", () => {
		const draft = withMarkdown();
		draft.markdown!.facts.facts[0].text = "Teks lain.";
		expect(messages(draft)).toEqual([
			"Terka_Fun_Facts.md: fact 1 text differs between Markdown and JSON"
		]);
	});
	test("a fact source list that differs fails", () => {
		const draft = withMarkdown();
		draft.markdown!.facts.facts[0].source = ["perpol"];
		expect(messages(draft)).toEqual([
			"Terka_Fun_Facts.md: fact 1 source differs between Markdown and JSON"
		]);
	});
	test("a fact present on one side only fails", () => {
		const draft = withMarkdown();
		draft.markdown!.facts.facts = [];
		expect(messages(draft)).toEqual([
			"Terka_Fun_Facts.md: fact 1 is missing from the Markdown"
		]);
	});
	test("a special holder that differs fails", () => {
		const draft = withMarkdown();
		draft.markdown!.specials.specials[0].holder = "Amerika";
		expect(messages(draft)).toEqual([
			"Terka_Special_Codes.md: special cd-12-amerika-serikat holder differs between Markdown and JSON"
		]);
	});
	test("a reference plate example that differs fails", () => {
		const draft = withMarkdown();
		draft.markdown!.specials.formats[0].example = "RI 2";
		expect(messages(draft)).toEqual([
			"Terka_Special_Codes.md: reference plate RI example differs between Markdown and JSON"
		]);
	});
	test("a source missing from the JSON fails", () => {
		const draft = withMarkdown();
		draft.markdown!.specials.sources.push({ ...draft.specials.sources[0], id: "lain" });
		expect(messages(draft)).toEqual([
			"Terka_Special_Codes.md: source lain is missing from the JSON"
		]);
	});
});
