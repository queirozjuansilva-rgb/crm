import { cn } from "@crm/ui/lib/utils";
import type * as React from "react";

type BarListItem = {
	key: string;
	label: React.ReactNode;
	value: React.ReactNode;
	ratio: number;
	color?: string;
	detail?: React.ReactNode;
	media?: React.ReactNode;
};

function BarList({
	items,
	className,
}: {
	items: BarListItem[];
	className?: string;
}) {
	return (
		<ul data-slot="bar-list" className={cn("flex flex-col gap-3", className)}>
			{items.map((item) => {
				const width = `${Math.max(0, Math.min(item.ratio, 1)) * 100}%`;
				return (
					<li key={item.key} className="group/bar flex flex-col gap-1.5">
						<div className="flex items-center gap-2 text-[13px]">
							{item.media}
							<span className="min-w-0 truncate">{item.label}</span>
							<span className="ml-auto shrink-0 font-medium tabular-nums">
								{item.value}
							</span>
						</div>
						<div className="h-2 overflow-hidden rounded-full bg-foreground/6">
							<div
								className="h-full rounded-full transition-[width,filter] duration-700 ease-out group-hover/bar:brightness-125 motion-reduce:transition-none"
								style={{
									width,
									backgroundColor: item.color ?? "var(--primary)",
								}}
							/>
						</div>
						{item.detail ? (
							<span className="font-mono text-[11px] text-muted-foreground tabular-nums">
								{item.detail}
							</span>
						) : null}
					</li>
				);
			})}
		</ul>
	);
}

export type { BarListItem };
export { BarList };
