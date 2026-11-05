"use client";

import Add from "@carbon/icons-react/es/Add";
import ArrowLeft from "@carbon/icons-react/es/ArrowLeft";
import TrashCan from "@carbon/icons-react/es/TrashCan";
import { Button } from "@crm/ui/components/button";
import { DatePicker } from "@crm/ui/components/date-picker";
import {
	EntityLogo,
	type EntityLogoTone,
} from "@crm/ui/components/entity-logo";
import { Input } from "@crm/ui/components/input";
import { KanbanBoard, type KanbanColumn } from "@crm/ui/components/kanban";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import { Spinner } from "@crm/ui/components/spinner";
import { cn } from "@crm/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { OwnerCell } from "@/components/crm/owner-cell";
import {
	formatDue,
	isOverdue,
	PROJECT_STATUS,
	type ProjectStatusKey,
	TASK_LANES,
	type TaskStatusKey,
} from "@/components/crm/projects/project-meta";
import { TaskDialog } from "@/components/crm/projects/task-dialog";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";

type Task = RouterOutputs["projects"]["byId"]["tasks"][number];

function isTaskStatus(value: string): value is TaskStatusKey {
	return TASK_LANES.some((lane) => lane.id === value);
}

function isProjectStatus(value: string): value is ProjectStatusKey {
	return value in PROJECT_STATUS;
}

export function ProjectBoard({ projectId }: { projectId: string }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const router = useRouter();
	const workspaceUrl = useWorkspaceUrl();
	const openRecord = useOpenRecord();
	const [moved, setMoved] = useState<Record<string, TaskStatusKey>>({});
	const [title, setTitle] = useState("");
	const [due, setDue] = useState("");
	const [editing, setEditing] = useState<string | null>(null);

	const project = useQuery(trpc.projects.byId.queryOptions({ id: projectId }));

	const refresh = () => cache.projects(projectId);

	const update = useMutation(
		trpc.projects.update.mutationOptions({
			onSuccess: async () => {
				await refresh();
				toast.success("Projeto atualizado.");
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const remove = useMutation(
		trpc.projects.remove.mutationOptions({
			onSuccess: async () => {
				await cache.projects();
				toast.success("Projeto excluído.");
				router.push(workspaceUrl("/projects"));
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const addTask = useMutation(
		trpc.projects.addTask.mutationOptions({
			onSuccess: async () => {
				setTitle("");
				setDue("");
				await refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const updateTask = useMutation(
		trpc.projects.updateTask.mutationOptions({
			onSuccess: refresh,
			onError: (error) => toast.error(error.message),
			onSettled: (_, __, variables) =>
				setMoved(({ [variables.id]: _drop, ...rest }) => rest),
		}),
	);
	const removeTask = useMutation(
		trpc.projects.removeTask.mutationOptions({
			onSuccess: refresh,
			onError: (error) => toast.error(error.message),
		}),
	);

	const tasks = useMemo(
		() =>
			(project.data?.tasks ?? []).map((task) => ({
				...task,
				status: moved[task.id] ?? task.status,
			})),
		[project.data?.tasks, moved],
	);

	const columns: KanbanColumn[] = TASK_LANES.map((lane) => ({
		id: lane.id,
		title: lane.title,
		accent: lane.accent,
		meta: (() => {
			const count = tasks.filter((task) => task.status === lane.id).length;
			return count === 1 ? "1 tarefa" : `${count} tarefas`;
		})(),
	}));

	if (project.isPending) {
		return (
			<div className="flex justify-center py-24">
				<Spinner size="lg" className="text-foreground" />
			</div>
		);
	}

	if (!project.data) {
		return (
			<p className="glass-surface px-6 py-12 text-center text-muted-foreground text-sm">
				Este projeto não existe mais.
			</p>
		);
	}

	const data = project.data;
	const { total, done } = data.taskCounts;
	const ratio = total === 0 ? 0 : done / total;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-5">
			<div className="flex flex-col gap-4">
				<Link
					href={workspaceUrl("/projects")}
					className="flex w-fit items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground"
				>
					<ArrowLeft className="size-3.5" />
					Projetos
				</Link>
				<div className="flex flex-wrap items-start gap-4">
					<EntityLogo
						src={data.company.iconUrl}
						darkSrc={data.company.iconDarkUrl}
						tone={data.company.iconTone as EntityLogoTone | null}
						name={data.company.name}
						size="xl"
					/>
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<h1 className="font-semibold text-2xl tracking-tight">
							{data.name}
						</h1>
						<button
							type="button"
							onClick={() =>
								openRecord({ kind: "company", id: data.company.id })
							}
							className="w-fit text-muted-foreground text-sm underline-offset-2 hover:text-foreground hover:underline"
						>
							{data.company.name}
						</button>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Select
							value={data.status}
							onValueChange={(next) => {
								if (isProjectStatus(next)) {
									update.mutate({ id: data.id, data: { status: next } });
								}
							}}
						>
							<SelectTrigger aria-label="Situação do projeto" className="w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(Object.keys(PROJECT_STATUS) as ProjectStatusKey[]).map(
									(key) => (
										<SelectItem key={key} value={key}>
											{PROJECT_STATUS[key].label}
										</SelectItem>
									),
								)}
							</SelectContent>
						</Select>
						<div className="w-44">
							<DatePicker
								value={data.dueDate?.slice(0, 10) ?? ""}
								onChange={(next) =>
									update.mutate({
										id: data.id,
										data: { dueDate: next || null },
									})
								}
								placeholder="Sem prazo"
							/>
						</div>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Excluir projeto"
							disabled={remove.isPending}
							onClick={() => {
								if (
									window.confirm("Excluir este projeto e todas as tarefas?")
								) {
									remove.mutate({ id: data.id });
								}
							}}
						>
							<TrashCan />
						</Button>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/8">
						<div
							className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
							style={{ width: `${ratio * 100}%` }}
						/>
					</div>
					<span className="font-mono text-[11px] text-muted-foreground">
						{done}/{total} · {Math.round(ratio * 100)}%
					</span>
				</div>
			</div>

			<form
				className="glass-surface flex flex-wrap items-center gap-2 p-2"
				onSubmit={(event) => {
					event.preventDefault();
					if (title.trim() === "") return;
					addTask.mutate({
						projectId: data.id,
						title,
						status: "TODO",
						dueDate: due || undefined,
					});
				}}
			>
				<Input
					value={title}
					onChange={(event) => setTitle(event.target.value)}
					placeholder="Nova tarefa…"
					className="min-w-48 flex-1 border-0 bg-transparent"
					aria-label="Nova tarefa"
				/>
				<div className="w-40">
					<DatePicker value={due} onChange={setDue} placeholder="Prazo" />
				</div>
				<Button
					type="submit"
					size="sm"
					disabled={addTask.isPending || title.trim() === ""}
				>
					{addTask.isPending ? <Spinner /> : <Add data-icon="inline-start" />}
					Adicionar
				</Button>
			</form>

			<KanbanBoard
				columns={columns}
				items={tasks}
				getItemId={(task) => task.id}
				getColumnId={(task) => task.status}
				empty="Arraste uma tarefa para cá"
				onOpen={(task) => setEditing(task.id)}
				onMove={(task, lane) => {
					if (!isTaskStatus(lane)) return;
					setMoved((current) => ({ ...current, [task.id]: lane }));
					updateTask.mutate({ id: task.id, data: { status: lane } });
				}}
				renderItem={(task) => (
					<TaskCard
						task={task}
						onRemove={() => removeTask.mutate({ id: task.id })}
					/>
				)}
			/>

			<TaskDialog
				task={data.tasks.find((task) => task.id === editing) ?? null}
				projectId={data.id}
				onClose={() => setEditing(null)}
			/>
		</div>
	);
}

function TaskCard({ task, onRemove }: { task: Task; onRemove: () => void }) {
	const done = task.status === "DONE";
	const late = isOverdue(task.dueDate, done);
	return (
		<div className="group/task flex flex-col gap-2">
			<div className="flex items-start gap-2">
				<span
					className={cn(
						"flex-1 font-medium text-[13px] leading-snug",
						done && "text-muted-foreground line-through",
					)}
				>
					{task.title}
				</span>
				<button
					type="button"
					aria-label="Excluir tarefa"
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => {
						event.stopPropagation();
						onRemove();
					}}
					className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover/task:opacity-100 max-lg:opacity-60"
				>
					<TrashCan className="size-3.5" />
				</button>
			</div>
			{task.dueDate || task.assignee ? (
				<div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
					{task.dueDate ? (
						<span className={cn(late && "text-chart-4")}>
							{late ? "atrasada · " : ""}
							{formatDue(task.dueDate)}
						</span>
					) : null}
					<span className="ml-auto">
						<OwnerCell
							owner={task.assignee ? { ...task.assignee, email: "" } : null}
							compact
						/>
					</span>
				</div>
			) : null}
		</div>
	);
}
