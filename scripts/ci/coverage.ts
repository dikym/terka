// Line coverage gate for the scheduling engine (src/core), at least 90%.
const PREFIX = "src/core/";
const MINIMUM = 0.9;

export function coverageOf(lcov: string, prefix: string): { hit: number; found: number } {
	let hit = 0;
	let found = 0;
	let counting = false;
	for (const line of lcov.split("\n")) {
		if (line.startsWith("SF:")) counting = line.slice(3).startsWith(prefix);
		else if (counting && line.startsWith("LF:")) found += Number(line.slice(3));
		else if (counting && line.startsWith("LH:")) hit += Number(line.slice(3));
	}
	return { hit, found };
}

if (import.meta.main) {
	const run = Bun.spawnSync(
		[
			"bun",
			"test",
			"tests",
			"--coverage",
			"--coverage-reporter=lcov",
			"--coverage-dir=coverage"
		],
		{ stdout: "inherit", stderr: "inherit" }
	);
	if (run.exitCode !== 0) process.exit(run.exitCode ?? 1);
	const { hit, found } = coverageOf(await Bun.file("coverage/lcov.info").text(), PREFIX);
	const ratio = found === 0 ? 0 : hit / found;
	console.log(`${PREFIX} line coverage ${(ratio * 100).toFixed(1)}% (${hit}/${found})`);
	process.exit(ratio >= MINIMUM ? 0 : 1);
}
