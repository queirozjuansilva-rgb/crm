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
import { AgendaView } from "./agenda-view";

export const metadata: Metadata = {
	title: "Agenda",
};

export default function AgendaPage() {
	return (
		<PageShell className="min-h-0">
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>Agenda</PageShellTitle>
					<PageShellDescription>
						Reuniões com clientes do Google Agenda e tarefas com prazo do CRM.
					</PageShellDescription>
				</PageShellHeading>
			</PageShellHeader>

			<PageShellContent className="min-h-0">
				<Suspense fallback={<PageShellLoading />}>
					<Agenda />
				</Suspense>
			</PageShellContent>
		</PageShell>
	);
}

async function Agenda() {
	await requireSession();
	return <AgendaView />;
}
