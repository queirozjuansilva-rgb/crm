"use client";

import DocumentIcon from "@carbon/icons-react/es/Document";
import DocumentPdf from "@carbon/icons-react/es/DocumentPdf";
import ImageIcon from "@carbon/icons-react/es/Image";
import Launch from "@carbon/icons-react/es/Launch";
import LinkIcon from "@carbon/icons-react/es/Link";
import TrashCan from "@carbon/icons-react/es/TrashCan";
import { Spinner } from "@crm/ui/components/spinner";
import { cn } from "@crm/ui/lib/utils";
import * as React from "react";

type AttachmentTone = "pdf" | "image" | "sheet" | "doc" | "link";

const TONE_ICON = {
	pdf: DocumentPdf,
	image: ImageIcon,
	sheet: DocumentIcon,
	doc: DocumentIcon,
	link: LinkIcon,
} as const;

const TONE_CLASS: Record<AttachmentTone, string> = {
	pdf: "bg-chart-4/15 text-chart-4",
	image: "bg-chart-2/15 text-chart-2",
	sheet: "bg-success/15 text-success",
	doc: "bg-primary/15 text-primary",
	link: "bg-ring/15 text-ring",
};

function toneFor(kind: "FILE" | "LINK", label: string): AttachmentTone {
	if (kind === "LINK") return "link";
	if (label === "PDF") return "pdf";
	if (["PNG", "JPG", "WEBP"].includes(label)) return "image";
	if (["XLSX", "CSV"].includes(label)) return "sheet";
	return "doc";
}

function AttachmentGrid({ className, ...props }: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="attachment-grid"
			className={cn(
				"grid grid-cols-1 gap-2 sm:grid-cols-2",
				className,
			)}
			{...props}
		/>
	);
}

function AttachmentTile({
	kind,
	label,
	name,
	detail,
	href,
	pending = false,
	onRemove,
	removeLabel = "Remover anexo",
}: {
	kind: "FILE" | "LINK";
	label: string;
	name: string;
	detail?: React.ReactNode;
	href?: string | null;
	pending?: boolean;
	onRemove?: () => void;
	removeLabel?: string;
}) {
	const tone = toneFor(kind, label);
	const Glyph = TONE_ICON[tone];
	const body = (
		<>
			<span
				className={cn(
					"flex size-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md",
					TONE_CLASS[tone],
				)}
			>
				{pending ? <Spinner /> : <Glyph className="size-4" />}
				<span className="font-mono text-[8px] uppercase tracking-[0.08em]">
					{kind === "LINK" ? "LINK" : label}
				</span>
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate font-medium text-[13px]">{name}</span>
				{detail ? (
					<span className="truncate text-muted-foreground text-xs">
						{detail}
					</span>
				) : null}
			</span>
			{href ? (
				<Launch
					aria-hidden
					className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/attachment:opacity-100"
				/>
			) : null}
		</>
	);

	return (
		<li
			data-slot="attachment-tile"
			data-pending={pending ? "" : undefined}
			className="group/attachment spotlight lift relative flex rounded-lg border bg-card data-pending:opacity-70"
		>
			{href ? (
				<a
					href={href}
					target="_blank"
					rel="noreferrer noopener"
					className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2.5 pr-10 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
				>
					{body}
				</a>
			) : (
				<span className="flex min-w-0 flex-1 items-center gap-3 p-2.5 pr-10">
					{body}
				</span>
			)}
			{onRemove ? (
				<button
					type="button"
					aria-label={removeLabel}
					onClick={onRemove}
					className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/60 group-hover/attachment:opacity-100"
				>
					<TrashCan className="size-3.5" />
				</button>
			) : null}
		</li>
	);
}

function FileDropZone({
	onFiles,
	disabled = false,
	className,
	children,
}: {
	onFiles: (files: File[]) => void;
	disabled?: boolean;
	className?: string;
	children: React.ReactNode;
}) {
	const [over, setOver] = React.useState(false);
	const depth = React.useRef(0);

	const hasFiles = (event: React.DragEvent) =>
		Array.from(event.dataTransfer.types).includes("Files");

	return (
		<div
			data-slot="file-drop-zone"
			data-over={over ? "" : undefined}
			className={cn(
				"relative rounded-xl transition-colors data-over:bg-primary/8",
				className,
			)}
			onDragEnter={(event) => {
				if (disabled || !hasFiles(event)) return;
				event.preventDefault();
				depth.current += 1;
				setOver(true);
			}}
			onDragOver={(event) => {
				if (disabled || !hasFiles(event)) return;
				event.preventDefault();
				event.dataTransfer.dropEffect = "copy";
			}}
			onDragLeave={() => {
				depth.current = Math.max(0, depth.current - 1);
				if (depth.current === 0) setOver(false);
			}}
			onDrop={(event) => {
				if (disabled || !hasFiles(event)) return;
				event.preventDefault();
				depth.current = 0;
				setOver(false);
				onFiles(Array.from(event.dataTransfer.files));
			}}
		>
			{children}
			{over ? (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border-2 border-ring border-dashed bg-background/70 font-medium text-sm backdrop-blur-sm">
					Solte para anexar
				</div>
			) : null}
		</div>
	);
}

export { AttachmentGrid, AttachmentTile, FileDropZone };
