import { Inject } from "@nestjs/common";
import { Input, Mutation, Query, Router, UseMiddlewares } from "nestjs-trpc";
import { z } from "zod";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import {
	fixedCostCreateInput,
	fixedCostListOutput,
	fixedCostOutput,
	fixedCostUpdateInput,
} from "./fixed-costs.contracts";
import { FixedCostsService } from "./fixed-costs.service";

const fixedCostActiveInput = z.object({
	id: z.string().min(1),
	active: z.boolean(),
});

@Router({ alias: "fixedCosts" })
@UseMiddlewares(AuthMiddleware)
export class FixedCostsRouter {
	constructor(
		@Inject(FixedCostsService) private readonly costs: FixedCostsService,
	) {}

	@Query({
		output: fixedCostListOutput,
		meta: restMeta("GET", "/fixed-costs", ["Finance"]),
	})
	async list() {
		return this.costs.list();
	}

	@Mutation({
		input: fixedCostCreateInput,
		output: fixedCostOutput,
		meta: restMeta("POST", "/fixed-costs", ["Finance"]),
	})
	async create(@Input() input: z.infer<typeof fixedCostCreateInput>) {
		return this.costs.create(input);
	}

	@Mutation({
		input: fixedCostUpdateInput,
		output: fixedCostOutput,
		meta: restMeta("PATCH", "/fixed-costs/{id}", ["Finance"]),
	})
	async update(@Input() input: z.infer<typeof fixedCostUpdateInput>) {
		return this.costs.update(input.id, input.data);
	}

	@Mutation({
		input: fixedCostActiveInput,
		output: fixedCostOutput,
		meta: restMeta("POST", "/fixed-costs/{id}/active", ["Finance"]),
	})
	async setActive(@Input() input: z.infer<typeof fixedCostActiveInput>) {
		return this.costs.setActive(input.id, input.active);
	}
}
