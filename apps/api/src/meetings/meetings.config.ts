import { DealStage } from "@crm/db";

const MINUTE = 1;

export const MEETINGS = {
	kinds: {
		SCREENING: { stage: DealStage.SCREENING_BOOKED, label: "Triagem" },
		PROPOSAL: {
			stage: DealStage.PROPOSAL_MEETING,
			label: "Reunião de Proposta",
		},
	},
	duration: { minMinutes: 15 * MINUTE, maxMinutes: 240 * MINUTE },
	title: { maxLength: 200 },
	notes: { maxLength: 2000 },
	timeZone: { maxLength: 64 },
	screening: {
		booked: DealStage.SCREENING_BOOKED,
		done: DealStage.SCREENING_DONE,
	},
	completion: { maxDealsPerTick: 50 },
} as const;

export const MEETING_KINDS = ["SCREENING", "PROPOSAL"] as const;

export type MeetingKind = (typeof MEETING_KINDS)[number];
