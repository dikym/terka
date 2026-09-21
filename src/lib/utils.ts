import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Keep custom font sizes separate from text colors when merging classes.
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
			shadow: [{ shadow: ["block", "block-accent", "lift", "overlay"] }],
			size: [{ size: ["control", "control-sm"] }]
		}
	}
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
