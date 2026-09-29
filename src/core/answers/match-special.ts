import type { Bundle, Special } from "../content/schema";
import { holderKey } from "../text";
import { typoDistance, typoThreshold } from "./typo";

export type HolderMatch = {
	matchType: "exact" | "typo" | "none";
	typoCost: number;
	confusedWith: string | null;
	correction: string | null;
};
export type SpecialCodeMatch = {
	matchType: "exact" | "none";
	confusedWith: string | null;
	extraDigits: boolean;
};

const noHolder = (confusedWith: string | null = null): HolderMatch => ({
	matchType: "none",
	typoCost: 0,
	confusedWith,
	correction: null
});
const pairId = (entry: Special) => (entry.confidence === "high" ? entry.id : null);
// SRD 5.3: all-capital abbreviations (UNDP, WHO) get no typo tolerance.
const isAbbreviation = (holder: string) => /[A-Z]/.test(holder) && holder === holder.toUpperCase();

function target(bundle: Pick<Bundle, "specials">, specialId: string): Special {
	const entry = bundle.specials.find((item) => item.id === specialId);
	if (!entry) throw new Error(`unknown special ${specialId}`);
	return entry;
}

// SRD 5.3 "Jawaban berupa nama pemegang".
export function matchHolder(
	input: string,
	specialId: string,
	bundle: Pick<Bundle, "specials">
): HolderMatch {
	const own = target(bundle, specialId);
	const key = holderKey(input);
	if (!key) return noHolder();
	const forms = bundle.specials.map((entry) => ({
		entry,
		keys: [entry.holder, ...entry.aliases].map(holderKey)
	}));
	if ([own.holder, ...own.aliases].map(holderKey).includes(key))
		return { matchType: "exact", typoCost: 0, confusedWith: null, correction: own.holder };
	const other = forms.find((form) => form.entry.id !== own.id && form.keys.includes(key));
	if (other) return noHolder(pairId(other.entry));
	const canonical = holderKey(own.holder);
	if (canonical.length <= 4 || isAbbreviation(own.holder)) return noHolder();
	// Score every holder/alias key (not only ones sharing the answer's first letter): a closer
	// different-first-letter holder must still be able to block the match (mirrors matchName).
	const scored = forms
		.flatMap((form) =>
			form.keys.map((candidate) => ({
				id: form.entry.id,
				form: candidate,
				cost: typoDistance(key, candidate)
			}))
		)
		.sort((a, b) => a.cost - b.cost);
	const best = scored[0];
	if (
		!best ||
		best.id !== own.id ||
		best.form[0] !== key[0] ||
		best.cost > typoThreshold(canonical.length)
	)
		return noHolder();
	if (scored.some((item) => item.id !== own.id && item.cost < best.cost + 1)) return noHolder();
	return { matchType: "typo", typoCost: best.cost, confusedWith: null, correction: own.holder };
}

// SRD 5.3 "Jawaban berupa kode": optional CD prefix, leading zeros dropped, exact, no extra digits.
export function matchSpecialCode(
	input: string,
	specialId: string,
	bundle: Pick<Bundle, "specials">
): SpecialCodeMatch {
	const own = target(bundle, specialId);
	const digits = input
		.toUpperCase()
		.replace(/[\s.-]/g, "")
		.match(/^(?:CD)?(\d+)$/)?.[1];
	if (!digits) return { matchType: "none", confusedWith: null, extraDigits: false };
	const number = String(Number(digits));
	if (number === own.number)
		return { matchType: "exact", confusedWith: null, extraDigits: false };
	const other = bundle.specials.find((entry) => entry.number === number && entry.id !== own.id);
	return {
		matchType: "none",
		confusedWith: other ? pairId(other) : null,
		extraDigits: number.length > own.number.length && number.startsWith(own.number)
	};
}
