import { z } from "zod";

export const leadAlertPayload = z.discriminatedUnion("type", [
	z.object({ type: z.literal("lead.alert"), dealId: z.string().min(1) }),
	z.object({ type: z.literal("lead.alert.test") }),
]);

export type LeadAlertPayload = z.infer<typeof leadAlertPayload>;

export function parseLeadAlertPayload(value: unknown): LeadAlertPayload {
	const parsed = leadAlertPayload.safeParse(value);
	if (!parsed.success) {
		throw new Error(
			`A lead-alert task carries an unreadable payload: ${parsed.error.message}`,
		);
	}
	return parsed.data;
}
