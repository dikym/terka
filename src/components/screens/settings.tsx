"use client";

import { Link } from "@/components/ui/app-link";
import { SkeletonText, skeletonWidth, Switch } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { PageTitle } from "@/components/ui/page-title";
import { DotLabel } from "@/components/ui/tag";
import type { Settings } from "@/lib/view/settings";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="flex flex-col">
			<div className="border-b border-ink-1000 pb-2">
				<span className="type-label text-ink-1000">{title}</span>
			</div>
			{children}
		</section>
	);
}

function Row({
	title,
	children,
	control,
	href,
	wide
}: {
	title: string;
	children?: React.ReactNode;
	control?: React.ReactNode;
	href?: string;
	/** Content under the title and the control, across the whole row. */
	wide?: React.ReactNode;
}) {
	const body = (
		<>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="font-sans text-body-md leading-[1.3] font-medium text-ink-1000">
					{title}
				</span>
				{children}
			</div>
			{/* At least the title's line height, so a short control sits level with the title. */}
			<div className="flex min-h-[calc(var(--text-body-md)*1.3)] flex-none items-center gap-2">
				{control ?? (href && <Icon name="chevron-right" size={16} />)}
			</div>
			{wide && <div className="w-full">{wide}</div>}
		</>
	);
	const className =
		"flex flex-wrap items-start justify-between gap-x-5 gap-y-2 border-b border-hairline py-4 text-left";
	if (!href) return <div className={className}>{body}</div>;
	if (href.startsWith("mailto:"))
		return (
			<a href={href} className={className}>
				{body}
			</a>
		);
	return (
		<Link href={href} className={className}>
			{body}
		</Link>
	);
}

function Note({ children }: { children: React.ReactNode }) {
	return <p className="font-sans text-body-sm leading-normal text-ink-500">{children}</p>;
}

function Locked({ value, loading, width }: { value: string; loading: boolean; width?: string }) {
	return (
		<span className="inline-flex h-9 items-center gap-2 rounded-sm border border-ink-200 px-3 opacity-60">
			<Icon name="lock" size={14} />
			<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-1000 tabular-nums">
				{loading ? <SkeletonText width={width ?? skeletonWidth(value)} /> : value}
			</span>
		</span>
	);
}

function LinkRow({ icon, label, href }: { icon: IconName; label: string; href: string }) {
	const content = (
		<>
			<span className="inline-flex items-center gap-3 font-sans text-body-md leading-none font-medium text-ink-1000">
				<Icon name={icon} size={18} />
				{label}
			</span>
			<Icon name="chevron-right" size={16} />
		</>
	);
	const className = "flex min-h-12 items-center justify-between border-b border-hairline";
	return href.startsWith("mailto:") ? (
		<a href={href} className={className}>
			{content}
		</a>
	) : (
		<Link href={href} className={className}>
			{content}
		</Link>
	);
}

// Sizes the skeleton lines while the settings load.
const PLACEHOLDER: Settings = {
	newPerDay: "10",
	newPerDayNote: "",
	holdAt: "40 soal",
	scope: "",
	diplomatEnabled: false,
	diplomatPerDay: "5",
	timeLimit: "8 detik",
	data: { version: "2026.09.24", regions: "61", diplomats: "130" },
	params: "",
	retention: "0,90",
	persisted: false,
	contact: "contact@terka.my.id"
};

export function SettingsScreen({
	data,
	onDiplomatChange
}: {
	data: Settings | null;
	onDiplomatChange: (enabled: boolean) => void;
}) {
	const loading = data === null;
	const s = data ?? PLACEHOLDER;
	const line = (text: string) => (loading ? <SkeletonText width="22em" /> : text);
	return (
		<>
			<PageTitle title="Setelan" back="/beranda" />
			<div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
				<div className="flex flex-col gap-8">
					<Section title="Materi baru">
						<Row
							title="Materi baru per hari"
							control={<Locked value={s.newPerDay} loading={loading} />}
						>
							<Note>{line(s.newPerDayNote)}</Note>
						</Row>
						<Row
							title="Materi baru dijeda jika"
							control={<Locked value={s.holdAt} loading={loading} width="4em" />}
						>
							<Note>Soal yang perlu diulang melebihi batas ini.</Note>
						</Row>
						<Row title="Cakupan" href="/cakupan">
							<Note>{line(s.scope)}</Note>
						</Row>
					</Section>
					<Section title="Latihan Kode diplomat">
						<Row
							title="Latihan Kode diplomat"
							control={
								<Switch
									checked={s.diplomatEnabled}
									onChange={onDiplomatChange}
									disabled={loading}
									label="Latihan Kode diplomat"
								/>
							}
						>
							<Note>
								Latih kode negara pada pelat CD. Jadwal dan materi barunya terpisah
								dari latihan wilayah.
							</Note>
						</Row>
						<div className="flex flex-col gap-3">
							<Row
								title="Materi baru Kode diplomat per hari"
								control={<Locked value={s.diplomatPerDay} loading={loading} />}
							>
								<Note>Nomor urut di belakang kode negara tidak dilatih.</Note>
							</Row>
							<div className="flex items-center justify-between gap-4 rounded-sm border border-ink-200 bg-paper-50 px-4 py-3">
								<div className="flex min-w-0 flex-col gap-1">
									<span className="type-label text-ink-700">
										Jika dinonaktifkan
									</span>
									<span className="text-ink-900 type-body">
										Materi baru berhenti. Soal yang sudah dipelajari tetap
										muncul saat perlu diulang.
									</span>
								</div>
							</div>
						</div>
					</Section>
					<Section title="Menjawab">
						<Row
							title="Batas waktu Tebak berwaktu"
							control={<Locked value={s.timeLimit} loading={loading} width="4em" />}
						>
							<Note>
								Mulai mengetik dalam batas ini; lewat batas, soal ditutup dengan
								Waktu habis.
							</Note>
						</Row>
						<Row
							title="Batalkan jawaban terakhir"
							control={<Locked value="Z" loading={false} />}
						>
							{/* Phones have no Z key. */}
							<Note>
								<span className="hidden lg:inline">
									Tombol Z atau Batalkan jawaban. Tidak tersedia di Mode Kilat.
								</span>
								<span className="lg:hidden">
									Lewat tombol Batalkan jawaban. Tidak tersedia di Mode Kilat.
								</span>
							</Note>
						</Row>
					</Section>
				</div>
				<div className="flex flex-col gap-8">
					<Section title="Data dan penyimpanan">
						<Row
							title="Penyimpanan permanen"
							control={
								<Switch
									checked={s.persisted}
									onChange={() => {}}
									label="Penyimpanan permanen"
									disabled
								/>
							}
						>
							<Note>
								{loading || s.persisted
									? "Mencegah browser menghapus data belajar secara otomatis."
									: "Penyimpanan permanen tidak tersedia. Masuk untuk menyinkronkan progres, atau ekspor data secara rutin."}
							</Note>
						</Row>
						<Row title="Akun, sinkronisasi, ekspor, dan impor" href="/statistik/akun">
							<Note>Dikelola dari Statistik.</Note>
						</Row>
						<Row
							title="Data pelat"
							href="/beranda?perubahan=1"
							control={<DotLabel tone="go">Terbaru</DotLabel>}
							wide={
								<div className="grid grid-cols-3 gap-4">
									{[
										[s.data.version, "versi", "5.5em"],
										[s.data.regions, "kode wilayah", "1.7em"],
										[s.data.diplomats, "kode CD", "1.7em"]
									].map(([value, label, width]) => (
										<span
											key={label}
											className="flex min-w-0 flex-col gap-[3px]"
										>
											<span className="font-mono text-body-md leading-none font-semibold text-ink-1000">
												{loading ? <SkeletonText width={width} /> : value}
											</span>
											<span className="font-sans text-micro leading-[1.2] text-ink-500">
												{loading ? (
													<SkeletonText width={skeletonWidth(label)} />
												) : (
													label
												)}
											</span>
										</span>
									))}
								</div>
							}
						/>
					</Section>
					<Section title="Pengaturan lanjutan">
						<Row title="Parameter jadwal" href="/setelan/parameter">
							<Note>{line(s.params)}</Note>
						</Row>
						<Row
							title="Target retensi"
							control={<Locked value={s.retention} loading={loading} width="2.5em" />}
						>
							<Note>Tetap, bukan pengaturan pengguna.</Note>
						</Row>
					</Section>
					<Section title="Tentang">
						<LinkRow icon="info" label="Tentang Terka" href="/tentang" />
						<LinkRow icon="shield-check" label="Kebijakan privasi" href="/privasi" />
						<LinkRow
							icon="mail"
							label="Laporkan data yang keliru"
							href={`mailto:${s.contact}`}
						/>
						<div className="pt-3 lg:flex lg:min-h-12 lg:items-center lg:justify-between lg:pt-0">
							<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
								{loading ? <SkeletonText width="11em" /> : s.contact}
							</span>
						</div>
					</Section>
				</div>
			</div>
		</>
	);
}
