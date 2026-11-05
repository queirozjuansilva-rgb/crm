import { vendorBySlug, vendors } from "@crm/mcp-integrations/catalog";
import GoogleLogo from "@crm/ui/components/brand-logos/google";
import MicrosoftLogo from "@crm/ui/components/brand-logos/microsoft";
import SlackLogo from "@crm/ui/components/brand-logos/slack";
import { Button } from "@crm/ui/components/button";
import { ProviderMark } from "@crm/ui/components/provider-mark";
import { Spinner } from "@crm/ui/components/spinner";
import { providerBrand } from "@crm/ui/lib/provider-brand";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSession } from "@/lib/session";
import { getServerQueryClient, getServerTrpc } from "@/lib/trpc/server";
import { AddConnectionDialog } from "./add-connection-dialog";

export const metadata: Metadata = { title: "Conexões" };

export default function ConnectionsSettingsPage(
	props: PageProps<"/[slug]/settings/connections">,
) {
	return (
		<Suspense fallback={<ConnectionsFallback />}>
			<ConnectionsSettingsPageContent {...props} />
		</Suspense>
	);
}

async function ConnectionsSettingsPageContent({
	params,
	searchParams,
}: PageProps<"/[slug]/settings/connections">) {
	await requireSession();
	const [{ slug }, query] = await Promise.all([params, searchParams]);
	const queryClient = getServerQueryClient();
	const trpc = getServerTrpc();
	const dialogOpen = first(query.add) === "1";
	const [google, microsoft, slack, mcp] = await Promise.all([
		queryClient.fetchQuery(trpc.google.status.queryOptions()),
		queryClient.fetchQuery(trpc.microsoft.status.queryOptions()),
		queryClient.fetchQuery(trpc.slack.status.queryOptions()),
		queryClient.fetchQuery(trpc.mcp.list.queryOptions()),
	]);
	const mcpRows = mcp.entries.flatMap((entry) => {
		const vendor = vendorBySlug(entry.slug);
		if (!vendor || entry.connection?.status !== "connected") return [];

		return [
			{
				name: vendor.name,
				status: "Conectado",
				bringsIn: vendor.presentation.bringsIn,
				sends:
					entry.connection.accessMode === "read_write"
						? vendor.presentation.sendsReadWrite
						: vendor.presentation.sendsReadOnly,
				href: `/${slug}/settings/connections/${vendor.slug}`,
				mark: (
					<ProviderMark
						slug={vendor.slug}
						name={vendor.name}
						brand={providerBrand(vendor.slug, vendor.name)}
						className="size-5"
					/>
				),
			},
		];
	});
	const rows = [
		...(google.linked
			? [
					{
						name: "Google Workspace",
						status: "Conectado",
						bringsIn: "E-mails, reuniões e as pessoas envolvidas",
						sends: "Nada ainda",
						href: `/${slug}/settings/connections/google`,
						mark: <GoogleLogo className="size-5 shrink-0" />,
					},
				]
			: []),
		...(slack.connected
			? [
					{
						name: "Slack",
						status: slack.workspace
							? `Conectado a ${slack.workspace}`
							: "Conectado",
						bringsIn: "Membros do espaço e canais em que o app entrou",
						sends: "Mensagens para canais e pessoas aprovados",
						href: `/${slug}/settings/connections/slack`,
						mark: <SlackLogo className="size-5 shrink-0" />,
					},
				]
			: []),
		...(microsoft.linked
			? [
					{
						name: "Microsoft 365",
						status: "Conectado",
						bringsIn: "E-mails do Outlook e as pessoas envolvidas",
						sends: "Nada ainda",
						href: `/${slug}/settings/connections/microsoft`,
						mark: <MicrosoftLogo className="size-5 shrink-0" />,
					},
				]
			: []),
		...mcpRows,
	];

	return (
		<main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-(--spacing-page-inline) pt-(--spacing-page-top) pb-(--spacing-page-bottom)">
			{rows.length > 0 ? (
				<div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-(--spacing-page-gap)">
					<header className="flex items-start justify-between gap-4 px-(--spacing-block-inline)">
						<div className="flex flex-col gap-2">
							<h1 className="font-medium text-2xl tracking-tight">Conexões</h1>
							<p className="max-w-2xl text-muted-foreground text-sm">
								De onde o CRM tira informações e o que pode enviar em seu nome.
							</p>
						</div>
						<Button asChild variant="outline">
							<Link href={`/${slug}/settings/connections?add=1`}>
								Adicionar conexão
							</Link>
						</Button>
					</header>
					<div className="flex flex-col gap-3">
						{rows.map((row) => (
							<ConnectionCard key={row.name} {...row} />
						))}
					</div>
				</div>
			) : (
				<div className="mx-auto flex w-full max-w-(--container-narrow) flex-1 flex-col justify-center gap-(--spacing-page-gap) text-center">
					<div className="flex flex-col gap-2 px-(--spacing-block-inline)">
						<h1 className="font-medium text-2xl tracking-tight">
							Nada conectado ainda
						</h1>
						<p className="text-muted-foreground text-sm leading-relaxed">
							Hoje todo negócio, contato e nota precisa ser digitado à mão.
							Conecte uma ferramenta e o CRM passa a se preencher com o trabalho
							que o time já faz.
						</p>
					</div>
					<div className="flex flex-col divide-y rounded-lg border bg-card px-(--spacing-block-inline)">
						<StarterRow
							logo={GoogleLogo}
							name="Google Workspace"
							description="Vincula e-mails e reuniões ao cliente certo"
							href={`/${slug}/settings/connections/google`}
						/>
						<StarterRow
							logo={SlackLogo}
							name="Slack"
							description="Permite que agentes publicados avisem canais e pessoas aprovados"
							href={`/${slug}/settings/connections/slack`}
						/>
						<StarterRow
							logo={MicrosoftLogo}
							name="Microsoft 365"
							description="Vincula e-mails do Outlook ao cliente certo"
							href={`/${slug}/settings/connections/microsoft`}
						/>
					</div>
					<p className="px-(--spacing-block-inline) text-muted-foreground text-sm">
						Procurando outra coisa?{" "}
						<Link
							className="font-medium text-foreground underline underline-offset-4"
							href={`/${slug}/settings/connections?add=1`}
						>
							Ver todas as conexões
						</Link>
					</p>
				</div>
			)}
			<AddConnectionDialog
				slug={slug}
				open={dialogOpen}
				connected={rows.map((row) => row.name)}
				mcpConfigured={mcp.configured}
				canManageMcp={mcp.canManage}
				mcpProviders={vendors.map((vendor) => ({
					slug: vendor.slug,
					name: vendor.name,
					description: vendor.presentation.description,
					brand: providerBrand(vendor.slug, vendor.name),
				}))}
			/>
		</main>
	);
}

function ConnectionsFallback() {
	return (
		<main className="flex min-h-0 min-w-0 flex-1 items-center justify-center px-(--spacing-page-inline) pt-(--spacing-page-top) pb-(--spacing-page-bottom)">
			<Spinner size="lg" />
		</main>
	);
}

function ConnectionCard({
	name,
	status,
	bringsIn,
	sends,
	href,
	mark,
}: {
	name: string;
	status: string;
	bringsIn: string;
	sends: string;
	href: string;
	mark: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-4 rounded-lg border bg-card px-(--spacing-block-inline) py-4">
			<div className="flex items-center gap-3">
				{mark}
				<h2 className="font-medium text-sm">{name}</h2>
				<p className="ml-auto text-right text-muted-foreground text-xs">
					{status}
				</p>
				<Button asChild size="sm" variant="outline">
					<Link href={href}>Gerenciar</Link>
				</Button>
			</div>
			<div className="flex flex-col gap-2 pl-8 text-sm">
				<CapabilityRow label="Traz" value={bringsIn} />
				<CapabilityRow label="Envia" value={sends} />
			</div>
		</section>
	);
}

function CapabilityRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex gap-4">
			<span className="w-22 shrink-0 text-muted-foreground">{label}</span>
			<span>{value}</span>
		</div>
	);
}

function StarterRow({
	logo: Logo,
	name,
	description,
	href,
}: {
	logo: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	name: string;
	description: string;
	href: string;
}) {
	return (
		<div className="flex items-center gap-3 py-4 text-left">
			<Logo className="size-5 shrink-0" />
			<div className="min-w-0 flex-1">
				<h2 className="font-medium text-sm">{name}</h2>
				<p className="text-muted-foreground text-xs">{description}</p>
			</div>
			<Button asChild variant="outline" size="sm">
				<Link href={href}>Conectar</Link>
			</Button>
		</div>
	);
}

function first(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}
