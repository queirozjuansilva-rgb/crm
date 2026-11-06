import { CALENDAR_SCOPE, GOOGLE_PROVIDER_ID } from "@crm/auth/scopes";
import { ActivityType, type Db, DealStage } from "@crm/db";
import {
	isClosedStage,
	LOSING_DEAL_STAGES,
	OPEN_DEAL_STAGES,
} from "@crm/db/deal-stage";
import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import { DealsService } from "../deals/deals.service";
import {
	CalendarClient,
	conferenceUrl,
	type NewGoogleEvent,
} from "../google/calendar.client";
import { MailboxTokenService } from "../mailbox/mailbox-token.service";
import { MEETING_KINDS, MEETINGS, type MeetingKind } from "./meetings.config";
import type { MeetingOutput, ScheduleMeetingInput } from "./meetings.contracts";

const MINUTE_MS = 60_000;

const LOSING = new Set<DealStage>(LOSING_DEAL_STAGES);

const OPEN_ORDER = new Map<DealStage, number>(
	OPEN_DEAL_STAGES.map((stage, index) => [stage, index]),
);

const KIND_BY_STAGE = new Map<DealStage, MeetingKind>(
	MEETING_KINDS.map((kind) => [MEETINGS.kinds[kind].stage, kind]),
);

const MEETING_SELECT = {
	id: true,
	title: true,
	startsAt: true,
	endsAt: true,
	conferenceUrl: true,
	dealStage: true,
} as const;

type MeetingRow = {
	id: string;
	title: string | null;
	startsAt: Date;
	endsAt: Date;
	conferenceUrl: string | null;
	dealStage: DealStage | null;
};

export function advancesTo(current: DealStage, target: DealStage): boolean {
	if (current === target) return false;
	if (LOSING.has(current)) return true;
	if (isClosedStage(current)) return false;

	const from = OPEN_ORDER.get(current);
	const to = OPEN_ORDER.get(target);
	return from !== undefined && to !== undefined && from < to;
}

@Injectable()
export class MeetingsService {
	private readonly logger = new Logger(MeetingsService.name);

	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly calendar: CalendarClient,
		private readonly tokens: MailboxTokenService,
		private readonly deals: DealsService,
	) {}

	async forDeal(dealId: string, userId: string) {
		const [rows, guests, canSchedule] = await Promise.all([
			this.db.calendarEvent.findMany({
				where: { dealId },
				orderBy: { startsAt: "asc" },
				select: MEETING_SELECT,
			}),
			this.db.dealContact.findMany({
				where: { dealId, contact: { email: { not: null } } },
				select: { contact: { select: { email: true } } },
				take: 1,
			}),
			this.canSchedule(userId),
		]);

		return {
			canSchedule,
			suggestedGuest: guests[0]?.contact.email ?? null,
			meetings: rows.map(serialize),
		};
	}

	async schedule(input: ScheduleMeetingInput, userId: string) {
		const deal = await this.db.deal.findUnique({
			where: { id: input.dealId },
			select: {
				id: true,
				stage: true,
				companyId: true,
				company: { select: { primaryContactId: true } },
				contacts: {
					select: { contact: { select: { id: true, email: true } } },
				},
			},
		});

		if (!deal) {
			throw new NotFoundException("Este negócio não existe mais.");
		}

		if (!(await this.canSchedule(userId))) {
			throw new BadRequestException(
				"Conecte o Google em Configurações → Conexões para agendar pelo CRM.",
			);
		}

		const token = await this.tokens.accessTokenFor(userId, "calendar");
		if (token.outcome !== "ok") {
			throw new BadRequestException(
				"O acesso ao Google expirou. Reconecte o Google em Configurações → Conexões.",
			);
		}

		const startsAt = new Date(input.startsAt);
		const endsAt = new Date(
			startsAt.getTime() + input.durationMinutes * MINUTE_MS,
		);
		const guest = input.guestEmail?.trim().toLowerCase() || null;

		const event: NewGoogleEvent = {
			summary: input.title,
			description: input.notes || undefined,
			start: { dateTime: startsAt.toISOString(), timeZone: input.timeZone },
			end: { dateTime: endsAt.toISOString(), timeZone: input.timeZone },
			attendees: guest ? [{ email: guest }] : undefined,
			conferenceData: input.withMeet
				? {
						createRequest: {
							requestId: crypto.randomUUID(),
							conferenceSolutionKey: { type: "hangoutsMeet" },
						},
					}
				: undefined,
		};

		const created = await this.calendar.insertEvent(token.accessToken, event);

		if (created.outcome === "unauthorized") {
			throw new BadRequestException(
				"O Google recusou o acesso. Reconecte o Google em Configurações → Conexões.",
			);
		}

		if (created.outcome !== "ok") {
			this.logger.warn({
				message: "Calendar event was not created",
				dealId: deal.id,
				outcome: created.outcome,
				reason: created.reason,
			});
			throw new BadRequestException(
				`O Google não criou o evento: ${created.reason}`,
			);
		}

		const google = created.data;
		if (!google.iCalUID) {
			throw new BadRequestException(
				"O Google criou o evento sem identificador. Confira sua agenda.",
			);
		}

		const target = MEETINGS.kinds[input.kind].stage;
		const contactId =
			deal.contacts.find((row) => row.contact.email?.toLowerCase() === guest)
				?.contact.id ??
			deal.contacts[0]?.contact.id ??
			deal.company.primaryContactId ??
			null;

		const fields = {
			title: input.title,
			description: input.notes || null,
			conferenceUrl: conferenceUrl(google),
			startsAt,
			endsAt,
			isAllDay: false,
			status: google.status ?? "confirmed",
			organizerEmail: google.organizer?.email?.toLowerCase() ?? null,
			companyId: deal.companyId,
			contactId,
			dealId: deal.id,
			dealStage: target,
		};

		const row = await this.db.calendarEvent.upsert({
			where: {
				iCalUid_originalStartTime: {
					iCalUid: google.iCalUID,
					originalStartTime: startsAt,
				},
			},
			create: {
				...fields,
				iCalUid: google.iCalUID,
				originalStartTime: startsAt,
				syncedByUserId: userId,
				googleEventId: google.id ?? null,
			},
			update: fields,
			select: MEETING_SELECT,
		});

		await this.db.activity.upsert({
			where: { calendarEventId: row.id },
			create: {
				type: ActivityType.MEETING,
				subject: input.title,
				occurredAt: startsAt,
				companyId: deal.companyId,
				contactId,
				dealId: deal.id,
				createdById: userId,
				calendarEventId: row.id,
				meta: { synced: true, source: "calendar" },
			},
			update: {
				subject: input.title,
				occurredAt: startsAt,
				dealId: deal.id,
			},
		});

		const moved = advancesTo(deal.stage, target)
			? await this.deals.setStage({ id: deal.id, stage: target }, userId)
			: null;

		this.logger.log({
			message: "Meeting scheduled from a deal",
			dealId: deal.id,
			kind: input.kind,
			stageChanged: Boolean(moved?.changed),
		});

		return {
			meeting: serialize(row),
			stage: moved?.stage ?? deal.stage,
			stageChanged: Boolean(moved?.changed),
		};
	}

	async completeEndedScreenings(now: Date): Promise<number> {
		const { booked, done } = MEETINGS.screening;
		const live = { status: { not: "cancelled" } };

		const deals = await this.db.deal.findMany({
			where: {
				stage: booked,
				archivedAt: null,
				calendarEvents: {
					some: { ...live, dealStage: booked, endsAt: { lte: now } },
					none: { ...live, dealStage: booked, endsAt: { gt: now } },
				},
			},
			select: {
				id: true,
				ownerId: true,
				calendarEvents: {
					where: { ...live, dealStage: booked },
					orderBy: { endsAt: "desc" },
					take: 1,
					select: { syncedByUserId: true },
				},
			},
			take: MEETINGS.completion.maxDealsPerTick,
		});

		let moved = 0;
		for (const deal of deals) {
			const actor = deal.calendarEvents[0]?.syncedByUserId ?? deal.ownerId;
			try {
				const result = await this.deals.setStage(
					{ id: deal.id, stage: done },
					actor,
				);
				if (result.changed) moved += 1;
			} catch (error) {
				this.logger.warn({
					message: "Ended screening did not move the deal",
					dealId: deal.id,
					reason: error instanceof Error ? error.message : String(error),
				});
			}
		}

		if (moved > 0) {
			this.logger.log({ message: "Ended screenings moved", count: moved });
		}

		return moved;
	}

	private async canSchedule(userId: string): Promise<boolean> {
		const scopes = await this.tokens.grantedScopes(userId, GOOGLE_PROVIDER_ID);
		return scopes.has(CALENDAR_SCOPE);
	}
}

function serialize(row: MeetingRow): MeetingOutput {
	return {
		id: row.id,
		title: row.title,
		startsAt: row.startsAt.toISOString(),
		endsAt: row.endsAt.toISOString(),
		conferenceUrl: row.conferenceUrl,
		kind: row.dealStage ? (KIND_BY_STAGE.get(row.dealStage) ?? null) : null,
	};
}
