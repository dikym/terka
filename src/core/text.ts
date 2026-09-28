// SRD 5.1 step 1: lower case, punctuation to spaces, collapsed spaces; administrative prefixes only as separate words.
export function normalizeName(value: string, stripAdministration = true): string {
	const normalized = value
		.normalize("NFKC")
		.toLocaleLowerCase("id-ID")
		.replace(/[\p{P}\p{S}]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
	return stripAdministration
		? normalized.replace(/^(?:kotamadya|kabupaten|kota|kab)\s+/, "")
		: normalized;
}

// SRD 5.1 step 2: names also compare without spaces.
export const compactName = (value: string) => normalizeName(value).replace(/ /g, "");

// SRD 5.3 step 1: holder answers keep administrative words but drop a leading country or embassy word.
export function holderKey(value: string): string {
	return normalizeName(value, false)
		.replace(/^(?:negara|kedutaan|kedubes|republik) (?=\S)/, "")
		.replace(/ /g, "");
}
