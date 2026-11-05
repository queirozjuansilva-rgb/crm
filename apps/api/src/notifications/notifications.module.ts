import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { TrpcModule } from "../trpc/trpc.module";
import { NotificationsRouter } from "./notifications.router";

@Module({
	imports: [TrpcModule, AgentModule],
	providers: [NotificationsRouter],
})
export class NotificationsModule {}
