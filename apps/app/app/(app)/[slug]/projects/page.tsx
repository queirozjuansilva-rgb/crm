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
import { ProjectsView } from "./projects-view";

export const metadata: Metadata = {
	title: "Projetos",
};

export default function ProjectsPage() {
	return (
		<PageShell>
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>Projetos</PageShellTitle>
					<PageShellDescription>
						As entregas de cada cliente e as tarefas do time.
					</PageShellDescription>
				</PageShellHeading>
			</PageShellHeader>

			<PageShellContent>
				<Suspense fallback={<PageShellLoading />}>
					<Projects />
				</Suspense>
			</PageShellContent>
		</PageShell>
	);
}

async function Projects() {
	await requireSession();
	return <ProjectsView />;
}
