import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { FinanceRouter } from "./finance.router";
import { FinanceService } from "./finance.service";

@Module({
	imports: [TrpcModule],
	providers: [FinanceService, FinanceRouter],
})
export class FinanceModule {}
