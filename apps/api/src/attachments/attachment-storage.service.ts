import { randomUUID } from "node:crypto";
import {
	Inject,
	Injectable,
	Logger,
	ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import type { EnvironmentVariables } from "../config/env.validation";
import { ATTACHMENT_STORAGE } from "./attachments-config";

type StorageConfig = { baseUrl: string; key: string; bucket: string };

const signedUploadResponse = z.object({ url: z.string() });

const signedDownloadResponse = z.array(
	z.object({
		path: z.string().nullable(),
		signedURL: z.string().nullable(),
	}),
);

function safeFileName(name: string): string {
	const cleaned = name
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-zA-Z0-9._-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
	return (cleaned || "arquivo").slice(-120);
}

function encodePath(path: string): string {
	return path.split("/").map(encodeURIComponent).join("/");
}

@Injectable()
export class AttachmentStorageService {
	private readonly logger = new Logger(AttachmentStorageService.name);
	private readonly config: StorageConfig | null;

	constructor(
		@Inject(ConfigService)
		config: ConfigService<EnvironmentVariables, true>,
	) {
		const url = config.get("SUPABASE_URL", { infer: true });
		const key = config.get("SUPABASE_SERVICE_ROLE_KEY", { infer: true });
		const bucket =
			config.get("ATTACHMENTS_BUCKET", { infer: true }) ||
			ATTACHMENT_STORAGE.defaultBucket;
		this.config =
			url && key
				? { baseUrl: `${url.replace(/\/+$/, "")}/storage/v1`, key, bucket }
				: null;
	}

	get enabled(): boolean {
		return this.config !== null;
	}

	pathFor(prefix: string, name: string): string {
		return `${prefix}/${randomUUID()}-${safeFileName(name)}`;
	}

	async createUploadUrl(path: string): Promise<string> {
		const config = this.require();
		const response = await this.call(
			`/object/upload/sign/${config.bucket}/${encodePath(path)}`,
			{ method: "POST", body: "{}" },
		);
		const body = signedUploadResponse.parse(await response.json());
		return `${config.baseUrl}${body.url}`;
	}

	async exists(path: string): Promise<boolean> {
		const config = this.require();
		const response = await this.call(
			`/object/info/${config.bucket}/${encodePath(path)}`,
			{ method: "GET" },
			{ allow: [400, 404] },
		);
		return response.ok;
	}

	async downloadUrls(paths: string[]): Promise<Map<string, string>> {
		const urls = new Map<string, string>();
		if (!this.config || paths.length === 0) return urls;
		const config = this.config;
		try {
			const response = await this.call(`/object/sign/${config.bucket}`, {
				method: "POST",
				body: JSON.stringify({
					expiresIn: ATTACHMENT_STORAGE.downloadUrlTtlS,
					paths,
				}),
			});
			for (const item of signedDownloadResponse.parse(await response.json())) {
				if (item.path && item.signedURL) {
					urls.set(item.path, `${config.baseUrl}${item.signedURL}`);
				}
			}
		} catch (error) {
			this.logger.warn({
				message: "Could not sign attachment download links",
				error: error instanceof Error ? error.message : String(error),
			});
		}
		return urls;
	}

	async remove(path: string): Promise<void> {
		if (!this.config) return;
		try {
			await this.call(`/object/${this.config.bucket}`, {
				method: "DELETE",
				body: JSON.stringify({ prefixes: [path] }),
			});
		} catch (error) {
			this.logger.warn({
				message: "Could not delete an attachment file from storage",
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private require(): StorageConfig {
		if (!this.config) {
			throw new ServiceUnavailableException(
				"O envio de arquivos não está configurado. Links continuam funcionando.",
			);
		}
		return this.config;
	}

	private async call(
		path: string,
		init: RequestInit,
		options: { allow?: number[] } = {},
	): Promise<Response> {
		const config = this.require();
		const response = await fetch(`${config.baseUrl}${path}`, {
			...init,
			headers: {
				Authorization: `Bearer ${config.key}`,
				apikey: config.key,
				"Content-Type": "application/json",
			},
			signal: AbortSignal.timeout(ATTACHMENT_STORAGE.requestTimeoutMs),
		});
		if (!response.ok && !options.allow?.includes(response.status)) {
			this.logger.error({
				message: "Storage request failed",
				status: response.status,
			});
			throw new ServiceUnavailableException(
				"O armazenamento de arquivos não respondeu. Tente de novo em instantes.",
			);
		}
		return response;
	}
}
