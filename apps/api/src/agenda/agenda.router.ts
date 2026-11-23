import { Inject } from "@nestjs/common";
import { Ctx, Input, Query, Router, UseMiddlewares } from "nestjs-trpc";
import type { z } from "zod";
import { SdrAccessService } from "../access/sdr-access.service";
import type { AuthedTrpcContext } from "../trpc/context.types";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import { agendaRangeInput, agendaRangeOutput } from "./agenda.contracts";
import { AgendaService } from "./agenda.service";
import { HostBusyService } from "./host-busy.service";

@Router({ alias: "agenda" })
@UseMiddlewares(AuthMiddleware)
export class AgendaRouter {
	constructor(
		@Inject(AgendaService) private readonly agenda: AgendaService,
		@Inject(SdrAccessService) private readonly access: SdrAccessService,
		@Inject(HostBusyService) private readonly hostBusy: HostBusyService,
	) {}

	@Query({
		input: agendaRangeInput,
		output: agendaRangeOutput,
		meta: restMeta("GET", "/agenda", ["Agenda"]),
	})
	async range(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof agendaRangeInput>,
	) {
		if (!ctx.sdr) return this.agenda.range(input, ctx.user.id);
		const host = await this.access.calendarHostId();
		const busy = host
			? await this.hostBusy.intervals(
					host,
					new Date(input.from),
					new Date(input.to),
				)
			: null;
		return this.agenda.range(input, ctx.user.id, {
			sdr: true,
			calendarUserId: host ?? ctx.user.id,
			busy,
		});
	}
}
