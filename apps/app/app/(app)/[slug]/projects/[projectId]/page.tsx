import type { Metadata } from "next";
import { Suspense } from "react";
import {
	PageShell,
	PageShellContent,
	PageShellLoading,
} from "@/components/page-shell";
import { requireSession } from "@/lib/session";
import { ProjectBoard } from "./project-board";

export const metadata: Metadata = {
	title: "Projeto",
};

export default function ProjectPage({
	params,
}: PageProps<"/[slug]/projects/[projectId]">) {
	return (
		<PageShell className="min-h-0">
			<PageShellContent className="min-h-0">
				<Suspense fallback={<PageShellLoading />}>
					<Project params={params} />
				</Suspense>
			</PageShellContent>
		</PageShell>
	);
}

async function Project({
	params,
}: Pick<PageProps<"/[slug]/projects/[projectId]">, "params">) {
	const [, { projectId }] = await Promise.all([requireSession(), params]);
	return <ProjectBoard projectId={projectId} />;
}
