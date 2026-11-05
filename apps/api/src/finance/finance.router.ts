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
	financeCreateInput,
	financeCreateOutput,
	financeEntryOutput,
	financeIdInput,
	financeListInput,
	financeListOutput,
	financeRemoveOutput,
	financeSetPaidInput,
	financeSummaryInput,
	financeSummaryOutput,
	financeUpdateInput,
} from "./finance.contracts";
import { FinanceService } from "./finance.service";

@Router({ alias: "finance" })
@UseMiddlewares(AuthMiddleware)
export class FinanceRouter {
	constructor(
		@Inject(FinanceService) private readonly finance: FinanceService,
	) {}

	@Query({
		input: financeListInput,
		output: financeListOutput,
		meta: restMeta("GET", "/finance/entries", ["Finance"]),
	})
	async list(@Input() input: z.infer<typeof financeListInput>) {
		return this.finance.list(input);
	}

	@Query({
		input: financeSummaryInput,
		output: financeSummaryOutput,
		meta: restMeta("GET", "/finance/summary", ["Finance"]),
	})
	async summary(@Input() input: z.infer<typeof financeSummaryInput>) {
		return this.finance.summary(input.months);
	}

	@Mutation({
		input: financeCreateInput,
		output: financeCreateOutput,
		meta: restMeta("POST", "/finance/entries", ["Finance"]),
	})
	async create(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof financeCreateInput>,
	) {
		return this.finance.create(input, ctx.user.id);
	}

	@Mutation({
		input: financeUpdateInput,
		output: financeEntryOutput,
		meta: restMeta("PATCH", "/finance/entries/{id}", ["Finance"]),
	})
	async update(@Input() input: z.infer<typeof financeUpdateInput>) {
		return this.finance.update(input);
	}

	@Mutation({
		input: financeSetPaidInput,
		output: financeEntryOutput,
		meta: restMeta("POST", "/finance/entries/{id}/paid", ["Finance"]),
	})
	async setPaid(@Input() input: z.infer<typeof financeSetPaidInput>) {
		return this.finance.setPaid(input.id, input.paid);
	}

	@Mutation({
		input: financeIdInput,
		output: financeRemoveOutput,
		meta: restMeta("DELETE", "/finance/entries/{id}", ["Finance"]),
	})
	async remove(@Input("id") id: string) {
		return this.finance.remove(id);
	}
}
