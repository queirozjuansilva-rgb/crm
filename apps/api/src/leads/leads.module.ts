import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { CurrencyModule } from "../currency/currency.module";
import { FieldsModule } from "../fields/fields.module";
import { TrpcModule } from "../trpc/trpc.module";
import { LeadsRouter } from "./leads.router";
import { LeadsService } from "./leads.service";

@Module({
	imports: [TrpcModule, AgentModule, FieldsModule, CurrencyModule],
	providers: [LeadsService, LeadsRouter],
})
export class LeadsModule {}
