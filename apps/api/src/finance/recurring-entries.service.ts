import { type Db, Prisma } from "@crm/db";
import { Injectable } from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import { FINANCE } from "./finance-config";
import {
	activeIn,
	dueDateIn,
	nextPeriod,
	periodOf,
	periodsBetween,
} from "./recurrence";

const { categories } = FINANCE.recurring;

@Injectable()
export class RecurringEntriesService {
	constructor(@InjectDatabase() private readonly db: Db) {}

	async ensureRange(from: Date, to: Date, now = new Date()): Promise<void> {
		const limit = nextPeriod(periodOf(now), FINANCE.recurring.aheadMonths);
		const periods = periodsBetween(from, to).filter(
			(period) => period <= limit,
		);
		for (const period of periods) await this.ensurePeriod(period);
	}

	async ensurePeriod(period: string): Promise<void> {
		const [contracts, fixedCosts] = await Promise.all([
			this.db.contract.findMany({
				where: { status: "ACTIVE" },
				select: {
					id: true,
					companyId: true,
					monthlyAmount: true,
					currency: true,
					dueDay: true,
					startsOn: true,
					endsOn: true,
					company: { select: { name: true } },
					payouts: { select: { id: true, payee: true, amount: true } },
				},
			}),
			this.db.fixedCost.findMany({
				where: { active: true },
				select: {
					id: true,
					description: true,
					amount: true,
					category: true,
					dueDay: true,
					startsOn: true,
					endsOn: true,
				},
			}),
		]);

		const rows: Prisma.FinanceEntryCreateManyInput[] = [];

		for (const contract of contracts) {
			if (!activeIn(period, contract)) continue;
			const dueDate = dueDateIn(period, contract.dueDay);
			rows.push({
				kind: "INCOME",
				description: `Contrato ${contract.company.name}`,
				amount: contract.monthlyAmount,
				currency: contract.currency,
				category: categories.contract,
				dueDate,
				companyId: contract.companyId,
				contractId: contract.id,
				period,
			});
			for (const payout of contract.payouts) {
				rows.push({
					kind: "EXPENSE",
					description: `Repasse ${payout.payee} — ${contract.company.name}`,
					amount: payout.amount,
					currency: contract.currency,
					category: categories.payout,
					dueDate,
					companyId: contract.companyId,
					payoutId: payout.id,
					period,
				});
			}
		}

		for (const cost of fixedCosts) {
			if (!activeIn(period, cost)) continue;
			rows.push({
				kind: "EXPENSE",
				description: cost.description,
				amount: cost.amount,
				currency: FINANCE.currency,
				category: cost.category ?? categories.fixed,
				dueDate: dueDateIn(period, cost.dueDay),
				fixedCostId: cost.id,
				period,
			});
		}

		if (rows.length > 0) {
			await this.db.financeEntry.createMany({
				data: rows,
				skipDuplicates: true,
			});
		}
	}

	async clearOpenFrom(
		source: { contractId: string } | { fixedCostId: string },
		fromPeriod: string,
		client: Prisma.TransactionClient = this.db,
	): Promise<void> {
		const owner =
			"contractId" in source
				? {
						OR: [
							{ contractId: source.contractId },
							{ payout: { contractId: source.contractId } },
						],
					}
				: { fixedCostId: source.fixedCostId };

		await client.financeEntry.deleteMany({
			where: { ...owner, paidAt: null, period: { gte: fromPeriod } },
		});
	}
}
