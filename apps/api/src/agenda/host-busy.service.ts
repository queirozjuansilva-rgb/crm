import { Injectable, Logger } from "@nestjs/common";
import { ACCESS } from "../access/access-config";
import {
	CalendarClient,
	eventTime,
	type GoogleEvent,
} from "../google/calendar.client";
import { MailboxTokenService } from "../mailbox/mailbox-token.service";

export type BusyInterval = {
	googleEventId: string | null;
	startsAt: Date;
	endsAt: Date;
	isAllDay: boolean;
};

@Injectable()
export class HostBusyService {
	private readonly logger = new Logger(HostBusyService.name);

	constructor(
		private readonly calendar: CalendarClient,
		private readonly tokens: MailboxTokenService,
	) {}

	async intervals(
		hostUserId: string,
		from: Date,
		to: Date,
	): Promise<BusyInterval[] | null> {
		const token = await this.tokens.accessTokenFor(hostUserId, "calendar");
		if (token.outcome !== "ok") return null;

		const busy: BusyInterval[] = [];
		let pageToken: string | undefined;

		for (let page = 0; page < ACCESS.sdr.busyPages; page += 1) {
			const result = await this.calendar.listEvents(token.accessToken, {
				timeMin: from.toISOString(),
				timeMax: to.toISOString(),
				pageToken,
			});

			if (result.outcome !== "ok") {
				this.logger.warn({
					message: "Host calendar could not be read for busy time",
					outcome: result.outcome,
				});
				return null;
			}

			for (const event of result.data.items ?? []) {
				const interval = toBusy(event);
				if (interval) busy.push(interval);
			}

			pageToken = result.data.nextPageToken;
			if (!pageToken) break;
		}

		return busy;
	}
}

function toBusy(event: GoogleEvent): BusyInterval | null {
	if (event.status === "cancelled" || event.transparency === "transparent") {
		return null;
	}
	if (event.attendees?.some((a) => a.self && a.responseStatus === "declined")) {
		return null;
	}

	const start = eventTime(event.start);
	const end = eventTime(event.end);
	if (!start || !end) return null;

	return {
		googleEventId: event.id ?? null,
		startsAt: start.at,
		endsAt: end.at,
		isAllDay: start.isAllDay,
	};
}
