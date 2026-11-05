"use client";

import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@crm/ui/components/card";
import { CardTableEmpty } from "@crm/ui/components/card-table";
import {
	SimpleTable,
	type SimpleTableColumn,
	SimpleTableRow,
} from "@crm/ui/components/simple-table";
import { TableCell } from "@crm/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

const CELL = "px-3 py-2.5 align-middle";

const COLUMNS: SimpleTableColumn[] = [
	{ id: "source", header: "Origem" },
	{ id: "medium", header: "Medium", width: "w-32" },
	{ id: "views", header: "Page views", width: "w-28", align: "right" },
	{ id: "contacts", header: "Contatos", width: "w-24", align: "right" },
];

export function TrafficSources() {
	const trpc = useTRPC();
	const sources = useQuery(trpc.tracking.sources.queryOptions());

	if (!sources.data) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Origens de tráfego</CardTitle>
				<CardDescription>
					De onde vêm os visitantes. Só quem enviou um formulário é ligado a um
					registro.
				</CardDescription>
			</CardHeader>

			{sources.data.length === 0 ? (
				<CardTableEmpty>
					Nenhuma origem ainda. Elas aparecem quando o script registrar a
					primeira visita.
				</CardTableEmpty>
			) : (
				<SimpleTable columns={COLUMNS}>
					{sources.data.map((row) => (
						<SimpleTableRow key={`${row.source}-${row.medium ?? ""}`}>
							<TableCell className={CELL}>{row.source}</TableCell>
							<TableCell className={`${CELL} text-muted-foreground`}>
								{row.medium ?? "—"}
							</TableCell>
							<TableCell className={`${CELL} text-right tabular-nums`}>
								{row.views.toLocaleString("pt-BR")}
							</TableCell>
							<TableCell className={`${CELL} text-right tabular-nums`}>
								{row.contacts.toLocaleString("pt-BR")}
							</TableCell>
						</SimpleTableRow>
					))}
				</SimpleTable>
			)}
		</Card>
	);
}
