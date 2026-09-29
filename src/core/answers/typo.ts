const KEY_POSITION = new Map(
	["qwertyuiop", "asdfghjkl", "zxcvbnm"].flatMap((row, rowIndex) =>
		[...row].map((key, column) => [key, [rowIndex, column + rowIndex * 0.5]] as const)
	)
);

function adjacentKeys(a: string, b: string): boolean {
	const p = KEY_POSITION.get(a);
	const q = KEY_POSITION.get(b);
	if (!p || !q) return false;
	const rows = Math.abs(p[0] - q[0]);
	const columns = Math.abs(p[1] - q[1]);
	return (rows === 0 && columns === 1) || (rows === 1 && columns <= 0.5);
}

export function typoDistance(a: string, b: string): number {
	const d = Array.from({ length: a.length + 1 }, (_, i) =>
		Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
	);
	for (let i = 1; i <= a.length; i++)
		for (let j = 1; j <= b.length; j++) {
			const substitute =
				a[i - 1] === b[j - 1] ? 0 : adjacentKeys(a[i - 1], b[j - 1]) ? 0.5 : 1;
			const remove = i > 1 && a[i - 1] === a[i - 2] ? 0.5 : 1;
			const insert = j > 1 && b[j - 1] === b[j - 2] ? 0.5 : 1;
			d[i][j] = Math.min(
				d[i - 1][j] + remove,
				d[i][j - 1] + insert,
				d[i - 1][j - 1] + substitute
			);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
				d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 0.5);
		}
	return d[a.length][b.length];
}

export function typoThreshold(length: number): number {
	return length <= 4 ? 0 : length <= 7 ? 1 : length <= 11 ? 1.5 : 2;
}
