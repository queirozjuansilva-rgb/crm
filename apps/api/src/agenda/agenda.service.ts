import type { Db } from "@crm/db";
import { Injectable } from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import type { AgendaItem, AgendaRangeInput } from "./agenda.contracts";
import { AGENDA } from "./agenda-config";

const COMPANY_SELECT = {
	id: true,
	name: true,
	iconUrl: true,
	iconDarkUrl: true,
	iconTone: true,
} as const;

type Person = { id: string; firstName: string; lastName: string | null };

function personName(person: Person): string {
	return [person.firstName, person.lastName].filter(Boolean).join(" ");
}

@Injectable()
export class AgendaService {
	constructor(@InjectDatabase() private readonly db: Db) {}

	async range(input: AgendaRangeInput, userId: string) {
		const from = new Date(input.from);
		const to = new Date(input.to);

		const [events, activities, calendarConnected] = await Promise.all([
			this.db.calendarEvent.findMany({
				where: {
					startsAt: { lt: to },
					endsAt: { gt: from },
					status: { not: "cancelled" },
				},
				orderBy: { startsAt: "asc" },
				take: AGENDA.maxItems + 1,
				select: {
					id: true,
					title: true,
					location: true,
					conferenceUrl: true,
					startsAt: true,
					endsAt: true,
					isAllDay: true,
					company: { select: COMPANY_SELECT },
					contact: { select: { id: true, firstName: true, lastName: true } },
					attendees: {
						where: { isOrganizer: false },
						orderBy: { email: "asc" },
						select: { email: true, name: true, responseStatus: true },
					},
				},
			}),
			this.db.activity.findMany({
				where: {
					OR: [
						{ type: "TASK", dueAt: { gte: from, lt: to } },
						{
							type: "MEETING",
							calendarEventId: null,
							occurredAt: { gte: from, lt: to },
						},
					],
				},
				orderBy: [{ dueAt: "asc" }, { occurredAt: "asc" }],
				take: AGENDA.maxItems + 1,
				select: {
					id: true,
					type: true,
					subject: true,
					body: true,
					dueAt: true,
					occurredAt: true,
					completedAt: true,
					company: { select: COMPANY_SELECT },
					contact: { select: { id: true, firstName: true, lastName: true } },
					deal: {
						select: {
							id: true,
							name: true,
							company: { select: COMPANY_SELECT },
						},
					},
				},
			}),
			this.db.mailboxSync.count({
				where: { userId, source: "calendar" },
			}),
		]);

		const meetings: AgendaItem[] = events.map((event) => ({
			id: event.id,
			kind: "meeting",
			source: "calendar",
			title: event.title?.trim() || "Reunião sem título",
			startsAt: event.startsAt.toISOString(),
			endsAt: event.endsAt.toISOString(),
			isAllDay: event.isAllDay,
			location: event.location,
			conferenceUrl: event.conferenceUrl,
			done: false,
			record: event.contact
				? {
						kind: "contact",
						id: event.contact.id,
						name: personName(event.contact),
					}
				: event.company
					? { kind: "company", id: event.company.id, name: event.company.name }
					: null,
			company: event.company,
			attendees: event.attendees.slice(0, AGENDA.attendeesShown),
			attendeeCount: event.attendees.length,
		}));

		const tasks: AgendaItem[] = activities.flatMap((activity) => {
			const at =
				activity.type === "TASK" ? activity.dueAt : activity.occurredAt;
			if (!at) return [];
			const company = activity.company ?? activity.deal?.company ?? null;
			const record = activity.deal
				? {
						kind: "deal" as const,
						id: activity.deal.id,
						name: activity.deal.name,
					}
				: activity.contact
					? {
							kind: "contact" as const,
							id: activity.contact.id,
							name: personName(activity.contact),
						}
					: activity.company
						? {
								kind: "company" as const,
								id: activity.company.id,
								name: activity.company.name,
							}
						: null;
			const fallback = activity.type === "TASK" ? "Tarefa" : "Reunião";
			return [
				{
					id: activity.id,
					kind: activity.type === "TASK" ? "task" : "meeting",
					source: "crm",
					title:
						activity.subject?.trim() ||
						activity.body?.trim().split("\n")[0]?.slice(0, 120) ||
						fallback,
					startsAt: at.toISOString(),
					endsAt: null,
					isAllDay: false,
					location: null,
					conferenceUrl: null,
					done: activity.completedAt !== null,
					record,
					company,
					attendees: [],
					attendeeCount: 0,
				},
			];
		});

		const items = [...meetings, ...tasks].sort((a, b) =>
			a.startsAt.localeCompare(b.startsAt),
		);

		return {
			items: items.slice(0, AGENDA.maxItems),
			calendarConnected: calendarConnected > 0,
			truncated:
				events.length > AGENDA.maxItems ||
				activities.length > AGENDA.maxItems ||
				items.length > AGENDA.maxItems,
		};
	}
}
