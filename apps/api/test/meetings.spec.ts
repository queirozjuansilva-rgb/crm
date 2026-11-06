import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import { AgentTriggerService } from "../src/agent/agent-trigger.service";
import { ActivityStampService } from "../src/crm/activity-stamp.service";
import { ConversionService } from "../src/currency/conversion.service";
import { DealsService } from "../src/deals/deals.service";
import { FieldsService } from "../src/fields/fields.service";
import type {
	CalendarClient,
	GoogleEvent,
	NewGoogleEvent,
} from "../src/google/calendar.client";
import type { MailboxResult } from "../src/mailbox/mailbox-api.client";
import type { MailboxTokenService } from "../src/mailbox/mailbox-token.service";
import { advancesTo, MeetingsService } from "../src/meetings/meetings.service";

const suffix = crypto.randomUUID();
const ownerId = `meeting-owner-${suffix}`;
const HOUR_MS = 60 * 60 * 1000;

const agent = new AgentTriggerService(db);
const stamp = new ActivityStampService(db);
const deals = new DealsService(
	db,
	agent,
	stamp,
	new ConversionService(db),
	new FieldsService(db, agent),
);

const sent: NewGoogleEvent[] = [];

function calendarAnswering(
	result: (event: NewGoogleEvent) => MailboxResult<GoogleEvent>,
): CalendarClient {
	return {
		insertEvent: async (_token: string, event: NewGoogleEvent) => {
			sent.push(event);
			return result(event);
		},
	} as unknown as CalendarClient;
}

function tokens(scopes: string[]): MailboxTokenService {
	return {
		grantedScopes: async () => new Set(scopes),
		accessTokenFor: async () => ({ outcome: "ok", accessToken: "token" }),
	} as unknown as MailboxTokenService;
}

const WRITE_SCOPE = "https://www.googleapis.com/auth/calendar.events";

const created = (event: NewGoogleEvent): MailboxResult<GoogleEvent> => ({
	outcome: "ok",
	data: {
		id: `google-${crypto.randomUUID()}`,
		iCalUID: `${crypto.randomUUID()}@google.com`,
		status: "confirmed",
		hangoutLink: event.conferenceData
			? "https://meet.google.com/abc"
			: undefined,
		organizer: { email: "juan@example.test" },
	},
});

const companies: string[] = [];

async function deal(stage: Parameters<typeof deals.setStage>[0]["stage"]) {
	const company = await db.company.create({
		data: { name: `Meeting Co ${suffix}`, ownerId },
		select: { id: true },
	});
	companies.push(company.id);
	const contact = await db.contact.create({
		data: {
			firstName: "Ana",
			email: `ana-${crypto.randomUUID()}@example.test`,
			companyId: company.id,
		},
		select: { id: true },
	});
	return db.deal.create({
		data: {
			name: "Meeting deal",
			companyId: company.id,
			ownerId,
			stage,
			contacts: { create: { contactId: contact.id } },
		},
		select: { id: true },
	});
}

beforeAll(async () => {
	delete process.env.AGENT_BRIDGE_SECRET;
	await db.user.create({
		data: {
			id: ownerId,
			name: "Meeting Owner",
			email: `${ownerId}@example.test`,
		},
	});
});

afterAll(async () => {
	const deals = await db.deal.findMany({
		where: { companyId: { in: companies } },
		select: { id: true },
	});
	await db.agentTask.deleteMany({
		where: {
			OR: [
				{ companyId: { in: companies } },
				{ dealId: { in: deals.map((row) => row.id) } },
			],
		},
	});
	await db.activity.deleteMany({ where: { createdById: ownerId } });
	await db.calendarEvent.deleteMany({ where: { syncedByUserId: ownerId } });
	await db.contact.deleteMany({ where: { companyId: { in: companies } } });
	await db.company.deleteMany({ where: { id: { in: companies } } });
	await db.user.deleteMany({ where: { id: ownerId } });
});

describe("advancesTo", () => {
	it("moves a deal forward and never back", () => {
		expect(advancesTo("SNIPER_SENT", "SCREENING_BOOKED")).toBe(true);
		expect(advancesTo("PROPOSAL_MEETING", "SCREENING_BOOKED")).toBe(false);
		expect(advancesTo("SCREENING_BOOKED", "SCREENING_BOOKED")).toBe(false);
	});

	it("reopens a remarketing deal and leaves a sale alone", () => {
		expect(advancesTo("CLOSED_LOST", "SCREENING_BOOKED")).toBe(true);
		expect(advancesTo("CLOSED_WON", "PROPOSAL_MEETING")).toBe(false);
	});
});

describe("MeetingsService.schedule", () => {
	it("creates the event, links it to the deal and books the screening", async () => {
		const { id } = await deal("SNIPER_SENT");
		const meetings = new MeetingsService(
			db,
			calendarAnswering(created),
			tokens([WRITE_SCOPE]),
			deals,
		);

		const result = await meetings.schedule(
			{
				dealId: id,
				kind: "SCREENING",
				title: "Triagem — Meeting Co",
				startsAt: new Date(Date.now() + 24 * HOUR_MS).toISOString(),
				durationMinutes: 30,
				timeZone: "America/Fortaleza",
				guestEmail: "cliente@example.test",
				withMeet: true,
			},
			ownerId,
		);

		expect(result.stage).toBe("SCREENING_BOOKED");
		expect(result.stageChanged).toBe(true);
		expect(result.meeting.kind).toBe("SCREENING");
		expect(result.meeting.conferenceUrl).toBe("https://meet.google.com/abc");
		expect(sent.at(-1)?.attendees).toEqual([{ email: "cliente@example.test" }]);

		const listed = await meetings.forDeal(id, ownerId);
		expect(listed.canSchedule).toBe(true);
		expect(listed.meetings).toHaveLength(1);

		const activity = await db.activity.findFirst({
			where: { dealId: id, type: "MEETING" },
			select: { subject: true },
		});
		expect(activity?.subject).toBe("Triagem — Meeting Co");
	});

	it("refuses without the calendar write grant", async () => {
		const { id } = await deal("SNIPER_SENT");
		const meetings = new MeetingsService(
			db,
			calendarAnswering(created),
			tokens(["https://www.googleapis.com/auth/calendar.readonly"]),
			deals,
		);

		await expect(
			meetings.schedule(
				{
					dealId: id,
					kind: "SCREENING",
					title: "Triagem",
					startsAt: new Date().toISOString(),
					durationMinutes: 30,
					timeZone: "America/Fortaleza",
					withMeet: false,
				},
				ownerId,
			),
		).rejects.toThrow("Conecte o Google");
	});

	it("keeps the stage when Google refuses the event", async () => {
		const { id } = await deal("SNIPER_SENT");
		const meetings = new MeetingsService(
			db,
			calendarAnswering(() => ({
				outcome: "failed",
				reason: "Invalid start time.",
				retryable: false,
			})),
			tokens([WRITE_SCOPE]),
			deals,
		);

		await expect(
			meetings.schedule(
				{
					dealId: id,
					kind: "PROPOSAL",
					title: "Proposta",
					startsAt: new Date().toISOString(),
					durationMinutes: 60,
					timeZone: "America/Fortaleza",
					withMeet: true,
				},
				ownerId,
			),
		).rejects.toThrow("Invalid start time.");

		const after = await db.deal.findUnique({
			where: { id },
			select: { stage: true },
		});
		expect(after?.stage).toBe("SNIPER_SENT");
	});
});

describe("MeetingsService.completeEndedScreenings", () => {
	const meetings = new MeetingsService(
		db,
		calendarAnswering(created),
		tokens([WRITE_SCOPE]),
		deals,
	);

	async function screening(dealId: string, endsAt: Date) {
		await db.calendarEvent.create({
			data: {
				iCalUid: `${crypto.randomUUID()}@google.com`,
				originalStartTime: new Date(endsAt.getTime() - HOUR_MS),
				startsAt: new Date(endsAt.getTime() - HOUR_MS),
				endsAt,
				status: "confirmed",
				dealId,
				dealStage: "SCREENING_BOOKED",
				syncedByUserId: ownerId,
			},
		});
	}

	it("moves a deal whose screening ended to Triagem Feita", async () => {
		const { id } = await deal("SCREENING_BOOKED");
		await screening(id, new Date(Date.now() - HOUR_MS));

		await meetings.completeEndedScreenings(new Date());

		const after = await db.deal.findUnique({
			where: { id },
			select: { stage: true },
		});
		expect(after?.stage).toBe("SCREENING_DONE");
	});

	it("waits while a rescheduled screening is still ahead", async () => {
		const { id } = await deal("SCREENING_BOOKED");
		await screening(id, new Date(Date.now() - HOUR_MS));
		await screening(id, new Date(Date.now() + 2 * HOUR_MS));

		await meetings.completeEndedScreenings(new Date());

		const after = await db.deal.findUnique({
			where: { id },
			select: { stage: true },
		});
		expect(after?.stage).toBe("SCREENING_BOOKED");
	});
});
