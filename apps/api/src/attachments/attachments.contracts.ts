import {
	ATTACHMENTS,
	attachmentContentType,
	attachmentFileName,
	attachmentFileSize,
	attachmentRecord,
} from "@crm/validation/attachments";
import { z } from "zod";

export const attachmentListInput = attachmentRecord;

export const attachmentOutput = z.object({
	id: z.string(),
	kind: z.enum(["FILE", "LINK"]),
	name: z.string(),
	href: z.string().nullable(),
	contentType: z.string().nullable(),
	size: z.number().int().nullable(),
	createdAt: z.string(),
	createdBy: z.object({ id: z.string(), name: z.string() }).nullable(),
});

export type AttachmentOutput = z.infer<typeof attachmentOutput>;

export const attachmentListOutput = z.object({
	rows: z.array(attachmentOutput),
	filesEnabled: z.boolean(),
});

export const attachmentPrepareInput = z.object({
	record: attachmentRecord,
	name: attachmentFileName,
	contentType: attachmentContentType,
	size: attachmentFileSize,
});

export type AttachmentPrepareInput = z.infer<typeof attachmentPrepareInput>;

export const attachmentPrepareOutput = z.object({
	path: z.string(),
	uploadUrl: z.string(),
});

export const attachmentCompleteInput = attachmentPrepareInput.extend({
	path: z.string().trim().min(1).max(400),
});

export type AttachmentCompleteInput = z.infer<typeof attachmentCompleteInput>;

export const attachmentLinkInput = z.object({
	record: attachmentRecord,
	url: z
		.string()
		.trim()
		.max(ATTACHMENTS.maxUrlLength, "O link é longo demais.")
		.transform((value) =>
			/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`,
		)
		.pipe(
			z
				.url({ protocol: /^https?$/, message: "Cole um link válido." })
				.max(ATTACHMENTS.maxUrlLength),
		),
	name: z
		.string()
		.trim()
		.max(ATTACHMENTS.maxNameLength, "O nome é longo demais.")
		.optional(),
});

export type AttachmentLinkInput = z.infer<typeof attachmentLinkInput>;

export const attachmentIdInput = z.object({ id: z.string() });

export const attachmentRemoveOutput = z.object({ id: z.string() });
