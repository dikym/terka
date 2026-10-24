import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Terka",
		short_name: "Terka",
		description: "Lihat pelatnya, terka asalnya.",
		lang: "id",
		start_url: "/",
		scope: "/",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#0f172a",
		icons: [
			{ src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
			{ src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
		],
		shortcuts: [{ name: "Referensi", short_name: "Referensi", url: "/referensi" }]
	};
}
