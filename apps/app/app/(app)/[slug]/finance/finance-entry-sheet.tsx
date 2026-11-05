"use client";

import Add from "@carbon/icons-react/es/Add";
import { Button } from "@crm/ui/components/button";
import { DatePicker } from "@crm/ui/components/date-picker";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@crm/ui/components/field";
import { Input } from "@crm/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@crm/ui/components/sheet";
import { Spinner } from "@crm/ui/components/spinner";
import { Switch } from "@crm/ui/components/switch";
import { Textarea } from "@crm/ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@crm/ui/components/toggle-group";
import { parseMoneyToCents } from "@crm/ui/lib/format";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { CompanyPicker } from "@/components/crm/company-picker";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";

type Kind = "INCOME" | "EXPENSE";

const NO_COMPANY = "none";

const REPEAT_OPTIONS = [1, 2, 3, 6, 12] as const;

function today(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function FinanceEntrySheet({
	categories,
	defaultCompanyId,
}: {
	categories: string[];
	defaultCompanyId?: string;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const descriptionId = useId();
	const amountId = useId();
	const dueId = useId();
	const categoryId = useId();
	const notesId = useId();
	const listId = useId();

	const [open, setOpen] = useState(false);
	const [kind, setKind] = useState<Kind>("INCOME");
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [dueDate, setDueDate] = useState(today());
	const [category, setCategory] = useState("");
	const [companyId, setCompanyId] = useState(defaultCompanyId ?? NO_COMPANY);
	const [paid, setPaid] = useState(false);
	const [repeat, setRepeat] = useState("1");
	const [notes, setNotes] = useState("");

	const reset = () => {
		setDescription("");
		setAmount("");
		setDueDate(today());
		setCategory("");
		setPaid(false);
		setRepeat("1");
		setNotes("");
	};

	const create = useMutation(
		trpc.finance.create.mutationOptions({
			onSuccess: async (result) => {
				await cache.finance();
				toast.success(
					result.ids.length === 1
						? "Lançamento criado."
						: `${result.ids.length} lançamentos criados.`,
				);
				reset();
				setOpen(false);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const cents = parseMoneyToCents(amount);
	const ready =
		description.trim() !== "" && cents !== null && cents > 0 && dueDate;

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button>
					<Add data-icon="inline-start" />
					Novo lançamento
				</Button>
			</SheetTrigger>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>Novo lançamento</SheetTitle>
					<SheetDescription>
						Uma conta a receber de um cliente ou uma despesa da Lugh.
					</SheetDescription>
				</SheetHeader>

				<form
					id="finance-entry"
					className="flex-1 overflow-y-auto px-4"
					onSubmit={(event) => {
						event.preventDefault();
						if (!ready || cents === null) return;
						create.mutate({
							kind,
							description,
							amountCents: cents,
							dueDate,
							category: category.trim() || undefined,
							notes: notes.trim() || undefined,
							companyId: companyId === NO_COMPANY ? undefined : companyId,
							paid,
							repeatMonths: Number(repeat),
						});
					}}
				>
					<FieldGroup>
						<Field>
							<FieldLabel>Tipo</FieldLabel>
							<ToggleGroup
								type="single"
								variant="outline"
								size="sm"
								spacing={0}
								value={kind}
								onValueChange={(next) => {
									if (next === "INCOME" || next === "EXPENSE") setKind(next);
								}}
							>
								<ToggleGroupItem value="INCOME">Receita</ToggleGroupItem>
								<ToggleGroupItem value="EXPENSE">Despesa</ToggleGroupItem>
							</ToggleGroup>
						</Field>

						<Field>
							<FieldLabel htmlFor={descriptionId}>Descrição</FieldLabel>
							<Input
								id={descriptionId}
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								placeholder={
									kind === "INCOME"
										? "Mensalidade Advisory — novembro"
										: "Ferramentas de anúncios"
								}
								autoComplete="off"
								required
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor={amountId}>Valor (R$)</FieldLabel>
							<Input
								id={amountId}
								value={amount}
								onChange={(event) => setAmount(event.target.value)}
								placeholder="4.500,00"
								inputMode="decimal"
								autoComplete="off"
								required
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor={dueId}>Vencimento</FieldLabel>
							<DatePicker id={dueId} value={dueDate} onChange={setDueDate} />
						</Field>

						<Field>
							<FieldLabel htmlFor="finance-company">Cliente</FieldLabel>
							<CompanyPicker
								id="finance-company"
								value={companyId}
								onValueChange={setCompanyId}
								none={{ value: NO_COMPANY, label: "Sem cliente" }}
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor={categoryId}>Categoria</FieldLabel>
							<Input
								id={categoryId}
								value={category}
								onChange={(event) => setCategory(event.target.value)}
								placeholder={kind === "INCOME" ? "Advisory" : "Ferramentas"}
								list={listId}
								autoComplete="off"
							/>
							<datalist id={listId}>
								{categories.map((value) => (
									<option key={value} value={value} />
								))}
							</datalist>
						</Field>

						<Field>
							<FieldLabel htmlFor="finance-repeat">Repetir</FieldLabel>
							<Select value={repeat} onValueChange={setRepeat}>
								<SelectTrigger id="finance-repeat">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{REPEAT_OPTIONS.map((value) => (
										<SelectItem key={value} value={String(value)}>
											{value === 1 ? "Não repetir" : `Todo mês, ${value} vezes`}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldDescription>
								Use para mensalidades e custos fixos.
							</FieldDescription>
						</Field>

						<Field orientation="horizontal">
							<Switch
								id="finance-paid"
								checked={paid}
								onCheckedChange={setPaid}
							/>
							<FieldLabel htmlFor="finance-paid">
								{kind === "INCOME" ? "Já recebido" : "Já pago"}
							</FieldLabel>
						</Field>

						<Field>
							<FieldLabel htmlFor={notesId}>Observações</FieldLabel>
							<Textarea
								id={notesId}
								value={notes}
								onChange={(event) => setNotes(event.target.value)}
								rows={3}
							/>
						</Field>
					</FieldGroup>
				</form>

				<SheetFooter>
					<Button
						type="submit"
						form="finance-entry"
						disabled={create.isPending || !ready}
					>
						{create.isPending ? <Spinner /> : null}
						Salvar lançamento
					</Button>
					<SheetClose asChild>
						<Button variant="outline">Cancelar</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
