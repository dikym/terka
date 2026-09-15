import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge only knows Tailwind's own scales, so a project token like
// `text-small` or `border-control` would be filed under text/border *color*
// and silently drop the real color next to it (e.g. `text-white text-control`
// lost its white). Every custom class group from globals.css is declared here.
const twMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			"font-size": [
				{
					text: [
						"display",
						"title",
						"title-sm",
						"h2",
						"h2-sm",
						"cta",
						"cta-lg",
						"celebration",
						"panel-title",
						"page-title",
						"screen-title",
						"screen-title-sm",
						"section-title",
						"card-title",
						"amount",
						"figure",
						"lead",
						"lead-lg",
						"control",
						"control-sm",
						"row",
						"small",
						"caption",
						"footnote",
						"index"
					]
				}
			],
			"border-w": ["border-control"],
			"border-w-t": ["border-t-control"],
			"border-w-l": ["border-l-marker"],
			shadow: ["shadow-l-marker"],
			"grid-cols": ["grid-cols-section-index", "grid-cols-bill-row", "grid-cols-check-list"]
		}
	}
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
