import type { Db } from "@crm/db";
import { normalizeCurrency } from "@crm/db/currency";
import { isClosedStage } from "@crm/db/deal-stage";
import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { AgentTriggerService } from "../agent/agent-trigger.service";
import {
	blankToNull,
	decimalFromCents,
	fromCents,
	normalizeEmail,
} from "../crm/values";
import { ConversionService } from "../currency/conversion.service";
import { InjectDatabase } from "../database/database.constants";
import { FieldsService } from "../fields/fields.service";
import { LEADS } from "./leads.config";
import type { LeadCreateInput } from "./leads.contracts";

type ExistingContact = {
	id: string;
	firstName: string;
	lastName: string | null;
	companyId: string | null;
	company: { name: string } | null;
};

export function instagramHandle(value: string | undefined): string | null {
	const handle = (value ?? "")
		.trim()
		.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
		.replace(/[/?#].*$/, "")
		.replace(/^@/, "");
	return handle ? `@${handle}` : null;
}

export function splitPersonName(value: string): {
	firstName: string;
	lastName: string | null;
} {
	const [firstName = "", ...rest] = value.trim().split(/\s+/);
	return { firstName, lastName: blankToNull(rest.join(" ")) };
}

function parseDate(value: string | null | undefined): Date | null {
	if (value === null || value === undefined || value === "") return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new BadRequestException(`"${value}" não é uma data.`);
	}
	return date;
}

function personName(contact: { firstName: string; lastName: string | null }) {
	return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
}

@Injectable()
export class LeadsService {
	private readonly logger = new Logger(LeadsService.name);

	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly agent: AgentTriggerService,
		private readonly fields: FieldsService,
		private readonly conversion: ConversionService,
	) {}

	async create(input: LeadCreateInput) {
		const email = normalizeEmail(input.email ?? "");
		const phone = blankToNull(input.phone ?? "");
		const person = blankToNull(input.person ?? "");

		const existingCompany =
			input.client.mode === "existing"
				? await this.db.company.findFirst({
						where: { id: input.client.companyId, archivedAt: null },
						select: { id: true, name: true },
					})
				: null;

		if (input.client.mode === "existing" && !existingCompany) {
			throw new NotFoundException("Esse cliente não existe mais.");
		}

		const owner = await this.db.user.findUnique({
			where: { id: input.ownerId },
			select: { id: true },
		});
		if (!owner) {
			throw new BadRequestException("Esse responsável não existe.");
		}

		const known = email ? await this.contactByEmail(email) : null;
		if (known && known.companyId !== existingCompany?.id) {
			throw new BadRequestException(
				`O e-mail ${email} já é de ${personName(known)}${
					known.company ? `, da ${known.company.name}` : ""
				}. Escolha "Já cadastrado" e esse cliente, ou deixe o e-mail em branco.`,
			);
		}

		const [companyFields, dealFields] = await Promise.all([
			this.fields.definitionsFor("COMPANY"),
			this.fields.definitionsFor("DEAL"),
		]);
		const instagram =
			input.client.mode === "new"
				? instagramHandle(input.client.instagram)
				: null;
		const companyValues =
			instagram &&
			companyFields.some((field) => field.key === LEADS.fields.instagram)
				? { [LEADS.fields.instagram]: instagram }
				: {};
		const origin = blankToNull(input.origin ?? "");
		const dealValues =
			origin && dealFields.some((field) => field.key === LEADS.fields.origin)
				? { [LEADS.fields.origin]: origin }
				: {};

		const stage = input.stage ?? "BUILDING_SNIPER";
		const closed = isClosedStage(stage);
		const currency = normalizeCurrency(
			input.currency ?? (await this.conversion.reportingCurrency()),
		);
		const fx = await this.conversion.dealFields(
			decimalFromCents(input.amountCents),
			currency,
		);
		const expectedCloseDate = parseDate(input.expectedCloseDate);
		const notes = blankToNull(input.notes ?? "");
		const wantsContact = Boolean(person || phone || email);

		const result = await this.agent.withCrmEvents(async (tx, emit) => {
			const now = new Date();

			const company = existingCompany
				? { ...existingCompany, created: false }
				: {
						...(await tx.company.create({
							data: {
								name: input.client.mode === "new" ? input.client.name : "",
								ownerId: input.ownerId,
							},
							select: { id: true, name: true },
						})),
						created: true,
					};

			if (company.created) {
				await emit({
					type: "company.created",
					record: { kind: "company", id: company.id },
					occurredAt: now,
					data: { name: company.name, domain: null },
				});
				await this.fields.applyValues(tx, "COMPANY", company.id, companyValues);
			}

			const contact = known
				? { id: known.id, created: false }
				: wantsContact
					? {
							...(await tx.contact.create({
								data: {
									...splitPersonName(person ?? company.name),
									email,
									phone,
									companyId: company.id,
									ownerId: input.ownerId,
								},
								select: { id: true, firstName: true, lastName: true },
							})),
							created: true,
						}
					: null;

			if (contact?.created) {
				await emit({
					type: "contact.created",
					record: { kind: "contact", id: contact.id },
					occurredAt: now,
					data: {
						firstName: person
							? splitPersonName(person).firstName
							: company.name,
						lastName: person ? splitPersonName(person).lastName : null,
						email,
						companyId: company.id,
					},
				});
			}

			const deal = await tx.deal.create({
				data: {
					name: company.name,
					description: notes,
					companyId: company.id,
					ownerId: input.ownerId,
					stage,
					stageChangedAt: now,
					closedAt: closed ? now : null,
					amount: fromCents(input.amountCents),
					currency,
					...fx,
					expectedCloseDate,
				},
				select: { id: true, name: true },
			});

			await emit({
				type: "deal.created",
				record: { kind: "deal", id: deal.id },
				occurredAt: now,
				data: { companyId: company.id, stage },
			});

			await this.fields.applyValues(tx, "DEAL", deal.id, dealValues);

			if (contact) {
				await tx.dealContact.create({
					data: { dealId: deal.id, contactId: contact.id },
				});
			}

			return { company, contact, deal };
		});

		const { company, contact, deal } = result;

		if (company.created) {
			await this.agent.companyCreated(company.id, LEADS.companyReason);
			void this.fields.queueBackfillForNewRecord("COMPANY", company.id);
		}
		if (contact?.created) {
			await this.agent.contactCreated(contact.id, LEADS.contactReason);
			void this.fields.queueBackfillForNewRecord("CONTACT", contact.id);
		}
		void this.fields.queueBackfillForNewRecord("DEAL", deal.id);

		this.logger.log({
			message: "Lead created",
			dealId: deal.id,
			companyCreated: company.created,
			contactCreated: Boolean(contact?.created),
		});

		return {
			dealId: deal.id,
			dealName: deal.name,
			companyId: company.id,
			contactId: contact?.id ?? null,
		};
	}

	private contactByEmail(email: string): Promise<ExistingContact | null> {
		return this.db.contact.findFirst({
			where: {
				email: { equals: email, mode: "insensitive" },
				archivedAt: null,
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
				companyId: true,
				company: { select: { name: true } },
			},
		});
	}
}
