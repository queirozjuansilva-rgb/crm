import { z } from "zod";
import { PROJECTS } from "./projects-config";

export const projectStatus = z.enum(["ACTIVE", "PAUSED", "DONE"]);
export const projectTaskStatus = z.enum(["TODO", "DOING", "DONE"]);

const dateInput = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}/, "Informe uma data válida.");

const FILTERS = ["open", "done", "all"] as const;

export const projectListInput = z.object({
	filter: z
		.string()
		.default("open")
		.refine((value) => (FILTERS as readonly string[]).includes(value), {
			message: "Filtro inválido.",
		}),
	companyId: z.string().optional(),
});

export type ProjectListInput = z.infer<typeof projectListInput>;

const companyOutput = z.object({
	id: z.string(),
	name: z.string(),
	iconUrl: z.string().nullable(),
	iconDarkUrl: z.string().nullable(),
	iconTone: z.string().nullable(),
});

const personOutput = z.object({
	id: z.string(),
	name: z.string(),
	image: z.string().nullable(),
});

export const projectTaskOutput = z.object({
	id: z.string(),
	title: z.string(),
	status: projectTaskStatus,
	position: z.number().int(),
	dueDate: z.string().nullable(),
	completedAt: z.string().nullable(),
	assignee: personOutput.nullable(),
});

export type ProjectTask = z.infer<typeof projectTaskOutput>;

export const projectSummaryOutput = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	status: projectStatus,
	startDate: z.string().nullable(),
	dueDate: z.string().nullable(),
	company: companyOutput,
	deal: z.object({ id: z.string(), name: z.string() }).nullable(),
	owner: personOutput.nullable(),
	taskCounts: z.object({
		total: z.number().int(),
		doing: z.number().int(),
		done: z.number().int(),
		overdue: z.number().int(),
	}),
	updatedAt: z.string(),
});

export type ProjectSummary = z.infer<typeof projectSummaryOutput>;

export const projectListOutput = z.object({
	rows: z.array(projectSummaryOutput),
});

export const projectDetailOutput = projectSummaryOutput.extend({
	tasks: z.array(projectTaskOutput),
});

export const projectIdInput = z.object({ id: z.string() });

export const projectCreateInput = z.object({
	name: z.string().trim().min(1, "Dê um nome ao projeto.").max(160),
	companyId: z.string().min(1, "Escolha o cliente."),
	dealId: z.string().optional(),
	ownerId: z.string().optional(),
	description: z.string().trim().max(4000).optional(),
	startDate: dateInput.optional(),
	dueDate: dateInput.optional(),
	tasks: z
		.array(z.string().trim().min(1).max(200))
		.max(PROJECTS.maxTemplateTasks)
		.default([]),
});

export type ProjectCreateInput = z.infer<typeof projectCreateInput>;

export const projectUpdateInput = z.object({
	id: z.string(),
	data: z.object({
		name: z.string().trim().min(1).max(160).optional(),
		description: z.string().trim().max(4000).nullable().optional(),
		status: projectStatus.optional(),
		startDate: dateInput.nullable().optional(),
		dueDate: dateInput.nullable().optional(),
		ownerId: z.string().nullable().optional(),
		dealId: z.string().nullable().optional(),
	}),
});

export type ProjectUpdateInput = z.infer<typeof projectUpdateInput>;

export const taskCreateInput = z.object({
	projectId: z.string(),
	title: z.string().trim().min(1, "Escreva a tarefa.").max(200),
	status: projectTaskStatus.default("TODO"),
	dueDate: dateInput.optional(),
	assigneeId: z.string().optional(),
});

export type TaskCreateInput = z.infer<typeof taskCreateInput>;

export const taskUpdateInput = z.object({
	id: z.string(),
	data: z.object({
		title: z.string().trim().min(1).max(200).optional(),
		status: projectTaskStatus.optional(),
		dueDate: dateInput.nullable().optional(),
		assigneeId: z.string().nullable().optional(),
	}),
});

export type TaskUpdateInput = z.infer<typeof taskUpdateInput>;

export const removedOutput = z.object({ id: z.string() });
