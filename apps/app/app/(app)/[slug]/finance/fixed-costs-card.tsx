"use client";

import Add from "@carbon/icons-react/es/Add";
import Edit from "@carbon/icons-react/es/Edit";
import { Button } from "@crm/ui/components/button";
import {
	Card,
	CardAction,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@crm/ui/components/card";
import { DatePicker } from "@crm/ui/components/date-picker";
import { Field, FieldGroup, FieldLabel } from "@crm/ui/components/field";
import { Input } from "@crm/ui/components/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@crm/ui/components/sheet";
import { Spinner } from "@crm/ui/components/spinner";
import { Switch } from "@crm/ui/components/switch";
import { formatMoney, parseMoneyToCents } from "@crm/ui/lib/format";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type FixedCost = RouterOutputs["fixedCosts"]["list"]["rows"][number];
type Editing = { cost: FixedCost | null } | null;

const DEFAULT_DUE_DAY = "10";

function money(cents: number) {
	return formatMoney(cents, "BRL");
}

function firstOfMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function centsToInput(cents: number): string {
	return (cents / 100).toFixed(2).replace(".", ",").replace(/,00$/, "");
}

export function FixedCostsCard() {
	const trpc = useTRPC();
	const costs = useQuery(trpc.fixedCosts.list.queryOptions());
	const [editing, setEditing] = useState<Editing>(null);
	const rows = costs.data?.rows ?? [];

	return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle>Contas fixas</CardTitle>
				<CardDescription>
					{rows.length > 0
						? `${money(costs.data?.monthlyCents ?? 0)} por mês. Entram sozinhas nos lançamentos de cada mês.`
						: "Cartão, salários e assinaturas que se repetem todo mês."}
				</CardDescription>
				<CardAction>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setEditing({ cost: null })}
					>
						<Add data-icon="inline-start" />
						Conta fixa
					</Button>
				</CardAction>
			</CardHeader>
			<div className="glass-surface reveal">
				{costs.isPending ? (
					<div className="flex justify-center py-8">
						<Spinner className="text-muted-foreground" />
					</div>
				) : rows.length === 0 ? (
					<p className="py-8 text-center text-muted-foreground text-sm">
						Nenhuma conta fixa ainda.
					</p>
				) : (
					<ul className="divide-y">
						{rows.map((cost) => (
							<FixedCostRow
								key={cost.id}
								cost={cost}
								onEdit={() => setEditing({ cost })}
							/>
						))}
					</ul>
				)}
			</div>
			<Sheet
				open={editing !== null}
				onOpenChange={(next) => !next && setEditing(null)}
			>
				<SheetContent side="right">
					{editing ? (
						<FixedCostForm
							key={editing.cost?.id ?? "new"}
							cost={editing.cost}
							onClose={() => setEditing(null)}
						/>
					) : null}
				</SheetContent>
			</Sheet>
		</Card>
	);
}

function FixedCostRow({
	cost,
	onEdit,
}: {
	cost: FixedCost;
	onEdit: () => void;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const setActive = useMutation(
		trpc.fixedCosts.setActive.mutationOptions({
			onSuccess: async (updated) => {
				await cache.finance();
				toast.success(
					updated.active
						? `${updated.description} voltou a entrar todo mês.`
						: `${updated.description} parou de entrar nos próximos meses.`,
				);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<li
			data-inactive={cost.active ? undefined : ""}
			className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 data-inactive:opacity-60 md:px-6"
		>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate font-medium text-[13px]">
					{cost.description}
				</span>
				<span className="truncate text-muted-foreground text-xs">
					{[cost.category, `Vence dia ${cost.dueDay}`]
						.filter(Boolean)
						.join(" · ")}
				</span>
			</span>
			<span className="w-32 shrink-0 text-right font-semibold text-chart-4 tabular-nums">
				− {money(cost.amountCents)}
			</span>
			<Switch
				checked={cost.active}
				disabled={setActive.isPending}
				onCheckedChange={(active) => setActive.mutate({ id: cost.id, active })}
				aria-label={`${cost.description} ativa`}
			/>
			<Button
				variant="ghost"
				size="icon-xs"
				aria-label={`Editar ${cost.description}`}
				onClick={onEdit}
			>
				<Edit />
			</Button>
		</li>
	);
}

function FixedCostForm({
	cost,
	onClose,
}: {
	cost: FixedCost | null;
	onClose: () => void;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const descriptionId = useId();
	const amountId = useId();
	const dueId = useId();
	const categoryId = useId();
	const startId = useId();

	const [description, setDescription] = useState(cost?.description ?? "");
	const [amount, setAmount] = useState(
		cost ? centsToInput(cost.amountCents) : "",
	);
	const [dueDay, setDueDay] = useState(
		cost ? String(cost.dueDay) : DEFAULT_DUE_DAY,
	);
	const [category, setCategory] = useState(cost?.category ?? "");
	const [startsOn, setStartsOn] = useState(cost?.startsOn ?? firstOfMonth());

	const done = async (message: string) => {
		await cache.finance();
		toast.success(message);
		onClose();
	};
	const create = useMutation(
		trpc.fixedCosts.create.mutationOptions({
			onSuccess: () => done("Conta fixa cadastrada."),
			onError: (error) => toast.error(error.message),
		}),
	);
	const update = useMutation(
		trpc.fixedCosts.update.mutationOptions({
			onSuccess: () => done("Conta fixa atualizada."),
			onError: (error) => toast.error(error.message),
		}),
	);

	const cents = parseMoneyToCents(amount);
	const day = Number.parseInt(dueDay, 10);
	const ready =
		description.trim() !== "" &&
		cents !== null &&
		cents > 0 &&
		Number.isInteger(day) &&
		day >= 1 &&
		day <= 31 &&
		startsOn !== "";
	const pending = create.isPending || update.isPending;

	return (
		<>
			<SheetHeader>
				<SheetTitle>{cost ? cost.description : "Nova conta fixa"}</SheetTitle>
				<SheetDescription>
					Entra todo mês no Financeiro como despesa, no dia do vencimento.
				</SheetDescription>
			</SheetHeader>
			<form
				id="fixed-cost-form"
				className="flex-1 overflow-y-auto px-4"
				onSubmit={(event) => {
					event.preventDefault();
					if (!ready || cents === null) return;
					const data = {
						description: description.trim(),
						amountCents: cents,
						dueDay: day,
						startsOn,
						category: category.trim() || undefined,
					};
					if (cost) update.mutate({ id: cost.id, data });
					else create.mutate(data);
				}}
			>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor={descriptionId}>Descrição</FieldLabel>
						<Input
							id={descriptionId}
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="Cartão da empresa"
							autoComplete="off"
						/>
					</Field>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel htmlFor={amountId}>Valor por mês</FieldLabel>
							<Input
								id={amountId}
								value={amount}
								onChange={(event) => setAmount(event.target.value)}
								placeholder="450"
								inputMode="decimal"
								autoComplete="off"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor={dueId}>Vence todo dia</FieldLabel>
							<Input
								id={dueId}
								value={dueDay}
								onChange={(event) => setDueDay(event.target.value)}
								inputMode="numeric"
								autoComplete="off"
							/>
						</Field>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel htmlFor={categoryId}>Categoria</FieldLabel>
							<Input
								id={categoryId}
								value={category}
								onChange={(event) => setCategory(event.target.value)}
								placeholder="Contas fixas"
								autoComplete="off"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor={startId}>Começa em</FieldLabel>
							<DatePicker
								id={startId}
								value={startsOn}
								onChange={setStartsOn}
							/>
						</Field>
					</div>
				</FieldGroup>
			</form>
			<SheetFooter>
				<Button
					type="submit"
					form="fixed-cost-form"
					disabled={pending || !ready}
				>
					{pending ? <Spinner /> : null}
					Salvar
				</Button>
				<Button variant="outline" onClick={onClose}>
					Cancelar
				</Button>
			</SheetFooter>
		</>
	);
}
