import { Inject } from "@nestjs/common";
import { Mutation, Query, Router, UseMiddlewares } from "nestjs-trpc";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import { LeadAlertService } from "./lead-alert.service";
import {
	notificationsStatusOutput,
	notificationsTestOutput,
} from "./notifications.contracts";

@Router({ alias: "notifications" })
@UseMiddlewares(AuthMiddleware)
export class NotificationsRouter {
	constructor(
		@Inject(LeadAlertService) private readonly leadAlert: LeadAlertService,
	) {}

	@Query({
		output: notificationsStatusOutput,
		meta: restMeta("GET", "/notifications", ["Notifications"]),
	})
	async status() {
		return { whatsapp: this.leadAlert.enabled };
	}

	@Mutation({
		output: notificationsTestOutput,
		meta: restMeta("POST", "/notifications/test", ["Notifications"]),
	})
	async testWhatsApp() {
		return { sent: await this.leadAlert.test() };
	}
}
