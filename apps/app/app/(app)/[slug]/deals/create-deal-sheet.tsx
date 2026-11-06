"use client";

import Add from "@carbon/icons-react/es/Add";
import { CURRENCIES } from "@crm/db/currency";
import { Button } from "@crm/ui/components/button";
import { DatePicker } from "@crm/ui/components/date-picker";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@crm/ui/components/field";
import { Icon } from "@crm/ui/components/icon";
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
import { Textarea } from "@crm/ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@crm/ui/components/toggle-group";
import { useMutation, useQuery } from "@tanstack/react-query";
import { parseAsBoolean, useQueryState } from "nuqs";
import { type ComponentProps, Suspense, useId, useState } from "react";
import { toast } from "sonner";
import { CompanyPicker } from "@/components/crm/company-picker";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { dealStageLabel, OPEN_STAGES } from "@/lib/deal-stage";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";

const UNSET = "";
const NO_ORIGIN = "none";
const ORIGIN_FIELD = "etiqueta_de_origem";

type ClientMode = "new" | "existing";

function AddButton(props: ComponentProps<typeof Button>) {
	return (
		<Button {...props}>
			<Icon icon={Add} data-icon="inline-start" />
			Novo lead
		</Button>
	);
}

export function CreateDealSheet({ companyId }: { companyId?: string }) {
	return (
		<Suspense fallback={<AddButton disabled />}>
			<CreateLeadForm companyId={companyId} />
		</Suspense>
	);
}

function CreateLeadForm({ companyId }: { companyId?: string }) {
	const openRecord = useOpenRecord();
	const trpc = useTRPC();
	const cache = useCrmCache();

	const [open, setOpen] = useQueryState(
		SEARCH_PARAM.dialog.create,
		parseAsBoolean.withDefault(false),
	);
	const [mode, setMode] = useState<ClientMode>(companyId ? "existing" : "new");
	const [clientName, setClientName] = useState("");
	const [company, setCompany] = useState(companyId ?? UNSET);
	const [person, setPerson] = useState("");
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [instagram, setInstagram] = useState("");
	const [ownerId, setOwnerId] = useState(UNSET);
	const [stage, setStage] = useState<string>("BUILDING_SNIPER");
	const [origin, setOrigin] = useState(NO_ORIGIN);
	const [amount, setAmount] = useState("");
	const [currency, setCurrency] = useState("");
	const [closeDate, setCloseDate] = useState("");
	const [notes, setNotes] = useState("");

	const clientId = useId();
	const personId = useId();
	const phoneId = useId();
	const emailId = useId();
	const instagramId = useId();
	const amountId = useId();
	const closeDateId = useId();
	const notesId = useId();

	const users = useQuery(trpc.users.list.queryOptions());
	const me = useQuery(trpc.users.me.queryOptions());
	const currencies = useQuery(trpc.currency.settings.queryOptions());
	const companyFields = useQuery(
		trpc.fields.list.queryOptions({ entity: "COMPANY" }),
	);
	const dealFields = useQuery(
		trpc.fields.list.queryOptions({ entity: "DEAL" }),
	);

	const hasInstagramField = (companyFields.data ?? []).some(
		(field) => field.key === "instagram_da_empresa",
	);
	const originField = (dealFields.data ?? []).find(
		(field) => field.key === ORIGIN_FIELD,
	);

	const resolvedOwner = ownerId || me.data?.id || UNSET;
	const workspaceCurrency = currencies.data?.reportingCurrency;
	const resolvedCurrency = currency || workspaceCurrency || "BRL";

	const ready =
		resolvedOwner !== UNSET &&
		(mode === "new" ? clientName.trim() !== "" : company !== UNSET);

	const reset = () => {
		setClientName("");
		setCompany(companyId ?? UNSET);
		setPerson("");
		setPhone("");
		setEmail("");
		setInstagram("");
		setOrigin(NO_ORIGIN);
		setAmount("");
		setCurrency("");
		setCloseDate("");
		setNotes("");
	};

	const createLead = useMutation(
		trpc.leads.create.mutationOptions({
			onSuccess: async (lead) => {
				await Promise.all([
					cache.deal(lead.dealId),
					cache.company(lead.companyId),
					lead.contactId ? cache.contact(lead.contactId) : Promise.resolve(),
				]);
				toast.success(`Lead ${lead.dealName} cadastrado.`);
				await setOpen(null);
				reset();
				openRecord({ kind: "deal", id: lead.dealId });
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const submit = () => {
		const trimmedAmount = amount.trim();
		const parsed = Number.parseFloat(trimmedAmount.replace(",", "."));
		if (trimmedAmount !== "" && !Number.isFinite(parsed)) {
			toast.error("O valor precisa ser um número, como 2500 ou 2500,50.");
			return;
		}

		createLead.mutate({
			client:
				mode === "new"
					? { mode: "new", name: clientName.trim(), instagram }
					: { mode: "existing", companyId: company },
			person,
			phone,
			email: email.trim(),
			ownerId: resolvedOwner,
			stage: stage as never,
			origin: origin !== NO_ORIGIN && originField ? origin : undefined,
			amountCents: trimmedAmount === "" ? null : Math.round(parsed * 100),
			currency: currency || workspaceCurrency,
			expectedCloseDate: closeDate || null,
			notes,
		});
	};

	return (
		<Sheet open={open} onOpenChange={(next) => setOpen(next || null)}>
			<SheetTrigger asChild>
				<AddButton />
			</SheetTrigger>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>Novo lead</SheetTitle>
					<SheetDescription>
						Cliente, contato e negócio num passo só. O card entra no Kanban na
						etapa escolhida.
					</SheetDescription>
				</SheetHeader>

				<form
					id="create-deal"
					className="flex-1 overflow-y-auto px-4"
					onSubmit={(event) => {
						event.preventDefault();
						if (ready && !createLead.isPending) submit();
					}}
				>
					<FieldGroup>
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
								<ToggleGroupItem value="new">Novo cliente</ToggleGroupItem>
								<ToggleGroupItem value="existing">
									Já cadastrado
								</ToggleGroupItem>
							</ToggleGroup>
							{mode === "new" ? (
								<Input
									id={clientId}
									value={clientName}
									onChange={(event) => setClientName(event.target.value)}
									placeholder="Clínica Sorriso"
									autoComplete="off"
									required
								/>
							) : (
								<CompanyPicker
									id={clientId}
									value={company}
									onValueChange={setCompany}
								/>
							)}
						</Field>

						<Field>
							<FieldLabel htmlFor={personId}>Pessoa de contato</FieldLabel>
							<Input
								id={personId}
								value={person}
								onChange={(event) => setPerson(event.target.value)}
								placeholder="Dra. Ana Lima"
								autoComplete="off"
							/>
						</Field>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel htmlFor={phoneId}>WhatsApp</FieldLabel>
								<Input
									id={phoneId}
									value={phone}
									onChange={(event) => setPhone(event.target.value)}
									placeholder="+55 85 99999-0000"
									inputMode="tel"
									autoComplete="off"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor={emailId}>E-mail</FieldLabel>
								<Input
									id={emailId}
									type="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									placeholder="opcional"
									autoComplete="off"
								/>
							</Field>
						</div>

						{mode === "new" && hasInstagramField ? (
							<Field>
								<FieldLabel htmlFor={instagramId}>Instagram</FieldLabel>
								<Input
									id={instagramId}
									value={instagram}
									onChange={(event) => setInstagram(event.target.value)}
									placeholder="@clinicasorriso"
									autoComplete="off"
								/>
							</Field>
						) : null}

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="create-deal-stage">Etapa</FieldLabel>
								<Select value={stage} onValueChange={setStage}>
									<SelectTrigger id="create-deal-stage">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{OPEN_STAGES.map((value) => (
											<SelectItem key={value} value={value}>
												{dealStageLabel(value)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>

							{originField ? (
								<Field>
									<FieldLabel htmlFor="create-deal-origin">Origem</FieldLabel>
									<Select value={origin} onValueChange={setOrigin}>
										<SelectTrigger id="create-deal-origin">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={NO_ORIGIN}>Sem origem</SelectItem>
											{originField.options.map((option) => (
												<SelectItem key={option.id} value={option.label}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							) : null}
						</div>

						<Field>
							<FieldLabel htmlFor="create-deal-owner">Responsável</FieldLabel>
							<Select value={resolvedOwner} onValueChange={setOwnerId}>
								<SelectTrigger id="create-deal-owner">
									<SelectValue placeholder="Escolha um responsável" />
								</SelectTrigger>
								<SelectContent>
									{(users.data ?? []).map((user) => (
										<SelectItem key={user.id} value={user.id}>
											{user.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel htmlFor={amountId}>Valor</FieldLabel>
								<div className="flex gap-2">
									<Input
										id={amountId}
										value={amount}
										onChange={(event) => setAmount(event.target.value)}
										placeholder="opcional"
										inputMode="decimal"
										autoComplete="off"
									/>
									<Select value={resolvedCurrency} onValueChange={setCurrency}>
										<SelectTrigger aria-label="Moeda" className="w-24 shrink-0">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{CURRENCIES.map((entry) => (
												<SelectItem key={entry.code} value={entry.code}>
													{entry.code}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</Field>

							<Field>
								<FieldLabel htmlFor={closeDateId}>
									Previsão de fechamento
								</FieldLabel>
								<DatePicker
									id={closeDateId}
									value={closeDate}
									onChange={setCloseDate}
									placeholder="Sem data ainda"
								/>
							</Field>
						</div>

						<Field>
							<FieldLabel htmlFor={notesId}>Observações</FieldLabel>
							<Textarea
								id={notesId}
								value={notes}
								onChange={(event) => setNotes(event.target.value)}
								placeholder="Como chegou, o que precisa, próximo passo."
								rows={3}
							/>
							<FieldDescription>Fica na descrição do negócio.</FieldDescription>
						</Field>
					</FieldGroup>
				</form>

				<SheetFooter>
					<Button
						type="submit"
						form="create-deal"
						disabled={createLead.isPending || !ready}
					>
						{createLead.isPending ? <Spinner /> : null}
						Cadastrar lead
					</Button>
					<SheetClose asChild>
						<Button variant="outline">Cancelar</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
