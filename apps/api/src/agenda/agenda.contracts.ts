import { z } from "zod";
import { AGENDA } from "./agenda-config";

export const agendaRangeInput = z
	.object({
		from: z.iso.datetime({ offset: true }),
		to: z.iso.datetime({ offset: true }),
	})
	.refine((range) => new Date(range.to) > new Date(range.from), {
		message: "O fim do período precisa vir depois do início.",
	})
	.refine(
		(range) =>
			new Date(range.to).getTime() - new Date(range.from).getTime() <=
			AGENDA.maxRangeMs,
		{ message: "Escolha um período de até 45 dias." },
	);

export type AgendaRangeInput = z.infer<typeof agendaRangeInput>;

const agendaRecordOutput = z.object({
	kind: z.enum(["company", "contact", "deal"]),
	id: z.string(),
	name: z.string(),
});

const agendaCompanyOutput = z.object({
	id: z.string(),
	name: z.string(),
	iconUrl: z.string().nullable(),
	iconDarkUrl: z.string().nullable(),
	iconTone: z.string().nullable(),
});

const agendaAttendeeOutput = z.object({
	email: z.string(),
	name: z.string().nullable(),
	responseStatus: z.string().nullable(),
});

export const agendaItemOutput = z.object({
	id: z.string(),
	kind: z.enum(["meeting", "task"]),
	source: z.enum(["calendar", "crm"]),
	title: z.string(),
	startsAt: z.string(),
	endsAt: z.string().nullable(),
	isAllDay: z.boolean(),
	location: z.string().nullable(),
	conferenceUrl: z.string().nullable(),
	done: z.boolean(),
	record: agendaRecordOutput.nullable(),
	company: agendaCompanyOutput.nullable(),
	attendees: z.array(agendaAttendeeOutput),
	attendeeCount: z.number().int(),
});

export type AgendaItem = z.infer<typeof agendaItemOutput>;

export const agendaRangeOutput = z.object({
	items: z.array(agendaItemOutput),
	calendarConnected: z.boolean(),
	truncated: z.boolean(),
});
