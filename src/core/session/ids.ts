// UUID v7: 48-bit millisecond time, version and variant bits, then random bits.
export function uuidV7(at: number, random: () => number): string {
	const bytes = new Uint8Array(16);
	let time = at;
	for (let index = 5; index >= 0; index--) {
		bytes[index] = time % 256;
		time = Math.floor(time / 256);
	}
	for (let index = 6; index < 16; index++) bytes[index] = Math.floor(random() * 256);
	bytes[6] = (bytes[6] & 0x0f) | 0x70;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
