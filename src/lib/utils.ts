import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge only knows Tailwind's own scales; the Terka type scale
// (`text-body-md`) would otherwise be filed under text *color* and drop the
// real colour next to it. Every custom font-size from globals.css is listed.
const twMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			"font-size": [
				{
					text: [
						"hero",
						"display",
						"title",
						"heading",
						"subhead",
						"body-lg",
						"body-md",
						"body-sm",
						"label",
						"micro"
					]
				}
			],
			shadow: [{ shadow: ["block", "block-accent", "lift", "overlay"] }]
		}
	}
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
