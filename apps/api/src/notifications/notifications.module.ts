import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { LeadAlertService } from "./lead-alert.service";
import { NotificationsRouter } from "./notifications.router";

@Module({
	imports: [TrpcModule],
	providers: [LeadAlertService, NotificationsRouter],
	exports: [LeadAlertService],
})
export class NotificationsModule {}
