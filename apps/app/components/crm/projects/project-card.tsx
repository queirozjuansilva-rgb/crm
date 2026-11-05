"use client";

import {
	EntityLogo,
	type EntityLogoTone,
} from "@crm/ui/components/entity-logo";
import { cn } from "@crm/ui/lib/utils";
import Link from "next/link";
import { OwnerCell } from "@/components/crm/owner-cell";
import type { RouterOutputs } from "@/lib/trpc/types";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";
import { formatDue, isOverdue, PROJECT_STATUS } from "./project-meta";

type Project = RouterOutputs["projects"]["list"]["rows"][number];

export function ProjectCard({
	project,
	compact = false,
}: {
	project: Project;
	compact?: boolean;
}) {
	const workspaceUrl = useWorkspaceUrl();
	const status = PROJECT_STATUS[project.status];
	const { total, done, doing, overdue } = project.taskCounts;
	const ratio = total === 0 ? 0 : done / total;
	const late = isOverdue(project.dueDate, project.status === "DONE");

	return (
		<Link
			href={workspaceUrl(`/projects/${project.id}`)}
			className={cn(
				"glass-surface lift reveal flex h-full flex-col gap-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
				compact ? "p-4" : "p-5",
			)}
		>
			<div className="flex items-start gap-3">
				<EntityLogo
					src={project.company.iconUrl}
					darkSrc={project.company.iconDarkUrl}
					tone={project.company.iconTone as EntityLogoTone | null}
					name={project.company.name}
					size={compact ? "lg" : "xl"}
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="truncate font-medium text-[15px]">
						{project.name}
					</span>
					<span className="truncate text-muted-foreground text-xs">
						{project.company.name}
					</span>
				</div>
				<span
					className={cn(
						"shrink-0 rounded-full px-2.5 py-0.5 font-medium text-[11px]",
						status.className,
					)}
				>
					{status.label}
				</span>
			</div>

			<div className="flex flex-col gap-1.5">
				<div className="flex items-baseline justify-between font-mono text-[11px] text-muted-foreground">
					<span>
						{done}/{total} {total === 1 ? "tarefa" : "tarefas"}
					</span>
					<span className="text-foreground">{Math.round(ratio * 100)}%</span>
				</div>
				<div className="h-1.5 overflow-hidden rounded-full bg-foreground/8">
					<div
						className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
						style={{ width: `${ratio * 100}%` }}
					/>
				</div>
			</div>

			<div className="mt-auto flex items-center gap-3 text-muted-foreground text-xs">
				<span>{doing} fazendo</span>
				{overdue > 0 ? (
					<span className="text-chart-4">
						{overdue === 1 ? "1 atrasada" : `${overdue} atrasadas`}
					</span>
				) : null}
				<span className="ml-auto flex items-center gap-2">
					{project.dueDate ? (
						<span className={cn(late && "text-chart-4")}>
							prazo {formatDue(project.dueDate)}
						</span>
					) : null}
					<OwnerCell
						owner={project.owner ? { ...project.owner, email: "" } : null}
						compact
					/>
				</span>
			</div>
		</Link>
	);
}
