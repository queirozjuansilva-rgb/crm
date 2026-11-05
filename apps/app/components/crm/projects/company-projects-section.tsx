"use client";

import { useQuery } from "@tanstack/react-query";
import { DetailSheetSection } from "@/components/detail-sheet";
import { useTRPC } from "@/lib/trpc/client";
import { CreateProjectSheet } from "./create-project-sheet";
import { ProjectCard } from "./project-card";

export function CompanyProjectsSection({ companyId }: { companyId: string }) {
	const trpc = useTRPC();
	const projects = useQuery(
		trpc.projects.list.queryOptions({ filter: "all", companyId }),
	);
	const rows = projects.data?.rows ?? [];

	return (
		<DetailSheetSection
			title={rows.length > 0 ? `Projetos · ${rows.length}` : "Projetos"}
			action={<CreateProjectSheet companyId={companyId} size="xs" />}
		>
			{rows.length === 0 ? (
				<p className="rounded-xl border border-dashed px-4 py-5 text-center text-muted-foreground text-xs">
					Nenhum projeto para este cliente ainda.
				</p>
			) : (
				<ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{rows.map((project) => (
						<li key={project.id}>
							<ProjectCard project={project} compact />
						</li>
					))}
				</ul>
			)}
		</DetailSheetSection>
	);
}
