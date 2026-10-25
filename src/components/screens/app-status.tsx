import { ErrorState } from "@/components/ui/states";
import type { RuntimeStatus } from "@/lib/app/runtime";

const FAILED = {
	contentFailed: "Data pelat tidak dapat dimuat. Coba buka kembali aplikasi.",
	storageFailed: "Data belajar tidak dapat dibuka. Coba muat ulang aplikasi."
};

/** The app could not open: says what failed and what to do, in place of the screen. */
export function AppFailed({ status }: { status: RuntimeStatus }) {
	if (status.status !== "contentFailed" && status.status !== "storageFailed") return null;
	return <ErrorState>{FAILED[status.status]}</ErrorState>;
}

export const failedMessage = (status: RuntimeStatus) =>
	status.status === "contentFailed" || status.status === "storageFailed"
		? FAILED[status.status]
		: null;

export const QUOTA_MESSAGE =
	"Penyimpanan perangkat penuh. Ekspor data, lalu kosongkan ruang penyimpanan.";
