export const GROUP_IDS = [
	"sumatera",
	"jawa",
	"kalimantan",
	"sulawesi",
	"balinusra",
	"maluku",
	"papua"
] as const;

export type GroupId = (typeof GROUP_IDS)[number];

export const GROUP_NAME: Record<GroupId, string> = {
	sumatera: "Sumatera",
	jawa: "Jawa",
	kalimantan: "Kalimantan",
	sulawesi: "Sulawesi",
	balinusra: "Bali & Nusa Tenggara",
	maluku: "Maluku",
	papua: "Papua"
};

// Literal class names, so Tailwind's scanner sees every group colour.
export const GROUP_BG: Record<GroupId, string> = {
	sumatera: "bg-group-sumatera",
	jawa: "bg-group-jawa",
	kalimantan: "bg-group-kalimantan",
	sulawesi: "bg-group-sulawesi",
	balinusra: "bg-group-balinusra",
	maluku: "bg-group-maluku",
	papua: "bg-group-papua"
};

export const GROUP_BORDER: Record<GroupId, string> = {
	sumatera: "border-group-sumatera",
	jawa: "border-group-jawa",
	kalimantan: "border-group-kalimantan",
	sulawesi: "border-group-sulawesi",
	balinusra: "border-group-balinusra",
	maluku: "border-group-maluku",
	papua: "border-group-papua"
};

export const groupColor = (id: GroupId) => `var(--color-group-${id})`;
