"use client";

import { useEffect, useState } from "react";
import { Link } from "@/components/ui/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { Callout, Skeleton, SkeletonText } from "@/components/ui/feedback";
import { GoogleMark } from "@/components/ui/icon";
import { EMAIL_RESEND_SECONDS } from "@/rules";

export type SignIn = {
	/** Why sign-in cannot start now, or null when it can. */
	blocked: string | null;
	/** Google refuses OAuth inside some apps' browsers. */
	inApp: boolean;
	accept: () => Promise<void>;
	google: () => Promise<string | null>;
	sendCode: (email: string) => Promise<string | null>;
	verify: (email: string, code: string) => Promise<string | null>;
};

const FIELD =
	"h-12 w-full rounded-sm border border-ink-1000 bg-paper-0 px-4 text-body-lg leading-none text-ink-1000 outline-none placeholder:text-ink-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1000";

function Hint({ children }: { children: React.ReactNode }) {
	return <p className="font-sans text-body-sm leading-normal text-ink-500">{children}</p>;
}

/** Whole seconds left of a wait started with `start`, counted down once a second. */
function useCooldown() {
	const [until, setUntil] = useState(0);
	const [now, setNow] = useState(0);
	useEffect(() => {
		if (!until) return;
		const timer = setInterval(() => {
			const at = Date.now();
			setNow(at);
			if (at >= until) clearInterval(timer);
		}, 1_000);
		return () => clearInterval(timer);
	}, [until]);
	return {
		left: Math.max(0, Math.ceil((until - now) / 1_000)),
		start(seconds: number) {
			const at = Date.now();
			setNow(at);
			setUntil(at + seconds * 1_000);
		}
	};
}

/**
 * Sign-in: consent first on every attempt, then Google or an emailed code. Each handler
 * returns the message to show, or null when nothing needs saying.
 */
export function SignInForm({ signIn }: { signIn: SignIn }) {
	const [step, setStep] = useState<"consent" | "choose" | "code">("consent");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const resend = useCooldown();

	const run = async (work: () => Promise<string | null>) => {
		setBusy(true);
		setMessage(null);
		try {
			setMessage(await work());
		} finally {
			setBusy(false);
		}
	};

	return (
		<Card>
			<CardHeader label="Akun" title="Masuk untuk menyinkronkan progres antarperangkat" />
			{signIn.blocked && <Hint>{signIn.blocked}</Hint>}
			{step === "consent" && (
				<>
					<p className="text-ink-900 type-body">
						Dengan masuk, email dan riwayat latihan disimpan untuk sinkronisasi.{" "}
						<Link href="/privasi" className="underline underline-offset-[3px]">
							Baca kebijakan privasi.
						</Link>
					</p>
					<Button
						block
						disabled={!!signIn.blocked || busy}
						onClick={() =>
							void run(async () => {
								await signIn.accept();
								setStep("choose");
								return null;
							})
						}
					>
						Setuju dan lanjutkan
					</Button>
				</>
			)}
			{step === "choose" && (
				<>
					{signIn.inApp ? (
						<Callout tone="warn">
							Masuk dengan Google tidak bisa dari browser aplikasi ini. Buka Terka di
							Chrome atau Safari, atau masuk dengan email.
							<div className="mt-3">
								<Button
									variant="outline"
									size="sm"
									className="w-fit"
									onClick={() =>
										void navigator.clipboard?.writeText(location.href)
									}
								>
									Salin tautan
								</Button>
							</div>
						</Callout>
					) : (
						<Button
							variant="secondary"
							block
							disabled={!!signIn.blocked || busy}
							onClick={() => void run(signIn.google)}
						>
							<span className="flex items-center gap-2">
								<GoogleMark />
								Masuk dengan Google
							</span>
						</Button>
					)}
					<div className="flex items-center gap-3">
						<span className="h-px flex-1 bg-hairline" />
						<span className="type-label text-ink-500">atau</span>
						<span className="h-px flex-1 bg-hairline" />
					</div>
					<label className="flex flex-col gap-2">
						<span className="type-label text-ink-500">Email</span>
						<input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							autoComplete="email"
							placeholder="nama@email.com"
							className={`${FIELD} font-sans`}
						/>
					</label>
					<Button
						variant="secondary"
						block
						disabled={!!signIn.blocked || busy || !email.includes("@")}
						onClick={() =>
							void run(async () => {
								const problem = await signIn.sendCode(email.trim());
								if (!problem) {
									resend.start(EMAIL_RESEND_SECONDS);
									setStep("code");
								}
								return problem;
							})
						}
					>
						Kirim tautan dan kode masuk
					</Button>
				</>
			)}
			{step === "code" && (
				<>
					<p className="text-ink-900 type-body">
						Tautan dan kode masuk dikirim ke {email.trim()}.
					</p>
					<label className="flex flex-col gap-2">
						<span className="type-label text-ink-500">Kode 6 digit dari email</span>
						<input
							inputMode="numeric"
							autoComplete="one-time-code"
							value={code}
							onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
							maxLength={6}
							className={`${FIELD} font-mono tracking-[0.3em]`}
						/>
					</label>
					<Button
						block
						disabled={!!signIn.blocked || busy || code.length !== 6}
						onClick={() => void run(() => signIn.verify(email.trim(), code))}
					>
						Masuk
					</Button>
					<Hint>Belum menerima email? Cek folder spam, atau kirim ulang.</Hint>
					<Button
						variant="quiet"
						size="sm"
						className="w-fit bg-transparent tabular-nums"
						disabled={busy || resend.left > 0}
						onClick={() =>
							void run(async () => {
								setCode("");
								const problem = await signIn.sendCode(email.trim());
								if (!problem) resend.start(EMAIL_RESEND_SECONDS);
								return problem;
							})
						}
					>
						{resend.left > 0
							? `Kirim kode baru dalam ${resend.left} detik`
							: "Kirim kode baru"}
					</Button>
				</>
			)}
			{message && <Hint>{message}</Hint>}
		</Card>
	);
}

/** Holds the form's place until the stored session is known. */
export function SignInSkeleton() {
	return (
		<Card>
			<CardHeader label="Akun" title={<SkeletonText width="18em" />} />
			<Skeleton className="block h-12 w-full rounded-sm" />
			<Skeleton className="block h-12 w-full rounded-sm" />
		</Card>
	);
}

/** Local data belongs to another account: go back to it, or wipe this device for the new one. */
export function OtherAccount({ onBack, onWipe }: { onBack: () => void; onWipe: () => void }) {
	return (
		<Modal
			title="Akun berbeda"
			onClose={onBack}
			actions={
				<>
					<Button size="sm" block data-autofocus onClick={onBack}>
						Kembali ke akun sebelumnya
					</Button>
					<Button variant="secondary" size="sm" block onClick={onWipe}>
						Hapus data di perangkat ini
					</Button>
				</>
			}
		>
			Data di perangkat ini milik akun lain.
		</Modal>
	);
}
