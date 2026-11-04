import { cn } from "@crm/ui/lib/utils";
import type * as React from "react";

const RING = { size: 168, stroke: 14 } as const;

function GoalCard({
	className,
	title,
	progress,
	centerLabel,
	stats,
	action,
	empty,
	...props
}: Omit<React.ComponentProps<"section">, "title"> & {
	title: React.ReactNode;
	progress: number | null;
	centerLabel: React.ReactNode;
	stats: { label: React.ReactNode; value: React.ReactNode }[];
	action?: React.ReactNode;
	empty?: React.ReactNode;
}) {
	const radius = (RING.size - RING.stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const ratio = progress === null ? 0 : Math.max(0, Math.min(progress, 1));
	const percent = progress === null ? null : Math.round(progress * 100);

	return (
		<section
			data-slot="goal-card"
			className={cn(
				"spotlight lift reveal flex flex-col gap-4 rounded-xl border border-primary/35 bg-linear-to-br from-primary/30 to-primary/10 p-5 backdrop-blur-xl md:p-6",
				className,
			)}
			{...props}
		>
			<div className="flex items-center justify-between gap-3">
				<h3 className="font-medium text-sm">{title}</h3>
				{action}
			</div>
			{progress === null ? (
				<div className="flex flex-1 items-center justify-center py-8 text-center text-muted-foreground text-sm">
					{empty}
				</div>
			) : (
				<>
					<div className="flex justify-center py-1">
						<svg
							role="img"
							aria-label={`${percent}%`}
							viewBox={`0 0 ${RING.size} ${RING.size}`}
							className="size-40"
						>
							<circle
								cx={RING.size / 2}
								cy={RING.size / 2}
								r={radius}
								fill="none"
								stroke="currentColor"
								strokeOpacity={0.14}
								strokeWidth={RING.stroke}
							/>
							<circle
								cx={RING.size / 2}
								cy={RING.size / 2}
								r={radius}
								fill="none"
								stroke="var(--primary)"
								strokeWidth={RING.stroke}
								strokeLinecap="round"
								strokeDasharray={`${circumference * ratio} ${circumference}`}
								transform={`rotate(-90 ${RING.size / 2} ${RING.size / 2})`}
								className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-1000"
							/>
							<text
								x="50%"
								y="49%"
								textAnchor="middle"
								className="fill-foreground font-semibold text-[34px] tracking-[-0.03em]"
							>
								{percent}%
							</text>
							<text
								x="50%"
								y="63%"
								textAnchor="middle"
								className="fill-muted-foreground text-[11px]"
							>
								{centerLabel}
							</text>
						</svg>
					</div>
					<dl className="grid grid-cols-3 gap-2 text-center">
						{stats.map((stat, index) => (
							<div key={index} className="flex flex-col gap-0.5">
								<dt className="text-muted-foreground text-xs">{stat.label}</dt>
								<dd className="font-semibold text-sm tabular-nums">
									{stat.value}
								</dd>
							</div>
						))}
					</dl>
				</>
			)}
		</section>
	);
}

export { GoalCard };
