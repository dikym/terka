"use client";
import Link from "next/link";
import { useLearning, useNow } from "@/components/learning/learning-provider";
import { Callout } from "@/components/ui/callout";
import { DAY } from "@/lib/terka/model";
import { EXPORT_REMINDER_DAYS } from "@/rules";

export function BackupStatus() {
	const { progress } = useLearning();
	const now = useNow();
	const age =
		progress.lastBackupAt === null
			? null
			: Math.max(0, Math.floor((now - progress.lastBackupAt) / DAY));
	return (
		<Callout title="Cadangan">
			<p className="text-body-sm">
				{age === null
					? "Belum pernah dicadangkan."
					: age > EXPORT_REMINDER_DAYS
						? `Ekspor terakhir sudah lebih dari ${EXPORT_REMINDER_DAYS} hari.`
						: age === 0
							? "Cadangan diperbarui"
							: `Terakhir dicadangkan ${age} hari lalu`}
			</p>
			<Link
				href="/cadangan"
				className="inline-flex min-h-control items-center font-display text-body-sm font-semibold underline"
			>
				Perbarui cadangan
			</Link>
		</Callout>
	);
}
