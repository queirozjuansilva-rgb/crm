import type { Db } from "@crm/db";
import type { AttachmentRecord } from "@crm/validation/attachments";
import {
	BadRequestException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import { AttachmentStorageService } from "./attachment-storage.service";
import type {
	AttachmentCompleteInput,
	AttachmentLinkInput,
	AttachmentOutput,
	AttachmentPrepareInput,
} from "./attachments.contracts";
import { ATTACHMENT_STORAGE } from "./attachments-config";

type RecordWhere =
	| { dealId: string }
	| { companyId: string }
	| { contactId: string };

const ROW_SELECT = {
	id: true,
	kind: true,
	name: true,
	url: true,
	storagePath: true,
	contentType: true,
	size: true,
	createdAt: true,
	createdBy: { select: { id: true, name: true } },
} as const;

function recordWhere(record: AttachmentRecord): RecordWhere {
	if (record.kind === "deal") return { dealId: record.id };
	if (record.kind === "company") return { companyId: record.id };
	return { contactId: record.id };
}

function storagePrefix(record: AttachmentRecord): string {
	return `${record.kind}/${record.id}`;
}

function linkName(url: string): string {
	try {
		const parsed = new URL(url);
		const path = parsed.pathname === "/" ? "" : parsed.pathname;
		return `${parsed.hostname.replace(/^www\./, "")}${path}`.slice(0, 200);
	} catch {
		return url.slice(0, 200);
	}
}

@Injectable()
export class AttachmentsService {
	constructor(
		@InjectDatabase() private readonly db: Db,
		@Inject(AttachmentStorageService)
		private readonly storage: AttachmentStorageService,
	) {}

	async list(record: AttachmentRecord) {
		const rows = await this.db.attachment.findMany({
			where: recordWhere(record),
			orderBy: { createdAt: "desc" },
			take: ATTACHMENT_STORAGE.listLimit,
			select: ROW_SELECT,
		});
		const urls = await this.storage.downloadUrls(
			rows.flatMap((row) => (row.storagePath ? [row.storagePath] : [])),
		);

		return {
			rows: rows.map((row) =>
				this.serialize(
					row,
					row.storagePath ? (urls.get(row.storagePath) ?? null) : row.url,
				),
			),
			filesEnabled: this.storage.enabled,
		};
	}

	async prepareUpload(input: AttachmentPrepareInput) {
		await this.requireRecord(input.record);
		const path = this.storage.pathFor(storagePrefix(input.record), input.name);
		const uploadUrl = await this.storage.createUploadUrl(path);
		return { path, uploadUrl };
	}

	async completeUpload(
		input: AttachmentCompleteInput,
		userId: string,
	): Promise<AttachmentOutput> {
		if (!input.path.startsWith(`${storagePrefix(input.record)}/`)) {
			throw new BadRequestException(
				"Este arquivo não pertence a este registro.",
			);
		}
		await this.requireRecord(input.record);
		if (!(await this.storage.exists(input.path))) {
			throw new BadRequestException(
				"O arquivo não chegou ao armazenamento. Envie de novo.",
			);
		}

		const row = await this.db.attachment.upsert({
			where: { storagePath: input.path },
			update: {},
			create: {
				kind: "FILE",
				name: input.name,
				storagePath: input.path,
				contentType: input.contentType,
				size: input.size,
				createdById: userId,
				...recordWhere(input.record),
			},
			select: ROW_SELECT,
		});
		const urls = await this.storage.downloadUrls([input.path]);
		return this.serialize(row, urls.get(input.path) ?? null);
	}

	async addLink(
		input: AttachmentLinkInput,
		userId: string,
	): Promise<AttachmentOutput> {
		await this.requireRecord(input.record);
		const row = await this.db.attachment.create({
			data: {
				kind: "LINK",
				name: input.name || linkName(input.url),
				url: input.url,
				createdById: userId,
				...recordWhere(input.record),
			},
			select: ROW_SELECT,
		});
		return this.serialize(row, row.url);
	}

	async remove(id: string) {
		const row = await this.db.attachment
			.delete({ where: { id }, select: { id: true, storagePath: true } })
			.catch(() => {
				throw new NotFoundException("Este anexo não existe mais.");
			});
		if (row.storagePath) await this.storage.remove(row.storagePath);
		return { id: row.id };
	}

	private async requireRecord(record: AttachmentRecord): Promise<void> {
		const where = { id: record.id };
		const found =
			record.kind === "deal"
				? await this.db.deal.findUnique({ where, select: { id: true } })
				: record.kind === "company"
					? await this.db.company.findUnique({ where, select: { id: true } })
					: await this.db.contact.findUnique({ where, select: { id: true } });
		if (!found) throw new NotFoundException("Este registro não existe mais.");
	}

	private serialize(
		row: {
			id: string;
			kind: "FILE" | "LINK";
			name: string;
			contentType: string | null;
			size: number | null;
			createdAt: Date;
			createdBy: { id: string; name: string } | null;
		},
		href: string | null,
	): AttachmentOutput {
		return {
			id: row.id,
			kind: row.kind,
			name: row.name,
			href,
			contentType: row.contentType,
			size: row.size,
			createdAt: row.createdAt.toISOString(),
			createdBy: row.createdBy,
		};
	}
}
