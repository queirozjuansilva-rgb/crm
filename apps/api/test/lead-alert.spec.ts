import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import type { ConfigService } from "@nestjs/config";
import type { EnvironmentVariables } from "../src/config/env.validation";
import { LeadAlertService } from "../src/notifications/lead-alert.service";

const suffix = process.env.TEST_RUN_ID ?? "lead-alert-spec";
const userId = `user-${suffix}`;
let companyId = "";
let dealId = "";

function config(values: Partial<EnvironmentVariables>) {
	return {
		get: (key: keyof EnvironmentVariables) => values[key],
	} as unknown as ConfigService<EnvironmentVariables, true>;
}

const sent: string[] = [];
const realFetch = globalThis.fetch;

beforeAll(async () => {
	globalThis.fetch = (async (input: string | URL) => {
		sent.push(String(input));
		return new Response("ok");
	}) as typeof fetch;
	await db.user.upsert({
		where: { id: userId },
		create: { id: userId, name: "Lead", email: `${userId}@example.test` },
		update: {},
	});
	const company = await db.company.create({
		data: { name: `Lead Co ${suffix}` },
		select: { id: true },
	});
	companyId = company.id;
	await db.contact.create({
		data: {
			firstName: "Ana",
			lastName: "Lima",
			phone: "+5585988887777",
			companyId,
		},
	});
	const deal = await db.deal.create({
		data: { name: `Lead deal ${suffix}`, companyId, ownerId: userId },
		select: { id: true },
	});
	dealId = deal.id;
});

afterAll(async () => {
	globalThis.fetch = realFetch;
	await db.company.deleteMany({ where: { id: companyId } });
	await db.contact.deleteMany({ where: { lastName: "Lima", companyId } });
	await db.user.deleteMany({ where: { id: userId } });
});

describe("new lead WhatsApp alert", () => {
	it("stays silent when it is not configured", async () => {
		const alert = new LeadAlertService(db, config({}));
		await alert.newLead(dealId);
		expect(alert.enabled).toBe(false);
		expect(sent).toHaveLength(0);
	});

	it("sends the deal, the client and the contact to the configured number", async () => {
		const alert = new LeadAlertService(
			db,
			config({
				WHATSAPP_ALERT_PHONE: "+55 (85) 99999-0000",
				CALLMEBOT_API_KEY: "key-123",
				APP_URL: "https://crm.example.test/",
			}),
		);
		await alert.newLead(dealId);
		expect(sent).toHaveLength(1);
		const url = new URL(sent[0] ?? "");
		expect(url.searchParams.get("phone")).toBe("+5585999990000");
		expect(url.searchParams.get("apikey")).toBe("key-123");
		const text = url.searchParams.get("text") ?? "";
		expect(text).toContain(`Lead deal ${suffix}`);
		expect(text).toContain(`Cliente: Lead Co ${suffix}`);
		expect(text).toContain("Contato: Ana Lima · +5585988887777");
		expect(text).toContain("Etapa: Montando Sniper");
		expect(text).toContain("https://crm.example.test/deals");
	});
});
