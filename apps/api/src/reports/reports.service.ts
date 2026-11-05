import { type Db, DealStage } from "@crm/db";
import { LOSING_DEAL_STAGES, OPEN_DEAL_STAGES } from "@crm/db/deal-stage";
import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { toCents } from "../crm/values";
import { ConversionService } from "../currency/conversion.service";
import { InjectDatabase } from "../database/database.constants";
import type {
	ReportsOverview,
	ReportsOverviewInput,
} from "./reports.contracts";
import { REPORTS } from "./reports-config";

const MONTH_LABEL = new Intl.DateTimeFormat("pt-BR", {
	month: "short",
	year: "2-digit",
});

const stageChangeMeta = z.object({ to: z.string().optional() }).passthrough();

const FUNNEL = [...OPEN_DEAL_STAGES, DealStage.CLOSED_WON] as const;

const LOSING = new Set<DealStage>(LOSING_DEAL_STAGES);

function monthStart(from: Date, offset: number): Date {
	return new Date(from.getFullYear(), from.getMonth() + offset, 1);
}

function monthId(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

@Injectable()
export class ReportsService {
	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly conversion: ConversionService,
	) {}

	async overview(
		input: ReportsOverviewInput,
		actingUserId: string,
	): Promise<ReportsOverview> {
		const now = new Date();
		const since = monthStart(now, -(input.months - 1));
		const owned = input.scope === "me" ? { ownerId: actingUserId } : {};
		const base = await this.conversion.reportingCurrency();

		const [deals, open] = await Promise.all([
			this.db.deal.findMany({
				where: {
					...owned,
					archivedAt: null,
					OR: [{ createdAt: { gte: since } }, { closedAt: { gte: since } }],
				},
				take: REPORTS.maxDeals,
				select: {
					id: true,
					name: true,
					stage: true,
					createdAt: true,
					closedAt: true,
					closedReason: true,
					baseAmount: true,
					baseCurrency: true,
					company: { select: { name: true } },
					owner: { select: { id: true, name: true, image: true } },
				},
			}),
			this.db.deal.findMany({
				where: {
					...owned,
					archivedAt: null,
					stage: { in: [...OPEN_DEAL_STAGES] },
				},
				take: REPORTS.maxDeals,
				select: {
					stage: true,
					stageChangedAt: true,
					baseAmount: true,
					baseCurrency: true,
					owner: { select: { id: true, name: true, image: true } },
				},
			}),
		]);

		const cents = (deal: {
			baseAmount: Parameters<typeof toCents>[0];
			baseCurrency: string | null;
		}) => (deal.baseCurrency === base ? (toCents(deal.baseAmount) ?? 0) : 0);

		const created = deals.filter((deal) => deal.createdAt >= since);
		const won = deals.filter(
			(deal) =>
				deal.stage === DealStage.CLOSED_WON &&
				deal.closedAt !== null &&
				deal.closedAt >= since,
		);
		const lost = deals.filter(
			(deal) =>
				LOSING.has(deal.stage) &&
				deal.closedAt !== null &&
				deal.closedAt >= since,
		);

		const history = await this.db.activity.findMany({
			where: {
				type: "STAGE_CHANGE",
				dealId: { in: created.map((deal) => deal.id) },
			},
			select: { dealId: true, meta: true },
		});
		const reachedIndex = new Map<string, number>();
		const indexOf = (stage: string) =>
			stage === DealStage.CLOSED_WON
				? FUNNEL.length - 1
				: (FUNNEL as readonly string[]).indexOf(stage);
		for (const deal of created) {
			reachedIndex.set(deal.id, Math.max(0, indexOf(deal.stage)));
		}
		const currentStage = new Map(created.map((deal) => [deal.id, deal.stage]));
		for (const entry of history) {
			if (!entry.dealId) continue;
			const parsed = stageChangeMeta.safeParse(entry.meta);
			const to = parsed.success ? parsed.data.to : undefined;
			if (!to) continue;
			if (
				to === DealStage.CLOSED_WON &&
				currentStage.get(entry.dealId) !== DealStage.CLOSED_WON
			) {
				continue;
			}
			const index = indexOf(to);
			if (index > (reachedIndex.get(entry.dealId) ?? 0)) {
				reachedIndex.set(entry.dealId, index);
			}
		}
		const funnel = FUNNEL.map((stage, index) => ({
			stage,
			reached: [...reachedIndex.values()].filter((value) => value >= index)
				.length,
		}));

		const monthly = Array.from({ length: input.months }, (_, offset) => {
			const start = monthStart(now, -(input.months - 1) + offset);
			const id = monthId(start);
			const wonInMonth = won.filter(
				(deal) => deal.closedAt && monthId(deal.closedAt) === id,
			);
			const createdInMonth = created.filter(
				(deal) => monthId(deal.createdAt) === id,
			);
			return {
				month: id,
				label: MONTH_LABEL.format(start).replace(".", ""),
				wonCount: wonInMonth.length,
				wonCents: wonInMonth.reduce((sum, deal) => sum + cents(deal), 0),
				createdCount: createdInMonth.length,
				createdCents: createdInMonth.reduce(
					(sum, deal) => sum + cents(deal),
					0,
				),
			};
		});

		const owners = new Map<string, ReportsOverview["owners"][number]>();
		const ownerEntry = (owner: {
			id: string;
			name: string;
			image: string | null;
		}) => {
			const entry = owners.get(owner.id) ?? {
				...owner,
				wonCount: 0,
				wonCents: 0,
				openCount: 0,
				openCents: 0,
			};
			owners.set(owner.id, entry);
			return entry;
		};
		for (const deal of won) {
			const entry = ownerEntry(deal.owner);
			entry.wonCount += 1;
			entry.wonCents += cents(deal);
		}
		for (const deal of open) {
			const entry = ownerEntry(deal.owner);
			entry.openCount += 1;
			entry.openCents += cents(deal);
		}

		const aging = OPEN_DEAL_STAGES.map((stage) => {
			const inStage = open.filter((deal) => deal.stage === stage);
			return {
				stage,
				openCount: inStage.length,
				avgDays: average(
					inStage.map(
						(deal) =>
							(now.getTime() - deal.stageChangedAt.getTime()) / REPORTS.dayMs,
					),
				),
			};
		});

		const cycles = won.flatMap((deal) =>
			deal.closedAt
				? [(deal.closedAt.getTime() - deal.createdAt.getTime()) / REPORTS.dayMs]
				: [],
		);
		const wonCents = won.reduce((sum, deal) => sum + cents(deal), 0);
		const decided = won.length + lost.length;

		const followUps = [...lost]
			.sort(
				(a, b) => (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0),
			)
			.slice(0, REPORTS.followUpsShown)
			.map((deal) => ({
				dealId: deal.id,
				name: deal.name,
				companyName: deal.company.name,
				stage: deal.stage,
				reason: deal.closedReason,
				at: (deal.closedAt ?? deal.createdAt).toISOString(),
			}));

		return {
			currency: base,
			months: input.months,
			totals: {
				created: created.length,
				won: won.length,
				lost: lost.length,
				wonCents,
				winRate: decided === 0 ? null : won.length / decided,
				avgCycleDays: average(cycles),
				avgTicketCents:
					won.length === 0 ? null : Math.round(wonCents / won.length),
			},
			funnel,
			monthly,
			owners: [...owners.values()].sort(
				(a, b) => b.wonCents - a.wonCents || b.openCents - a.openCents,
			),
			aging,
			followUps,
		};
	}
}
