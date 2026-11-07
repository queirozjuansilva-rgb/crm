import { type Db, Prisma } from "@crm/db";
import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { toCents } from "../crm/values";
import { InjectDatabase } from "../database/database.constants";
import type {
	FinanceCreateInput,
	FinanceEntry,
	FinanceListInput,
	FinanceUpdateInput,
} from "./finance.contracts";
import { FINANCE } from "./finance-config";
import { RecurringEntriesService } from "./recurring-entries.service";

const MONTH_LABEL = new Intl.DateTimeFormat("pt-BR", {
	month: "short",
	year: "2-digit",
	timeZone: "UTC",
});

const ENTRY_SELECT = {
	id: true,
	kind: true,
	description: true,
	amount: true,
	currency: true,
	category: true,
	dueDate: true,
	paidAt: true,
	notes: true,
	company: {
		select: {
			id: true,
			name: true,
			iconUrl: true,
			iconDarkUrl: true,
			iconTone: true,
		},
	},
	deal: { select: { id: true, name: true } },
	contractId: true,
	payoutId: true,
	fixedCostId: true,
} as const;

type EntryRow = Prisma.FinanceEntryGetPayload<{ select: typeof ENTRY_SELECT }>;

function toDate(value: string): Date {
	return new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
}

function addMonths(date: Date, months: number): Date {
	const next = new Date(date);
	const day = next.getUTCDate();
	next.setUTCDate(1);
	next.setUTCMonth(next.getUTCMonth() + months);
	const last = new Date(
		Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
	).getUTCDate();
	next.setUTCDate(Math.min(day, last));
	return next;
}

function monthStartUtc(from: Date, offset: number): Date {
	return new Date(
		Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + offset, 1),
	);
}

function monthId(date: Date): string {
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function fromCents(cents: number): Prisma.Decimal {
	return new Prisma.Decimal(cents).div(100);
}

@Injectable()
export class FinanceService {
	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly recurring: RecurringEntriesService,
	) {}

	async list(input: FinanceListInput) {
		await this.recurring.ensureRange(new Date(input.from), new Date(input.to));
		const rows = await this.db.financeEntry.findMany({
			where: {
				dueDate: { gte: new Date(input.from), lt: new Date(input.to) },
				...(input.kind === "all"
					? {}
					: { kind: input.kind as "INCOME" | "EXPENSE" }),
				...(input.companyId ? { companyId: input.companyId } : {}),
			},
			orderBy: [{ dueDate: "asc" }, { kind: "asc" }, { createdAt: "asc" }],
			take: FINANCE.listLimit,
			select: ENTRY_SELECT,
		});
		const entries = rows.map((row) => this.serialize(row));
		const sum = (kind: "INCOME" | "EXPENSE", paid: boolean) =>
			entries
				.filter((entry) => entry.kind === kind && (!paid || entry.paidAt))
				.reduce((total, entry) => total + entry.amountCents, 0);
		return {
			rows: entries,
			totals: {
				incomeCents: sum("INCOME", false),
				incomePaidCents: sum("INCOME", true),
				expenseCents: sum("EXPENSE", false),
				expensePaidCents: sum("EXPENSE", true),
			},
		};
	}

	async summary(months: number) {
		const now = new Date();
		const since = monthStartUtc(now, -(months - 1));
		const until = monthStartUtc(now, 1);
		await this.recurring.ensureRange(since, until, now);
		const [rows, overdue, categories] = await Promise.all([
			this.db.financeEntry.findMany({
				where: { dueDate: { gte: since, lt: until } },
				select: { kind: true, amount: true, dueDate: true, paidAt: true },
			}),
			this.db.financeEntry.groupBy({
				by: ["kind"],
				where: { paidAt: null, dueDate: { lt: now } },
				_count: { _all: true },
				_sum: { amount: true },
			}),
			this.db.financeEntry.findMany({
				where: { category: { not: null } },
				distinct: ["category"],
				select: { category: true },
				take: 50,
			}),
		]);

		const monthly = Array.from({ length: months }, (_, index) => {
			const start = monthStartUtc(now, -(months - 1) + index);
			const id = monthId(start);
			const inMonth = rows.filter((row) => monthId(row.dueDate) === id);
			const total = (kind: "INCOME" | "EXPENSE", paid: boolean) =>
				inMonth
					.filter((row) => row.kind === kind && (!paid || row.paidAt))
					.reduce((sum, row) => sum + (toCents(row.amount) ?? 0), 0);
			return {
				month: id,
				label: MONTH_LABEL.format(start).replace(".", ""),
				incomeCents: total("INCOME", false),
				expenseCents: total("EXPENSE", false),
				incomePaidCents: total("INCOME", true),
				expensePaidCents: total("EXPENSE", true),
			};
		});

		const overdueOf = (kind: "INCOME" | "EXPENSE") =>
			overdue.find((group) => group.kind === kind);

		return {
			currency: FINANCE.currency,
			monthly,
			overdue: {
				incomeCount: overdueOf("INCOME")?._count._all ?? 0,
				incomeCents: toCents(overdueOf("INCOME")?._sum.amount ?? null) ?? 0,
				expenseCount: overdueOf("EXPENSE")?._count._all ?? 0,
				expenseCents: toCents(overdueOf("EXPENSE")?._sum.amount ?? null) ?? 0,
			},
			categories: categories.flatMap((row) =>
				row.category ? [row.category] : [],
			),
		};
	}

	async create(input: FinanceCreateInput, userId: string) {
		const first = toDate(input.dueDate);
		const now = new Date();
		const ids: string[] = [];
		await this.db.$transaction(async (tx) => {
			for (let index = 0; index < input.repeatMonths; index += 1) {
				const dueDate = addMonths(first, index);
				const row = await tx.financeEntry.create({
					data: {
						kind: input.kind,
						description:
							input.repeatMonths > 1
								? `${input.description} (${index + 1}/${input.repeatMonths})`
								: input.description,
						amount: fromCents(input.amountCents),
						currency: FINANCE.currency,
						category: input.category || null,
						notes: input.notes || null,
						dueDate,
						paidAt: input.paid && index === 0 ? now : null,
						companyId: input.companyId || null,
						dealId: input.dealId || null,
						createdById: userId,
					},
					select: { id: true },
				});
				ids.push(row.id);
			}
		});
		return { ids };
	}

	async update(input: FinanceUpdateInput): Promise<FinanceEntry> {
		const { data } = input;
		const row = await this.db.financeEntry
			.update({
				where: { id: input.id },
				data: {
					kind: data.kind,
					description: data.description,
					amount:
						data.amountCents === undefined
							? undefined
							: fromCents(data.amountCents),
					dueDate: data.dueDate ? toDate(data.dueDate) : undefined,
					category:
						data.category === undefined ? undefined : data.category || null,
					notes: data.notes === undefined ? undefined : data.notes || null,
					companyId: data.companyId === undefined ? undefined : data.companyId,
					dealId: data.dealId === undefined ? undefined : data.dealId,
				},
				select: ENTRY_SELECT,
			})
			.catch(() => {
				throw new NotFoundException("Este lançamento não existe mais.");
			});
		return this.serialize(row);
	}

	async setPaid(id: string, paid: boolean): Promise<FinanceEntry> {
		const row = await this.db.financeEntry
			.update({
				where: { id },
				data: { paidAt: paid ? new Date() : null },
				select: ENTRY_SELECT,
			})
			.catch(() => {
				throw new NotFoundException("Este lançamento não existe mais.");
			});
		return this.serialize(row);
	}

	async remove(id: string) {
		const entry = await this.db.financeEntry.findUnique({
			where: { id },
			select: { contractId: true, payoutId: true, fixedCostId: true },
		});
		if (entry?.contractId || entry?.payoutId) {
			throw new BadRequestException(
				"Esse lançamento vem de um contrato. Edite ou encerre o contrato em Clientes.",
			);
		}
		if (entry?.fixedCostId) {
			throw new BadRequestException(
				"Esse lançamento vem de uma conta fixa. Edite ou desative a conta fixa.",
			);
		}
		await this.db.financeEntry.delete({ where: { id } }).catch(() => {
			throw new NotFoundException("Este lançamento não existe mais.");
		});
		return { id };
	}

	private serialize(row: EntryRow): FinanceEntry {
		const now = new Date();
		return {
			id: row.id,
			kind: row.kind,
			description: row.description,
			amountCents: toCents(row.amount) ?? 0,
			currency: row.currency,
			category: row.category,
			dueDate: row.dueDate.toISOString(),
			paidAt: row.paidAt?.toISOString() ?? null,
			status: row.paidAt ? "paid" : row.dueDate < now ? "overdue" : "pending",
			notes: row.notes,
			company: row.company,
			deal: row.deal,
			source: row.contractId
				? "contract"
				: row.payoutId
					? "payout"
					: row.fixedCostId
						? "fixed"
						: null,
		};
	}
}
