import type { Bundle } from "./schema";

export { provinceName } from "../answers/dictionary";

export const groupName = (bundle: Pick<Bundle, "groups">, id: string): string =>
	bundle.groups.find((group) => group.id === id)?.name ?? id;
