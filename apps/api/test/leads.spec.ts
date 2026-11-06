import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import { AgentTriggerService } from "../src/agent/agent-trigger.service";
import { ConversionService } from "../src/currency/conversion.service";
import { FieldsService } from "../src/fields/fields.service";
import {
	instagramHandle,
	LeadsService,
	splitPersonName,
} from "../src/leads/leads.service";

const suffix = crypto.randomUUID().slice(0, 8);
const ownerId = `lead-owner-${suffix}`;
const agent = new AgentTriggerService(db);
const leads = new LeadsService(
	db,
	agent,
	new FieldsService(db, agent),
	new ConversionService(db),
);
const name = (label: string) => `Lead ${label} ${suffix}`;

async function companiesNamed(label: string) {
	return db.company.count({ where: { name: name(label) } });
}

beforeAll(async () => {
	delete process.env.AGENT_BRIDGE_SECRET;
	await db.user.create({
		data: { id: ownerId, name: "Lead Owner", email: `${ownerId}@example.test` },
	});
});

afterAll(async () => {
	const companies = await db.company.findMany({
		where: { ownerId },
		select: {
			id: true,
			contacts: { select: { id: true } },
			deals: { select: { id: true } },
		},
	});
	await db.agentTask.deleteMany({
		where: {
			OR: [
				{ companyId: { in: companies.map((row) => row.id) } },
				{
					contactId: {
						in: companies.flatMap((row) => row.contacts.map((c) => c.id)),
					},
				},
				{
					dealId: {
						in: companies.flatMap((row) => row.deals.map((d) => d.id)),
					},
				},
			],
		},
	});
	await db.contact.deleteMany({ where: { ownerId } });
	await db.company.deleteMany({ where: { ownerId } });
	await db.user.deleteMany({ where: { id: ownerId } });
});

describe("helpers", () => {
	it("turns an Instagram link or handle into @handle", () => {
		expect(instagramHandle("https://www.instagram.com/clinica.x/?hl=pt")).toBe(
			"@clinica.x",
		);
		expect(instagramHandle(" @clinica ")).toBe("@clinica");
		expect(instagramHandle("")).toBeNull();
	});

	it("splits a person's name", () => {
		expect(splitPersonName("Ana Maria Lima")).toEqual({
			firstName: "Ana",
			lastName: "Maria Lima",
		});
		expect(splitPersonName("Cândido")).toEqual({
			firstName: "Cândido",
			lastName: null,
		});
	});
});

describe("LeadsService.create", () => {
	it("creates the client, the contact and the deal together", async () => {
		const lead = await leads.create({
			client: { mode: "new", name: name("Clinica") },
			person: "Ana Lima",
			phone: "+55 85 98888-1111",
			email: `ana-${suffix}@example.test`,
			ownerId,
			stage: "SNIPER_READY",
			amountCents: 250050,
			currency: "BRL",
			notes: "Veio pelo Instagram.",
		});

		const deal = await db.deal.findUnique({
			where: { id: lead.dealId },
			select: {
				name: true,
				stage: true,
				description: true,
				amount: true,
				contacts: {
					select: { contact: { select: { firstName: true, phone: true } } },
				},
			},
		});
		expect(deal?.name).toBe(name("Clinica"));
		expect(deal?.stage).toBe("SNIPER_READY");
		expect(deal?.description).toBe("Veio pelo Instagram.");
		expect(Number(deal?.amount)).toBe(2500.5);
		expect(deal?.contacts[0]?.contact).toEqual({
			firstName: "Ana",
			phone: "+55 85 98888-1111",
		});
	});

	it("writes nothing when the e-mail belongs to another client", async () => {
		const email = `taken-${suffix}@example.test`;
		await leads.create({
			client: { mode: "new", name: name("Primeiro") },
			person: "Bia",
			email,
			ownerId,
		});

		await expect(
			leads.create({
				client: { mode: "new", name: name("Segundo") },
				person: "Bia",
				email,
				ownerId,
			}),
		).rejects.toThrow("já é de Bia");
		expect(await companiesNamed("Segundo")).toBe(0);
	});

	it("reuses the contact when the e-mail belongs to the chosen client", async () => {
		const email = `same-${suffix}@example.test`;
		const first = await leads.create({
			client: { mode: "new", name: name("Mesmo") },
			person: "Caio",
			email,
			ownerId,
		});

		const second = await leads.create({
			client: { mode: "existing", companyId: first.companyId },
			email,
			ownerId,
			stage: "PROPOSAL_MEETING",
		});

		expect(second.contactId).toBe(first.contactId);
		expect(second.dealId).not.toBe(first.dealId);
	});

	it("rolls the client back when the deal cannot be written", async () => {
		const existing = await db.fieldDefinition.findFirst({
			where: { entity: "DEAL", key: "etiqueta_de_origem" },
			select: { id: true },
		});
		const field =
			existing ??
			(await db.fieldDefinition.create({
				data: {
					entity: "DEAL",
					key: "etiqueta_de_origem",
					label: "Etiqueta de origem",
					type: "SELECT",
					position: 99,
					agentFilled: false,
					options: { create: [{ label: "Via formulário", position: 0 }] },
				},
				select: { id: true },
			}));

		try {
			await expect(
				leads.create({
					client: { mode: "new", name: name("Origem") },
					person: "Duda",
					ownerId,
					origin: "Origem que não existe",
				}),
			).rejects.toThrow("Origem que não existe");
			expect(await companiesNamed("Origem")).toBe(0);
		} finally {
			if (!existing) {
				await db.fieldDefinition.delete({ where: { id: field.id } });
			}
		}
	});
});
