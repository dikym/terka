import { LatihanTerfokus } from "@/components/screens/latihan-terfokus";
export default async function Page({
	searchParams
}: {
	searchParams: Promise<{ level?: string; id?: string }>;
}) {
	const { level, id } = await searchParams;
	return <LatihanTerfokus level={level} id={id} />;
}
