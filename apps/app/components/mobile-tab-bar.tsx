"use client";

import Calendar from "@carbon/icons-react/es/Calendar";
import Dashboard from "@carbon/icons-react/es/Dashboard";
import Menu from "@carbon/icons-react/es/Menu";
import Partnership from "@carbon/icons-react/es/Partnership";
import TaskView from "@carbon/icons-react/es/TaskView";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, type RailItem } from "@/components/app-icon-rail";
import { useMobileNav } from "@/components/mobile-nav";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";

const TABS: RailItem[] = [
	{ title: "Início", href: "/", icon: Dashboard, match: "exact" },
	{ title: "Pipeline", href: "/deals", icon: Partnership, match: "prefix" },
	{ title: "Agenda", href: "/agenda", icon: Calendar, match: "prefix" },
	{ title: "Projetos", href: "/projects", icon: TaskView, match: "prefix" },
];

const TAB_CLASS =
	"flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 font-medium text-[10.5px] text-muted-foreground transition-colors active:scale-95 data-active:bg-foreground/10 data-active:text-foreground";

export function MobileTabBar() {
	const pathname = usePathname();
	const workspaceUrl = useWorkspaceUrl();
	const { setOpen } = useMobileNav();

	return (
		<nav
			aria-label="Navegação rápida"
			className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex items-stretch gap-1 rounded-3xl border bg-popover/85 p-1.5 shadow-[0_18px_40px_-20px_rgb(0_0_0/0.6)] backdrop-blur-xl xl:hidden"
		>
			{TABS.map((tab) => {
				const href = workspaceUrl(tab.href);
				const active = isActive({ ...tab, href }, pathname);
				const Glyph = tab.icon;
				return (
					<Link
						key={tab.href}
						href={href}
						data-active={active ? "" : undefined}
						aria-current={active ? "page" : undefined}
						className={TAB_CLASS}
					>
						<Glyph className="size-5" />
						{tab.title}
					</Link>
				);
			})}
			<button type="button" onClick={() => setOpen(true)} className={TAB_CLASS}>
				<Menu className="size-5" />
				Mais
			</button>
		</nav>
	);
}
