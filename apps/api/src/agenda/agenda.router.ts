import { Inject } from "@nestjs/common";
import { Ctx, Input, Query, Router, UseMiddlewares } from "nestjs-trpc";
import type { z } from "zod";
import type { AuthedTrpcContext } from "../trpc/context.types";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import { agendaRangeInput, agendaRangeOutput } from "./agenda.contracts";
import { AgendaService } from "./agenda.service";

@Router({ alias: "agenda" })
@UseMiddlewares(AuthMiddleware)
export class AgendaRouter {
	constructor(@Inject(AgendaService) private readonly agenda: AgendaService) {}

	@Query({
		input: agendaRangeInput,
		output: agendaRangeOutput,
		meta: restMeta("GET", "/agenda", ["Agenda"]),
	})
	async range(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof agendaRangeInput>,
	) {
		return this.agenda.range(input, ctx.user.id);
	}
}
