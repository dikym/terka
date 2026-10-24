"use client";

import { Cakupan } from "@/components/screens/cakupan";
import { useDummy } from "@/dummy/use-dummy";

export default function Page() {
	const ready = useDummy(true);
	return <Cakupan loading={!ready} />;
}
