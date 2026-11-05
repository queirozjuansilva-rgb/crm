import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { AgendaRouter } from "./agenda.router";
import { AgendaService } from "./agenda.service";

@Module({
	imports: [TrpcModule],
	providers: [AgendaService, AgendaRouter],
})
export class AgendaModule {}
