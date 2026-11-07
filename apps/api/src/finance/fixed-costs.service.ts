import { type Db, Prisma } from "@crm/db";
import { Injectable, NotFoundException } from "@nestjs/common";
import { toCents } from "../crm/values";
import { InjectDatabase } from "../database/database.constants";
import type {
	FixedCostCreateInput,
	FixedCostOutput,
} from "./fixed-costs.contracts";
import { nextPeriod, periodOf } from "./recurrence";
import { RecurringEntriesService } from "./recurring-entries.service";

const FIXED_COST_SELECT = {
	id: true,
	description: true,
	amount: true,
	category: true,
	dueDay: true,
	startsOn: true,
	active: true,
	notes: true,
} as const;

type FixedCostRow = Prisma.FixedCostGetPayload<{
	select: typeof FIXED_COST_SELECT;
}>;

function fromCents(cents: number): Prisma.Decimal {
	return new Prisma.Decimal(cents).div(100);
}

function toDay(value: string): Date {
	return new Date(`${value}T12:00:00.000Z`);
}

function serialize(row: FixedCostRow): FixedCostOutput {
	return {
		id: row.id,
		description: row.description,
		amountCents: toCents(row.amount) ?? 0,
		category: row.category,
		dueDay: row.dueDay,
		startsOn: row.startsOn.toISOString().slice(0, 10),
		active: row.active,
		notes: row.notes,
	};
}

@Injectable()
export class FixedCostsService {
	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly recurring: RecurringEntriesService,
	) {}

	async list() {
		const rows = await this.db.fixedCost.findMany({
			orderBy: [{ active: "desc" }, { dueDay: "asc" }, { description: "asc" }],
			select: FIXED_COST_SELECT,
		});
		const costs = rows.map(serialize);
		return {
			rows: costs,
			monthlyCents: costs
				.filter((cost) => cost.active)
				.reduce((sum, cost) => sum + cost.amountCents, 0),
		};
	}

	async create(input: FixedCostCreateInput) {
		const row = await this.db.fixedCost.create({
			data: {
				description: input.description,
				amount: fromCents(input.amountCents),
				category: input.category || null,
				dueDay: input.dueDay,
				startsOn: toDay(input.startsOn),
				notes: input.notes || null,
			},
			select: FIXED_COST_SELECT,
		});
		await this.recurring.ensurePeriod(periodOf(new Date()));
		return serialize(row);
	}

	async update(id: string, input: FixedCostCreateInput, now = new Date()) {
		const row = await this.db.$transaction(async (tx) => {
			await this.recurring.clearOpenFrom(
				{ fixedCostId: id },
				periodOf(now),
				tx,
			);
			return tx.fixedCost
				.update({
					where: { id },
					data: {
						description: input.description,
						amount: fromCents(input.amountCents),
						category: input.category || null,
						dueDay: input.dueDay,
						startsOn: toDay(input.startsOn),
						notes: input.notes || null,
					},
					select: FIXED_COST_SELECT,
				})
				.catch(() => {
					throw new NotFoundException("Essa conta fixa não existe mais.");
				});
		});
		await this.recurring.ensurePeriod(periodOf(now));
		return serialize(row);
	}

	async setActive(id: string, active: boolean, now = new Date()) {
		const row = await this.db.$transaction(async (tx) => {
			if (!active) {
				await this.recurring.clearOpenFrom(
					{ fixedCostId: id },
					nextPeriod(periodOf(now)),
					tx,
				);
			}
			return tx.fixedCost
				.update({
					where: { id },
					data: { active, endsOn: active ? null : now },
					select: FIXED_COST_SELECT,
				})
				.catch(() => {
					throw new NotFoundException("Essa conta fixa não existe mais.");
				});
		});
		if (active) await this.recurring.ensurePeriod(periodOf(now));
		return serialize(row);
	}
}
