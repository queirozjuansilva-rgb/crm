"use client";

import { Button } from "@crm/ui/components/button";
import { DatePicker } from "@crm/ui/components/date-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@crm/ui/components/dialog";
import { Field, FieldGroup, FieldLabel } from "@crm/ui/components/field";
import { Input } from "@crm/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import { Spinner } from "@crm/ui/components/spinner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import { TASK_LANES, type TaskStatusKey } from "./project-meta";

type Task = RouterOutputs["projects"]["byId"]["tasks"][number];

const NOBODY = "nobody";

function isTaskStatus(value: string): value is TaskStatusKey {
	return TASK_LANES.some((lane) => lane.id === value);
}

export function TaskDialog({
	task,
	projectId,
	onClose,
}: {
	task: Task | null;
	projectId: string;
	onClose: () => void;
}) {
	return (
		<Dialog open={task !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				{task ? (
					<TaskForm
						key={task.id}
						task={task}
						projectId={projectId}
						onClose={onClose}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function TaskForm({
	task,
	projectId,
	onClose,
}: {
	task: Task;
	projectId: string;
	onClose: () => void;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const titleId = useId();
	const dueId = useId();
	const users = useQuery(trpc.users.list.queryOptions());

	const [title, setTitle] = useState(task.title);
	const [status, setStatus] = useState<TaskStatusKey>(task.status);
	const [dueDate, setDueDate] = useState(task.dueDate?.slice(0, 10) ?? "");
	const [assigneeId, setAssigneeId] = useState(task.assignee?.id ?? NOBODY);

	const update = useMutation(
		trpc.projects.updateTask.mutationOptions({
			onSuccess: async () => {
				await cache.projects(projectId);
				toast.success("Tarefa atualizada.");
				onClose();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const remove = useMutation(
		trpc.projects.removeTask.mutationOptions({
			onSuccess: async () => {
				await cache.projects(projectId);
				toast.success("Tarefa excluída.");
				onClose();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<>
			<DialogHeader>
				<DialogTitle>Editar tarefa</DialogTitle>
				<DialogDescription>
					Mude o texto, a etapa, o prazo ou quem cuida dela.
				</DialogDescription>
			</DialogHeader>

			<form
				id="task-form"
				className="px-4"
				onSubmit={(event) => {
					event.preventDefault();
					if (title.trim() === "") return;
					update.mutate({
						id: task.id,
						data: {
							title,
							status,
							dueDate: dueDate || null,
							assigneeId: assigneeId === NOBODY ? null : assigneeId,
						},
					});
				}}
			>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor={titleId}>Tarefa</FieldLabel>
						<Input
							id={titleId}
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							autoComplete="off"
							required
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="task-status">Etapa</FieldLabel>
						<Select
							value={status}
							onValueChange={(next) => {
								if (isTaskStatus(next)) setStatus(next);
							}}
						>
							<SelectTrigger id="task-status">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{TASK_LANES.map((lane) => (
									<SelectItem key={lane.id} value={lane.id}>
										{lane.title}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel htmlFor={dueId}>Prazo</FieldLabel>
						<DatePicker
							id={dueId}
							value={dueDate}
							onChange={setDueDate}
							placeholder="Sem prazo"
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="task-assignee">Responsável</FieldLabel>
						<Select value={assigneeId} onValueChange={setAssigneeId}>
							<SelectTrigger id="task-assignee">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NOBODY}>Ninguém</SelectItem>
								{(users.data ?? []).map((user) => (
									<SelectItem key={user.id} value={user.id}>
										{user.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
				</FieldGroup>
			</form>

			<DialogFooter>
				<Button
					type="submit"
					form="task-form"
					disabled={update.isPending || title.trim() === ""}
				>
					{update.isPending ? <Spinner /> : null}
					Salvar
				</Button>
				<Button
					variant="outline"
					disabled={remove.isPending}
					onClick={() => remove.mutate({ id: task.id })}
				>
					Excluir
				</Button>
			</DialogFooter>
		</>
	);
}
