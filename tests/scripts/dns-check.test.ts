import { expect, test } from "bun:test";
import { checkDns } from "../../scripts/ops/dns-check";

const good = {
	spf: ["v=spf1 ip4:52.3.252.119 ip4:199.249.231.0/24 ~all"],
	dkim: ["p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ"],
	dmarc: ["v=DMARC1; p=quarantine"]
};

test("accepts the records email sending needs", () => {
	expect(checkDns(good)).toEqual([]);
});

test("names a missing DMARC record", () => {
	expect(checkDns({ ...good, dmarc: [] })).toEqual([expect.stringContaining("DMARC")]);
});

test("names an SPF record that authorizes no sender", () => {
	expect(checkDns({ ...good, spf: ["v=spf1 -all"] })).toEqual([expect.stringContaining("SPF")]);
});

test("names a missing DKIM key", () => {
	expect(checkDns({ ...good, dkim: [] })).toEqual([expect.stringContaining("DKIM")]);
});
