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
import { FinanceView } from "./finance-view";

export const metadata: Metadata = {
	title: "Financeiro",
};

export default function FinancePage() {
	return (
		<PageShell>
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>Financeiro</PageShellTitle>
					<PageShellDescription>
						Contas a receber dos clientes, despesas da Lugh e o fluxo de caixa
						mês a mês.
					</PageShellDescription>
				</PageShellHeading>
			</PageShellHeader>

			<PageShellContent>
				<Suspense fallback={<PageShellLoading />}>
					<Finance />
				</Suspense>
			</PageShellContent>
		</PageShell>
	);
}

async function Finance() {
	await requireSession();
	return <FinanceView />;
}
