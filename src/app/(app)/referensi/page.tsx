"use client";

import { Referensi } from "@/components/screens/referensi";
import { useDummy } from "@/dummy/use-dummy";

export default function Page() {
	return <Referensi loading={!useDummy(true)} />;
}
