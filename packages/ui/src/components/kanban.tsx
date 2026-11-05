"use client";

import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	MouseSensor,
	pointerWithin,
	TouchSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { cn } from "@crm/ui/lib/utils";
import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import * as React from "react";

type KanbanColumn = {
	id: string;
	title: React.ReactNode;
	accent: string;
	meta?: React.ReactNode;
};

type KanbanBoardProps<T> = {
	columns: KanbanColumn[];
	items: T[];
	getItemId: (item: T) => string;
	getColumnId: (item: T) => string;
	renderItem: (item: T) => React.ReactNode;
	onMove: (item: T, columnId: string) => void;
	onOpen?: (item: T) => void;
	empty?: React.ReactNode;
	className?: string;
};

function KanbanBoard<T>({
	columns,
	items,
	getItemId,
	getColumnId,
	renderItem,
	onMove,
	onOpen,
	empty = "Arraste um card para cá",
	className,
}: KanbanBoardProps<T>) {
	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 220, tolerance: 8 },
		}),
		useSensor(KeyboardSensor),
	);
	const [dragging, setDragging] = React.useState<T | null>(null);

	const byColumn = React.useMemo(() => {
		const groups = new Map<string, T[]>(
			columns.map((column) => [column.id, []]),
		);
		for (const item of items) groups.get(getColumnId(item))?.push(item);
		return groups;
	}, [columns, items, getColumnId]);

	const find = (id: string) => items.find((item) => getItemId(item) === id);

	const onDragStart = (event: DragStartEvent) => {
		setDragging(find(String(event.active.id)) ?? null);
	};

	const onDragEnd = (event: DragEndEvent) => {
		setDragging(null);
		const item = find(String(event.active.id));
		const target = event.over ? String(event.over.id) : null;
		if (!item || !target || target === getColumnId(item)) return;
		onMove(item, target);
	};

	return (
		<LazyMotion features={domAnimation}>
			<DndContext
				sensors={sensors}
				collisionDetection={pointerWithin}
				onDragStart={onDragStart}
				onDragEnd={onDragEnd}
				onDragCancel={() => setDragging(null)}
			>
				<div
					data-slot="kanban-board"
					className={cn(
						"flex min-h-0 flex-1 snap-x snap-mandatory max-sm:min-h-[62svh] max-sm:flex-none gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin] sm:snap-none",
						className,
					)}
				>
					{columns.map((column) => (
						<KanbanLane
							key={column.id}
							column={column}
							count={byColumn.get(column.id)?.length ?? 0}
							empty={empty}
						>
							{byColumn.get(column.id)?.map((item) => (
								<KanbanCard
									key={getItemId(item)}
									id={getItemId(item)}
									onOpen={onOpen ? () => onOpen(item) : undefined}
								>
									{renderItem(item)}
								</KanbanCard>
							))}
						</KanbanLane>
					))}
				</div>
				<DragOverlay dropAnimation={{ duration: 220 }}>
					{dragging ? (
						<div className="kanban-card rotate-[1.5deg] cursor-grabbing border-ring/60 shadow-[0_24px_60px_-20px_color-mix(in_oklab,var(--ring)_70%,transparent)]">
							{renderItem(dragging)}
						</div>
					) : null}
				</DragOverlay>
			</DndContext>
		</LazyMotion>
	);
}

function KanbanLane({
	column,
	count,
	empty,
	children,
}: {
	column: KanbanColumn;
	count: number;
	empty: React.ReactNode;
	children: React.ReactNode;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: column.id });

	return (
		<section
			ref={setNodeRef}
			data-slot="kanban-lane"
			data-over={isOver ? "" : undefined}
			aria-label={typeof column.title === "string" ? column.title : undefined}
			className="glass-surface reveal flex min-w-[82vw] flex-1 basis-0 snap-start flex-col sm:min-w-56 transition-[border-color,background-color] duration-200 data-over:border-ring/70 data-over:bg-primary/8"
		>
			<header className="flex flex-col gap-1 px-4 pt-4 pb-3">
				<div className="flex items-start gap-2">
					<span
						aria-hidden
						className="mt-1.5 size-2 shrink-0 rounded-full"
						style={{ backgroundColor: column.accent }}
					/>
					<h3 className="line-clamp-2 font-medium text-sm leading-tight">
						{column.title}
					</h3>
					<span className="ml-auto rounded-full bg-foreground/8 px-2 py-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
						{count}
					</span>
				</div>
				{column.meta ? (
					<div className="font-mono text-[11px] text-muted-foreground tabular-nums">
						{column.meta}
					</div>
				) : null}
				<span
					aria-hidden
					className="mt-2 h-px w-full"
					style={{
						backgroundImage: `linear-gradient(90deg, ${column.accent}, transparent)`,
					}}
				/>
			</header>
			<div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
				{children}
				{count === 0 ? (
					<p className="rounded-lg border border-dashed px-3 py-6 text-center text-muted-foreground text-xs">
						{empty}
					</p>
				) : null}
			</div>
		</section>
	);
}

function KanbanCard({
	id,
	onOpen,
	children,
}: {
	id: string;
	onOpen?: () => void;
	children: React.ReactNode;
}) {
	const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
		id,
	});
	const reduceMotion = useReducedMotion();

	return (
		<m.div
			ref={setNodeRef}
			layout={!reduceMotion}
			initial={reduceMotion ? false : { opacity: 0, y: 8 }}
			animate={{ opacity: isDragging ? 0.35 : 1, y: 0 }}
			transition={{ type: "spring", stiffness: 420, damping: 34 }}
			data-slot="kanban-card"
			className="kanban-card spotlight lift cursor-grab touch-manipulation select-none text-left active:cursor-grabbing [-webkit-touch-callout:none]"
			onClick={onOpen}
			{...attributes}
			{...listeners}
		>
			{children}
		</m.div>
	);
}

export type { KanbanColumn };
export { KanbanBoard };
