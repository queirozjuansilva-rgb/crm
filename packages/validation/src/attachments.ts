import { z } from "zod";

const MEGABYTE = 1024 * 1024;

export const ATTACHMENTS = {
	maxBytes: 25 * MEGABYTE,
	maxNameLength: 200,
	maxUrlLength: 2048,
	acceptedTypes: {
		"application/pdf": "PDF",
		"image/png": "PNG",
		"image/jpeg": "JPG",
		"image/webp": "WEBP",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
			"DOCX",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation":
			"PPTX",
		"text/csv": "CSV",
		"text/plain": "TXT",
	},
} as const;

export type AcceptedContentType = keyof typeof ATTACHMENTS.acceptedTypes;

export const ATTACHMENT_CONTENT_TYPES = Object.keys(
	ATTACHMENTS.acceptedTypes,
) as AcceptedContentType[];

export const ATTACHMENT_RECORD_KINDS = ["deal", "company", "contact"] as const;

export const attachmentRecord = z.object({
	kind: z.enum(ATTACHMENT_RECORD_KINDS),
	id: z.string().trim().min(1),
});

export type AttachmentRecord = z.infer<typeof attachmentRecord>;

export const attachmentContentType = z.enum(
	ATTACHMENT_CONTENT_TYPES as [AcceptedContentType, ...AcceptedContentType[]],
	{ message: "Envie um PDF, imagem, planilha, documento ou texto." },
);

export const attachmentFileName = z
	.string()
	.trim()
	.min(1, "O arquivo precisa de um nome.")
	.max(ATTACHMENTS.maxNameLength, "O nome do arquivo é longo demais.");

export const attachmentFileSize = z
	.number()
	.int()
	.positive("O arquivo está vazio.")
	.max(ATTACHMENTS.maxBytes, "O arquivo passa de 25 MB.");

const EXTENSION_TYPES: Record<string, AcceptedContentType> = {
	pdf: "application/pdf",
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	csv: "text/csv",
	txt: "text/plain",
};

export function attachmentContentTypeFor(
	name: string,
	type: string,
): AcceptedContentType | null {
	if (type in ATTACHMENTS.acceptedTypes) return type as AcceptedContentType;
	const extension = name.split(".").pop()?.toLowerCase() ?? "";
	return EXTENSION_TYPES[extension] ?? null;
}

export function attachmentTypeLabel(contentType: string | null): string {
	if (!contentType) return "ARQUIVO";
	return (
		ATTACHMENTS.acceptedTypes[contentType as AcceptedContentType] ?? "ARQUIVO"
	);
}
