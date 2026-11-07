"use client";

import Add from "@carbon/icons-react/es/Add";
import Edit from "@carbon/icons-react/es/Edit";
import { Button } from "@crm/ui/components/button";
import { StatGroup } from "@crm/ui/components/dashboard";
import {
	EntityLogo,
	type EntityLogoTone,
} from "@crm/ui/components/entity-logo";
import { Spinner } from "@crm/ui/components/spinner";
import { StatCard } from "@crm/ui/components/stat-card";
import { Switch } from "@crm/ui/components/switch";
import { formatMoney } from "@crm/ui/lib/format";
import { cn } from "@crm/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BoardNotes } from "@/components/crm/finance/board-notes";
import {
	type Contract,
	ContractSheet,
} from "@/components/crm/finance/contract-sheet";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";

type Editing = { contract: Contract | null } | null;

const MONTH_STATUS = {
	paid: { label: "Pago", className: "bg-success/15 text-success" },
	pending: {
		label: "Em aberto",
		className: "bg-foreground/8 text-muted-foreground",
	},
	overdue: { label: "Vencido", className: "bg-chart-4/15 text-chart-4" },
} as const;

function money(cents: number) {
	return formatMoney(cents, "BRL");
}

export function NewClientButton() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button onClick={() => setOpen(true)}>
				<Add data-icon="inline-start" />
				Novo cliente
			</Button>
			<ContractSheet
				open={open}
				contract={null}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}

export function ClientsView() {
	const trpc = useTRPC();
	const contracts = useQuery(trpc.contracts.list.queryOptions());
	const [editing, setEditing] = useState<Editing>(null);
	const [showEnded, setShowEnded] = useState(false);

	if (contracts.isPending) {
		return (
			<div className="flex justify-center py-24">
				<Spinner size="lg" className="text-foreground" />
			</div>
		);
	}

	if (contracts.isError) {
		return (
			<div className="glass-surface flex flex-col items-center gap-3 py-16 text-center">
				<p className="font-medium">Não foi possível carregar os clientes</p>
				<p className="max-w-sm text-muted-foreground text-sm">
					{contracts.error.message}
				</p>
				<Button
					variant="outline"
					disabled={contracts.isFetching}
					onClick={() => void contracts.refetch()}
				>
					{contracts.isFetching ? <Spinner /> : null}
					Tentar de novo
				</Button>
			</div>
		);
	}

	const data = contracts.data;
	const rows = data?.rows ?? [];
	const live = rows.filter((row) => row.status !== "ENDED");
	const ended = rows.filter((row) => row.status === "ENDED");
	const totals = data?.totals;

	return (
		<div className="flex flex-col gap-6">
			<StatGroup>
				<StatCard
					label="Clientes ativos"
					value={String(totals?.active ?? 0)}
					description="com contrato em andamento"
				/>
				<StatCard
					label="Receita mensal"
					value={money(totals?.monthlyCents ?? 0)}
					description={`${money(totals?.payoutsCents ?? 0)} em repasses`}
				/>
				<StatCard
					label="Fica para a Lugh"
					value={money(totals?.netCents ?? 0)}
					description="por mês, depois dos repasses"
				/>
				<StatCard
					label="Recebido no mês"
					value={money(totals?.receivedCents ?? 0)}
					description={`de ${money(totals?.monthlyCents ?? 0)} previstos`}
				/>
			</StatGroup>

			<div className="glass-surface reveal">
				{live.length === 0 ? (
					<div className="flex flex-col items-center gap-3 py-16 text-center">
						<p className="font-medium">Nenhum cliente com contrato ainda</p>
						<p className="max-w-sm text-muted-foreground text-sm">
							Cadastre um cliente com o valor do contrato. A mensalidade entra
							no Financeiro todo mês.
						</p>
						<NewClientButton />
					</div>
				) : (
					<ul className="divide-y">
						{live.map((contract) => (
							<ClientRow
								key={contract.id}
								contract={contract}
								onEdit={() => setEditing({ contract })}
							/>
						))}
					</ul>
				)}
			</div>

			{ended.length > 0 ? (
				<div className="flex flex-col gap-3">
					<Button
						variant="ghost"
						size="sm"
						className="self-start"
						onClick={() => setShowEnded((current) => !current)}
					>
						{showEnded
							? "Esconder contratos encerrados"
							: `Ver contratos encerrados (${ended.length})`}
					</Button>
					{showEnded ? (
						<div className="glass-surface">
							<ul className="divide-y">
								{ended.map((contract) => (
									<ClientRow
										key={contract.id}
										contract={contract}
										onEdit={() => setEditing({ contract })}
									/>
								))}
							</ul>
						</div>
					) : null}
				</div>
			) : null}

			<BoardNotes
				board="CLIENTS"
				clients={live.map((contract) => ({
					id: contract.company.id,
					name: contract.company.name,
				}))}
			/>

			<ContractSheet
				open={editing !== null}
				contract={editing?.contract ?? null}
				onClose={() => setEditing(null)}
			/>
		</div>
	);
}

function ClientRow({
	contract,
	onEdit,
}: {
	contract: Contract;
	onEdit: () => void;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const openRecord = useOpenRecord();
	const month = contract.thisMonth;
	const status = month ? MONTH_STATUS[month.status] : null;
	const ended = contract.status === "ENDED";

	const setPaid = useMutation(
		trpc.finance.setPaid.mutationOptions({
			onSuccess: async (updated) => {
				await cache.finance();
				toast.success(
					updated.paidAt
						? `${contract.company.name}: mês recebido.`
						: `${contract.company.name}: mês em aberto.`,
				);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const payouts = contract.payouts
		.map((payout) => `${payout.payee} ${money(payout.amountCents)}`)
		.join(" · ");

	return (
		<li
			data-ended={ended ? "" : undefined}
			className="group/client flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-foreground/[0.03] data-ended:opacity-60 md:px-6"
		>
			<button
				type="button"
				onClick={() => openRecord({ kind: "company", id: contract.company.id })}
				className="flex min-w-0 flex-1 items-center gap-3 text-left"
			>
				<EntityLogo
					src={contract.company.iconUrl}
					darkSrc={contract.company.iconDarkUrl}
					tone={contract.company.iconTone as EntityLogoTone | null}
					name={contract.company.name}
					size="sm"
				/>
				<span className="flex min-w-0 flex-col gap-0.5">
					<span className="truncate font-medium text-[13px]">
						{contract.company.name}
					</span>
					<span className="truncate text-muted-foreground text-xs">
						{[
							contract.service,
							ended ? "Contrato encerrado" : `Vence dia ${contract.dueDay}`,
							payouts ? `Repasse: ${payouts}` : null,
						]
							.filter(Boolean)
							.join(" · ")}
					</span>
				</span>
			</button>

			<span className="flex w-36 shrink-0 flex-col items-end">
				<span className="font-semibold tabular-nums">
					{money(contract.monthlyAmountCents)}
				</span>
				<span className="text-muted-foreground text-xs tabular-nums">
					Lugh {money(contract.netAmountCents)}
				</span>
			</span>

			{status && month ? (
				<>
					<span
						className={cn(
							"w-20 shrink-0 rounded-full px-2.5 py-0.5 text-center font-medium text-[11px]",
							status.className,
						)}
					>
						{status.label}
					</span>
					<Switch
						checked={month.paidAt !== null}
						disabled={setPaid.isPending}
						onCheckedChange={(paid) =>
							setPaid.mutate({ id: month.entryId, paid })
						}
						aria-label={`${contract.company.name} pagou este mês`}
					/>
				</>
			) : (
				<span className="w-24 shrink-0 text-right text-muted-foreground text-xs">
					{ended ? "—" : "Começa depois"}
				</span>
			)}

			<Button
				variant="ghost"
				size="icon-xs"
				aria-label={`Editar contrato de ${contract.company.name}`}
				onClick={onEdit}
			>
				<Edit />
			</Button>
		</li>
	);
}
