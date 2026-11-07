import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { TrpcModule } from "../trpc/trpc.module";
import { BoardNotesRouter } from "./board-notes.router";
import { BoardNotesService } from "./board-notes.service";
import { ContractsRouter } from "./contracts.router";
import { ContractsService } from "./contracts.service";
import { FinanceRouter } from "./finance.router";
import { FinanceService } from "./finance.service";
import { FixedCostsRouter } from "./fixed-costs.router";
import { FixedCostsService } from "./fixed-costs.service";
import { RecurringEntriesService } from "./recurring-entries.service";

@Module({
	imports: [TrpcModule, AgentModule],
	providers: [
		RecurringEntriesService,
		BoardNotesService,
		BoardNotesRouter,
		FinanceService,
		FinanceRouter,
		ContractsService,
		ContractsRouter,
		FixedCostsService,
		FixedCostsRouter,
	],
})
export class FinanceModule {}
