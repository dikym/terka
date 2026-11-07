import type { Metadata } from "next";
import { Landing } from "@/components/screens/landing";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site-meta";

export const metadata: Metadata = { title: SITE_TITLE };

const STRUCTURED_DATA = JSON.stringify({
	"@context": "https://schema.org",
	"@type": "WebApplication",
	name: "Terka",
	url: SITE_URL,
	description: SITE_DESCRIPTION,
	inLanguage: "id",
	applicationCategory: "EducationalApplication",
	operatingSystem: "Web",
	offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" }
});

export default function Page() {
	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: STRUCTURED_DATA }}
			/>
			<Landing />
		</>
	);
}
