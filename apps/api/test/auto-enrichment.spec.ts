import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import { AgentTriggerService } from "../src/agent/agent-trigger.service";
import { isEnabledSyncSource } from "../src/mailbox/mailbox.constants";

const suffix = process.env.TEST_RUN_ID ?? "auto-enrichment-spec";
const name = `Auto Enrich Co ${suffix}`;

const agent = new AgentTriggerService(db);

let companyId: string;
let bridgeSecret: string | undefined;
let autoEnrichment: string | undefined;

function restore(key: string, value: string | undefined) {
	if (value === undefined) delete process.env[key];
	else process.env[key] = value;
}

beforeAll(async () => {
	bridgeSecret = process.env.AGENT_BRIDGE_SECRET;
	autoEnrichment = process.env.AUTO_ENRICHMENT;
	process.env.AGENT_BRIDGE_SECRET = "";
	delete process.env.AUTO_ENRICHMENT;

	await db.company.deleteMany({ where: { name } });
	const company = await db.company.create({
		data: { name, domain: `auto-enrich-${suffix}.test`.toLowerCase() },
		select: { id: true },
	});
	companyId = company.id;
});

afterAll(async () => {
	await db.agentTask.deleteMany({ where: { companyId } });
	await db.company.deleteMany({ where: { name } });
	restore("AGENT_BRIDGE_SECRET", bridgeSecret);
	restore("AUTO_ENRICHMENT", autoEnrichment);
});

const tasks = () =>
	db.agentTask.findMany({
		where: { companyId, finishedAt: null },
		select: { kind: true },
	});

describe("automatic enrichment", () => {
	it("queues nothing when a company appears", async () => {
		await agent.companyCreated(companyId, "New company");

		expect(await tasks()).toEqual([]);
	});

	it("still runs when a rep asks for it", async () => {
		expect(await agent.companyRequested(companyId, "A rep asked")).toBe(true);

		const kinds = (await tasks()).map((task) => task.kind).sort();
		expect(kinds).toEqual(["brand", "company-profile"]);

		await db.agentTask.deleteMany({ where: { companyId } });
	});

	it("comes back with AUTO_ENRICHMENT=true", async () => {
		process.env.AUTO_ENRICHMENT = "true";
		try {
			await agent.companyCreated(companyId, "New company");
		} finally {
			delete process.env.AUTO_ENRICHMENT;
		}

		expect((await tasks()).length).toBe(2);
	});
});

describe("mailbox sync sources", () => {
	it("syncs the calendar and skips Gmail", () => {
		expect(isEnabledSyncSource("calendar")).toBe(true);
		expect(isEnabledSyncSource("gmail")).toBe(false);
	});
});
