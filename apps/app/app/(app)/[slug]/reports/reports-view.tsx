"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@crm/ui/components/avatar";
import { BarList } from "@crm/ui/components/bar-list";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@crm/ui/components/card";
import type { ChartConfig } from "@crm/ui/components/chart";
import { DashboardRow, StatGroup } from "@crm/ui/components/dashboard";
import { Spinner } from "@crm/ui/components/spinner";
import { StatCard } from "@crm/ui/components/stat-card";
import { ToggleGroup, ToggleGroupItem } from "@crm/ui/components/toggle-group";
import {
	formatMoney,
	formatMoneyCompact,
	formatPercent,
	initialsFromName,
} from "@crm/ui/lib/format";
import { useQuery } from "@tanstack/react-query";
import {
	parseAsNumberLiteral,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import type { ReactNode } from "react";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { BarTrend } from "@/components/dashboard-charts";
import { LocalRelativeTime } from "@/components/local-date-time";
import { dealStageColor, dealStageLabel } from "@/lib/deal-stage";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import { OVERVIEW_SCOPES } from "../overview-search-params";

type ReportData = RouterOutputs["reports"]["overview"];

const PERIODS = [3, 6, 12] as const;

const SCOPE_LABELS = { me: "Eu", everyone: "Todos" } as const;

const MONTHLY_CONFIG: ChartConfig = {
	won: { label: "Vendido", color: "var(--primary)" },
	created: { label: "Novo pipeline", color: "var(--chart-3)" },
};

const reportParams = {
	[SEARCH_PARAM.reports.months]: parseAsNumberLiteral(PERIODS).withDefault(6),
	[SEARCH_PARAM.overview.scope]:
		parseAsStringLiteral(OVERVIEW_SCOPES).withDefault("everyone"),
};

function days(value: number | null): string {
	if (value === null) return "—";
	const rounded = Math.round(value);
	return rounded === 1 ? "1 dia" : `${rounded} dias`;
}

export function ReportsView() {
	const trpc = useTRPC();
	const openRecord = useOpenRecord();
	const [params, setParams] = useQueryStates(reportParams);
	const months = params[SEARCH_PARAM.reports.months];
	const scope = params[SEARCH_PARAM.overview.scope];

	const report = useQuery({
		...trpc.reports.overview.queryOptions({
			months,
			scope: scope === "me" ? "me" : "everyone",
		}),
		placeholderData: (previous) => previous,
	});

	const data = report.data;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center gap-3">
				<ToggleGroup
					type="single"
					variant="outline"
					size="sm"
					spacing={0}
					value={String(months)}
					onValueChange={(next) => {
						const value = PERIODS.find((period) => String(period) === next);
						if (value) void setParams({ [SEARCH_PARAM.reports.months]: value });
					}}
					aria-label="Período do relatório"
				>
					{PERIODS.map((period) => (
						<ToggleGroupItem key={period} value={String(period)}>
							{period} meses
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				<ToggleGroup
					type="single"
					variant="outline"
					size="sm"
					spacing={0}
					value={scope}
					onValueChange={(next) => {
						const value = OVERVIEW_SCOPES.find((item) => item === next);
						if (value) void setParams({ [SEARCH_PARAM.overview.scope]: value });
					}}
					aria-label="De quem mostrar os números"
				>
					{OVERVIEW_SCOPES.map((value) => (
						<ToggleGroupItem key={value} value={value}>
							{SCOPE_LABELS[value]}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				{report.isFetching ? (
					<Spinner className="text-muted-foreground" />
				) : null}
			</div>

			{!data ? (
				<div className="flex justify-center py-24">
					<Spinner size="lg" className="text-foreground" />
				</div>
			) : (
				<Report
					data={data}
					onOpenDeal={(id) => openRecord({ kind: "deal", id })}
				/>
			)}
		</div>
	);
}

function Report({
	data,
	onOpenDeal,
}: {
	data: ReportData;
	onOpenDeal: (id: string) => void;
}) {
	const money = (cents: number) => formatMoneyCompact(cents, data.currency);
	const exact = (value: number | string) =>
		formatMoney(Number(value), data.currency);

	const top = data.funnel[0]?.reached ?? 0;
	const funnel = data.funnel.map((step, index) => {
		const previous =
			index === 0 ? step.reached : (data.funnel[index - 1]?.reached ?? 0);
		return {
			key: step.stage,
			label: dealStageLabel(step.stage),
			value: step.reached,
			ratio: top === 0 ? 0 : step.reached / top,
			color:
				step.stage === "CLOSED_WON"
					? "var(--chart-2)"
					: dealStageColor(step.stage),
			detail:
				index === 0
					? "entrada do funil"
					: `${previous === 0 ? "—" : formatPercent(step.reached / previous)} da etapa anterior`,
		};
	});

	const maxOwner = Math.max(
		1,
		...data.owners.map((owner) => owner.wonCents + owner.openCents),
	);
	const maxAging = Math.max(
		1,
		...data.aging.map((stage) => stage.avgDays ?? 0),
	);
	const monthly = data.monthly.map((point) => ({
		month: point.label,
		won: point.wonCents,
		created: point.createdCents,
	}));
	const hasMonthly = data.monthly.some(
		(point) => point.wonCents > 0 || point.createdCents > 0,
	);

	return (
		<>
			<StatGroup>
				<StatCard
					label={`Vendido (${data.months} meses)`}
					value={money(data.totals.wonCents)}
					description={
						data.totals.won === 1 ? "1 venda" : `${data.totals.won} vendas`
					}
				/>
				<StatCard
					label="Negócios criados"
					value={data.totals.created}
					description={`${data.totals.lost} em follow-up`}
				/>
				<StatCard
					label="Taxa de venda"
					value={
						data.totals.winRate === null
							? "—"
							: formatPercent(data.totals.winRate)
					}
					description="vendas sobre negócios decididos"
				/>
				<StatCard
					label="Ciclo médio"
					value={days(data.totals.avgCycleDays)}
					description={
						data.totals.avgTicketCents === null
							? "Nenhuma venda para medir"
							: `ticket médio ${money(data.totals.avgTicketCents)}`
					}
				/>
			</StatGroup>

			<DashboardRow split="even">
				<Panel
					title="Funil de conversão"
					description="Negócios criados no período e até onde chegaram"
				>
					{top === 0 ? (
						<Empty label="Nenhum negócio criado no período" />
					) : (
						<BarList items={funnel} className="p-5 md:p-6" />
					)}
				</Panel>
				<Panel
					title="Vendas por mês"
					description="Valor vendido e novo pipeline criado em cada mês"
				>
					{hasMonthly ? (
						<div className="flex flex-1 flex-col justify-center p-4">
							<BarTrend
								data={monthly}
								config={MONTHLY_CONFIG}
								xKey="month"
								height={240}
								showLegend
								formatValue={exact}
							/>
						</div>
					) : (
						<Empty label="Nenhuma venda ou negócio novo no período" />
					)}
				</Panel>
			</DashboardRow>

			<DashboardRow split="even">
				<Panel
					title="Por responsável"
					description="Vendido no período e pipeline aberto agora"
				>
					{data.owners.length === 0 ? (
						<Empty label="Ninguém com negócios ainda" />
					) : (
						<BarList
							className="p-5 md:p-6"
							items={data.owners.map((owner) => ({
								key: owner.id,
								media: (
									<Avatar size="sm">
										{owner.image ? (
											<AvatarImage src={owner.image} alt="" />
										) : null}
										<AvatarFallback>
											{initialsFromName(owner.name)}
										</AvatarFallback>
									</Avatar>
								),
								label: owner.name,
								value: money(owner.wonCents),
								ratio: (owner.wonCents + owner.openCents) / maxOwner,
								detail: `${owner.wonCount} vendas · ${money(owner.openCents)} em ${owner.openCount} abertos`,
							}))}
						/>
					)}
				</Panel>
				<Panel
					title="Tempo parado na etapa"
					description="Média de dias desde a última mudança, nos negócios abertos"
				>
					<BarList
						className="p-5 md:p-6"
						items={data.aging.map((stage) => ({
							key: stage.stage,
							label: dealStageLabel(stage.stage),
							value: days(stage.avgDays),
							ratio: (stage.avgDays ?? 0) / maxAging,
							color: dealStageColor(stage.stage),
							detail:
								stage.openCount === 1
									? "1 negócio"
									: `${stage.openCount} negócios`,
						}))}
					/>
				</Panel>
			</DashboardRow>

			<Panel
				title="Remarketing / Follow-up recentes"
				description="Negócios que saíram do funil no período e o motivo registrado"
			>
				{data.followUps.length === 0 ? (
					<Empty label="Nenhum negócio foi para follow-up no período" />
				) : (
					<ul className="divide-y">
						{data.followUps.map((deal) => (
							<li key={deal.dealId}>
								<button
									type="button"
									onClick={() => onOpenDeal(deal.dealId)}
									className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 text-left transition-colors hover:bg-foreground/[0.03] md:px-6"
								>
									<span className="font-medium text-[13px]">{deal.name}</span>
									<span className="text-muted-foreground text-xs">
										{deal.companyName} · {dealStageLabel(deal.stage)}
									</span>
									<span className="ml-auto text-muted-foreground text-xs">
										<LocalRelativeTime date={deal.at} />
									</span>
									<span className="w-full text-muted-foreground text-xs">
										{deal.reason ?? "Sem motivo registrado"}
									</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</Panel>
		</>
	);
}

function Panel({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				{description ? <CardDescription>{description}</CardDescription> : null}
			</CardHeader>
			<div className="glass-surface reveal flex flex-1 flex-col">
				{children}
			</div>
		</Card>
	);
}

function Empty({ label }: { label: string }) {
	return (
		<div className="flex flex-1 items-center justify-center px-5 py-10 text-muted-foreground text-sm md:px-6">
			{label}
		</div>
	);
}
