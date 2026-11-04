"use client";

import { toggleVariants } from "@crm/ui/components/toggle";
import { cn } from "@crm/ui/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import * as React from "react";

const ToggleGroupContext = React.createContext<
	VariantProps<typeof toggleVariants> & {
		spacing?: number;
		orientation?: "horizontal" | "vertical";
	}
>({
	size: "default",
	variant: "default",
	spacing: 2,
	orientation: "horizontal",
});

function ToggleGroup({
	className,
	variant,
	size,
	spacing = 2,
	orientation = "horizontal",
	children,
	...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
	VariantProps<typeof toggleVariants> & {
		spacing?: number;
		orientation?: "horizontal" | "vertical";
	}) {
	const context = React.useMemo(
		() => ({ variant, size, spacing, orientation }),
		[variant, size, spacing, orientation],
	);

	return (
		<ToggleGroupPrimitive.Root
			data-slot="toggle-group"
			data-variant={variant}
			data-size={size}
			data-spacing={spacing}
			data-orientation={orientation}
			style={{ "--gap": spacing } as React.CSSProperties}
			className={cn(
				"group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-full data-[size=sm]:rounded-full data-[spacing=0]:data-[variant=outline]:gap-0.5 data-[spacing=0]:data-[variant=outline]:border data-[spacing=0]:data-[variant=outline]:border-input data-[spacing=0]:data-[variant=outline]:bg-card data-[spacing=0]:data-[variant=outline]:p-0.5 data-vertical:w-full data-vertical:flex-col data-vertical:items-stretch",
				className,
			)}
			{...props}
		>
			<ToggleGroupContext.Provider value={context}>
				{children}
			</ToggleGroupContext.Provider>
		</ToggleGroupPrimitive.Root>
	);
}

function ToggleGroupItem({
	className,
	children,
	variant = "default",
	size = "default",
	...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
	VariantProps<typeof toggleVariants>) {
	const context = React.useContext(ToggleGroupContext);

	return (
		<ToggleGroupPrimitive.Item
			data-slot="toggle-group-item"
			data-variant={context.variant || variant}
			data-size={context.size || size}
			data-spacing={context.spacing}
			className={cn(
				"shrink-0 focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:px-3 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-2 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-2 group-data-[spacing=0]/toggle-group:rounded-full group-data-[spacing=0]/toggle-group:data-[variant=outline]:border-0 group-data-[spacing=0]/toggle-group:data-[variant=outline]:data-[state=on]:bg-foreground/12 group-data-[spacing=0]/toggle-group:data-[variant=outline]:data-[state=on]:ring-0",
				toggleVariants({
					variant: context.variant || variant,
					size: context.size || size,
				}),
				className,
			)}
			{...props}
		>
			{children}
		</ToggleGroupPrimitive.Item>
	);
}

export { ToggleGroup, ToggleGroupItem };
