"use client";

import { Spinner } from "@crm/ui/components/spinner";
import { ToggleGroup, ToggleGroupItem } from "@crm/ui/components/toggle-group";
import { useQuery } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { CreateProjectSheet } from "@/components/crm/projects/create-project-sheet";
import { ProjectCard } from "@/components/crm/projects/project-card";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { useTRPC } from "@/lib/trpc/client";

const FILTERS = ["open", "done", "all"] as const;

const FILTER_LABELS: Record<(typeof FILTERS)[number], string> = {
	open: "Em andamento",
	done: "Concluídos",
	all: "Todos",
};

const params = {
	[SEARCH_PARAM.projects.filter]:
		parseAsStringLiteral(FILTERS).withDefault("open"),
};

export function ProjectsView() {
	const trpc = useTRPC();
	const [state, setState] = useQueryStates(params);
	const filter = state[SEARCH_PARAM.projects.filter];
	const projects = useQuery({
		...trpc.projects.list.queryOptions({ filter }),
		placeholderData: (previous) => previous,
	});
	const rows = projects.data?.rows ?? [];

	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-wrap items-center gap-3">
				<ToggleGroup
					type="single"
					variant="outline"
					size="sm"
					spacing={0}
					value={filter}
					onValueChange={(next) => {
						const value = FILTERS.find((item) => item === next);
						if (value) void setState({ [SEARCH_PARAM.projects.filter]: value });
					}}
					aria-label="Quais projetos mostrar"
				>
					{FILTERS.map((value) => (
						<ToggleGroupItem key={value} value={value}>
							{FILTER_LABELS[value]}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				{projects.isFetching ? (
					<Spinner className="text-muted-foreground" />
				) : null}
				<div className="ml-auto">
					<CreateProjectSheet />
				</div>
			</div>

			{projects.isPending ? (
				<div className="flex justify-center py-24">
					<Spinner size="lg" className="text-foreground" />
				</div>
			) : rows.length === 0 ? (
				<div className="glass-surface flex flex-col items-center gap-2 px-6 py-14 text-center">
					<span className="font-medium">Nenhum projeto aqui ainda</span>
					<span className="text-muted-foreground text-sm">
						Crie um projeto para um cliente e organize as tarefas do time.
					</span>
				</div>
			) : (
				<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{rows.map((project) => (
						<li key={project.id}>
							<ProjectCard project={project} />
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
