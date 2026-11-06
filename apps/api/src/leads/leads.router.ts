import { Inject } from "@nestjs/common";
import { Input, Mutation, Router, UseMiddlewares } from "nestjs-trpc";
import type { z } from "zod";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import { leadCreateInput, leadCreateOutput } from "./leads.contracts";
import { LeadsService } from "./leads.service";

@Router({ alias: "leads" })
@UseMiddlewares(AuthMiddleware)
export class LeadsRouter {
	constructor(@Inject(LeadsService) private readonly leads: LeadsService) {}

	@Mutation({
		input: leadCreateInput,
		output: leadCreateOutput,
		meta: restMeta("POST", "/leads", ["Leads"]),
	})
	async create(@Input() input: z.infer<typeof leadCreateInput>) {
		return this.leads.create(input);
	}
}
