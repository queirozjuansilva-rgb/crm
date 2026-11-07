"use client";

import ChevronLeft from "@carbon/icons-react/es/ChevronLeft";
import ChevronRight from "@carbon/icons-react/es/ChevronRight";
import TrashCan from "@carbon/icons-react/es/TrashCan";
import { Button } from "@crm/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@crm/ui/components/card";
import type { ChartConfig } from "@crm/ui/components/chart";
import { StatGroup } from "@crm/ui/components/dashboard";
import {
	EntityLogo,
	type EntityLogoTone,
} from "@crm/ui/components/entity-logo";
import { Spinner } from "@crm/ui/components/spinner";
import { StatCard } from "@crm/ui/components/stat-card";
import { Switch } from "@crm/ui/components/switch";
import { ToggleGroup, ToggleGroupItem } from "@crm/ui/components/toggle-group";
import { formatMoney } from "@crm/ui/lib/format";
import { cn } from "@crm/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BoardNotes } from "@/components/crm/finance/board-notes";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { BarTrend } from "@/components/dashboard-charts";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import { FinanceEntrySheet } from "./finance-entry-sheet";
import { FixedCostsCard } from "./fixed-costs-card";

type Entry = RouterOutputs["finance"]["list"]["rows"][number];

const KINDS = ["all", "INCOME", "EXPENSE"] as const;

const KIND_LABELS: Record<(typeof KINDS)[number], string> = {
	all: "Todos",
	INCOME: "Receitas",
	EXPENSE: "Despesas",
};

const STATUS: Record<Entry["status"], { label: string; className: string }> = {
	paid: { label: "Pago", className: "bg-success/15 text-success" },
	pending: {
		label: "Em aberto",
		className: "bg-foreground/8 text-muted-foreground",
	},
	overdue: { label: "Vencido", className: "bg-chart-4/15 text-chart-4" },
};

const FLOW_CONFIG: ChartConfig = {
	income: { label: "Receitas", color: "var(--primary)" },
	expense: { label: "Despesas", color: "var(--chart-4)" },
};

const financeParams = {
	[SEARCH_PARAM.finance.month]: parseAsString,
	[SEARCH_PARAM.finance.kind]: parseAsStringLiteral(KINDS).withDefault("all"),
};

const monthLabel = new Intl.DateTimeFormat("pt-BR", {
	month: "long",
	year: "numeric",
});
const dayLabel = new Intl.DateTimeFormat("pt-BR", {
	day: "2-digit",
	month: "short",
	timeZone: "UTC",
});

function monthKey(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string | null): Date | null {
	const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null;
	return match ? new Date(Number(match[1]), Number(match[2]) - 1, 1) : null;
}

function money(cents: number) {
	return formatMoney(cents, "BRL");
}

export function FinanceView() {
	const trpc = useTRPC();
	const [params, setParams] = useQueryStates(financeParams);
	const kind = params[SEARCH_PARAM.finance.kind];
	const [current, setCurrent] = useState<Date | null>(null);

	useEffect(() => {
		const now = new Date();
		setCurrent(new Date(now.getFullYear(), now.getMonth(), 1));
	}, []);

	const month = parseMonth(params[SEARCH_PARAM.finance.month]) ?? current;
	const range = useMemo(
		() =>
			month
				? {
						from: month.toISOString(),
						to: new Date(
							month.getFullYear(),
							month.getMonth() + 1,
							1,
						).toISOString(),
					}
				: null,
		[month],
	);

	const list = useQuery({
		...trpc.finance.list.queryOptions({
			from: range?.from ?? new Date(0).toISOString(),
			to: range?.to ?? new Date(1).toISOString(),
			kind,
		}),
		enabled: range !== null,
		placeholderData: (previous) => previous,
	});
	const summary = useQuery(trpc.finance.summary.queryOptions({ months: 6 }));

	if (!month) {
		return (
			<div className="flex justify-center py-24">
				<Spinner size="lg" className="text-foreground" />
			</div>
		);
	}

	const shift = (offset: number) =>
		void setParams({
			[SEARCH_PARAM.finance.month]: monthKey(
				new Date(month.getFullYear(), month.getMonth() + offset, 1),
			),
		});

	const totals = list.data?.totals;
	const balance = (totals?.incomeCents ?? 0) - (totals?.expenseCents ?? 0);
	const flow = (summary.data?.monthly ?? []).map((point) => ({
		month: point.label,
		income: point.incomeCents,
		expense: point.expenseCents,
	}));
	const overdue = summary.data?.overdue;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon-sm"
						aria-label="Mês anterior"
						onClick={() => shift(-1)}
					>
						<ChevronLeft />
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							void setParams({ [SEARCH_PARAM.finance.month]: null })
						}
					>
						Este mês
					</Button>
					<Button
						variant="outline"
						size="icon-sm"
						aria-label="Próximo mês"
						onClick={() => shift(1)}
					>
						<ChevronRight />
					</Button>
				</div>
				<h2 className="font-medium text-lg tracking-tight first-letter:uppercase">
					{monthLabel.format(month)}
				</h2>
				{list.isFetching ? <Spinner className="text-muted-foreground" /> : null}
				<div className="ml-auto">
					<FinanceEntrySheet categories={summary.data?.categories ?? []} />
				</div>
			</div>

			<StatGroup>
				<StatCard
					label="Recebido"
					value={money(totals?.incomePaidCents ?? 0)}
					description={`de ${money(totals?.incomeCents ?? 0)} previstos no mês`}
				/>
				<StatCard
					label="A receber"
					value={money(
						(totals?.incomeCents ?? 0) - (totals?.incomePaidCents ?? 0),
					)}
					description={
						overdue && overdue.incomeCount > 0
							? `${money(overdue.incomeCents)} vencidos no total`
							: "Nada vencido"
					}
				/>
				<StatCard
					label="A pagar"
					value={money(
						(totals?.expenseCents ?? 0) - (totals?.expensePaidCents ?? 0),
					)}
					description={
						overdue && overdue.expenseCount > 0
							? `${money(overdue.expenseCents)} vencidos no total`
							: `de ${money(totals?.expenseCents ?? 0)} no mês`
					}
				/>
				<StatCard
					label="Saldo previsto"
					value={money(balance)}
					description="receitas menos despesas do mês"
				/>
			</StatGroup>

			<Card className="min-w-0">
				<CardHeader>
					<CardTitle>Fluxo de caixa</CardTitle>
					<CardDescription>
						Receitas e despesas dos últimos seis meses
					</CardDescription>
				</CardHeader>
				<div className="glass-surface reveal flex flex-col p-4">
					{flow.some((point) => point.income > 0 || point.expense > 0) ? (
						<BarTrend
							data={flow}
							config={FLOW_CONFIG}
							xKey="month"
							height={220}
							showLegend
							formatValue={(value) => money(Number(value))}
						/>
					) : (
						<p className="py-10 text-center text-muted-foreground text-sm">
							Nenhum lançamento nos últimos seis meses.
						</p>
					)}
				</div>
			</Card>

			<Card className="min-w-0">
				<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
					<div className="flex flex-col gap-1">
						<CardTitle>Lançamentos do mês</CardTitle>
						<CardDescription>
							Marque como pago quando o dinheiro entrar ou sair.
						</CardDescription>
					</div>
					<ToggleGroup
						type="single"
						variant="outline"
						size="sm"
						spacing={0}
						value={kind}
						onValueChange={(next) => {
							const value = KINDS.find((item) => item === next);
							if (value) void setParams({ [SEARCH_PARAM.finance.kind]: value });
						}}
						aria-label="Tipo de lançamento"
					>
						{KINDS.map((value) => (
							<ToggleGroupItem key={value} value={value}>
								{KIND_LABELS[value]}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</CardHeader>
				<div className="glass-surface reveal">
					{list.isPending ? (
						<div className="flex justify-center py-10">
							<Spinner className="text-muted-foreground" />
						</div>
					) : (list.data?.rows.length ?? 0) === 0 ? (
						<p className="py-10 text-center text-muted-foreground text-sm">
							Nenhum lançamento neste mês.
						</p>
					) : (
						<ul className="divide-y">
							{list.data?.rows.map((entry) => (
								<EntryRow key={entry.id} entry={entry} />
							))}
						</ul>
					)}
				</div>
			</Card>

			<FixedCostsCard />

			<BoardNotes board="FINANCE" period={monthKey(month)} />
		</div>
	);
}

function EntryRow({ entry }: { entry: Entry }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const openRecord = useOpenRecord();
	const status = STATUS[entry.status];

	const setPaid = useMutation(
		trpc.finance.setPaid.mutationOptions({
			onSuccess: async (updated) => {
				await cache.finance();
				toast.success(
					updated.paidAt ? "Marcado como pago." : "Marcado como em aberto.",
				);
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const remove = useMutation(
		trpc.finance.remove.mutationOptions({
			onSuccess: async () => {
				await cache.finance();
				toast.success("Lançamento excluído.");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<li className="group/entry flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-foreground/[0.03] md:px-6">
			<span className="w-14 shrink-0 font-mono text-[11px] text-muted-foreground uppercase">
				{dayLabel
					.format(new Date(entry.dueDate))
					.replace(".", "")
					.replace(" de ", " ")}
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate font-medium text-[13px]">
					{entry.description}
				</span>
				<span className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
					{entry.company ? (
						<button
							type="button"
							onClick={() =>
								entry.company &&
								openRecord({ kind: "company", id: entry.company.id })
							}
							className="flex min-w-0 items-center gap-1.5 hover:text-foreground"
						>
							<EntityLogo
								src={entry.company.iconUrl}
								darkSrc={entry.company.iconDarkUrl}
								tone={entry.company.iconTone as EntityLogoTone | null}
								name={entry.company.name}
								size="xs"
							/>
							<span className="truncate">{entry.company.name}</span>
						</button>
					) : null}
					{entry.category ? (
						<span className="truncate">
							{entry.company ? "· " : ""}
							{entry.category}
						</span>
					) : null}
				</span>
			</div>
			<span
				className={cn(
					"shrink-0 rounded-full px-2.5 py-0.5 font-medium text-[11px]",
					status.className,
				)}
			>
				{status.label}
			</span>
			<span
				className={cn(
					"w-32 shrink-0 text-right font-semibold tabular-nums",
					entry.kind === "EXPENSE" && "text-chart-4",
				)}
			>
				{entry.kind === "EXPENSE" ? "− " : "+ "}
				{money(entry.amountCents)}
			</span>
			<Switch
				checked={entry.paidAt !== null}
				disabled={setPaid.isPending}
				onCheckedChange={(paid) => setPaid.mutate({ id: entry.id, paid })}
				aria-label={entry.kind === "INCOME" ? "Recebido" : "Pago"}
			/>
			{entry.source ? (
				<span className="size-6 shrink-0" />
			) : (
				<Button
					variant="ghost"
					size="icon-xs"
					aria-label="Excluir lançamento"
					disabled={remove.isPending}
					onClick={() => remove.mutate({ id: entry.id })}
					className="opacity-60 group-hover/entry:opacity-100"
				>
					<TrashCan />
				</Button>
			)}
		</li>
	);
}
