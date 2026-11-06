import { Module } from "@nestjs/common";
import { DealsModule } from "../deals/deals.module";
import { GoogleModule } from "../google/google.module";
import { MailboxModule } from "../mailbox/mailbox.module";
import { TrpcModule } from "../trpc/trpc.module";
import { MeetingsRouter } from "./meetings.router";
import { MeetingsService } from "./meetings.service";

@Module({
	imports: [TrpcModule, DealsModule, GoogleModule, MailboxModule],
	providers: [MeetingsService, MeetingsRouter],
	exports: [MeetingsService],
})
export class MeetingsModule {}
