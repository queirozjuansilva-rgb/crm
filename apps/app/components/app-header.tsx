"use client";

import Asleep from "@carbon/icons-react/es/Asleep";
import Light from "@carbon/icons-react/es/Light";
import Logout from "@carbon/icons-react/es/Logout";
import Menu from "@carbon/icons-react/es/Menu";
import Settings from "@carbon/icons-react/es/Settings";
import UserAvatar from "@carbon/icons-react/es/UserAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@crm/ui/components/avatar";
import { Button } from "@crm/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@crm/ui/components/dropdown-menu";
import Logo from "@crm/ui/components/logo";
import { Separator } from "@crm/ui/components/separator";
import { Skeleton } from "@crm/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { AppTopNav } from "@/components/app-top-nav";
import { EnrichmentQueue } from "@/components/enrichment-queue";
import { useMobileNav } from "@/components/mobile-nav";
import { signOutAndRedirect } from "@/lib/sign-out";
import { useTRPC } from "@/lib/trpc/client";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";
import { workspaceLabel } from "@/lib/workspace-label";

type User = { name: string; email: string; image: string | null };

export function AppHeader({ user }: { user: User }) {
	const { setOpen: setMobileNavOpen } = useMobileNav();
	const trpc = useTRPC();
	const workspaceUrl = useWorkspaceUrl();
	const workspace = useQuery(trpc.workspace.get.queryOptions());
	const label = workspaceLabel(workspace.data?.name);

	return (
		<header className="relative flex h-16 shrink-0 items-center gap-3 px-4 md:px-6 [view-transition-name:app-header]">
			<div className="flex min-w-0 shrink-0 items-center gap-2.5">
				<Button
					variant="ghost"
					size="icon"
					className="xl:hidden"
					aria-label="Abrir navegação"
					onClick={() => setMobileNavOpen(true)}
				>
					<Menu />
				</Button>
				<Link
					href={workspaceUrl()}
					aria-label="Início"
					className="flex items-center gap-2.5 text-foreground"
				>
					<Logo className="size-8 shrink-0" />
					<span className="font-semibold text-[19px] tracking-[-0.03em]">
						lugh
					</span>
				</Link>
				<Separator
					orientation="vertical"
					className="mx-1 hidden h-5 sm:block xl:hidden 2xl:block"
				/>
				<span className="hidden min-w-0 truncate font-medium font-mono sm:inline xl:hidden 2xl:inline text-[10.5px] text-muted-foreground uppercase tracking-[0.14em]">
					{label}
				</span>
			</div>

			<div className="absolute left-1/2 -translate-x-1/2">
				<AppTopNav />
			</div>

			<div className="ml-auto flex shrink-0 items-center gap-1.5">
				<EnrichmentQueue />
				<Button variant="ghost" size="icon" asChild>
					<Link href={workspaceUrl("/settings")} aria-label="Configurações">
						<Settings />
					</Link>
				</Button>
				<UserMenu
					user={user}
					onSignOut={() => {
						signOutAndRedirect().catch(() =>
							toast.error("Não foi possível sair."),
						);
					}}
				/>
			</div>
		</header>
	);
}

export function AppHeaderFallback() {
	return (
		<header
			className="flex h-16 shrink-0 items-center gap-3 px-4 md:px-6 [view-transition-name:app-header]"
			aria-busy="true"
		>
			<div className="flex shrink-0 items-center gap-2.5">
				<Logo className="size-8 shrink-0" />
				<span className="font-semibold text-[19px] tracking-[-0.03em]">
					lugh
				</span>
				<Separator orientation="vertical" className="mx-1 h-5" />
				<Skeleton className="h-4 w-24" />
			</div>

			<div className="ml-auto flex shrink-0 items-center gap-1.5">
				<Avatar className="size-8">
					<AvatarFallback />
				</Avatar>
			</div>
			<span role="status" className="sr-only">
				Carregando o cabeçalho…
			</span>
		</header>
	);
}

function UserMenu({ user, onSignOut }: { user: User; onSignOut: () => void }) {
	const { resolvedTheme, setTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Menu da conta"
					className="hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent"
				>
					<Avatar className="size-8">
						{user.image && <AvatarImage alt={user.name} src={user.image} />}
						<AvatarFallback className="text-xs">
							{initials(user.name)}
						</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-56">
				<DropdownMenuLabel className="flex items-center gap-2">
					<UserAvatar />
					<span className="min-w-0 truncate">{user.email}</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onSelect={(event) => {
						event.preventDefault();
						setTheme(isDark ? "light" : "dark");
					}}
				>
					{isDark ? <Light /> : <Asleep />}
					{isDark ? "Modo claro" : "Modo escuro"}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={onSignOut}>
					<Logout />
					Sair
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function initials(name: string): string {
	return (
		name
			.split(" ")
			.map((part) => part[0])
			.filter(Boolean)
			.slice(0, 2)
			.join("")
			.toUpperCase() || "?"
	);
}
