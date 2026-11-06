import { z } from "zod";
import { MEETING_KINDS, MEETINGS } from "./meetings.config";

export const scheduleMeetingInput = z.object({
	dealId: z.string().min(1),
	kind: z.enum(MEETING_KINDS),
	title: z.string().trim().min(1).max(MEETINGS.title.maxLength),
	startsAt: z.iso.datetime({ offset: true }),
	durationMinutes: z
		.number()
		.int()
		.min(MEETINGS.duration.minMinutes)
		.max(MEETINGS.duration.maxMinutes),
	timeZone: z.string().trim().min(1).max(MEETINGS.timeZone.maxLength),
	guestEmail: z.union([z.email(), z.literal("")]).optional(),
	withMeet: z.boolean(),
	notes: z.string().trim().max(MEETINGS.notes.maxLength).optional(),
});

export const dealMeetingsInput = z.object({
	dealId: z.string().min(1),
});

export const meetingOutput = z.object({
	id: z.string(),
	title: z.string().nullable(),
	startsAt: z.string(),
	endsAt: z.string(),
	conferenceUrl: z.string().nullable(),
	kind: z.enum(MEETING_KINDS).nullable(),
});

export const dealMeetingsOutput = z.object({
	canSchedule: z.boolean(),
	suggestedGuest: z.string().nullable(),
	meetings: z.array(meetingOutput),
});

export const scheduleMeetingOutput = z.object({
	meeting: meetingOutput,
	stage: z.string(),
	stageChanged: z.boolean(),
});

export type ScheduleMeetingInput = z.infer<typeof scheduleMeetingInput>;
export type MeetingOutput = z.infer<typeof meetingOutput>;
