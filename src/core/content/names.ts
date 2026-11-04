import type { Bundle } from "@/core/content/schema";

export { provinceName } from "@/core/answers/dictionary";

export const groupName = (bundle: Pick<Bundle, "groups">, id: string): string =>
	bundle.groups.find((group) => group.id === id)?.name ?? id;
