"use client";

import CheckmarkFilled from "@carbon/icons-react/es/CheckmarkFilled";
import ChevronLeft from "@carbon/icons-react/es/ChevronLeft";
import ChevronRight from "@carbon/icons-react/es/ChevronRight";
import CircleDash from "@carbon/icons-react/es/CircleDash";
import Video from "@carbon/icons-react/es/Video";
import { Button } from "@crm/ui/components/button";
import {
	EntityLogo,
	type EntityLogoTone,
} from "@crm/ui/components/entity-logo";
import { Spinner } from "@crm/ui/components/spinner";
import { ToggleGroup, ToggleGroupItem } from "@crm/ui/components/toggle-group";
import { cn } from "@crm/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";
import {
	AGENDA_PERIODS,
	type AgendaPeriod,
	addDays,
	dayKey,
	formatPeriodLabel,
	formatTime,
	formatWeekday,
	parseDayKey,
	sameDay,
	shiftAnchor,
	startOfDay,
	visibleDays,
} from "./agenda-dates";

type AgendaItem = RouterOutputs["agenda"]["range"]["items"][number];

const PERIOD_LABELS: Record<AgendaPeriod, string> = {
	week: "Semana",
	month: "Mês",
};

const MONTH_CHIPS = 3;

const agendaParams = {
	[SEARCH_PARAM.agenda.period]:
		parseAsStringLiteral(AGENDA_PERIODS).withDefault("week"),
	[SEARCH_PARAM.agenda.date]: parseAsString,
};

function isPeriod(value: string): value is AgendaPeriod {
	return (AGENDA_PERIODS as readonly string[]).includes(value);
}

export function AgendaView() {
	const trpc = useTRPC();
	const [params, setParams] = useQueryStates(agendaParams);
	const period = params[SEARCH_PARAM.agenda.period];
	const [today, setToday] = useState<Date | null>(null);

	useEffect(() => {
		setToday(startOfDay(new Date()));
	}, []);

	const anchor = parseDayKey(params[SEARCH_PARAM.agenda.date]) ?? today;
	const days = useMemo(
		() => (anchor ? visibleDays(anchor, period) : []),
		[anchor, period],
	);
	const first = days[0];
	const last = days[days.length - 1];

	const agenda = useQuery({
		...trpc.agenda.range.queryOptions({
			from: (first ?? new Date(0)).toISOString(),
			to: addDays(last ?? new Date(0), 1).toISOString(),
		}),
		enabled: Boolean(first && last),
		placeholderData: (previous) => previous,
	});

	const byDay = useMemo(() => {
		const groups = new Map<string, AgendaItem[]>();
		for (const item of agenda.data?.items ?? []) {
			const key = dayKey(new Date(item.startsAt));
			groups.set(key, [...(groups.get(key) ?? []), item]);
		}
		return groups;
	}, [agenda.data?.items]);

	if (!anchor || !today) {
		return (
			<div className="flex flex-1 items-center justify-center py-24">
				<Spinner size="lg" className="text-foreground" />
			</div>
		);
	}

	const go = (date: Date | null) =>
		void setParams({
			[SEARCH_PARAM.agenda.date]: date ? dayKey(date) : null,
		});

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon-sm"
						aria-label="Período anterior"
						onClick={() => go(shiftAnchor(anchor, period, -1))}
					>
						<ChevronLeft />
					</Button>
					<Button variant="outline" size="sm" onClick={() => go(null)}>
						Hoje
					</Button>
					<Button
						variant="outline"
						size="icon-sm"
						aria-label="Próximo período"
						onClick={() => go(shiftAnchor(anchor, period, 1))}
					>
						<ChevronRight />
					</Button>
				</div>
				<h2 className="font-medium text-lg tracking-tight first-letter:uppercase">
					{formatPeriodLabel(days, period, anchor)}
				</h2>
				{agenda.isFetching ? (
					<Spinner className="text-muted-foreground" />
				) : null}
				<div className="ml-auto">
					<ToggleGroup
						type="single"
						variant="outline"
						size="sm"
						spacing={0}
						value={period}
						onValueChange={(next) => {
							if (isPeriod(next)) {
								void setParams({ [SEARCH_PARAM.agenda.period]: next });
							}
						}}
						aria-label="Período da agenda"
					>
						{AGENDA_PERIODS.map((value) => (
							<ToggleGroupItem key={value} value={value}>
								{PERIOD_LABELS[value]}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</div>
			</div>

			{agenda.data && !agenda.data.calendarConnected ? (
				<CalendarNotice />
			) : null}

			{period === "week" ? (
				<WeekGrid days={days} today={today} byDay={byDay} />
			) : (
				<MonthGrid
					days={days}
					today={today}
					anchor={anchor}
					byDay={byDay}
					onOpenDay={(date) =>
						void setParams({
							[SEARCH_PARAM.agenda.period]: "week",
							[SEARCH_PARAM.agenda.date]: dayKey(date),
						})
					}
				/>
			)}
		</div>
	);
}

function CalendarNotice() {
	const workspaceUrl = useWorkspaceUrl();
	return (
		<div className="glass-surface flex flex-wrap items-center gap-3 px-5 py-4 text-sm">
			<span className="text-muted-foreground">
				Conecte o Google Agenda para ver aqui as reuniões com clientes. Tarefas
				com prazo já aparecem.
			</span>
			<Button asChild variant="outline" size="sm" className="ml-auto">
				<Link href={workspaceUrl("/settings/connections")}>
					Conectar agenda
				</Link>
			</Button>
		</div>
	);
}

function WeekGrid({
	days,
	today,
	byDay,
}: {
	days: Date[];
	today: Date;
	byDay: Map<string, AgendaItem[]>;
}) {
	return (
		<div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
			{days.map((day) => {
				const items = byDay.get(dayKey(day)) ?? [];
				const isToday = sameDay(day, today);
				return (
					<section
						key={dayKey(day)}
						data-today={isToday ? "" : undefined}
						className="glass-surface reveal flex min-w-36 flex-1 basis-0 flex-col data-today:border-ring/60"
					>
						<header className="flex items-baseline gap-2 px-4 pt-4 pb-3">
							<span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
								{formatWeekday(day)}
							</span>
							<span
								className={cn(
									"ml-auto flex size-7 items-center justify-center rounded-full font-medium text-sm tabular-nums",
									isToday && "bg-primary text-primary-foreground",
								)}
							>
								{day.getDate()}
							</span>
						</header>
						<div className="flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
							{items.length === 0 ? (
								<p className="px-1 pt-1 text-muted-foreground text-xs">Livre</p>
							) : (
								items.map((item) => <AgendaCard key={item.id} item={item} />)
							)}
						</div>
					</section>
				);
			})}
		</div>
	);
}

function AgendaCard({ item }: { item: AgendaItem }) {
	const openRecord = useOpenRecord();
	const start = new Date(item.startsAt);
	const end = item.endsAt ? new Date(item.endsAt) : null;
	const record = item.record;

	return (
		<article
			data-kind={item.kind}
			data-done={item.done ? "" : undefined}
			className="kanban-card spotlight lift relative gap-2 border-l-2 data-[kind=meeting]:border-l-ring data-[kind=task]:border-l-chart-3 data-done:opacity-60"
		>
			<div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
				{item.kind === "task" ? (
					item.done ? (
						<CheckmarkFilled className="size-3.5 text-success" />
					) : (
						<CircleDash className="size-3.5" />
					)
				) : null}
				<span>
					{item.isAllDay
						? "Dia inteiro"
						: end
							? `${formatTime(start)}–${formatTime(end)}`
							: formatTime(start)}
				</span>
				{item.conferenceUrl ? (
					<a
						href={item.conferenceUrl}
						target="_blank"
						rel="noreferrer noopener"
						aria-label="Entrar na reunião"
						className="ml-auto flex size-6 items-center justify-center rounded-full text-ring hover:bg-ring/15"
					>
						<Video className="size-3.5" />
					</a>
				) : null}
			</div>
			<button
				type="button"
				disabled={!record}
				onClick={() =>
					record ? openRecord({ kind: record.kind, id: record.id }) : undefined
				}
				className="flex flex-col gap-1.5 text-left outline-none disabled:cursor-default"
			>
				<span
					className={cn(
						"line-clamp-2 font-medium text-[13px] leading-snug",
						item.done && "line-through",
					)}
				>
					{item.title}
				</span>
				{record ? (
					<span className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
						{item.company ? (
							<EntityLogo
								src={item.company.iconUrl}
								darkSrc={item.company.iconDarkUrl}
								tone={item.company.iconTone as EntityLogoTone | null}
								name={item.company.name}
								size="sm"
							/>
						) : null}
						<span className="truncate">{record.name}</span>
					</span>
				) : null}
				{item.attendeeCount > 0 ? (
					<span className="text-[11px] text-muted-foreground">
						{item.attendeeCount === 1
							? "1 participante"
							: `${item.attendeeCount} participantes`}
					</span>
				) : null}
			</button>
		</article>
	);
}

function MonthGrid({
	days,
	today,
	anchor,
	byDay,
	onOpenDay,
}: {
	days: Date[];
	today: Date;
	anchor: Date;
	byDay: Map<string, AgendaItem[]>;
	onOpenDay: (date: Date) => void;
}) {
	const header = days.slice(0, 7);
	return (
		<div className="glass-surface reveal flex min-h-0 flex-1 flex-col overflow-hidden">
			<div className="grid grid-cols-7 border-b">
				{header.map((day) => (
					<span
						key={dayKey(day)}
						className="px-3 py-2 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.1em]"
					>
						{formatWeekday(day)}
					</span>
				))}
			</div>
			<div className="grid flex-1 auto-rows-fr grid-cols-7">
				{days.map((day) => {
					const items = byDay.get(dayKey(day)) ?? [];
					const outside = day.getMonth() !== anchor.getMonth();
					const isToday = sameDay(day, today);
					return (
						<button
							key={dayKey(day)}
							type="button"
							onClick={() => onOpenDay(day)}
							data-outside={outside ? "" : undefined}
							className="flex min-h-24 flex-col gap-1 border-r border-b p-2 text-left transition-colors last:border-r-0 hover:bg-foreground/[0.03] data-outside:opacity-40 [&:nth-child(7n)]:border-r-0"
						>
							<span
								className={cn(
									"flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
									isToday && "bg-primary font-medium text-primary-foreground",
								)}
							>
								{day.getDate()}
							</span>
							{items.slice(0, MONTH_CHIPS).map((item) => (
								<span
									key={item.id}
									data-kind={item.kind}
									className="truncate rounded-md bg-ring/12 px-1.5 py-0.5 text-[11px] data-[kind=task]:bg-chart-3/15"
								>
									{item.isAllDay
										? ""
										: `${formatTime(new Date(item.startsAt))} `}
									{item.title}
								</span>
							))}
							{items.length > MONTH_CHIPS ? (
								<span className="px-1.5 text-[11px] text-muted-foreground">
									+{items.length - MONTH_CHIPS}
								</span>
							) : null}
						</button>
					);
				})}
			</div>
		</div>
	);
}
