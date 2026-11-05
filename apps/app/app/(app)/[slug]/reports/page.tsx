import type { Metadata } from "next";
import { Suspense } from "react";
import {
	PageShell,
	PageShellContent,
	PageShellDescription,
	PageShellHeader,
	PageShellHeading,
	PageShellLoading,
	PageShellTitle,
} from "@/components/page-shell";
import { requireSession } from "@/lib/session";
import { ReportsView } from "./reports-view";

export const metadata: Metadata = {
	title: "Relatórios",
};

export default function ReportsPage() {
	return (
		<PageShell>
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>Relatórios</PageShellTitle>
					<PageShellDescription>
						Conversão do funil, vendas por mês, desempenho do time e onde os
						negócios estão parados.
					</PageShellDescription>
				</PageShellHeading>
			</PageShellHeader>

			<PageShellContent>
				<Suspense fallback={<PageShellLoading />}>
					<Reports />
				</Suspense>
			</PageShellContent>
		</PageShell>
	);
}

async function Reports() {
	await requireSession();
	return <ReportsView />;
}
