// Same seed gives the same sequence on every device.
export function seeded(seed: string): () => number {
	let hash = 0x811c9dc5;
	for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
	let state = hash >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
	const result = [...items];
	for (let index = result.length - 1; index > 0; index--) {
		const other = Math.floor(random() * (index + 1));
		[result[index], result[other]] = [result[other], result[index]];
	}
	return result;
}
