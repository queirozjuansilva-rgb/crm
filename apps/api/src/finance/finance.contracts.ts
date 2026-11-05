import { z } from "zod";
import { FINANCE } from "./finance-config";

const KINDS = ["INCOME", "EXPENSE"] as const;

export const financeKind = z.enum(KINDS);

const dateInput = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}/, "Informe uma data válida.");

const cents = z
	.number()
	.int()
	.positive("O valor precisa ser maior que zero.")
	.max(99_999_999_999, "Esse valor é alto demais.");

export const financeListInput = z.object({
	from: z.iso.datetime({ offset: true }),
	to: z.iso.datetime({ offset: true }),
	kind: z
		.string()
		.default("all")
		.refine(
			(value) =>
				value === "all" || (KINDS as readonly string[]).includes(value),
			{
				message: "Tipo inválido.",
			},
		),
	companyId: z.string().optional(),
});

export type FinanceListInput = z.infer<typeof financeListInput>;

const financeCompany = z.object({
	id: z.string(),
	name: z.string(),
	iconUrl: z.string().nullable(),
	iconDarkUrl: z.string().nullable(),
	iconTone: z.string().nullable(),
});

export const financeEntryOutput = z.object({
	id: z.string(),
	kind: financeKind,
	description: z.string(),
	amountCents: z.number(),
	currency: z.string(),
	category: z.string().nullable(),
	dueDate: z.string(),
	paidAt: z.string().nullable(),
	status: z.enum(["paid", "pending", "overdue"]),
	notes: z.string().nullable(),
	company: financeCompany.nullable(),
	deal: z.object({ id: z.string(), name: z.string() }).nullable(),
});

export type FinanceEntry = z.infer<typeof financeEntryOutput>;

export const financeListOutput = z.object({
	rows: z.array(financeEntryOutput),
	totals: z.object({
		incomeCents: z.number(),
		incomePaidCents: z.number(),
		expenseCents: z.number(),
		expensePaidCents: z.number(),
	}),
});

export const financeSummaryInput = z.object({
	months: z.coerce
		.number()
		.int()
		.min(FINANCE.summaryMonths.min)
		.max(FINANCE.summaryMonths.max)
		.default(FINANCE.summaryMonths.default),
});

export const financeSummaryOutput = z.object({
	currency: z.string(),
	monthly: z.array(
		z.object({
			month: z.string(),
			label: z.string(),
			incomeCents: z.number(),
			expenseCents: z.number(),
			incomePaidCents: z.number(),
			expensePaidCents: z.number(),
		}),
	),
	overdue: z.object({
		incomeCount: z.number().int(),
		incomeCents: z.number(),
		expenseCount: z.number().int(),
		expenseCents: z.number(),
	}),
	categories: z.array(z.string()),
});

export const financeCreateInput = z.object({
	kind: financeKind,
	description: z.string().trim().min(1, "Descreva o lançamento.").max(200),
	amountCents: cents,
	dueDate: dateInput,
	category: z.string().trim().max(60).optional(),
	notes: z.string().trim().max(2000).optional(),
	companyId: z.string().optional(),
	dealId: z.string().optional(),
	paid: z.boolean().default(false),
	repeatMonths: z.number().int().min(1).max(FINANCE.maxRepeatMonths).default(1),
});

export type FinanceCreateInput = z.infer<typeof financeCreateInput>;

export const financeUpdateInput = z.object({
	id: z.string(),
	data: z.object({
		kind: financeKind.optional(),
		description: z.string().trim().min(1).max(200).optional(),
		amountCents: cents.optional(),
		dueDate: dateInput.optional(),
		category: z.string().trim().max(60).nullable().optional(),
		notes: z.string().trim().max(2000).nullable().optional(),
		companyId: z.string().nullable().optional(),
		dealId: z.string().nullable().optional(),
	}),
});

export type FinanceUpdateInput = z.infer<typeof financeUpdateInput>;

export const financeSetPaidInput = z.object({
	id: z.string(),
	paid: z.boolean(),
});

export const financeIdInput = z.object({ id: z.string() });

export const financeCreateOutput = z.object({ ids: z.array(z.string()) });

export const financeRemoveOutput = z.object({ id: z.string() });
