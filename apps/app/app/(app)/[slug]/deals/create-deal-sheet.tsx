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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
const INSTAGRAM_FIELD = "instagram_da_empresa";
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

function instagramHandle(value: string): string {
	const handle = value
		.trim()
		.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
		.replace(/[/?#].*$/, "")
		.replace(/^@/, "");
	return handle ? `@${handle}` : "";
}

function splitName(value: string): { firstName: string; lastName?: string } {
	const [firstName = "", ...rest] = value.trim().split(/\s+/);
	return { firstName, lastName: rest.join(" ") || undefined };
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
	const queryClient = useQueryClient();

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
	const [saving, setSaving] = useState(false);

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
		(field) => field.key === INSTAGRAM_FIELD,
	);
	const originField = (dealFields.data ?? []).find(
		(field) => field.key === ORIGIN_FIELD,
	);

	const createCompany = useMutation(trpc.companies.create.mutationOptions());
	const updateCompany = useMutation(trpc.companies.update.mutationOptions());
	const createContact = useMutation(trpc.contacts.create.mutationOptions());
	const createDeal = useMutation(trpc.deals.create.mutationOptions());
	const updateDeal = useMutation(trpc.deals.update.mutationOptions());
	const attachContact = useMutation(trpc.deals.attachContact.mutationOptions());

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

	const submit = async () => {
		setSaving(true);
		try {
			const handle = instagramHandle(instagram);
			const client =
				mode === "new"
					? await createCompany.mutateAsync({
							name: clientName.trim(),
							ownerId: resolvedOwner,
						})
					: await queryClient.fetchQuery(
							trpc.companies.byId.queryOptions({ id: company }),
						);

			if (mode === "new" && handle && hasInstagramField) {
				await updateCompany.mutateAsync({
					id: client.id,
					data: { fields: { [INSTAGRAM_FIELD]: handle } },
				});
			}

			const contact =
				person.trim() !== "" || phone.trim() !== "" || email.trim() !== ""
					? await createContact.mutateAsync({
							...splitName(person.trim() || clientName.trim() || "Contato"),
							phone: phone.trim() || undefined,
							email: email.trim() || undefined,
							companyId: client.id,
							ownerId: resolvedOwner,
						})
					: null;

			const parsed = Number.parseFloat(amount.replace(",", "."));
			const deal = await createDeal.mutateAsync({
				name: client.name,
				companyId: client.id,
				ownerId: resolvedOwner,
				stage: stage as never,
				amountCents: Number.isFinite(parsed) ? Math.round(parsed * 100) : null,
				currency: currency || workspaceCurrency,
				expectedCloseDate: closeDate || null,
			});

			if (contact) {
				await attachContact.mutateAsync({
					dealId: deal.id,
					contactId: contact.id,
					role: null,
				});
			}

			const originLabel = origin !== NO_ORIGIN && originField ? origin : null;
			if (notes.trim() !== "" || originLabel) {
				await updateDeal.mutateAsync({
					id: deal.id,
					data: {
						...(notes.trim() !== "" ? { description: notes.trim() } : {}),
						...(originLabel ? { fields: { [ORIGIN_FIELD]: originLabel } } : {}),
					},
				});
			}

			await Promise.all([
				cache.deal(deal.id),
				cache.company(client.id),
				contact ? cache.contact(contact.id) : Promise.resolve(),
			]);
			toast.success(`Lead ${deal.name} cadastrado.`);
			await setOpen(null);
			reset();
			openRecord({ kind: "deal", id: deal.id });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "O lead não foi cadastrado.",
			);
		} finally {
			setSaving(false);
		}
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
						if (ready && !saving) void submit();
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
					<Button type="submit" form="create-deal" disabled={saving || !ready}>
						{saving ? <Spinner /> : null}
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
