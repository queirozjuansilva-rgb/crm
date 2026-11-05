import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import type { AgentQueueService } from "../src/agent/agent-queue.service";
import type { AgentTriggerService } from "../src/agent/agent-trigger.service";
import type { AttachmentStorageService } from "../src/attachments/attachment-storage.service";
import { CompaniesService } from "../src/companies/companies.service";
import type { FaviconService } from "../src/companies/favicon.service";
import { ActivityStampService } from "../src/crm/activity-stamp.service";
import { ConversionService } from "../src/currency/conversion.service";
import { FieldsService } from "../src/fields/fields.service";
import { withDiscardedCrmEvents } from "./agent-trigger.stub";

const suffix = process.env.TEST_RUN_ID ?? "attachments-purge-spec";

const agent = {
	companyCreated: async () => undefined,
	withCrmEvents: withDiscardedCrmEvents,
} as unknown as AgentTriggerService;

const removed: string[][] = [];
const storage = {
	removeMany: async (paths: string[]) => {
		removed.push(paths);
	},
} as unknown as AttachmentStorageService;

const companies = new CompaniesService(
	db,
	agent,
	{} as AgentQueueService,
	{ backfill: async () => undefined } as unknown as FaviconService,
	new ActivityStampService(db),
	new ConversionService(db),
	new FieldsService(db, agent),
	storage,
);

const created: string[] = [];
const userId = `user-${suffix}`;

beforeAll(async () => {
	await db.user.upsert({
		where: { id: userId },
		create: { id: userId, name: "Purge", email: `${userId}@example.test` },
		update: {},
	});
});

afterAll(async () => {
	await db.company.deleteMany({ where: { id: { in: created } } });
	await db.user.deleteMany({ where: { id: userId } });
});

describe("purging a record with attachments", () => {
	it("removes its files and its deals' files from storage", async () => {
		const company = await db.company.create({
			data: { name: `Purge ${suffix}`, domain: `purge-${suffix}.test` },
			select: { id: true },
		});
		created.push(company.id);
		const deal = await db.deal.create({
			data: {
				name: `Purge deal ${suffix}`,
				companyId: company.id,
				ownerId: userId,
			},
			select: { id: true },
		});
		await db.attachment.createMany({
			data: [
				{
					kind: "FILE",
					name: "a.pdf",
					storagePath: `company/${company.id}/a-${suffix}.pdf`,
					companyId: company.id,
				},
				{
					kind: "FILE",
					name: "b.pdf",
					storagePath: `deal/${deal.id}/b-${suffix}.pdf`,
					dealId: deal.id,
				},
				{
					kind: "LINK",
					name: "link",
					url: "https://example.com",
					companyId: company.id,
				},
			],
		});

		await companies.purge(company.id);

		expect(removed.flat().sort()).toEqual(
			[
				`company/${company.id}/a-${suffix}.pdf`,
				`deal/${deal.id}/b-${suffix}.pdf`,
			].sort(),
		);
		expect(
			await db.attachment.count({ where: { companyId: company.id } }),
		).toBe(0);
	});
});
