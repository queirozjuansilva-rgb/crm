"use client";

import { PillNav, PillNavLink } from "@crm/ui/components/pill-nav";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ITEMS, isActive, SETTINGS_HREF } from "@/components/app-icon-rail";
import { usePrefetchSection } from "@/components/crm/section-prefetch";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";

export function AppTopNav() {
	const pathname = usePathname();
	const workspaceUrl = useWorkspaceUrl();
	const prefetchSection = usePrefetchSection();

	const items = useMemo(
		() =>
			ITEMS.filter((item) => item.href !== SETTINGS_HREF).map((item) => ({
				...item,
				section: item.href,
				href: workspaceUrl(item.href),
				related: item.related?.map((path) => workspaceUrl(path)),
			})),
		[workspaceUrl],
	);

	return (
		<PillNav aria-label="Principal" className="hidden lg:flex">
			{items.map((item) => {
				const active = isActive(item, pathname);
				return (
					<PillNavLink key={item.href} asChild active={active}>
						<Link
							href={item.href}
							prefetch
							onMouseEnter={() => prefetchSection(item.section)}
							onFocus={() => prefetchSection(item.section)}
							aria-current={active ? "page" : undefined}
							transitionTypes={["nav-lateral"]}
						>
							{item.title}
						</Link>
					</PillNavLink>
				);
			})}
		</PillNav>
	);
}
