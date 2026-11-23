import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import type {
	MiddlewareOptions,
	MiddlewareResponse,
	TRPCMiddleware,
} from "nestjs-trpc";
import { SdrAccessService } from "../../access/sdr-access.service";
import { setRequestUserId } from "../../logging/request-context";
import type { AuthedTrpcContext, BaseTrpcContext } from "../context.types";

@Injectable()
export class AuthMiddleware implements TRPCMiddleware {
	constructor(private readonly access: SdrAccessService) {}

	async use(opts: MiddlewareOptions): Promise<MiddlewareResponse> {
		const ctx = opts.ctx as BaseTrpcContext;
		const user = ctx.session?.user;

		if (!user) {
			throw new TRPCError({ code: "UNAUTHORIZED" });
		}

		setRequestUserId(user.id);

		const sdr = await this.access.isSdr(user.id);

		if (
			sdr &&
			!(await this.access.allows(opts.path, await opts.getRawInput(), user.id))
		) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Seu acesso é só ao seu pipeline e à agenda.",
			});
		}

		const nextCtx: AuthedTrpcContext = { ...ctx, user, sdr };
		return opts.next({ ctx: nextCtx });
	}
}
