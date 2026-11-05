import { Module } from "@nestjs/common";
import { CurrencyModule } from "../currency/currency.module";
import { TrpcModule } from "../trpc/trpc.module";
import { ReportsRouter } from "./reports.router";
import { ReportsService } from "./reports.service";

@Module({
	imports: [TrpcModule, CurrencyModule],
	providers: [ReportsService, ReportsRouter],
})
export class ReportsModule {}
