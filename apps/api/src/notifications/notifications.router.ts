import { Inject } from "@nestjs/common";
import { Mutation, Router, UseMiddlewares } from "nestjs-trpc";
import { AgentTriggerService } from "../agent/agent-trigger.service";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import { notificationsTestOutput } from "./notifications.contracts";

@Router({ alias: "notifications" })
@UseMiddlewares(AuthMiddleware)
export class NotificationsRouter {
	constructor(
		@Inject(AgentTriggerService) private readonly agent: AgentTriggerService,
	) {}

	@Mutation({
		output: notificationsTestOutput,
		meta: restMeta("POST", "/notifications/test", ["Notifications"]),
	})
	async testWhatsApp() {
		return { queued: await this.agent.leadAlertTest() };
	}
}
