import { Bandingkan } from "./bandingkan";
import { BandingkanDijawab } from "./bandingkan-dijawab";
import { SesiDinilai } from "./sesi-dinilai";
import { SesiRingkasan } from "./sesi-ringkasan";
import { SesiTanya } from "./sesi-tanya";

export const sesiScreens = {
	tanya: SesiTanya,
	dinilai: SesiDinilai,
	bandingkan: Bandingkan,
	"bandingkan-dijawab": BandingkanDijawab,
	ringkasan: SesiRingkasan
} satisfies Record<string, () => React.JSX.Element>;

export type SesiScreenKey = keyof typeof sesiScreens;
