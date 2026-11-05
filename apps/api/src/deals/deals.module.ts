import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { AttachmentsModule } from "../attachments/attachments.module";
import { CurrencyModule } from "../currency/currency.module";
import { FieldsModule } from "../fields/fields.module";
import { TrpcModule } from "../trpc/trpc.module";
import { DealsRouter } from "./deals.router";
import { DealsService } from "./deals.service";

@Module({
	imports: [
		AttachmentsModule,
		AgentModule,
		FieldsModule,
		TrpcModule,
		CurrencyModule,
	],
	providers: [DealsService, DealsRouter],
	exports: [DealsService],
})
export class DealsModule {}
