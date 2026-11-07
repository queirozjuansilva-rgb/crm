import { Inject } from "@nestjs/common";
import {
	Ctx,
	Input,
	Mutation,
	Query,
	Router,
	UseMiddlewares,
} from "nestjs-trpc";
import { z } from "zod";
import type { AuthedTrpcContext } from "../trpc/context.types";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import {
	contractCreateInput,
	contractEndInput,
	contractListOutput,
	contractSavedOutput,
	contractUpdateInput,
} from "./contracts.contracts";
import { ContractsService } from "./contracts.service";

const contractIdInput = z.object({ id: z.string().min(1) });

@Router({ alias: "contracts" })
@UseMiddlewares(AuthMiddleware)
export class ContractsRouter {
	constructor(
		@Inject(ContractsService) private readonly contracts: ContractsService,
	) {}

	@Query({
		output: contractListOutput,
		meta: restMeta("GET", "/contracts", ["Contracts"]),
	})
	async list() {
		return this.contracts.list();
	}

	@Mutation({
		input: contractCreateInput,
		output: contractSavedOutput,
		meta: restMeta("POST", "/contracts", ["Contracts"]),
	})
	async create(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof contractCreateInput>,
	) {
		return this.contracts.create(input, ctx.user.id);
	}

	@Mutation({
		input: contractUpdateInput,
		output: contractSavedOutput,
		meta: restMeta("PATCH", "/contracts/{id}", ["Contracts"]),
	})
	async update(@Input() input: z.infer<typeof contractUpdateInput>) {
		return this.contracts.update(input);
	}

	@Mutation({
		input: contractEndInput,
		output: contractSavedOutput,
		meta: restMeta("POST", "/contracts/{id}/end", ["Contracts"]),
	})
	async end(@Input() input: z.infer<typeof contractEndInput>) {
		return this.contracts.end(input.id, input.endsOn);
	}

	@Mutation({
		input: contractIdInput,
		output: contractSavedOutput,
		meta: restMeta("POST", "/contracts/{id}/reactivate", ["Contracts"]),
	})
	async reactivate(@Input("id") id: string) {
		return this.contracts.reactivate(id);
	}
}
