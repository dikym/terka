// Email records for the login sender: Resend's SPF on its "send" return-path subdomain, its DKIM key and
// a DMARC policy on the domain.
const DOMAIN = "terka.my.id";

export type DnsRecords = { spf: string[]; dkim: string[]; dmarc: string[] };

export function checkDns(records: DnsRecords): string[] {
	const problems: string[] = [];
	const spf = records.spf.filter((record) => record.startsWith("v=spf1"));
	if (!spf.some((record) => record.includes("amazonses.com")))
		problems.push(`SPF on send.${DOMAIN} does not include amazonses.com`);
	if (!records.dkim.some((record) => record.includes("p=")))
		problems.push(`DKIM key resend._domainkey.${DOMAIN} is missing`);
	if (!records.dmarc.some((record) => record.startsWith("v=DMARC1")))
		problems.push(`DMARC record _dmarc.${DOMAIN} is missing`);
	return problems;
}

async function txt(name: string): Promise<string[]> {
	const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${name}&type=TXT`, {
		headers: { accept: "application/dns-json" }
	});
	const body = (await response.json()) as { Answer?: { data: string }[] };
	// TXT data arrives quoted and may be split into several quoted strings.
	return (body.Answer ?? []).map((answer) => answer.data.replace(/"\s*"/g, "").replace(/"/g, ""));
}

if (import.meta.main) {
	const problems = checkDns({
		spf: await txt(`send.${DOMAIN}`),
		dkim: await txt(`resend._domainkey.${DOMAIN}`),
		dmarc: await txt(`_dmarc.${DOMAIN}`)
	});
	for (const problem of problems) console.error(problem);
	process.exit(problems.length > 0 ? 1 : 0);
}
