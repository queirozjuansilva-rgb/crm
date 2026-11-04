import { DealStage } from "./generated/prisma/enums";

export const OPEN_DEAL_STAGES = [
	DealStage.BUILDING_SNIPER,
	DealStage.SNIPER_READY,
	DealStage.SNIPER_SENT,
	DealStage.ENGAGED_CONVERSATION,
	DealStage.SCREENING_BOOKED,
	DealStage.SCREENING_DONE,
	DealStage.PROPOSAL_MEETING,
	DealStage.NEGOTIATION,
] as const;

export const CLOSED_DEAL_STAGES = [
	DealStage.CLOSED_WON,
	DealStage.CLOSED_LOST,
	DealStage.UNQUALIFIED_TO_BUY,
] as const;

export const LOSING_DEAL_STAGES = [
	DealStage.CLOSED_LOST,
	DealStage.UNQUALIFIED_TO_BUY,
] as const;

const CLOSED = new Set<DealStage>(CLOSED_DEAL_STAGES);

export function isClosedStage(stage: DealStage): boolean {
	return CLOSED.has(stage);
}
