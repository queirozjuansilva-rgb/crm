import { cn } from "@crm/ui/lib/utils";
import { Slot } from "radix-ui";
import type * as React from "react";

function PillNav({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			data-slot="pill-nav"
			className={cn(
				"flex items-center gap-0.5 rounded-full border bg-card p-1 backdrop-blur-xl",
				className,
			)}
			{...props}
		/>
	);
}

function PillNavLink({
	className,
	active = false,
	asChild = false,
	...props
}: React.ComponentProps<"a"> & { active?: boolean; asChild?: boolean }) {
	const Comp = asChild ? Slot.Root : "a";

	return (
		<Comp
			data-slot="pill-nav-link"
			data-active={active ? "" : undefined}
			className={cn(
				"inline-flex h-8 items-center justify-center rounded-full px-4 font-medium text-[13px] text-muted-foreground outline-none transition-[color,background-color] duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 data-active:bg-foreground/12 data-active:text-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export { PillNav, PillNavLink };
