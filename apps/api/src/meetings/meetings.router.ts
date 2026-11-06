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
	dealMeetingsInput,
	dealMeetingsOutput,
	scheduleMeetingInput,
	scheduleMeetingOutput,
} from "./meetings.contracts";
import { MeetingsService } from "./meetings.service";

@Router({ alias: "meetings" })
@UseMiddlewares(AuthMiddleware)
export class MeetingsRouter {
	constructor(
		@Inject(MeetingsService) private readonly meetings: MeetingsService,
	) {}

	@Query({
		input: dealMeetingsInput,
		output: dealMeetingsOutput,
		meta: restMeta("GET", "/meetings", ["Meetings"]),
	})
	async forDeal(
		@Ctx() ctx: AuthedTrpcContext,
		@Input("dealId") dealId: string,
	) {
		return this.meetings.forDeal(dealId, ctx.user.id);
	}

	@Mutation({
		input: scheduleMeetingInput,
		output: scheduleMeetingOutput,
		meta: restMeta("POST", "/meetings", ["Meetings"]),
	})
	async schedule(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof scheduleMeetingInput>,
	) {
		return this.meetings.schedule(input, ctx.user.id);
	}
}
