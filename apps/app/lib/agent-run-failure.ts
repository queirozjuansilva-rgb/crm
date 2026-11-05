type RunFailureReasons = Record<string, string>;

const REASONS: RunFailureReasons = {
	ACTION_NOT_PERFORMED:
		"O agente terminou sem fazer o que deveria. Abra a execução para ver qual passo ele pulou.",
	NO_EXECUTOR:
		"Este agente pede algo que o CRM ainda não faz. Ele precisa ser refeito.",
	DEPENDENCY_UNAVAILABLE:
		"A connection this agent needs is missing. Reconnect it, then run again.",
	NOT_AUTHORISED: "A conexão recusou. O acesso foi revogado ou reduzido.",
	PROVIDER_ERROR: "O serviço externo recusou. Em geral vale tentar de novo.",
	NEVER_SETTLED:
		"O agente parou sem informar resultado. Nada ficou pela metade.",
	TURN_FAILED: "O modelo falhou no meio desta execução.",
	DELIVERY_FAILED: "A execução não chegou ao agente.",
	DELIVERY_EXHAUSTED:
		"Não chegou ao agente depois de três tentativas. Nada foi executado.",
	ACTION_REJECTED: "O agente tentou a ação e o CRM recusou. Nada foi gravado.",
	AGENT_UNAVAILABLE:
		"O agente estava pausado ou arquivado quando a execução começou.",
	AGENT_DELETED: "O agente foi excluído antes de a execução terminar.",
	CANCELLED_BY_USER: "Alguém parou esta execução.",
	RUN_TIMED_OUT:
		"Esta execução demorou demais e foi parada para liberar as próximas.",
};

export function runFailureReason(
	code: string | null | undefined,
	message: string | null | undefined,
): string {
	const known = code ? REASONS[code] : undefined;
	if (known) return known;
	if (message?.trim()) return message.trim();
	return "Esta execução falhou sem dizer o motivo.";
}
