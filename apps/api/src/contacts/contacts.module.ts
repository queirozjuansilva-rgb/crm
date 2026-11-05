import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { AttachmentsModule } from "../attachments/attachments.module";
import { CompaniesModule } from "../companies/companies.module";
import { FieldsModule } from "../fields/fields.module";
import { TrpcModule } from "../trpc/trpc.module";
import { ContactsRouter } from "./contacts.router";
import { ContactsService } from "./contacts.service";

@Module({
	imports: [
		AttachmentsModule,
		FieldsModule,
		TrpcModule,
		AgentModule,
		CompaniesModule,
	],
	providers: [ContactsService, ContactsRouter],
	exports: [ContactsService],
})
export class ContactsModule {}
