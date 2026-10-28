"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { PageTitle } from "@/components/ui/page-title";

function AccountRow({
	icon,
	last,
	children,
	aside
}: {
	icon: "user" | "cloud-upload" | "cloud-check";
	last?: boolean;
	children: React.ReactNode;
	aside?: React.ReactNode;
}) {
	return (
		<div
			className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 lg:flex-nowrap ${last ? "" : "border-b border-hairline"}`}
		>
			<div className="flex min-w-0 items-center gap-3">
				<Icon name={icon} size={18} />
				{children}
			</div>
			{aside && (
				// When it wraps on a phone, it lines up with the text after the icon.
				<span className="ml-7.5 flex-none font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums lg:ml-0">
					{aside}
				</span>
			)}
		</div>
	);
}

export type AccountPage = {
	email: string;
	provider: string;
	pending: string;
	pendingNote: string | null;
	synced: string;
	devices: string;
};

/** `loading`: the stored session is still being read, so the signed-in layout shows as a skeleton. */
export type AccountView =
	{ kind: "loading" } | { kind: "guest" } | { kind: "member"; page: AccountPage };

export type AccountActions = {
	exportData: () => void;
	importData: () => void;
	signOut: () => void;
	deleteAccount: () => void;
};

const block = (className: string) => <Skeleton className={`block rounded-sm ${className}`} />;

function TransferCard({
	ready,
	lastExport,
	actions
}: {
	ready: boolean;
	lastExport: string | null;
	actions: AccountActions;
}) {
	return (
		<Card>
			<CardHeader
				label="Ekspor dan impor"
				title={ready && lastExport ? lastExport : <SkeletonText width="9em" />}
			/>
			<p className="font-sans text-body-sm leading-normal text-ink-500">
				Ekspor menyimpan riwayat latihan, pengaturan, dan catatan pengingat dalam satu
				berkas JSON. Sinkronisasi menyimpan salinan di server; ekspor tetap berguna sebagai
				salinan yang kamu pegang sendiri.
			</p>
			<div className="flex items-center gap-3">
				{ready ? (
					<>
						<Button size="sm" icon="download" onClick={actions.exportData}>
							Ekspor data
						</Button>
						<Button
							variant="secondary"
							size="sm"
							icon="upload"
							onClick={actions.importData}
						>
							Impor data
						</Button>
					</>
				) : (
					<>
						{block("h-9 w-30")}
						{block("h-9 w-30")}
					</>
				)}
			</div>
		</Card>
	);
}

export function AccountScreen({
	view,
	lastExport,
	actions,
	onLogin
}: {
	view: AccountView;
	lastExport: string | null;
	actions: AccountActions;
	onLogin: () => void;
}) {
	if (view.kind === "guest")
		return (
			<>
				<PageTitle title="Akun" back="/setelan" />
				<div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-8">
					<Card>
						<CardHeader label="Akun" title="Belum masuk" />
						<p className="font-sans text-body-sm leading-normal text-ink-500">
							Progres tersimpan di perangkat ini. Masuk untuk menyinkronkan progres
							antarperangkat.
						</p>
						<Button size="sm" icon="user" onClick={onLogin}>
							Masuk
						</Button>
					</Card>
					<TransferCard ready lastExport={lastExport} actions={actions} />
				</div>
			</>
		);

	const page = view.kind === "member" ? view.page : null;
	return (
		<>
			<PageTitle title="Akun" back="/setelan" />
			<div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					<Card>
						<CardHeader label="Akun" />
						<div className="flex flex-col">
							<AccountRow icon="user">
								<div className="flex flex-col gap-0.75">
									<span className="font-display text-body-md leading-[1.2] font-semibold">
										{page ? page.email : <SkeletonText width="13em" />}
									</span>
									<span className="font-sans text-body-sm leading-[1.2] text-ink-500">
										{page ? page.provider : <SkeletonText width="9em" />}
									</span>
								</div>
							</AccountRow>
							<AccountRow
								icon="cloud-upload"
								aside={page ? (page.pendingNote ?? undefined) : undefined}
							>
								<span className="text-ink-900 type-body">
									{page ? page.pending : <SkeletonText width="16em" />}
								</span>
							</AccountRow>
							<AccountRow
								icon="cloud-check"
								aside={page ? page.devices : <SkeletonText width="4.5em" />}
								last
							>
								<span className="text-ink-900 type-body">
									{page ? page.synced : <SkeletonText width="12em" />}
								</span>
							</AccountRow>
						</div>
					</Card>
					<TransferCard ready={!!page} lastExport={lastExport} actions={actions} />
				</div>
				<aside className="flex min-w-0 flex-col gap-5">
					<Card>
						<CardHeader label="Keluar" />
						<p className="font-sans text-body-sm leading-normal text-ink-500">
							Keluar menyelesaikan sinkronisasi lebih dulu, lalu menghapus data dari
							perangkat ini.
						</p>
						{page ? (
							<Button
								variant="secondary"
								size="sm"
								block
								icon="log-out"
								onClick={actions.signOut}
							>
								Keluar
							</Button>
						) : (
							block("h-9 w-full")
						)}
					</Card>
					<Card bar="bg-stop-500">
						<CardHeader
							label={<span className="text-stop-700">Hapus akun</span>}
							aside={<Icon name="triangle-alert" size={18} color="bg-stop-700" />}
						/>
						<p className="font-sans text-body-sm leading-normal text-ink-500">
							Menghapus akun menghapus data di server. Data di perangkat ini tetap
							ada.
						</p>
						{page ? (
							<Button variant="stop" size="sm" block onClick={actions.deleteAccount}>
								Hapus akun
							</Button>
						) : (
							block("h-9 w-full")
						)}
					</Card>
				</aside>
			</div>
		</>
	);
}
