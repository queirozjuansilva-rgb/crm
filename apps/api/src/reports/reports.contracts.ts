import { DealStage } from "@crm/db/enums";
import { z } from "zod";

export const reportsOverviewInput = z.object({
	months: z.coerce
		.number()
		.int()
		.refine((value) => [3, 6, 12].includes(value), {
			message: "Escolha 3, 6 ou 12 meses.",
		})
		.default(6),
	scope: z.enum(["me", "everyone"]).default("everyone"),
});

export type ReportsOverviewInput = z.infer<typeof reportsOverviewInput>;

const stage = z.enum(DealStage);

export const reportsOverviewOutput = z.object({
	currency: z.string(),
	months: z.number().int(),
	totals: z.object({
		created: z.number().int(),
		won: z.number().int(),
		lost: z.number().int(),
		wonCents: z.number(),
		winRate: z.number().nullable(),
		avgCycleDays: z.number().nullable(),
		avgTicketCents: z.number().nullable(),
	}),
	funnel: z.array(z.object({ stage, reached: z.number().int() })),
	monthly: z.array(
		z.object({
			month: z.string(),
			label: z.string(),
			wonCount: z.number().int(),
			wonCents: z.number(),
			createdCount: z.number().int(),
			createdCents: z.number(),
		}),
	),
	owners: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			image: z.string().nullable(),
			wonCount: z.number().int(),
			wonCents: z.number(),
			openCount: z.number().int(),
			openCents: z.number(),
		}),
	),
	aging: z.array(
		z.object({
			stage,
			openCount: z.number().int(),
			avgDays: z.number().nullable(),
		}),
	),
	followUps: z.array(
		z.object({
			dealId: z.string(),
			name: z.string(),
			companyName: z.string(),
			stage,
			reason: z.string().nullable(),
			at: z.string(),
		}),
	),
});

export type ReportsOverview = z.infer<typeof reportsOverviewOutput>;
