import { Bandingkan } from "./bandingkan";
import { BandingkanDijawab } from "./bandingkan-dijawab";
import { BenarSalah } from "./benar-salah";
import { BukanYangMana } from "./bukan-yang-mana";
import { FaktaKode } from "./fakta-kode";
import { KodeBelakang } from "./kode-belakang";
import { PlatUtuh } from "./plat-utuh";
import { Sebutkan } from "./sebutkan";
import { SesiDinilai } from "./sesi-dinilai";
import { SesiRingkasan } from "./sesi-ringkasan";
import { SesiTanya } from "./sesi-tanya";
import { TanpaPetunjuk } from "./tanpa-petunjuk";

export const sesiScreens = {
	tanya: SesiTanya,
	dinilai: SesiDinilai,
	bandingkan: Bandingkan,
	"bandingkan-dijawab": BandingkanDijawab,
	ringkasan: SesiRingkasan,
	"tanpa-petunjuk": TanpaPetunjuk,
	sebutkan: Sebutkan,
	"plat-utuh": PlatUtuh,
	"kode-belakang": KodeBelakang,
	"benar-salah": BenarSalah,
	"bukan-yang-mana": BukanYangMana,
	"fakta-kode": FaktaKode
} satisfies Record<string, () => React.JSX.Element>;

export type SesiScreenKey = keyof typeof sesiScreens;
