import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { AttachmentStorageService } from "./attachment-storage.service";
import { AttachmentsRouter } from "./attachments.router";
import { AttachmentsService } from "./attachments.service";

@Module({
	imports: [TrpcModule],
	providers: [AttachmentStorageService, AttachmentsService, AttachmentsRouter],
	exports: [AttachmentStorageService],
})
export class AttachmentsModule {}
