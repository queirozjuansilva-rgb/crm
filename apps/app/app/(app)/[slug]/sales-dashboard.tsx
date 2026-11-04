"use client";

import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@crm/ui/components/card";
import type { ChartConfig } from "@crm/ui/components/chart";
import { DashboardRow, StatGroup } from "@crm/ui/components/dashboard";
import { GoalCard } from "@crm/ui/components/goal-card";
import { StatCard, type StatDelta } from "@crm/ui/components/stat-card";
import {
	formatCount,
	formatMoney,
	formatMoneyCompact,
	formatPercent,
} from "@crm/ui/lib/format";
import Link from "next/link";
import type { ReactNode } from "react";
import { AreaTrend, DonutStat } from "@/components/dashboard-charts";
import { dealStageColor, dealStageLabel } from "@/lib/deal-stage";
import type { RouterOutputs } from "@/lib/trpc/types";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";

type Summary = RouterOutputs["dashboard"]["summary"];

const TREND_CONFIG: ChartConfig = {
	won: { label: "Ganhos", color: "var(--primary)" },
	created: { label: "Novo pipeline", color: "var(--chart-3)" },
};

function changeDelta(
	current: number,
	previous: number,
	label: string,
): StatDelta | undefined {
	if (previous === 0) return undefined;
	const change = Math.round(((current - previous) / previous) * 100);
	return {
		value: `${change >= 0 ? "+" : ""}${change}%`,
		direction: change > 0 ? "up" : change < 0 ? "down" : "neutral",
		label,
	};
}

export function SalesDashboard({ summary }: { summary: Summary }) {
	const workspaceUrl = useWorkspaceUrl();

	const {
		pipeline,
		wonThisMonth,
		wonPrevMonth,
		performance,
		trend,
		closingThisMonthTotal,
		reportingCurrency,
		monthlyGoalCents,
		unconverted,
	} = summary;

	const money = (cents: number) => formatMoneyCompact(cents, reportingCurrency);
	const exact = (value: number | string) =>
		formatMoney(Number(value), reportingCurrency);

	const hasTrend = trend.some((point) => point.won > 0 || point.created > 0);

	const stageSlices = pipeline.stages.flatMap((stage) =>
		stage.valueCents > 0
			? [
					{
						key: stage.stage,
						label: dealStageLabel(stage.stage),
						value: stage.valueCents,
						color: dealStageColor(stage.stage),
						count: stage.count,
					},
				]
			: [],
	);

	return (
		<div className="flex flex-col gap-6">
			<StatGroup>
				<StatCard
					label="Ganho este mês"
					value={money(wonThisMonth.valueCents)}
					delta={changeDelta(
						wonThisMonth.valueCents,
						wonPrevMonth.valueCents,
						"vs. mês passado",
					)}
					description={`${formatCount(wonThisMonth.count, "deal")} · ${money(wonPrevMonth.valueCents)} no mês passado`}
				/>
				<StatCard
					label="Pipeline aberto"
					value={money(pipeline.totalCents)}
					description={`${formatCount(pipeline.totalDeals, "deal")} em andamento · ${money(closingThisMonthTotal.valueCents)} previstos este mês`}
				/>
				<StatCard
					label={`Taxa de ganho (${performance.windowDays}d)`}
					value={
						performance.winRate === null
							? "—"
							: formatPercent(performance.winRate)
					}
					description={
						performance.wins + performance.losses === 0
							? "Nada fechado ainda"
							: `${performance.wins} ganhos · ${performance.losses} perdidos`
					}
				/>
				<StatCard
					label={`Ticket médio (${performance.windowDays}d)`}
					value={
						performance.avgDealCents === null
							? "—"
							: money(performance.avgDealCents)
					}
					description={
						performance.avgCycleDays === null
							? "Nenhum ganho para medir"
							: `ciclo médio de ${performance.avgCycleDays} dias`
					}
				/>
			</StatGroup>

			{unconverted.count > 0 ? (
				<p className="text-muted-foreground text-xs">
					Todos os valores acima estão em {reportingCurrency}.{" "}
					{formatCount(unconverted.count, "deal")} em{" "}
					{unconverted.currencies.join(", ")}{" "}
					{unconverted.count === 1 ? "ficou" : "ficaram"} de fora, porque falta
					a taxa de conversão.{" "}
					<Link
						href={workspaceUrl("/settings/currencies")}
						className="underline hover:no-underline"
					>
						Definir
					</Link>
					.
				</p>
			) : null}

			<DashboardRow split="hero">
				<ChartPanel
					title="Ganhos vs. novo pipeline"
					description="Últimos seis meses, pelo mês em que o negócio fechou ou foi criado"
				>
					{hasTrend ? (
						<div className="flex flex-1 flex-col justify-center py-4">
							<AreaTrend
								data={trend}
								config={TREND_CONFIG}
								xKey="month"
								height={196}
								variant="gradient"
								bloom="high"
								showLegend
								formatValue={exact}
							/>
						</div>
					) : (
						<EmptyChart label="Nenhum negócio fechado ou criado ainda" />
					)}
				</ChartPanel>

				<GoalCard
					title="Meta do time"
					progress={
						monthlyGoalCents && monthlyGoalCents > 0
							? wonThisMonth.valueCents / monthlyGoalCents
							: null
					}
					centerLabel="da meta do mês"
					stats={[
						{ label: "Ganho", value: money(wonThisMonth.valueCents) },
						{ label: "Meta", value: money(monthlyGoalCents ?? 0) },
						{ label: "Dias restantes", value: daysLeftInMonth(new Date()) },
					]}
					action={
						<Link
							href={workspaceUrl("/settings")}
							className="text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
						>
							{monthlyGoalCents ? "Editar" : "Definir meta"}
						</Link>
					}
					empty="Defina a meta mensal em Configurações para acompanhar o time aqui."
				/>
			</DashboardRow>

			<div className="grid grid-cols-1 gap-4">
				<ChartPanel
					title="Pipeline aberto por etapa"
					description="Onde o valor está agora"
				>
					{stageSlices.length > 0 ? (
						<div className="flex flex-1 flex-col justify-between gap-1 pt-4">
							<DonutStat
								data={stageSlices}
								height={168}
								centerValue={money(pipeline.totalCents)}
								centerLabel="em aberto"
								formatValue={exact}
							/>
							<ul className="flex flex-col px-5 pb-1 md:px-6">
								{stageSlices.map((slice) => (
									<li key={slice.key} className="border-t first:border-t-0">
										<Link
											href={`${workspaceUrl("/deals")}?stage=${slice.key}`}
											className="flex items-center gap-2.5 py-2 text-xs hover:underline"
										>
											<span
												aria-hidden
												className="size-1.5 shrink-0"
												style={{ backgroundColor: slice.color }}
											/>
											<span className="min-w-0 flex-1 truncate">
												{slice.label}
											</span>
											<span className="shrink-0 text-muted-foreground tabular-nums">
												{slice.count}
											</span>
											<span className="w-14 shrink-0 text-right font-medium tabular-nums">
												{money(slice.value)}
											</span>
										</Link>
									</li>
								))}
							</ul>
						</div>
					) : (
						<EmptyChart label="Nada em aberto" />
					)}
				</ChartPanel>
			</div>
		</div>
	);
}

function daysLeftInMonth(now: Date): number {
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	return Math.max(0, end.getDate() - now.getDate());
}

function ChartPanel({
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

function EmptyChart({ label }: { label: string }) {
	return (
		<div className="flex flex-1 items-center justify-center px-5 py-10 text-muted-foreground text-sm md:px-6">
			{label}
		</div>
	);
}
