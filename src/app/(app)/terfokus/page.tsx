import { FocusedPracticeScreen } from "@/components/screens/focused-practice";
export default async function Page({
	searchParams
}: {
	searchParams: Promise<{ level?: string; id?: string }>;
}) {
	const { level, id } = await searchParams;
	return <FocusedPracticeScreen level={level} id={id} />;
}
