import { type Db, Prisma } from "@crm/db";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AgentTriggerService } from "../agent/agent-trigger.service";
import { toCents } from "../crm/values";
import { InjectDatabase } from "../database/database.constants";
import type {
	ContractCreateInput,
	ContractOutput,
	ContractUpdateInput,
} from "./contracts.contracts";
import { FINANCE } from "./finance-config";
import { periodOf } from "./recurrence";
import { RecurringEntriesService } from "./recurring-entries.service";

const CONTRACT_SELECT = {
	id: true,
	status: true,
	service: true,
	monthlyAmount: true,
	dueDay: true,
	startsOn: true,
	endsOn: true,
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
	payouts: {
		orderBy: { position: "asc" },
		select: { id: true, payee: true, amount: true },
	},
} as const;

type ContractRow = Prisma.ContractGetPayload<{
	select: typeof CONTRACT_SELECT;
}>;

type ThisMonth = {
	id: string;
	dueDate: Date;
	paidAt: Date | null;
};

function fromCents(cents: number): Prisma.Decimal {
	return new Prisma.Decimal(cents).div(100);
}

function toDay(value: string): Date {
	return new Date(`${value}T12:00:00.000Z`);
}

@Injectable()
export class ContractsService {
	private readonly logger = new Logger(ContractsService.name);

	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly recurring: RecurringEntriesService,
		private readonly agent: AgentTriggerService,
	) {}

	async list(now = new Date()) {
		const period = periodOf(now);
		await this.recurring.ensurePeriod(period);

		const contracts = await this.db.contract.findMany({
			orderBy: [{ status: "asc" }, { company: { name: "asc" } }],
			select: {
				...CONTRACT_SELECT,
				financeEntries: {
					where: { period },
					select: { id: true, dueDate: true, paidAt: true },
					take: 1,
				},
			},
		});

		const rows = contracts.map((contract) =>
			this.serialize(contract, contract.financeEntries[0] ?? null, now),
		);
		const active = rows.filter((row) => row.status === "ACTIVE");
		const sum = (values: number[]) =>
			values.reduce((total, value) => total + value, 0);

		return {
			period,
			rows,
			totals: {
				active: active.length,
				monthlyCents: sum(active.map((row) => row.monthlyAmountCents)),
				payoutsCents: sum(
					active.flatMap((row) =>
						row.payouts.map((payout) => payout.amountCents),
					),
				),
				netCents: sum(active.map((row) => row.netAmountCents)),
				receivedCents: sum(
					active
						.filter((row) => row.thisMonth?.paidAt)
						.map((row) => row.monthlyAmountCents),
				),
			},
		};
	}

	async create(input: ContractCreateInput, userId: string) {
		const result = await this.db.$transaction(async (tx) => {
			const company =
				input.client.mode === "existing"
					? await tx.company.findFirst({
							where: { id: input.client.companyId, archivedAt: null },
							select: { id: true },
						})
					: await tx.company.create({
							data: { name: input.client.name, ownerId: userId },
							select: { id: true },
						});

			if (!company) {
				throw new NotFoundException("Esse cliente não existe mais.");
			}

			const contract = await tx.contract.create({
				data: {
					companyId: company.id,
					service: input.service || null,
					monthlyAmount: fromCents(input.monthlyAmountCents),
					currency: FINANCE.currency,
					dueDay: input.dueDay,
					startsOn: toDay(input.startsOn),
					notes: input.notes || null,
					payouts: {
						create: input.payouts.map((payout, position) => ({
							payee: payout.payee,
							amount: fromCents(payout.amountCents),
							position,
						})),
					},
				},
				select: { id: true, companyId: true },
			});

			return { contract, companyCreated: input.client.mode === "new" };
		});

		if (result.companyCreated) {
			await this.agent.companyCreated(
				result.contract.companyId,
				"Cliente com contrato cadastrado à mão",
			);
		}
		await this.recurring.ensurePeriod(periodOf(new Date()));

		this.logger.log({
			message: "Contract created",
			contractId: result.contract.id,
			companyCreated: result.companyCreated,
		});

		return result.contract;
	}

	async update(input: ContractUpdateInput, now = new Date()) {
		const { data } = input;
		const period = periodOf(now);

		const contract = await this.db.$transaction(async (tx) => {
			const existing = await tx.contract.findUnique({
				where: { id: input.id },
				select: { id: true, companyId: true },
			});
			if (!existing) {
				throw new NotFoundException("Esse contrato não existe mais.");
			}

			await this.recurring.clearOpenFrom(
				{ contractId: existing.id },
				period,
				tx,
			);
			await tx.contractPayout.deleteMany({
				where: { contractId: existing.id },
			});

			return tx.contract.update({
				where: { id: existing.id },
				data: {
					service: data.service || null,
					monthlyAmount: fromCents(data.monthlyAmountCents),
					dueDay: data.dueDay,
					startsOn: toDay(data.startsOn),
					notes: data.notes || null,
					payouts: {
						create: data.payouts.map((payout, position) => ({
							payee: payout.payee,
							amount: fromCents(payout.amountCents),
							position,
						})),
					},
				},
				select: { id: true, companyId: true },
			});
		});

		await this.recurring.ensurePeriod(period);
		return contract;
	}

	async end(id: string, endsOn: string | undefined, now = new Date()) {
		const end = endsOn ? toDay(endsOn) : now;
		const contract = await this.db.$transaction(async (tx) => {
			const updated = await tx.contract
				.update({
					where: { id },
					data: { status: "ENDED", endsOn: end },
					select: { id: true, companyId: true },
				})
				.catch(() => {
					throw new NotFoundException("Esse contrato não existe mais.");
				});
			await this.recurring.clearOpenFrom(
				{ contractId: id },
				periodOf(
					new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 1)),
				),
				tx,
			);
			return updated;
		});
		return contract;
	}

	async reactivate(id: string) {
		const contract = await this.db.contract
			.update({
				where: { id },
				data: { status: "ACTIVE", endsOn: null },
				select: { id: true, companyId: true },
			})
			.catch(() => {
				throw new NotFoundException("Esse contrato não existe mais.");
			});
		await this.recurring.ensurePeriod(periodOf(new Date()));
		return contract;
	}

	private serialize(
		row: ContractRow,
		entry: ThisMonth | null,
		now: Date,
	): ContractOutput {
		const monthly = toCents(row.monthlyAmount) ?? 0;
		const payouts = row.payouts.map((payout) => ({
			id: payout.id,
			payee: payout.payee,
			amountCents: toCents(payout.amount) ?? 0,
		}));
		return {
			id: row.id,
			status: row.status,
			service: row.service,
			monthlyAmountCents: monthly,
			netAmountCents:
				monthly - payouts.reduce((sum, payout) => sum + payout.amountCents, 0),
			dueDay: row.dueDay,
			startsOn: row.startsOn.toISOString().slice(0, 10),
			endsOn: row.endsOn?.toISOString().slice(0, 10) ?? null,
			notes: row.notes,
			company: row.company,
			payouts,
			thisMonth: entry
				? {
						entryId: entry.id,
						dueDate: entry.dueDate.toISOString(),
						paidAt: entry.paidAt?.toISOString() ?? null,
						status: entry.paidAt
							? "paid"
							: entry.dueDate < now
								? "overdue"
								: "pending",
					}
				: null,
		};
	}
}
