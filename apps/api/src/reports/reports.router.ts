import { Inject } from "@nestjs/common";
import { Ctx, Input, Query, Router, UseMiddlewares } from "nestjs-trpc";
import type { z } from "zod";
import type { AuthedTrpcContext } from "../trpc/context.types";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import {
	reportsOverviewInput,
	reportsOverviewOutput,
} from "./reports.contracts";
import { ReportsService } from "./reports.service";

@Router({ alias: "reports" })
@UseMiddlewares(AuthMiddleware)
export class ReportsRouter {
	constructor(
		@Inject(ReportsService) private readonly reports: ReportsService,
	) {}

	@Query({
		input: reportsOverviewInput,
		output: reportsOverviewOutput,
		meta: restMeta("GET", "/reports/overview", ["Reports"]),
	})
	async overview(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof reportsOverviewInput>,
	) {
		return this.reports.overview(input, ctx.user.id);
	}
}
