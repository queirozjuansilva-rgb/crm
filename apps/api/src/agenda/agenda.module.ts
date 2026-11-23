import { Module } from "@nestjs/common";
import { GoogleModule } from "../google/google.module";
import { MailboxModule } from "../mailbox/mailbox.module";
import { TrpcModule } from "../trpc/trpc.module";
import { AgendaRouter } from "./agenda.router";
import { AgendaService } from "./agenda.service";
import { HostBusyService } from "./host-busy.service";

@Module({
	imports: [TrpcModule, GoogleModule, MailboxModule],
	providers: [AgendaService, AgendaRouter, HostBusyService],
})
export class AgendaModule {}
