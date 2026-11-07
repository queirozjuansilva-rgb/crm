"use client";

import TrashCan from "@carbon/icons-react/es/TrashCan";
import { Button } from "@crm/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@crm/ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import { Spinner } from "@crm/ui/components/spinner";
import { Textarea } from "@crm/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { LocalDateTime } from "@/components/local-date-time";
import { useTRPC } from "@/lib/trpc/client";

type Board = "CLIENTS" | "FINANCE";
type ClientOption = { id: string; name: string };

const NO_CLIENT = "none";

const WHEN = {
	day: "2-digit",
	month: "short",
	hour: "2-digit",
	minute: "2-digit",
} as const;

const COPY: Record<Board, { description: string; placeholder: string }> = {
	CLIENTS: {
		description: "Atrasos, combinados e o que precisa de atenção nos clientes.",
		placeholder: "Ex.: Maranata pediu para pagar dia 15 este mês.",
	},
	FINANCE: {
		description:
			"Contas que vieram maiores, pagamentos extras e lembretes do mês.",
		placeholder:
			"Ex.: Cartão veio R$ 120 a mais por causa da renovação do domínio.",
	},
};

export function BoardNotes({
	board,
	period,
	clients = [],
}: {
	board: Board;
	period?: string;
	clients?: ClientOption[];
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const openRecord = useOpenRecord();
	const bodyId = useId();
	const [body, setBody] = useState("");
	const [clientId, setClientId] = useState(NO_CLIENT);

	const input = { board, ...(period ? { period } : {}) };
	const notes = useQuery(trpc.boardNotes.list.queryOptions(input));
	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: trpc.boardNotes.list.queryKey(),
		});

	const create = useMutation(
		trpc.boardNotes.create.mutationOptions({
			onSuccess: async () => {
				await refresh();
				setBody("");
				setClientId(NO_CLIENT);
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const remove = useMutation(
		trpc.boardNotes.remove.mutationOptions({
			onSuccess: refresh,
			onError: (error) => toast.error(error.message),
		}),
	);

	const rows = notes.data ?? [];

	return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle>Observações</CardTitle>
				<CardDescription>{COPY[board].description}</CardDescription>
			</CardHeader>
			<div className="glass-surface reveal flex flex-col">
				<form
					className="flex flex-col gap-3 p-4 md:px-6"
					onSubmit={(event) => {
						event.preventDefault();
						if (body.trim() === "") return;
						create.mutate({
							...input,
							body: body.trim(),
							companyId: clientId === NO_CLIENT ? undefined : clientId,
						});
					}}
				>
					<Textarea
						id={bodyId}
						aria-label="Nova observação"
						value={body}
						onChange={(event) => setBody(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
								event.currentTarget.form?.requestSubmit();
							}
						}}
						placeholder={COPY[board].placeholder}
						rows={2}
					/>
					<div className="flex flex-wrap items-center justify-end gap-2">
						{clients.length > 0 ? (
							<Select value={clientId} onValueChange={setClientId}>
								<SelectTrigger aria-label="Cliente da observação" size="sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NO_CLIENT}>Sem cliente</SelectItem>
									{clients.map((client) => (
										<SelectItem key={client.id} value={client.id}>
											{client.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : null}
						<Button
							type="submit"
							size="sm"
							disabled={create.isPending || body.trim() === ""}
						>
							{create.isPending ? <Spinner /> : null}
							Adicionar
						</Button>
					</div>
				</form>

				{notes.isPending ? (
					<div className="flex justify-center border-t py-6">
						<Spinner className="text-muted-foreground" />
					</div>
				) : notes.isError ? (
					<p className="border-t py-6 text-center text-muted-foreground text-sm">
						Não foi possível carregar as observações: {notes.error.message}
					</p>
				) : rows.length === 0 ? (
					<p className="border-t py-6 text-center text-muted-foreground text-sm">
						Nenhuma observação ainda.
					</p>
				) : (
					<ul className="divide-y border-t">
						{rows.map((note) => (
							<li
								key={note.id}
								className="group/note flex items-start gap-3 px-4 py-3 md:px-6"
							>
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<p className="whitespace-pre-wrap text-sm">{note.body}</p>
									<span className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs">
										<LocalDateTime date={note.createdAt} options={WHEN} />
										{note.author ? <span>· {note.author.name}</span> : null}
										{note.company ? (
											<>
												<span>·</span>
												<button
													type="button"
													className="hover:text-foreground"
													onClick={() =>
														note.company &&
														openRecord({ kind: "company", id: note.company.id })
													}
												>
													{note.company.name}
												</button>
											</>
										) : null}
									</span>
								</div>
								<Button
									variant="ghost"
									size="icon-xs"
									aria-label="Apagar observação"
									disabled={remove.isPending}
									onClick={() => remove.mutate({ id: note.id })}
									className="opacity-60 group-hover/note:opacity-100"
								>
									<TrashCan />
								</Button>
							</li>
						))}
					</ul>
				)}
			</div>
		</Card>
	);
}
