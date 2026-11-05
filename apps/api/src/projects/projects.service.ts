import type { Db, Prisma } from "@crm/db";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import type {
	ProjectCreateInput,
	ProjectListInput,
	ProjectSummary,
	ProjectTask,
	ProjectUpdateInput,
	TaskCreateInput,
	TaskUpdateInput,
} from "./projects.contracts";
import { PROJECTS } from "./projects-config";

const PERSON = { select: { id: true, name: true, image: true } } as const;

const PROJECT_SELECT = {
	id: true,
	name: true,
	description: true,
	status: true,
	startDate: true,
	dueDate: true,
	updatedAt: true,
	company: {
		select: {
			id: true,
			name: true,
			iconUrl: true,
			iconDarkUrl: true,
			iconTone: true,
		},
	},
	deal: { select: { id: true, name: true } },
	owner: PERSON,
	tasks: { select: { status: true, dueDate: true } },
} as const;

const TASK_SELECT = {
	id: true,
	title: true,
	status: true,
	position: true,
	dueDate: true,
	completedAt: true,
	assignee: PERSON,
} as const;

type ProjectRow = Prisma.ProjectGetPayload<{ select: typeof PROJECT_SELECT }>;
type TaskRow = Prisma.ProjectTaskGetPayload<{ select: typeof TASK_SELECT }>;

function toDate(value: string | null | undefined): Date | null | undefined {
	if (value === undefined) return undefined;
	if (value === null) return null;
	return new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
}

@Injectable()
export class ProjectsService {
	constructor(@InjectDatabase() private readonly db: Db) {}

	async list(input: ProjectListInput) {
		const rows = await this.db.project.findMany({
			where: {
				...(input.filter === "open"
					? { status: { in: ["ACTIVE", "PAUSED"] } }
					: input.filter === "done"
						? { status: "DONE" }
						: {}),
				...(input.companyId ? { companyId: input.companyId } : {}),
			},
			orderBy: [{ status: "asc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
			take: PROJECTS.listLimit,
			select: PROJECT_SELECT,
		});
		return { rows: rows.map((row) => this.summarize(row)) };
	}

	async byId(id: string) {
		const [project, tasks] = await Promise.all([
			this.db.project.findUnique({ where: { id }, select: PROJECT_SELECT }),
			this.db.projectTask.findMany({
				where: { projectId: id },
				orderBy: [{ position: "asc" }, { createdAt: "asc" }],
				take: PROJECTS.tasksPerProject,
				select: TASK_SELECT,
			}),
		]);
		if (!project) throw new NotFoundException("Este projeto não existe mais.");
		return { ...this.summarize(project), tasks: tasks.map(serializeTask) };
	}

	async create(input: ProjectCreateInput, userId: string) {
		const company = await this.db.company.findUnique({
			where: { id: input.companyId },
			select: { id: true },
		});
		if (!company) throw new NotFoundException("Este cliente não existe mais.");
		const project = await this.db.project.create({
			data: {
				name: input.name,
				description: input.description || null,
				companyId: input.companyId,
				dealId: input.dealId || null,
				ownerId: input.ownerId || userId,
				startDate: toDate(input.startDate) ?? null,
				dueDate: toDate(input.dueDate) ?? null,
				tasks: {
					create: input.tasks.map((title, position) => ({ title, position })),
				},
			},
			select: { id: true },
		});
		return this.byId(project.id);
	}

	async update(input: ProjectUpdateInput) {
		const { data } = input;
		await this.db.project
			.update({
				where: { id: input.id },
				data: {
					name: data.name,
					description: data.description,
					status: data.status,
					startDate: toDate(data.startDate),
					dueDate: toDate(data.dueDate),
					ownerId: data.ownerId,
					dealId: data.dealId,
				},
				select: { id: true },
			})
			.catch(() => {
				throw new NotFoundException("Este projeto não existe mais.");
			});
		return this.byId(input.id);
	}

	async remove(id: string) {
		await this.db.project.delete({ where: { id } }).catch(() => {
			throw new NotFoundException("Este projeto não existe mais.");
		});
		return { id };
	}

	async addTask(input: TaskCreateInput): Promise<ProjectTask> {
		const last = await this.db.projectTask.findFirst({
			where: { projectId: input.projectId, status: input.status },
			orderBy: { position: "desc" },
			select: { position: true },
		});
		const row = await this.db.projectTask
			.create({
				data: {
					projectId: input.projectId,
					title: input.title,
					status: input.status,
					position: (last?.position ?? -1) + 1,
					dueDate: toDate(input.dueDate) ?? null,
					assigneeId: input.assigneeId || null,
					completedAt: input.status === "DONE" ? new Date() : null,
				},
				select: TASK_SELECT,
			})
			.catch(() => {
				throw new NotFoundException("Este projeto não existe mais.");
			});
		await this.touch(input.projectId);
		return serializeTask(row);
	}

	async updateTask(input: TaskUpdateInput): Promise<ProjectTask> {
		const { data } = input;
		const row = await this.db.projectTask
			.update({
				where: { id: input.id },
				data: {
					title: data.title,
					status: data.status,
					completedAt:
						data.status === undefined
							? undefined
							: data.status === "DONE"
								? new Date()
								: null,
					dueDate: toDate(data.dueDate),
					assigneeId: data.assigneeId,
				},
				select: { ...TASK_SELECT, projectId: true },
			})
			.catch(() => {
				throw new NotFoundException("Esta tarefa não existe mais.");
			});
		await this.touch(row.projectId);
		return serializeTask(row);
	}

	async removeTask(id: string) {
		const row = await this.db.projectTask
			.delete({ where: { id }, select: { id: true, projectId: true } })
			.catch(() => {
				throw new NotFoundException("Esta tarefa não existe mais.");
			});
		await this.touch(row.projectId);
		return { id: row.id };
	}

	private async touch(projectId: string) {
		await this.db.project.update({
			where: { id: projectId },
			data: { updatedAt: new Date() },
			select: { id: true },
		});
	}

	private summarize(row: ProjectRow): ProjectSummary {
		const now = new Date();
		return {
			id: row.id,
			name: row.name,
			description: row.description,
			status: row.status,
			startDate: row.startDate?.toISOString() ?? null,
			dueDate: row.dueDate?.toISOString() ?? null,
			company: row.company,
			deal: row.deal,
			owner: row.owner,
			taskCounts: {
				total: row.tasks.length,
				doing: row.tasks.filter((task) => task.status === "DOING").length,
				done: row.tasks.filter((task) => task.status === "DONE").length,
				overdue: row.tasks.filter(
					(task) =>
						task.status !== "DONE" &&
						task.dueDate !== null &&
						task.dueDate < now,
				).length,
			},
			updatedAt: row.updatedAt.toISOString(),
		};
	}
}

function serializeTask(row: TaskRow): ProjectTask {
	return {
		id: row.id,
		title: row.title,
		status: row.status,
		position: row.position,
		dueDate: row.dueDate?.toISOString() ?? null,
		completedAt: row.completedAt?.toISOString() ?? null,
		assignee: row.assignee,
	};
}
