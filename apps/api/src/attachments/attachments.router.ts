import { Inject } from "@nestjs/common";
import {
	Ctx,
	Input,
	Mutation,
	Query,
	Router,
	UseMiddlewares,
} from "nestjs-trpc";
import type { z } from "zod";
import type { AuthedTrpcContext } from "../trpc/context.types";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import {
	attachmentCompleteInput,
	attachmentIdInput,
	attachmentLinkInput,
	attachmentListInput,
	attachmentListOutput,
	attachmentOutput,
	attachmentPrepareInput,
	attachmentPrepareOutput,
	attachmentRemoveOutput,
} from "./attachments.contracts";
import { AttachmentsService } from "./attachments.service";

@Router({ alias: "attachments" })
@UseMiddlewares(AuthMiddleware)
export class AttachmentsRouter {
	constructor(
		@Inject(AttachmentsService)
		private readonly attachments: AttachmentsService,
	) {}

	@Query({
		input: attachmentListInput,
		output: attachmentListOutput,
		meta: restMeta("GET", "/attachments", ["Attachments"]),
	})
	async list(@Input() input: z.infer<typeof attachmentListInput>) {
		return this.attachments.list(input);
	}

	@Mutation({
		input: attachmentPrepareInput,
		output: attachmentPrepareOutput,
		meta: restMeta("POST", "/attachments/uploads", ["Attachments"]),
	})
	async prepareUpload(@Input() input: z.infer<typeof attachmentPrepareInput>) {
		return this.attachments.prepareUpload(input);
	}

	@Mutation({
		input: attachmentCompleteInput,
		output: attachmentOutput,
		meta: restMeta("POST", "/attachments/files", ["Attachments"]),
	})
	async completeUpload(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof attachmentCompleteInput>,
	) {
		return this.attachments.completeUpload(input, ctx.user.id);
	}

	@Mutation({
		input: attachmentLinkInput,
		output: attachmentOutput,
		meta: restMeta("POST", "/attachments/links", ["Attachments"]),
	})
	async addLink(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof attachmentLinkInput>,
	) {
		return this.attachments.addLink(input, ctx.user.id);
	}

	@Mutation({
		input: attachmentIdInput,
		output: attachmentRemoveOutput,
		meta: restMeta("DELETE", "/attachments/{id}", ["Attachments"]),
	})
	async remove(@Input("id") id: string) {
		return this.attachments.remove(id);
	}
}
