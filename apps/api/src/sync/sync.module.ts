import { Module } from "@nestjs/common";
import { GoogleModule } from "../google/google.module";
import { MailboxModule } from "../mailbox/mailbox.module";
import { MeetingsModule } from "../meetings/meetings.module";
import { MicrosoftModule } from "../microsoft/microsoft.module";
import { MailboxSyncService } from "./mailbox-sync.service";
import { SyncController } from "./sync.controller";

@Module({
	imports: [MailboxModule, GoogleModule, MicrosoftModule, MeetingsModule],
	controllers: [SyncController],
	providers: [MailboxSyncService],
	exports: [MailboxSyncService],
})
export class SyncModule {}
