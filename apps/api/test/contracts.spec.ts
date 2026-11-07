import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import { AgentTriggerService } from "../src/agent/agent-trigger.service";
import { ContractsService } from "../src/finance/contracts.service";
import { FinanceService } from "../src/finance/finance.service";
import { FixedCostsService } from "../src/finance/fixed-costs.service";
import {
	dueDateIn,
	nextPeriod,
	periodOf,
	periodsBetween,
} from "../src/finance/recurrence";
import { RecurringEntriesService } from "../src/finance/recurring-entries.service";

const suffix = crypto.randomUUID().slice(0, 8);
const ownerId = `contract-owner-${suffix}`;
const recurring = new RecurringEntriesService(db);
const contracts = new ContractsService(
	db,
	recurring,
	new AgentTriggerService(db),
);
const fixedCosts = new FixedCostsService(db, recurring);
const finance = new FinanceService(db, recurring);

const now = new Date();
const period = periodOf(now);
const firstOfMonth = `${period}-01`;
const fixedIds: string[] = [];

async function entriesFor(contractId: string, onlyPeriod = period) {
	return db.financeEntry.findMany({
		where: {
			period: onlyPeriod,
			OR: [{ contractId }, { payout: { contractId } }],
		},
		orderBy: { kind: "asc" },
		select: { kind: true, amount: true, description: true, paidAt: true },
	});
}

beforeAll(async () => {
	delete process.env.AGENT_BRIDGE_SECRET;
	await db.user.create({
		data: {
			id: ownerId,
			name: "Contract Owner",
			email: `${ownerId}@example.test`,
		},
	});
});

afterAll(async () => {
	const companies = await db.company.findMany({
		where: { ownerId },
		select: { id: true },
	});
	const ids = companies.map((row) => row.id);
	await db.financeEntry.deleteMany({
		where: {
			OR: [{ companyId: { in: ids } }, { fixedCostId: { in: fixedIds } }],
		},
	});
	await db.agentTask.deleteMany({ where: { companyId: { in: ids } } });
	await db.fixedCost.deleteMany({ where: { id: { in: fixedIds } } });
	await db.company.deleteMany({ where: { id: { in: ids } } });
	await db.user.deleteMany({ where: { id: ownerId } });
});

describe("recurrence helpers", () => {
	it("clamps the due day to the last day of a short month", () => {
		expect(dueDateIn("2026-02", 31).toISOString().slice(0, 10)).toBe(
			"2026-02-28",
		);
	});

	it("lists every month a range touches", () => {
		expect(
			periodsBetween(
				new Date("2026-11-01T03:00:00Z"),
				new Date("2027-01-01T03:00:00Z"),
			),
		).toEqual(["2026-11", "2026-12"]);
		expect(nextPeriod("2026-12")).toBe("2027-01");
	});
});

describe("ContractsService", () => {
	it("creates the client and books the fee and the payout every month", async () => {
		const saved = await contracts.create(
			{
				client: { mode: "new", name: `Maranata ${suffix}` },
				monthlyAmountCents: 120000,
				dueDay: 10,
				startsOn: firstOfMonth,
				payouts: [{ payee: "Sara", amountCents: 40000 }],
			},
			ownerId,
		);

		const rows = await entriesFor(saved.id);
		expect(rows.map((row) => [row.kind, Number(row.amount)])).toEqual([
			["INCOME", 1200],
			["EXPENSE", 400],
		]);

		const listed = await contracts.list(now);
		const mine = listed.rows.find((row) => row.id === saved.id);
		expect(mine?.netAmountCents).toBe(80000);
		expect(mine?.thisMonth?.paidAt).toBeNull();

		const next = nextPeriod(period);
		await finance.list({
			from: `${next}-01T00:00:00.000Z`,
			to: `${nextPeriod(next)}-01T00:00:00.000Z`,
			kind: "all",
		});
		expect(await entriesFor(saved.id, next)).toHaveLength(2);
	});

	it("never books twice for the same month", async () => {
		const saved = await contracts.create(
			{
				client: { mode: "new", name: `Agua ${suffix}` },
				monthlyAmountCents: 60000,
				dueDay: 5,
				startsOn: firstOfMonth,
				payouts: [],
			},
			ownerId,
		);
		await recurring.ensurePeriod(period);
		await recurring.ensurePeriod(period);
		expect(await entriesFor(saved.id)).toHaveLength(1);
	});

	it("keeps a paid month and rewrites the open one when the contract changes", async () => {
		const saved = await contracts.create(
			{
				client: { mode: "new", name: `Pdral ${suffix}` },
				monthlyAmountCents: 200000,
				dueDay: 10,
				startsOn: firstOfMonth,
				payouts: [{ payee: "Sara", amountCents: 60000 }],
			},
			ownerId,
		);
		const fee = await db.financeEntry.findFirstOrThrow({
			where: { contractId: saved.id, period },
			select: { id: true },
		});
		await finance.setPaid(fee.id, true);

		await contracts.update({
			id: saved.id,
			data: {
				monthlyAmountCents: 250000,
				dueDay: 15,
				startsOn: firstOfMonth,
				payouts: [{ payee: "Sara", amountCents: 70000 }],
			},
		});

		const rows = await entriesFor(saved.id);
		expect(
			rows.map((row) => [row.kind, Number(row.amount), Boolean(row.paidAt)]),
		).toEqual([
			["INCOME", 2000, true],
			["EXPENSE", 700, false],
		]);
	});

	it("refuses to delete a booked fee by hand", async () => {
		const saved = await contracts.create(
			{
				client: { mode: "new", name: `Uv ${suffix}` },
				monthlyAmountCents: 150000,
				dueDay: 10,
				startsOn: firstOfMonth,
				payouts: [],
			},
			ownerId,
		);
		const fee = await db.financeEntry.findFirstOrThrow({
			where: { contractId: saved.id, period },
			select: { id: true },
		});
		await expect(finance.remove(fee.id)).rejects.toThrow("vem de um contrato");
	});

	it("stops booking future months once the contract ends", async () => {
		const saved = await contracts.create(
			{
				client: { mode: "new", name: `Makes ${suffix}` },
				monthlyAmountCents: 60000,
				dueDay: 10,
				startsOn: firstOfMonth,
				payouts: [],
			},
			ownerId,
		);
		const next = nextPeriod(period);
		await recurring.ensurePeriod(next);
		expect(await entriesFor(saved.id, next)).toHaveLength(1);

		await contracts.end(saved.id, undefined, now);
		await recurring.ensurePeriod(next);

		expect(await entriesFor(saved.id, next)).toHaveLength(0);
		expect(await entriesFor(saved.id)).toHaveLength(1);
	});

	it("rejects payouts above the fee", async () => {
		const { contractCreateInput } = await import(
			"../src/finance/contracts.contracts"
		);
		const parsed = contractCreateInput.safeParse({
			client: { mode: "new", name: "X" },
			monthlyAmountCents: 100,
			dueDay: 10,
			startsOn: firstOfMonth,
			payouts: [{ payee: "Sara", amountCents: 200 }],
		});
		expect(parsed.success).toBe(false);
	});
});

describe("FixedCostsService", () => {
	it("books a fixed cost every month until it is turned off", async () => {
		const cost = await fixedCosts.create({
			description: `Cartão da empresa ${suffix}`,
			amountCents: 45000,
			dueDay: 10,
			startsOn: firstOfMonth,
		});
		fixedIds.push(cost.id);

		const count = (onlyPeriod: string) =>
			db.financeEntry.count({
				where: { fixedCostId: cost.id, period: onlyPeriod },
			});

		expect(await count(period)).toBe(1);

		await fixedCosts.setActive(cost.id, false, now);
		await recurring.ensurePeriod(nextPeriod(period));
		expect(await count(nextPeriod(period))).toBe(0);
		expect(await count(period)).toBe(1);
	});
});
