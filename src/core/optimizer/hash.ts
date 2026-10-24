const toHex = (bytes: Uint8Array) =>
	Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

// SHA-256 over the sorted answer ids, 16 bytes each, as fsrs_params.training_set_hash stores it.
export async function trainingSetHash(ids: readonly string[]): Promise<string> {
	const sorted = [...ids].sort();
	const bytes = new Uint8Array(sorted.length * 16);
	sorted.forEach((id, index) => {
		const hex = id.replaceAll("-", "");
		for (let offset = 0; offset < 16; offset++)
			bytes[index * 16 + offset] = parseInt(hex.slice(offset * 2, offset * 2 + 2), 16);
	});
	return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}
