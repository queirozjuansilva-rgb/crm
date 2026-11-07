import { Button } from "@crm/ui/components/button";
import type { Metadata } from "next";
import Link from "next/link";
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
import { requireSession } from "@/lib/session";
import { HydrateClient } from "@/lib/trpc/hydrate";
import { getServerQueryClient, getServerTrpc } from "@/lib/trpc/server";
import { ClientsView, NewClientButton } from "./clients-view";
import { CompaniesCards } from "./companies-cards";
import {
	CompaniesLayoutSwitch,
	CompaniesLayoutToggle,
	CompaniesLayoutToggleFallback,
} from "./companies-layout";
import { companiesSearchParams } from "./companies-search-params";
import { CompaniesTable } from "./companies-table";
import { CreateCompanySheet } from "./create-company-sheet";

export const metadata: Metadata = {
	title: "Clientes",
};

const ALL_RECORDS = "todos";

export default function CompaniesPage({
	params,
	searchParams,
}: PageProps<"/[slug]/companies">) {
	return (
		<Suspense fallback={<PageShellLoading />}>
			<CompaniesRoute params={params} searchParams={searchParams} />
		</Suspense>
	);
}

async function CompaniesRoute({
	params,
	searchParams,
}: PageProps<"/[slug]/companies">) {
	const [{ slug }, query] = await Promise.all([params, searchParams]);
	const showAll = query[ALL_RECORDS] === "1";

	if (!showAll) {
		return (
			<PageShell className="min-h-0">
				<PageShellHeader>
					<PageShellHeading>
						<PageShellTitle>Clientes</PageShellTitle>
						<PageShellDescription>
							Quem tem contrato com a Lugh. Dê baixa no mês aqui ou no
							Financeiro.
						</PageShellDescription>
					</PageShellHeading>
					<PageShellActions>
						<Button variant="outline" asChild>
							<Link href={`/${slug}/companies?${ALL_RECORDS}=1`}>
								Todos os cadastros
							</Link>
						</Button>
						<NewClientButton />
					</PageShellActions>
				</PageShellHeader>

				<PageShellContent className="min-h-0">
					<Suspense fallback={<PageShellLoading />}>
						<Clients />
					</Suspense>
				</PageShellContent>
			</PageShell>
		);
	}

	return (
		<PageShell className="min-h-0">
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>Todos os cadastros</PageShellTitle>
					<PageShellDescription>
						Clientes, leads e prospects. Os leads ativos ficam no Pipeline.
					</PageShellDescription>
				</PageShellHeading>
				<PageShellActions>
					<Button variant="outline" asChild>
						<Link href={`/${slug}/companies`}>Só clientes</Link>
					</Button>
					<Suspense fallback={<CompaniesLayoutToggleFallback />}>
						<CompaniesLayoutToggle />
					</Suspense>
					<CreateCompanySheet />
				</PageShellActions>
			</PageShellHeader>

			<PageShellContent className="min-h-0">
				<Suspense fallback={<PageShellLoading />}>
					<Companies searchParams={searchParams} />
				</Suspense>
			</PageShellContent>
		</PageShell>
	);
}

async function Clients() {
	await requireSession();
	return <ClientsView />;
}

async function Companies({
	searchParams,
}: Pick<PageProps<"/[slug]/companies">, "searchParams">) {
	const [, values] = await Promise.all([
		requireSession(),
		companiesSearchParams.load(searchParams),
	]);

	const trpc = getServerTrpc();
	const queryClient = getServerQueryClient();
	await Promise.all([
		queryClient.prefetchQuery(
			trpc.companies.list.queryOptions(companiesSearchParams.toInput(values)),
		),
		queryClient.prefetchQuery(trpc.users.list.queryOptions()),
	]);

	return (
		<HydrateClient>
			<CompaniesLayoutSwitch
				cards={<CompaniesCards />}
				list={<CompaniesTable />}
			/>
		</HydrateClient>
	);
}
