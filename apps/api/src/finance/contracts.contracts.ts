import { z } from "zod";
import { FINANCE } from "./finance-config";

const { dueDay, maxPayouts } = FINANCE.recurring;

const cents = z
	.number()
	.int()
	.positive("O valor precisa ser maior que zero.")
	.max(99_999_999_999, "Esse valor é alto demais.");

const dateInput = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.");

const payoutInput = z.object({
	payee: z.string().trim().min(1, "Diga quem recebe o repasse.").max(80),
	amountCents: cents,
});

const contractTerms = z.object({
	service: z.string().trim().max(120).optional(),
	monthlyAmountCents: cents,
	dueDay: z.number().int().min(dueDay.min).max(dueDay.max),
	startsOn: dateInput,
	payouts: z.array(payoutInput).max(maxPayouts).default([]),
	notes: z.string().trim().max(2000).optional(),
});

function payoutsFit(terms: {
	monthlyAmountCents: number;
	payouts: { amountCents: number }[];
}) {
	return (
		terms.payouts.reduce((sum, payout) => sum + payout.amountCents, 0) <=
		terms.monthlyAmountCents
	);
}

const PAYOUTS_TOO_HIGH = {
	message: "Os repasses passam do valor do contrato.",
	path: ["payouts"],
};

export const contractCreateInput = contractTerms
	.extend({
		client: z.discriminatedUnion("mode", [
			z.object({
				mode: z.literal("new"),
				name: z
					.string()
					.trim()
					.min(1, "O cliente precisa de um nome.")
					.max(200),
			}),
			z.object({
				mode: z.literal("existing"),
				companyId: z.string().min(1, "Escolha o cliente."),
			}),
		]),
	})
	.refine(payoutsFit, PAYOUTS_TOO_HIGH);

export const contractUpdateInput = z.object({
	id: z.string().min(1),
	data: contractTerms.refine(payoutsFit, PAYOUTS_TOO_HIGH),
});

export const contractEndInput = z.object({
	id: z.string().min(1),
	endsOn: dateInput.optional(),
});

const entryStatus = z.enum(["paid", "pending", "overdue"]);

export const contractOutput = z.object({
	id: z.string(),
	status: z.enum(["ACTIVE", "PAUSED", "ENDED"]),
	service: z.string().nullable(),
	monthlyAmountCents: z.number(),
	netAmountCents: z.number(),
	dueDay: z.number().int(),
	startsOn: z.string(),
	endsOn: z.string().nullable(),
	notes: z.string().nullable(),
	company: z.object({
		id: z.string(),
		name: z.string(),
		iconUrl: z.string().nullable(),
		iconDarkUrl: z.string().nullable(),
		iconTone: z.string().nullable(),
	}),
	payouts: z.array(
		z.object({ id: z.string(), payee: z.string(), amountCents: z.number() }),
	),
	thisMonth: z
		.object({
			entryId: z.string(),
			dueDate: z.string(),
			paidAt: z.string().nullable(),
			status: entryStatus,
		})
		.nullable(),
});

export const contractListOutput = z.object({
	period: z.string(),
	rows: z.array(contractOutput),
	totals: z.object({
		active: z.number().int(),
		monthlyCents: z.number(),
		payoutsCents: z.number(),
		netCents: z.number(),
		receivedCents: z.number(),
	}),
});

export const contractSavedOutput = z.object({
	id: z.string(),
	companyId: z.string(),
});

export type ContractCreateInput = z.infer<typeof contractCreateInput>;
export type ContractUpdateInput = z.infer<typeof contractUpdateInput>;
export type ContractOutput = z.infer<typeof contractOutput>;
