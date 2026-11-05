import { Inject } from "@nestjs/common";
import {
	Ctx,
	Input,
	Mutation,
	Query,
	Router,
	UseMiddlewares,
} from "nestjs-trpc";
import type { z } from "zod";
import type { AuthedTrpcContext } from "../trpc/context.types";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import {
	projectCreateInput,
	projectDetailOutput,
	projectIdInput,
	projectListInput,
	projectListOutput,
	projectTaskOutput,
	projectUpdateInput,
	removedOutput,
	taskCreateInput,
	taskUpdateInput,
} from "./projects.contracts";
import { ProjectsService } from "./projects.service";

@Router({ alias: "projects" })
@UseMiddlewares(AuthMiddleware)
export class ProjectsRouter {
	constructor(
		@Inject(ProjectsService) private readonly projects: ProjectsService,
	) {}

	@Query({
		input: projectListInput,
		output: projectListOutput,
		meta: restMeta("GET", "/projects", ["Projects"]),
	})
	async list(@Input() input: z.infer<typeof projectListInput>) {
		return this.projects.list(input);
	}

	@Query({
		input: projectIdInput,
		output: projectDetailOutput,
		meta: restMeta("GET", "/projects/{id}", ["Projects"]),
	})
	async byId(@Input("id") id: string) {
		return this.projects.byId(id);
	}

	@Mutation({
		input: projectCreateInput,
		output: projectDetailOutput,
		meta: restMeta("POST", "/projects", ["Projects"]),
	})
	async create(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof projectCreateInput>,
	) {
		return this.projects.create(input, ctx.user.id);
	}

	@Mutation({
		input: projectUpdateInput,
		output: projectDetailOutput,
		meta: restMeta("PATCH", "/projects/{id}", ["Projects"]),
	})
	async update(@Input() input: z.infer<typeof projectUpdateInput>) {
		return this.projects.update(input);
	}

	@Mutation({
		input: projectIdInput,
		output: removedOutput,
		meta: restMeta("DELETE", "/projects/{id}", ["Projects"]),
	})
	async remove(@Input("id") id: string) {
		return this.projects.remove(id);
	}

	@Mutation({
		input: taskCreateInput,
		output: projectTaskOutput,
		meta: restMeta("POST", "/projects/tasks", ["Projects"]),
	})
	async addTask(@Input() input: z.infer<typeof taskCreateInput>) {
		return this.projects.addTask(input);
	}

	@Mutation({
		input: taskUpdateInput,
		output: projectTaskOutput,
		meta: restMeta("PATCH", "/projects/tasks/{id}", ["Projects"]),
	})
	async updateTask(@Input() input: z.infer<typeof taskUpdateInput>) {
		return this.projects.updateTask(input);
	}

	@Mutation({
		input: projectIdInput,
		output: removedOutput,
		meta: restMeta("DELETE", "/projects/tasks/{id}", ["Projects"]),
	})
	async removeTask(@Input("id") id: string) {
		return this.projects.removeTask(id);
	}
}
