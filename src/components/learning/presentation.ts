import type { IslandGroup } from "@/components/terka/scope-node";

export function islandGroup(group: string): IslandGroup {
	switch (group) {
		case "sumatera":
		case "jawa":
		case "kalimantan":
		case "sulawesi":
		case "maluku":
		case "papua":
			return group;
		default:
			return "balinusra";
	}
}

export const groupStrokes: Record<IslandGroup, string> = {
	sumatera: "stroke-group-sumatera",
	jawa: "stroke-group-jawa",
	kalimantan: "stroke-group-kalimantan",
	sulawesi: "stroke-group-sulawesi",
	balinusra: "stroke-group-balinusra",
	maluku: "stroke-group-maluku",
	papua: "stroke-group-papua"
};
