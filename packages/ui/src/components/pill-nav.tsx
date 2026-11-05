"use client";

import { cn } from "@crm/ui/lib/utils";
import { Slot } from "radix-ui";
import * as React from "react";

type Box = { left: number; width: number };

const LINK_SELECTOR = '[data-slot="pill-nav-link"]';

function measure(nav: HTMLElement, link: Element | null): Box | null {
	if (!(link instanceof HTMLElement)) return null;
	const navRect = nav.getBoundingClientRect();
	const rect = link.getBoundingClientRect();
	return { left: rect.left - navRect.left, width: rect.width };
}

function PillNav({
	className,
	children,
	...props
}: React.ComponentProps<"nav">) {
	const ref = React.useRef<HTMLElement>(null);
	const [active, setActive] = React.useState<Box | null>(null);
	const [hover, setHover] = React.useState<Box | null>(null);

	React.useLayoutEffect(() => {
		const nav = ref.current;
		if (!nav) return;
		const sync = () =>
			setActive(measure(nav, nav.querySelector(`${LINK_SELECTOR}[data-active]`)));
		sync();
		const resize = new ResizeObserver(sync);
		resize.observe(nav);
		const mutation = new MutationObserver(sync);
		mutation.observe(nav, {
			subtree: true,
			attributes: true,
			attributeFilter: ["data-active"],
		});
		return () => {
			resize.disconnect();
			mutation.disconnect();
		};
	}, []);

	const onPointerOver = (event: React.PointerEvent<HTMLElement>) => {
		const nav = ref.current;
		if (!nav || !(event.target instanceof Element)) return;
		setHover(measure(nav, event.target.closest(LINK_SELECTOR)));
	};

	return (
		<nav
			ref={ref}
			data-slot="pill-nav"
			onPointerOver={onPointerOver}
			onPointerLeave={() => setHover(null)}
			className={cn(
				"relative isolate flex items-center gap-0.5 rounded-full border bg-card p-1 backdrop-blur-xl",
				className,
			)}
			{...props}
		>
			<span
				aria-hidden
				className="pointer-events-none absolute inset-y-1 -z-10 rounded-full bg-foreground/6 transition-[left,width,opacity] duration-300 ease-out motion-reduce:transition-none"
				style={{
					left: hover?.left ?? active?.left ?? 0,
					width: hover?.width ?? active?.width ?? 0,
					opacity: hover ? 1 : 0,
				}}
			/>
			<span
				aria-hidden
				className="pointer-events-none absolute inset-y-1 -z-10 rounded-full bg-foreground/12 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ring)_30%,transparent)] transition-[left,width,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
				style={{
					left: active?.left ?? 0,
					width: active?.width ?? 0,
					opacity: active ? 1 : 0,
				}}
			/>
			{children}
		</nav>
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
				"inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full px-3 font-medium 2xl:px-4 text-[13px] text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 data-active:text-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export { PillNav, PillNavLink };
