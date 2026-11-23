import type { Metadata } from "next";
import { Suspense } from "react";
import {
	PageShell,
	PageShellActions,
	PageShellContent,
	PageShellDescription,
	PageShellHeader,
	PageShellHeading,
	PageShellLoading,
	PageShellTitle,
} from "@/components/page-shell";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { requireSession } from "@/lib/session";
import { HydrateClient } from "@/lib/trpc/hydrate";
import { getServerQueryClient, getServerTrpc } from "@/lib/trpc/server";
import { CreateDealSheet } from "./create-deal-sheet";
import { DealsBoard } from "./deals-board";
import { DealsPipelineSwitch } from "./deals-pipeline";
import { dealsSearchParams } from "./deals-search-params";
import { DealsTable } from "./deals-table";
import { LUGH_PIPELINE } from "./deals-view";
import {
	DealsViewSwitch,
	DealsViewToggle,
	DealsViewToggleFallback,
} from "./deals-view-toggle";

export const metadata: Metadata = {
	title: "Negócios",
};

export default function DealsPage({
	searchParams,
}: PageProps<"/[slug]/deals">) {
	return (
		<PageShell className="min-h-0">
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>Negócios</PageShellTitle>
					<PageShellDescription>
						Arraste os cards entre as etapas, ou troque para a lista.
					</PageShellDescription>
				</PageShellHeading>
				<PageShellActions>
					<Suspense fallback={null}>
						<DealsPipelineSwitch />
					</Suspense>
					<Suspense fallback={<DealsViewToggleFallback />}>
						<DealsViewToggle />
					</Suspense>
					<CreateDealSheet />
				</PageShellActions>
			</PageShellHeader>

			<PageShellContent className="min-h-0">
				<Suspense fallback={<PageShellLoading />}>
					<Deals searchParams={searchParams} />
				</Suspense>
			</PageShellContent>
		</PageShell>
	);
}

async function Deals({
	searchParams,
}: Pick<PageProps<"/[slug]/deals">, "searchParams">) {
	const [, values, raw] = await Promise.all([
		requireSession(),
		dealsSearchParams.load(searchParams),
		searchParams,
	]);
	const pipeline =
		typeof raw[SEARCH_PARAM.deals.pipeline] === "string"
			? String(raw[SEARCH_PARAM.deals.pipeline])
			: LUGH_PIPELINE;

	const trpc = getServerTrpc();
	const queryClient = getServerQueryClient();
	await Promise.all([
		queryClient.prefetchQuery(
			trpc.deals.list.queryOptions({
				...dealsSearchParams.toInput(values),
				pipeline,
			}),
		),
		queryClient.prefetchQuery(trpc.users.list.queryOptions()),
		queryClient.prefetchQuery(trpc.companies.options.queryOptions({ q: "" })),
	]);

	return (
		<HydrateClient>
			<DealsViewSwitch board={<DealsBoard />} list={<DealsTable />} />
		</HydrateClient>
	);
}
