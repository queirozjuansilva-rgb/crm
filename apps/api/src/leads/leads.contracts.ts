import { DealStage } from "@crm/db";
import { z } from "zod";
import { currencyCode } from "../currency/currency.contracts";
import { MAX_AMOUNT_CENTS } from "../deals/deals.contracts";
import { LEADS } from "./leads.config";

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const leadCreateInput = z.object({
	client: z.discriminatedUnion("mode", [
		z.object({
			mode: z.literal("new"),
			name: z
				.string()
				.trim()
				.min(1, "O cliente precisa de um nome.")
				.max(LEADS.limits.name),
			instagram: optionalText(LEADS.limits.instagram),
		}),
		z.object({
			mode: z.literal("existing"),
			companyId: z.string().min(1, "Escolha o cliente."),
		}),
	]),
	person: optionalText(LEADS.limits.person),
	phone: optionalText(LEADS.limits.phone),
	email: z
		.union([z.email("Esse e-mail não é válido."), z.literal("")])
		.optional(),
	ownerId: z.string().min(1, "O lead precisa de um responsável."),
	stage: z
		.enum(Object.values(DealStage) as [DealStage, ...DealStage[]])
		.optional(),
	origin: optionalText(LEADS.limits.name),
	amountCents: z
		.number()
		.int()
		.min(0)
		.max(MAX_AMOUNT_CENTS, "Esse valor é alto demais para registrar.")
		.nullable()
		.optional(),
	currency: currencyCode.optional(),
	expectedCloseDate: z.string().nullable().optional(),
	notes: optionalText(LEADS.limits.notes),
});

export const leadCreateOutput = z.object({
	dealId: z.string(),
	dealName: z.string(),
	companyId: z.string(),
	contactId: z.string().nullable(),
});

export type LeadCreateInput = z.infer<typeof leadCreateInput>;
