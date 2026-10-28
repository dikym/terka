// Pages the export must contain. Each main screen has its own path, so a page view counts screens, not answers.
export const MAIN_ROUTES = [
	"/",
	"/sesi",
	"/cakupan",
	"/statistik",
	"/referensi",
	"/setelan",
	"/setelan/parameter",
	"/setelan/akun",
	"/papan-tombol",
	"/statistik/peta",
	"/statistik/sulit",
	"/tentang",
	"/auth/callback",
	"/masuk",
	"/privasi",
	"/beranda"
] as const;

export const htmlPathOf = (route: string) => (route === "/" ? "index.html" : `${route.slice(1)}.html`);
