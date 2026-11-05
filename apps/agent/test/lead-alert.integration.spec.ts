import { afterEach, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import { leadAlertTarget, runLeadAlert } from "../agent/lib/lead-alert";

const env = {
	WHATSAPP_ALERT_PHONE: "+55 (85) 99999-0000",
	CALLMEBOT_API_KEY: "test-key",
	APP_URL: "https://crm.example.test/",
};

const created = { contacts: [] as string[], companies: [] as string[] };
const ownerId = `lead-alert-${crypto.randomUUID()}`;

afterEach(async () => {
	await db.contact.deleteMany({
		where: { id: { in: created.contacts.splice(0) } },
	});
	await db.company.deleteMany({
		where: { id: { in: created.companies.splice(0) } },
	});
	await db.user.deleteMany({ where: { id: ownerId } });
});

async function lead() {
	await db.user.upsert({
		where: { id: ownerId },
		create: {
			id: ownerId,
			name: "Lead Alert",
			email: `${ownerId}@example.test`,
		},
		update: {},
	});
	const company = await db.company.create({
		data: { name: "Padaria Teste", ownerId },
		select: { id: true },
	});
	created.companies.push(company.id);
	const contact = await db.contact.create({
		data: {
			firstName: "Maria",
			lastName: "Silva",
			phone: "+55 85 98888-7777",
			companyId: company.id,
		},
		select: { id: true },
	});
	created.contacts.push(contact.id);
	const deal = await db.deal.create({
		data: {
			name: "Padaria Teste · Formulário",
			companyId: company.id,
			ownerId,
			contacts: { create: { contactId: contact.id } },
		},
		select: { id: true },
	});
	return deal.id;
}

function recorder(status = 200) {
	const urls: URL[] = [];
	const send = (async (input: string | URL | Request) => {
		urls.push(new URL(String(input)));
		return new Response("ok", { status });
	}) as typeof fetch;
	return { urls, send };
}

describe("leadAlertTarget", () => {
	it("is null without a phone or a key", () => {
		expect(leadAlertTarget({})).toBeNull();
		expect(leadAlertTarget({ WHATSAPP_ALERT_PHONE: "+5585" })).toBeNull();
	});

	it("keeps only digits and the plus sign of the phone", () => {
		expect(leadAlertTarget(env)?.phone).toBe("+5585999990000");
	});
});

describe("runLeadAlert", () => {
	it("skips without sending when the variables are missing", async () => {
		const { urls, send } = recorder();
		const result = await runLeadAlert(
			{ type: "lead.alert.test" },
			{ env: {}, send },
		);
		expect(result.outcome).toBe("skipped");
		expect(urls).toHaveLength(0);
	});

	it("sends the deal, the client, the contact and the stage", async () => {
		const dealId = await lead();
		const { urls, send } = recorder();
		const result = await runLeadAlert(
			{ type: "lead.alert", dealId },
			{ env, send },
		);
		expect(result.outcome).toBe("sent");
		const text = urls[0]?.searchParams.get("text") ?? "";
		expect(text).toContain("Novo lead no Lugh CRM");
		expect(text).toContain("Cliente: Padaria Teste");
		expect(text).toContain("Contato: Maria Silva · +55 85 98888-7777");
		expect(text).toContain("Etapa: Montando Sniper");
		expect(text).toContain("https://crm.example.test/deals");
		expect(urls[0]?.searchParams.get("apikey")).toBe("test-key");
	});

	it("asks for a retry when CallMeBot fails", async () => {
		const { send } = recorder(500);
		const result = await runLeadAlert(
			{ type: "lead.alert.test" },
			{ env, send },
		);
		expect(result.outcome).toBe("retry");
	});

	it("skips a deal that no longer exists", async () => {
		const { urls, send } = recorder();
		const result = await runLeadAlert(
			{ type: "lead.alert", dealId: "missing" },
			{ env, send },
		);
		expect(result.outcome).toBe("skipped");
		expect(urls).toHaveLength(0);
	});

	it("rejects a payload of the wrong shape", async () => {
		const { send } = recorder();
		await expect(
			runLeadAlert({ type: "other" }, { env, send }),
		).rejects.toThrow();
	});
});
