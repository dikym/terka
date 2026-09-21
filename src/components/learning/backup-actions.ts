"use client";

import { useEffect, useState } from "react";
import { useLearning } from "./learning-provider";
import {
	acknowledgeManualBackup,
	automaticBackup,
	connectBackupFolder,
	manualBackup
} from "@/lib/terka/backup";
import { restoreBackup } from "@/lib/terka/storage";

export function useBackupActions() {
	const { client, repository, content, progress, run } = useLearning();
	const [folder, setFolder] = useState<string | null>(null);
	const [downloaded, setDownloaded] = useState<number | null>(null);
	const supported = typeof window !== "undefined" && "showDirectoryPicker" in window;
	useEffect(() => {
		let active = true;
		void repository
			.getLocal("backupDirectory")
			.then((directory) => {
				if (active)
					setFolder(
						directory && typeof directory === "object"
							? "name" in directory && typeof directory.name === "string"
								? directory.name
								: "Folder terhubung"
							: null
					);
			})
			.catch(() => {
				if (active) setFolder(null);
			});
		return () => {
			active = false;
		};
	}, [repository]);
	async function toggleFolder() {
		await run(async () => {
			if (folder) {
				await repository.setLocal("backupDirectory", null);
				setFolder(null);
				return;
			}
			try {
				await connectBackupFolder(repository);
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") return;
				throw error;
			}
			const directory = await repository.getLocal("backupDirectory");
			setFolder(
				directory &&
					typeof directory === "object" &&
					"name" in directory &&
					typeof directory.name === "string"
					? directory.name
					: "Folder terhubung"
			);
			const result = await automaticBackup(client, repository, Date.now(), true);
			if (result.status === "failed") throw new Error(result.message);
		});
	}
	async function save() {
		await run(async () => {
			if (downloaded !== null) {
				await acknowledgeManualBackup(client, downloaded);
				setDownloaded(null);
				return;
			}
			if (folder) {
				const result = await automaticBackup(client, repository, Date.now(), true);
				if (result.status === "failed") throw new Error(result.message);
				if (result.status === "saved") return;
			}
			const now = Date.now();
			const url = URL.createObjectURL(manualBackup({ ...progress, lastBackupAt: now }));
			const link = document.createElement("a");
			link.href = url;
			link.download = `terka-${new Date(now).toISOString().slice(0, 10)}.json`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 60000);
			setDownloaded(now);
		});
	}
	async function restore(file: File) {
		await run(async () => {
			if (file.size > 20 * 1024 * 1024)
				throw new Error("Berkas cadangan terlalu besar (maksimal 20 MB).");
			const text = await file.text();
			const backup = restoreBackup(text, content);
			if (
				!window.confirm(
					`Pulihkan ${backup.cards.length} kartu dan ${backup.reviews.length} jawaban dari cadangan ini? Progres saat ini akan diganti.`
				)
			)
				return;
			await client.restore(text, crypto.randomUUID(), Date.now());
			setDownloaded(null);
		});
	}
	return { folder, supported, downloaded, save, restore, toggleFolder };
}
