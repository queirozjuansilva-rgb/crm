"use client";

import {
	EntityLogo,
	type EntityLogoTone,
} from "@crm/ui/components/entity-logo";
import { Spinner } from "@crm/ui/components/spinner";
import { TablePagination } from "@crm/ui/components/table-pagination";
import { formatMoney } from "@crm/ui/lib/format";
import { cn } from "@crm/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { OwnerCell } from "@/components/crm/owner-cell";
import { usePrefetchRecord } from "@/components/crm/record-sheet/record-prefetch";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { ListSearch } from "@/components/data-table/list-search";
import { useTableQuery } from "@/components/data-table/use-table-query";
import { LocalRelativeTime } from "@/components/local-date-time";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import { companiesSearchParams } from "./companies-search-params";

type CompanyRow = RouterOutputs["companies"]["list"]["rows"][number];

type Relationship = "client" | "negotiating" | "prospect";

const RELATIONSHIP: Record<Relationship, { label: string; className: string }> =
	{
		client: {
			label: "Cliente",
			className: "bg-primary text-primary-foreground",
		},
		negotiating: {
			label: "Em negociação",
			className: "bg-ring/15 text-ring",
		},
		prospect: {
			label: "Prospect",
			className: "bg-foreground/8 text-muted-foreground",
		},
	};

function relationshipOf(company: CompanyRow): Relationship {
	if (company.wonDealCount > 0) return "client";
	if (company.openDealCount > 0) return "negotiating";
	return "prospect";
}

export function CompaniesCards() {
	const trpc = useTRPC();
	const openRecord = useOpenRecord();
	const prefetchRecord = usePrefetchRecord();
	const { query, input } = useTableQuery(companiesSearchParams);

	const companies = useQuery({
		...trpc.companies.list.queryOptions(input),
		placeholderData: (previous) => previous,
	});
	const currency = useQuery(trpc.currency.settings.queryOptions());
	const reporting = currency.data?.reportingCurrency ?? "BRL";

	const rows = companies.data?.rows ?? [];
	const total = companies.data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / input.pageSize));

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				<ListSearch placeholder="Buscar clientes por nome ou domínio…" />
				{companies.isFetching ? (
					<Spinner className="text-muted-foreground" />
				) : null}
			</div>

			{companies.isPending ? (
				<div className="flex flex-1 items-center justify-center py-24">
					<Spinner size="lg" className="text-foreground" />
				</div>
			) : rows.length === 0 ? (
				<p className="glass-surface px-6 py-12 text-center text-muted-foreground text-sm">
					Nenhum cliente corresponde a esta busca.
				</p>
			) : (
				<ul className="grid grid-cols-1 gap-3 overflow-y-auto pb-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
					{rows.map((company) => (
						<li key={company.id}>
							<CompanyCard
								company={company}
								currency={reporting}
								onOpen={() => openRecord({ kind: "company", id: company.id })}
								onHover={() =>
									prefetchRecord({ kind: "company", id: company.id })
								}
							/>
						</li>
					))}
				</ul>
			)}

			{total > input.pageSize ? (
				<TablePagination
					page={query.page}
					totalPages={totalPages}
					pageSize={input.pageSize}
					total={total}
					loading={companies.isFetching}
					onPageChange={(page) => void query.setPage(page)}
				/>
			) : null}
		</div>
	);
}

function CompanyCard({
	company,
	currency,
	onOpen,
	onHover,
}: {
	company: CompanyRow;
	currency: string;
	onOpen: () => void;
	onHover: () => void;
}) {
	const relationship = RELATIONSHIP[relationshipOf(company)];

	return (
		<button
			type="button"
			onClick={onOpen}
			onPointerEnter={onHover}
			className="glass-surface lift reveal relative flex h-full w-full flex-col gap-4 overflow-hidden p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
		>
			<span
				aria-hidden
				className="absolute inset-x-0 top-0 h-px"
				style={{
					backgroundImage: `linear-gradient(90deg, ${company.brandColor ?? "var(--ring)"}, transparent)`,
				}}
			/>
			<div className="flex items-start gap-3">
				<EntityLogo
					src={company.iconUrl ?? company.logoUrl}
					darkSrc={company.iconDarkUrl}
					tone={company.iconTone as EntityLogoTone | null | undefined}
					name={company.name}
					size="xl"
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="truncate font-medium text-[15px]">
						{company.name}
					</span>
					<span className="truncate text-muted-foreground text-xs">
						{company.domain ?? company.industry ?? "Sem domínio"}
					</span>
				</div>
				<span
					className={cn(
						"shrink-0 rounded-full px-2.5 py-0.5 font-medium text-[11px]",
						relationship.className,
					)}
				>
					{relationship.label}
				</span>
			</div>

			<dl className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1">
					<dt className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
						Vendido
					</dt>
					<dd className="font-semibold text-lg tabular-nums tracking-tight">
						{formatMoney(company.wonValueCents, currency)}
					</dd>
				</div>
				<div className="flex flex-col gap-1">
					<dt className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
						Em aberto
					</dt>
					<dd className="font-semibold text-lg tabular-nums tracking-tight">
						{formatMoney(company.openValueCents, currency)}
					</dd>
				</div>
			</dl>

			<div className="mt-auto flex items-center gap-3 border-t pt-3 text-muted-foreground text-xs">
				<span>
					{company.openDealCount === 1
						? "1 negócio aberto"
						: `${company.openDealCount} negócios abertos`}
				</span>
				<span aria-hidden>·</span>
				<span>
					{company.contactCount === 1
						? "1 contato"
						: `${company.contactCount} contatos`}
				</span>
				<span className="ml-auto flex items-center gap-2">
					{company.lastActivityAt ? (
						<LocalRelativeTime date={company.lastActivityAt} />
					) : null}
					<OwnerCell owner={company.owner} compact />
				</span>
			</div>
		</button>
	);
}
