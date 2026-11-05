import { MAX_ATTEMPTS, type TaskKind } from "@crm/db/agent-tasks";

export type EnrichmentQueueState = "running" | "queued" | "failed";

const STEPS = {
	brand: "Buscando o logo",
	portrait: "Buscando a foto",
	"meeting-prep": "Preparando a reunião",
	identify: "Lendo o perfil",
	profile: "Lendo o perfil",
	recheck: "Procurando novidades",
	"company-profile": "Lendo o site do cliente",
	"workspace-profile": "Lendo o site da Lugh",
	"field-backfill": "Preenchendo os campos vazios",
	"slack-people-match": "Vinculando pessoas no Slack",
	"slack-channel-join": "Entrando num canal do Slack",
	"agent-event": "Reagindo a uma mudança",
	"mcp-tool-discovery": "Lendo ferramentas da integração",
	"lead-alert": "Avisando no WhatsApp",
} satisfies Record<TaskKind, string>;

const STEP_BY_KIND = new Map<string, string>(Object.entries(STEPS));

const UNKNOWN_STEP = "Pesquisando";
const WAITING = "Na fila";
const GAVE_UP = "Não foi possível pesquisar";

const SECOND_MS = 1_000;
const DAY_MS = 24 * 60 * 60 * SECOND_MS;
const DAYS_IN_WEEK = 7;
const DAYS_IN_MONTH = 30;
const WEEKS_FROM = 14;
const MONTHS_FROM = 60;

const TODAY = "Hoje, mais tarde";
const TOMORROW = "Amanhã";

export function enrichmentStep(kind: string): string {
	return STEP_BY_KIND.get(kind) ?? UNKNOWN_STEP;
}

export function enrichmentQueueState(
	attempts: number,
	leasedUntil: Date | null,
	now: Date,
): EnrichmentQueueState {
	if (leasedUntil !== null && leasedUntil.getTime() > now.getTime()) {
		return "running";
	}

	return attempts >= MAX_ATTEMPTS ? "failed" : "queued";
}

export function enrichmentQueueLine(
	state: EnrichmentQueueState,
	kind: string,
): string {
	if (state === "queued") return WAITING;
	if (state === "failed") return GAVE_UP;

	return enrichmentStep(kind);
}

export function enrichmentDueLabel(dueAt: Date, now: Date): string {
	const ahead = dueAt.getTime() - now.getTime();
	if (ahead < DAY_MS) return TODAY;

	const days = Math.floor(ahead / DAY_MS);
	if (days === 1) return TOMORROW;
	if (days < WEEKS_FROM) return `Em ${days} dias`;
	if (days < MONTHS_FROM)
		return `Em ${Math.round(days / DAYS_IN_WEEK)} semanas`;

	return `Em ${Math.round(days / DAYS_IN_MONTH)} meses`;
}
