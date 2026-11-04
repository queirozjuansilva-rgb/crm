"use client";

import Add from "@carbon/icons-react/es/Add";
import LinkIcon from "@carbon/icons-react/es/Link";
import Upload from "@carbon/icons-react/es/Upload";
import {
	AttachmentGrid,
	AttachmentTile,
	FileDropZone,
} from "@crm/ui/components/attachment-tile";
import { Button } from "@crm/ui/components/button";
import { Input } from "@crm/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@crm/ui/components/popover";
import { Spinner } from "@crm/ui/components/spinner";
import { formatBytes } from "@crm/ui/lib/format";
import {
	ATTACHMENT_CONTENT_TYPES,
	ATTACHMENTS,
	type AttachmentRecord,
	attachmentContentTypeFor,
	attachmentTypeLabel,
} from "@crm/validation/attachments";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { DetailSheetSection } from "@/components/detail-sheet";
import { LocalRelativeTime } from "@/components/local-date-time";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";

type Uploading = { key: string; name: string; contentType: string };

const ACCEPT = [
	...ATTACHMENT_CONTENT_TYPES,
	".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx,.csv,.txt",
].join(",");

async function sendToStorage(
	uploadUrl: string,
	file: File,
	contentType: string,
): Promise<void> {
	const response = await fetch(uploadUrl, {
		method: "PUT",
		body: file,
		headers: {
			"content-type": contentType,
			"cache-control": "max-age=3600",
			"x-upsert": "false",
		},
	});
	if (!response.ok) {
		throw new Error("O arquivo não foi enviado. Tente de novo.");
	}
}

export function AttachmentsSection({ record }: { record: AttachmentRecord }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const inputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState<Uploading[]>([]);
	const [removing, setRemoving] = useState<string | null>(null);

	const attachments = useQuery(trpc.attachments.list.queryOptions(record));
	const prepare = useMutation(trpc.attachments.prepareUpload.mutationOptions());
	const complete = useMutation(
		trpc.attachments.completeUpload.mutationOptions(),
	);
	const remove = useMutation(
		trpc.attachments.remove.mutationOptions({
			onMutate: ({ id }) => setRemoving(id),
			onSuccess: async () => {
				await cache.attachments(record);
				toast.success("Anexo removido.");
			},
			onError: (error) => toast.error(error.message),
			onSettled: () => setRemoving(null),
		}),
	);

	const filesEnabled = attachments.data?.filesEnabled ?? false;
	const rows = attachments.data?.rows ?? [];

	const upload = async (file: File) => {
		const contentType = attachmentContentTypeFor(file.name, file.type);
		if (!contentType) {
			toast.error(
				`${file.name}: envie PDF, imagem, planilha, documento ou texto.`,
			);
			return;
		}
		if (file.size > ATTACHMENTS.maxBytes) {
			toast.error(`${file.name}: o arquivo passa de 25 MB.`);
			return;
		}
		const key = `${file.name}-${file.size}-${file.lastModified}`;
		setUploading((current) => [
			...current,
			{ key, name: file.name, contentType },
		]);
		try {
			const meta = {
				record,
				name: file.name,
				contentType,
				size: file.size,
			};
			const { path, uploadUrl } = await prepare.mutateAsync(meta);
			await sendToStorage(uploadUrl, file, contentType);
			await complete.mutateAsync({ ...meta, path });
			await cache.attachments(record);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "O envio falhou.");
		} finally {
			setUploading((current) => current.filter((item) => item.key !== key));
		}
	};

	const onFiles = (files: File[]) => {
		for (const file of files) void upload(file);
	};

	const count = rows.length;

	return (
		<DetailSheetSection
			title={count > 0 ? `Anexos · ${count}` : "Anexos"}
			action={
				<div className="flex items-center gap-1.5">
					<AddLinkButton record={record} />
					{filesEnabled ? (
						<>
							<Button
								variant="outline"
								size="xs"
								onClick={() => inputRef.current?.click()}
							>
								<Upload data-icon="inline-start" />
								Arquivo
							</Button>
							<input
								ref={inputRef}
								type="file"
								multiple
								accept={ACCEPT}
								className="sr-only"
								tabIndex={-1}
								onChange={(event) => {
									onFiles(Array.from(event.target.files ?? []));
									event.target.value = "";
								}}
							/>
						</>
					) : null}
				</div>
			}
		>
			<FileDropZone onFiles={onFiles} disabled={!filesEnabled}>
				{attachments.isPending ? (
					<div className="flex justify-center py-6">
						<Spinner className="text-muted-foreground" />
					</div>
				) : count === 0 && uploading.length === 0 ? (
					<button
						type="button"
						disabled={!filesEnabled}
						onClick={() => inputRef.current?.click()}
						className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center text-muted-foreground text-xs transition-colors hover:border-ring/60 hover:text-foreground disabled:cursor-default disabled:hover:border-border disabled:hover:text-muted-foreground"
					>
						<span className="font-medium text-foreground text-sm">
							Nenhum anexo ainda
						</span>
						{filesEnabled
							? "Arraste PDFs aqui, clique para escolher ou adicione um link."
							: "Adicione links. O envio de arquivos ainda não está configurado."}
					</button>
				) : (
					<AttachmentGrid>
						{uploading.map((item) => (
							<AttachmentTile
								key={item.key}
								kind="FILE"
								label={attachmentTypeLabel(item.contentType)}
								name={item.name}
								detail="Enviando…"
								pending
							/>
						))}
						{rows.map((row) => (
							<AttachmentTile
								key={row.id}
								kind={row.kind}
								label={attachmentTypeLabel(row.contentType)}
								name={row.name}
								href={row.href}
								pending={removing === row.id}
								onRemove={() => remove.mutate({ id: row.id })}
								detail={
									<>
										{row.size !== null ? `${formatBytes(row.size)} · ` : null}
										<LocalRelativeTime date={row.createdAt} />
										{row.createdBy ? ` · ${row.createdBy.name}` : null}
									</>
								}
							/>
						))}
					</AttachmentGrid>
				)}
			</FileDropZone>
		</DetailSheetSection>
	);
}

function AddLinkButton({ record }: { record: AttachmentRecord }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const urlId = useId();
	const nameId = useId();
	const [open, setOpen] = useState(false);
	const [url, setUrl] = useState("");
	const [name, setName] = useState("");

	const addLink = useMutation(
		trpc.attachments.addLink.mutationOptions({
			onSuccess: async () => {
				await cache.attachments(record);
				setUrl("");
				setName("");
				setOpen(false);
				toast.success("Link anexado.");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="xs">
					<LinkIcon data-icon="inline-start" />
					Link
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80">
				<form
					className="flex flex-col gap-3"
					onSubmit={(event) => {
						event.preventDefault();
						if (url.trim() === "") return;
						addLink.mutate({
							record,
							url,
							name: name.trim() || undefined,
						});
					}}
				>
					<label htmlFor={urlId} className="flex flex-col gap-1.5 text-xs">
						<span className="font-medium">Link</span>
						<Input
							id={urlId}
							value={url}
							onChange={(event) => setUrl(event.target.value)}
							placeholder="https://drive.google.com/…"
							autoFocus
						/>
					</label>
					<label htmlFor={nameId} className="flex flex-col gap-1.5 text-xs">
						<span className="font-medium">Nome (opcional)</span>
						<Input
							id={nameId}
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Proposta comercial"
						/>
					</label>
					<Button
						type="submit"
						size="sm"
						disabled={addLink.isPending || url.trim() === ""}
					>
						{addLink.isPending ? <Spinner /> : <Add data-icon="inline-start" />}
						Anexar link
					</Button>
				</form>
			</PopoverContent>
		</Popover>
	);
}
