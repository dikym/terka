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

export const compactName = (value: string) => normalizeName(value).replace(/ /g, "");

export function holderKey(value: string): string {
	return normalizeName(value, false)
		.replace(/^(?:negara|kedutaan|kedubes|republik) (?=\S)/, "")
		.replace(/ /g, "");
}
