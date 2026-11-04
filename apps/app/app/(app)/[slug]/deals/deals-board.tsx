"use client";

import { DealStage } from "@crm/db/enums";
import { KanbanBoard, type KanbanColumn } from "@crm/ui/components/kanban";
import { Spinner } from "@crm/ui/components/spinner";
import { formatMoney } from "@crm/ui/lib/format";
import { useMutation, useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CompanyCell } from "@/components/crm/company-cell";
import { OwnerCell } from "@/components/crm/owner-cell";
import { usePrefetchRecord } from "@/components/crm/record-sheet/record-prefetch";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { ListSearch } from "@/components/data-table/list-search";
import { useTableQuery } from "@/components/data-table/use-table-query";
import { LocalDay } from "@/components/local-date-time";
import { dealStageColor, dealStageLabel } from "@/lib/deal-stage";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import { dealsSearchParams } from "./deals-search-params";

type DealRow = RouterOutputs["deals"]["list"]["rows"][number];

const BOARD = {
	pageSize: 100,
	lost: DealStage.CLOSED_LOST,
	lanes: [
		DealStage.BUILDING_SNIPER,
		DealStage.SNIPER_READY,
		DealStage.SNIPER_SENT,
		DealStage.ENGAGED_CONVERSATION,
		DealStage.SCREENING_BOOKED,
		DealStage.SCREENING_DONE,
		DealStage.PROPOSAL_MEETING,
		DealStage.NEGOTIATION,
		DealStage.CLOSED_WON,
		DealStage.CLOSED_LOST,
	],
	accents: {
		CLOSED_WON: "var(--chart-2)",
		CLOSED_LOST: "var(--chart-4)",
	},
} as const;

const closeReasonParams = {
	[SEARCH_PARAM.dialog.closeDeal]: parseAsString,
	[SEARCH_PARAM.dialog.closeStage]: parseAsString,
};

function laneOf(stage: DealStage): string {
	return stage === DealStage.UNQUALIFIED_TO_BUY ? BOARD.lost : stage;
}

function laneAccent(stage: DealStage): string {
	if (stage === DealStage.CLOSED_WON) return BOARD.accents.CLOSED_WON;
	if (stage === DealStage.CLOSED_LOST) return BOARD.accents.CLOSED_LOST;
	return dealStageColor(stage);
}

function isStage(value: string): value is DealStage {
	return (Object.values(DealStage) as string[]).includes(value);
}

export function DealsBoard() {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const openRecord = useOpenRecord();
	const prefetchRecord = usePrefetchRecord();
	const [, setCloseParams] = useQueryStates(closeReasonParams);
	const { input } = useTableQuery(dealsSearchParams);
	const [moved, setMoved] = useState<Record<string, DealStage>>({});

	const boardInput = {
		...input,
		page: 1,
		pageSize: BOARD.pageSize,
		status: "all",
		archived: false,
	};

	const deals = useQuery({
		...trpc.deals.list.queryOptions(boardInput),
		placeholderData: (previous) => previous,
	});

	const setStage = useMutation(
		trpc.deals.setStage.mutationOptions({
			onSuccess: async (_, variables) => {
				await cache.deal(variables.id);
				toast.success(`Movido para ${dealStageLabel(variables.stage)}.`);
			},
			onError: (error) => toast.error(error.message),
			onSettled: (_, __, variables) => {
				setMoved(({ [variables.id]: _drop, ...rest }) => rest);
			},
		}),
	);

	const reportingCurrency = deals.data?.reportingCurrency;
	const rows = useMemo(
		() =>
			(deals.data?.rows ?? []).map((row) => ({
				...row,
				stage: moved[row.id] ?? row.stage,
			})),
		[deals.data?.rows, moved],
	);

	const columns: KanbanColumn[] = useMemo(
		() =>
			BOARD.lanes.map((stage) => {
				const inLane = rows.filter((row) => laneOf(row.stage) === stage);
				const sum = inLane.reduce(
					(total, row) => total + (row.baseAmountCents ?? 0),
					0,
				);
				return {
					id: stage,
					title: dealStageLabel(stage),
					accent: laneAccent(stage),
					meta: formatMoney(sum, reportingCurrency),
				};
			}),
		[rows, reportingCurrency],
	);

	const total = deals.data?.total ?? 0;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				<ListSearch placeholder="Buscar negócios por nome ou empresa…" />
				{deals.isFetching ? (
					<Spinner className="text-muted-foreground" />
				) : null}
				<span className="ml-auto font-mono text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
					{total > BOARD.pageSize
						? `Mostrando ${BOARD.pageSize} de ${total} · use a lista para ver todos`
						: `${total} negócios`}
				</span>
			</div>

			{deals.isPending ? (
				<div className="flex flex-1 items-center justify-center py-24">
					<Spinner size="lg" className="text-foreground" />
				</div>
			) : (
				<KanbanBoard
					columns={columns}
					items={rows}
					getItemId={(row) => row.id}
					getColumnId={(row) => laneOf(row.stage)}
					onOpen={(row) => openRecord({ kind: "deal", id: row.id })}
					onMove={(row, lane) => {
						if (!isStage(lane)) return;
						if (lane === BOARD.lost) {
							void setCloseParams({
								[SEARCH_PARAM.dialog.closeDeal]: row.id,
								[SEARCH_PARAM.dialog.closeStage]: lane,
							});
							return;
						}
						setMoved((current) => ({ ...current, [row.id]: lane }));
						setStage.mutate({ id: row.id, stage: lane });
					}}
					renderItem={(row) => (
						<DealCard
							deal={row}
							onHover={() => prefetchRecord({ kind: "deal", id: row.id })}
						/>
					)}
				/>
			)}
		</div>
	);
}

function DealCard({ deal, onHover }: { deal: DealRow; onHover: () => void }) {
	return (
		<div className="flex flex-col gap-2.5" onPointerEnter={onHover}>
			<div className="flex items-start justify-between gap-2">
				<span className="line-clamp-2 font-medium text-sm">{deal.name}</span>
				<OwnerCell owner={deal.owner} compact />
			</div>
			{deal.company ? (
				<span className="text-muted-foreground text-xs">
					<CompanyCell company={deal.company} />
				</span>
			) : null}
			<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
				<span className="text-foreground tabular-nums">
					{deal.amountCents === null
						? "Sem valor"
						: formatMoney(deal.amountCents, deal.currency)}
				</span>
				{deal.expectedCloseDate ? (
					<span>
						<LocalDay date={deal.expectedCloseDate} />
					</span>
				) : null}
			</div>
			{deal.stage === DealStage.UNQUALIFIED_TO_BUY ? (
				<span className="w-fit rounded-full bg-foreground/8 px-2 py-0.5 text-[11px] text-muted-foreground">
					Desqualificado
				</span>
			) : null}
		</div>
	);
}
