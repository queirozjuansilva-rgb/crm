"use client";

import Add from "@carbon/icons-react/es/Add";
import TrashCan from "@carbon/icons-react/es/TrashCan";
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
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@crm/ui/components/sheet";
import { Spinner } from "@crm/ui/components/spinner";
import { Textarea } from "@crm/ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@crm/ui/components/toggle-group";
import { formatMoney, parseMoneyToCents } from "@crm/ui/lib/format";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { CompanyPicker } from "@/components/crm/company-picker";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

export type Contract = RouterOutputs["contracts"]["list"]["rows"][number];

type ClientMode = "new" | "existing";
type PayoutDraft = { key: string; payee: string; amount: string };

const DEFAULT_DUE_DAY = "10";
const SUGGESTED_PAYEE = "Sara";

function firstOfMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function centsToInput(cents: number): string {
	return (cents / 100).toFixed(2).replace(".", ",").replace(/,00$/, "");
}

function draftKey(): string {
	return crypto.randomUUID();
}

export function ContractSheet({
	open,
	contract,
	onClose,
}: {
	open: boolean;
	contract: Contract | null;
	onClose: () => void;
}) {
	return (
		<Sheet open={open} onOpenChange={(next) => !next && onClose()}>
			<SheetContent side="right">
				{open ? (
					<ContractForm
						key={contract?.id ?? "new"}
						contract={contract}
						onClose={onClose}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function ContractForm({
	contract,
	onClose,
}: {
	contract: Contract | null;
	onClose: () => void;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const editing = contract !== null;

	const clientId = useId();
	const serviceId = useId();
	const amountId = useId();
	const dueId = useId();
	const startId = useId();
	const notesId = useId();

	const [mode, setMode] = useState<ClientMode>("new");
	const [clientName, setClientName] = useState("");
	const [companyId, setCompanyId] = useState("");
	const [service, setService] = useState(contract?.service ?? "");
	const [amount, setAmount] = useState(
		contract ? centsToInput(contract.monthlyAmountCents) : "",
	);
	const [dueDay, setDueDay] = useState(
		contract ? String(contract.dueDay) : DEFAULT_DUE_DAY,
	);
	const [startsOn, setStartsOn] = useState(
		contract?.startsOn ?? firstOfMonth(),
	);
	const [notes, setNotes] = useState(contract?.notes ?? "");
	const [payouts, setPayouts] = useState<PayoutDraft[]>(
		contract?.payouts.map((payout) => ({
			key: payout.id,
			payee: payout.payee,
			amount: centsToInput(payout.amountCents),
		})) ?? [],
	);

	const done = async (message: string) => {
		await Promise.all([cache.finance(), cache.company()]);
		toast.success(message);
		onClose();
	};
	const fail = (error: { message: string }) => toast.error(error.message);

	const create = useMutation(
		trpc.contracts.create.mutationOptions({
			onSuccess: () => done("Cliente cadastrado com o contrato."),
			onError: fail,
		}),
	);
	const update = useMutation(
		trpc.contracts.update.mutationOptions({
			onSuccess: () => done("Contrato atualizado."),
			onError: fail,
		}),
	);
	const end = useMutation(
		trpc.contracts.end.mutationOptions({
			onSuccess: () => done("Contrato encerrado."),
			onError: fail,
		}),
	);
	const reactivate = useMutation(
		trpc.contracts.reactivate.mutationOptions({
			onSuccess: () => done("Contrato reativado."),
			onError: fail,
		}),
	);

	const monthlyCents = parseMoneyToCents(amount);
	const payoutCents = payouts.map((payout) => parseMoneyToCents(payout.amount));
	const payoutTotal = payoutCents.reduce<number>(
		(sum, cents) => sum + (cents ?? 0),
		0,
	);
	const net = (monthlyCents ?? 0) - payoutTotal;
	const day = Number.parseInt(dueDay, 10);
	const pending =
		create.isPending ||
		update.isPending ||
		end.isPending ||
		reactivate.isPending;

	const ready =
		monthlyCents !== null &&
		monthlyCents > 0 &&
		Number.isInteger(day) &&
		day >= 1 &&
		day <= 31 &&
		startsOn !== "" &&
		net >= 0 &&
		payouts.every(
			(payout, index) =>
				payout.payee.trim() !== "" && (payoutCents[index] ?? 0) > 0,
		) &&
		(editing || (mode === "new" ? clientName.trim() !== "" : companyId !== ""));

	const submit = () => {
		if (!ready || monthlyCents === null) return;
		const terms = {
			service: service.trim() || undefined,
			monthlyAmountCents: monthlyCents,
			dueDay: day,
			startsOn,
			notes: notes.trim() || undefined,
			payouts: payouts.map((payout, index) => ({
				payee: payout.payee.trim(),
				amountCents: payoutCents[index] ?? 0,
			})),
		};
		if (contract) {
			update.mutate({ id: contract.id, data: terms });
			return;
		}
		create.mutate({
			...terms,
			client:
				mode === "new"
					? { mode: "new", name: clientName.trim() }
					: { mode: "existing", companyId },
		});
	};

	const setPayout = (key: string, patch: Partial<PayoutDraft>) =>
		setPayouts((current) =>
			current.map((payout) =>
				payout.key === key ? { ...payout, ...patch } : payout,
			),
		);

	return (
		<>
			<SheetHeader>
				<SheetTitle>
					{contract ? contract.company.name : "Novo cliente"}
				</SheetTitle>
				<SheetDescription>
					A mensalidade e os repasses entram no Financeiro todo mês, no dia do
					vencimento.
				</SheetDescription>
			</SheetHeader>

			<form
				id="contract-form"
				className="flex-1 overflow-y-auto px-4"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<FieldGroup>
					{editing ? null : (
						<Field>
							<FieldLabel htmlFor={clientId}>Cliente</FieldLabel>
							<ToggleGroup
								type="single"
								value={mode}
								onValueChange={(next) => {
									if (next === "new" || next === "existing") setMode(next);
								}}
								size="sm"
								spacing={0}
								variant="outline"
							>
								<ToggleGroupItem value="new">Cliente novo</ToggleGroupItem>
								<ToggleGroupItem value="existing">
									Já está no CRM
								</ToggleGroupItem>
							</ToggleGroup>
							{mode === "new" ? (
								<Input
									id={clientId}
									value={clientName}
									onChange={(event) => setClientName(event.target.value)}
									placeholder="Maranata Empreendimentos"
									autoComplete="off"
								/>
							) : (
								<CompanyPicker
									id={clientId}
									value={companyId}
									onValueChange={setCompanyId}
								/>
							)}
						</Field>
					)}

					<Field>
						<FieldLabel htmlFor={serviceId}>Serviço</FieldLabel>
						<Input
							id={serviceId}
							value={service}
							onChange={(event) => setService(event.target.value)}
							placeholder="Gestão de tráfego e conteúdo"
							autoComplete="off"
						/>
					</Field>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<Field>
							<FieldLabel htmlFor={amountId}>Valor mensal</FieldLabel>
							<Input
								id={amountId}
								value={amount}
								onChange={(event) => setAmount(event.target.value)}
								placeholder="1.200"
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
						<Field>
							<FieldLabel htmlFor={startId}>Início</FieldLabel>
							<DatePicker
								id={startId}
								value={startsOn}
								onChange={setStartsOn}
							/>
						</Field>
					</div>

					<Field>
						<div className="flex items-center justify-between gap-2">
							<FieldLabel>Repasses</FieldLabel>
							<Button
								type="button"
								variant="outline"
								size="xs"
								onClick={() =>
									setPayouts((current) => [
										...current,
										{
											key: draftKey(),
											payee: current.length === 0 ? SUGGESTED_PAYEE : "",
											amount: "",
										},
									])
								}
							>
								<Add />
								Repasse
							</Button>
						</div>
						{payouts.length === 0 ? (
							<FieldDescription>
								Sem repasse: o valor inteiro fica para a Lugh.
							</FieldDescription>
						) : (
							<div className="flex flex-col gap-2">
								{payouts.map((payout) => (
									<div key={payout.key} className="flex items-center gap-2">
										<Input
											aria-label="Quem recebe"
											value={payout.payee}
											onChange={(event) =>
												setPayout(payout.key, { payee: event.target.value })
											}
											placeholder="Sara (videomaker)"
											autoComplete="off"
										/>
										<Input
											aria-label="Valor do repasse"
											value={payout.amount}
											onChange={(event) =>
												setPayout(payout.key, { amount: event.target.value })
											}
											placeholder="400"
											inputMode="decimal"
											autoComplete="off"
											className="w-32 shrink-0"
										/>
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											aria-label="Remover repasse"
											onClick={() =>
												setPayouts((current) =>
													current.filter((item) => item.key !== payout.key),
												)
											}
										>
											<TrashCan />
										</Button>
									</div>
								))}
							</div>
						)}
						{monthlyCents ? (
							<FieldDescription>
								{net < 0
									? "Os repasses passam do valor do contrato."
									: `Fica para a Lugh: ${formatMoney(net, "BRL")} por mês.`}
							</FieldDescription>
						) : null}
					</Field>

					<Field>
						<FieldLabel htmlFor={notesId}>Observações</FieldLabel>
						<Textarea
							id={notesId}
							value={notes}
							onChange={(event) => setNotes(event.target.value)}
							placeholder="Escopo, reajuste, forma de pagamento."
							rows={3}
						/>
					</Field>
				</FieldGroup>
			</form>

			<SheetFooter>
				<Button type="submit" form="contract-form" disabled={pending || !ready}>
					{create.isPending || update.isPending ? <Spinner /> : null}
					{editing ? "Salvar" : "Cadastrar cliente"}
				</Button>
				{contract?.status === "ENDED" ? (
					<Button
						variant="outline"
						disabled={pending}
						onClick={() => reactivate.mutate({ id: contract.id })}
					>
						Reativar contrato
					</Button>
				) : contract ? (
					<Button
						variant="outline"
						disabled={pending}
						onClick={() => end.mutate({ id: contract.id })}
					>
						Encerrar contrato
					</Button>
				) : (
					<Button variant="outline" onClick={onClose}>
						Cancelar
					</Button>
				)}
			</SheetFooter>
		</>
	);
}
