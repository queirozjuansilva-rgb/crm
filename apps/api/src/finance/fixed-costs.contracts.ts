import { z } from "zod";
import { FINANCE } from "./finance-config";

const { dueDay } = FINANCE.recurring;

const fixedCostTerms = z.object({
	description: z.string().trim().min(1, "Descreva a conta.").max(120),
	amountCents: z
		.number()
		.int()
		.positive("O valor precisa ser maior que zero.")
		.max(99_999_999_999, "Esse valor é alto demais."),
	category: z.string().trim().max(60).optional(),
	dueDay: z.number().int().min(dueDay.min).max(dueDay.max),
	startsOn: z
		.string()
		.trim()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
	notes: z.string().trim().max(2000).optional(),
});

export const fixedCostCreateInput = fixedCostTerms;

export const fixedCostUpdateInput = z.object({
	id: z.string().min(1),
	data: fixedCostTerms,
});

export const fixedCostIdInput = z.object({ id: z.string().min(1) });

export const fixedCostOutput = z.object({
	id: z.string(),
	description: z.string(),
	amountCents: z.number(),
	category: z.string().nullable(),
	dueDay: z.number().int(),
	startsOn: z.string(),
	active: z.boolean(),
	notes: z.string().nullable(),
});

export const fixedCostListOutput = z.object({
	rows: z.array(fixedCostOutput),
	monthlyCents: z.number(),
});

export type FixedCostCreateInput = z.infer<typeof fixedCostCreateInput>;
export type FixedCostOutput = z.infer<typeof fixedCostOutput>;
