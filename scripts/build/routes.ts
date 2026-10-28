// Pages the export must contain. Each main screen has its own path, so a page view counts screens, not answers.
export const MAIN_ROUTES = [
	"/",
	"/sesi",
	"/cakupan",
	"/statistik",
	"/referensi",
	"/setelan",
	"/papan-tombol",
	"/statistik/peta",
	"/statistik/sulit",
	"/statistik/akun",
	"/tentang",
	"/auth/callback",
	"/masuk",
	"/privasi",
	"/beranda"
] as const;

export const htmlPathOf = (route: string) => (route === "/" ? "index.html" : `${route.slice(1)}.html`);
