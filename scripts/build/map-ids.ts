// Groups are marked with data-group: "papua" and "maluku" name both a group and a province,
// and element ids must stay unique.
export const readMapIds = (svg: string): string[] =>
	[...svg.matchAll(/\s(?:id|data-group)="([^"]+)"/g)].map(([, id]) => id);
