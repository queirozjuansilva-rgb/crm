export const PROJECT_STATUS = {
	ACTIVE: { label: "Em andamento", className: "bg-ring/15 text-ring" },
	PAUSED: {
		label: "Pausado",
		className: "bg-foreground/8 text-muted-foreground",
	},
	DONE: { label: "Concluído", className: "bg-success/15 text-success" },
} as const;

export type ProjectStatusKey = keyof typeof PROJECT_STATUS;

export const TASK_LANES = [
	{ id: "TODO", title: "A fazer", accent: "var(--stage-1)" },
	{ id: "DOING", title: "Fazendo", accent: "var(--stage-3)" },
	{ id: "DONE", title: "Feito", accent: "var(--chart-2)" },
] as const;

export type TaskStatusKey = (typeof TASK_LANES)[number]["id"];

export const PROJECT_TEMPLATE = [
	"Reunião de kickoff",
	"Levantar acessos e materiais",
	"Diagnóstico inicial",
	"Plano de ação",
	"Apresentar resultados",
];

const shortDate = new Intl.DateTimeFormat("pt-BR", {
	day: "2-digit",
	month: "short",
	timeZone: "UTC",
});

export function formatDue(value: string): string {
	return shortDate.format(new Date(value)).replace(".", "");
}

export function isOverdue(value: string | null, done: boolean): boolean {
	if (!value || done) return false;
	const due = new Date(value);
	const today = new Date();
	return (
		Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()) <
		Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
	);
}
