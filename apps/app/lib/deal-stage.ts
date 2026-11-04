import { DealStage } from "@crm/db/enums";
import type { StatusTone } from "@crm/ui/components/status-indicator";

const ORDER = [
	DealStage.BUILDING_SNIPER,
	DealStage.SNIPER_READY,
	DealStage.SNIPER_SENT,
	DealStage.ENGAGED_CONVERSATION,
	DealStage.SCREENING_BOOKED,
	DealStage.SCREENING_DONE,
	DealStage.PROPOSAL_MEETING,
	DealStage.NEGOTIATION,
	DealStage.CLOSED_WON,
	DealStage.CLOSED_LOST,
	DealStage.UNQUALIFIED_TO_BUY,
] as const;

type DealStagePresentation = Record<
	DealStage,
	{ label: string; tone: StatusTone }
>;

const PRESENTATION: DealStagePresentation = {
	BUILDING_SNIPER: { label: "Montando Sniper", tone: "neutral" },
	SNIPER_READY: { label: "Sniper Pronta", tone: "neutral" },
	SNIPER_SENT: { label: "Contato Sniper Disparada", tone: "info" },
	ENGAGED_CONVERSATION: { label: "Conversa Efetiva", tone: "info" },
	SCREENING_BOOKED: { label: "Triagem Marcada", tone: "info" },
	SCREENING_DONE: { label: "Triagem Feita", tone: "info" },
	PROPOSAL_MEETING: { label: "Reunião de Proposta", tone: "warning" },
	NEGOTIATION: { label: "Negociação", tone: "warning" },
	CLOSED_WON: { label: "Venda", tone: "success" },
	CLOSED_LOST: { label: "Remarketing/Follow-up", tone: "error" },
	UNQUALIFIED_TO_BUY: { label: "Desqualificado", tone: "neutral" },
};

export const OPEN_STAGES = ORDER.slice(0, 8) as readonly DealStage[];

export const LOSING_STAGES: readonly DealStage[] = [
	DealStage.CLOSED_LOST,
	DealStage.UNQUALIFIED_TO_BUY,
];

export const DEAL_STAGE_OPTIONS = ORDER.map((value) => ({
	value,
	label: PRESENTATION[value].label,
}));

const OPEN_STAGE_COLORS = [
	"var(--stage-1)",
	"color-mix(in oklab, var(--stage-1), var(--stage-2) 55%)",
	"var(--stage-2)",
	"color-mix(in oklab, var(--stage-2), var(--stage-3) 50%)",
	"var(--stage-3)",
	"color-mix(in oklab, var(--stage-3), var(--stage-4) 45%)",
	"color-mix(in oklab, var(--stage-3), var(--stage-4) 75%)",
	"var(--stage-4)",
] as const;

export function isClosedStage(stage: DealStage): boolean {
	return !OPEN_STAGES.includes(stage);
}

export function dealStageColor(stage: DealStage): string {
	return OPEN_STAGE_COLORS[OPEN_STAGES.indexOf(stage)] ?? "var(--chart-5)";
}

export function dealStageLabel(stage: DealStage): string {
	return PRESENTATION[stage].label;
}

export function dealStagePresentation(stage: DealStage) {
	return PRESENTATION[stage];
}
