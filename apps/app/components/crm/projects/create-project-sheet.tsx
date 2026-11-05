"use client";

import Add from "@carbon/icons-react/es/Add";
import { Button } from "@crm/ui/components/button";
import { DatePicker } from "@crm/ui/components/date-picker";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@crm/ui/components/field";
import { Input } from "@crm/ui/components/input";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@crm/ui/components/sheet";
import { Spinner } from "@crm/ui/components/spinner";
import { Textarea } from "@crm/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { CompanyPicker } from "@/components/crm/company-picker";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";
import { PROJECT_TEMPLATE } from "./project-meta";

export function CreateProjectSheet({
	companyId,
	size = "default",
}: {
	companyId?: string;
	size?: "default" | "xs";
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const router = useRouter();
	const workspaceUrl = useWorkspaceUrl();
	const nameId = useId();
	const dueId = useId();
	const tasksId = useId();

	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [company, setCompany] = useState(companyId ?? "");
	const [dueDate, setDueDate] = useState("");
	const [tasks, setTasks] = useState(PROJECT_TEMPLATE.join("\n"));

	const create = useMutation(
		trpc.projects.create.mutationOptions({
			onSuccess: async (project) => {
				await cache.projects(project.id);
				toast.success("Projeto criado.");
				setOpen(false);
				setName("");
				setDueDate("");
				setTasks(PROJECT_TEMPLATE.join("\n"));
				router.push(workspaceUrl(`/projects/${project.id}`));
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const ready = name.trim() !== "" && company !== "";

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button size={size} variant={size === "xs" ? "outline" : "default"}>
					<Add data-icon="inline-start" />
					Novo projeto
				</Button>
			</SheetTrigger>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>Novo projeto</SheetTitle>
					<SheetDescription>
						Um projeto é a entrega para um cliente, com as tarefas do time.
					</SheetDescription>
				</SheetHeader>

				<form
					id="create-project"
					className="flex-1 overflow-y-auto px-4"
					onSubmit={(event) => {
						event.preventDefault();
						if (!ready) return;
						create.mutate({
							name,
							companyId: company,
							dueDate: dueDate || undefined,
							tasks: tasks
								.split("\n")
								.map((line) => line.trim())
								.filter(Boolean),
						});
					}}
				>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor={nameId}>Nome</FieldLabel>
							<Input
								id={nameId}
								value={name}
								onChange={(event) => setName(event.target.value)}
								placeholder="Diagnóstico — Dodog"
								autoComplete="off"
								required
							/>
						</Field>
						{companyId ? null : (
							<Field>
								<FieldLabel htmlFor="project-company">Cliente</FieldLabel>
								<CompanyPicker
									id="project-company"
									value={company}
									onValueChange={setCompany}
								/>
							</Field>
						)}
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
							<FieldLabel htmlFor={tasksId}>Tarefas iniciais</FieldLabel>
							<Textarea
								id={tasksId}
								value={tasks}
								onChange={(event) => setTasks(event.target.value)}
								rows={7}
							/>
							<FieldDescription>
								Uma por linha. Você pode mudar tudo depois.
							</FieldDescription>
						</Field>
					</FieldGroup>
				</form>

				<SheetFooter>
					<Button
						type="submit"
						form="create-project"
						disabled={create.isPending || !ready}
					>
						{create.isPending ? <Spinner /> : null}
						Criar projeto
					</Button>
					<SheetClose asChild>
						<Button variant="outline">Cancelar</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
