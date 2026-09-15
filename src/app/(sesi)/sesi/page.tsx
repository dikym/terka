import { SessionShell } from "@/components/layout/session-shell";

export default function Page() {
	return (
		<SessionShell current={7} total={24}>
			<p>Sesi</p>
		</SessionShell>
	);
}
