import type { Db } from "@crm/db";

export type SdrCheckArgs = {
	db: Db;
	userId: string;
	input: Record<string, unknown>;
};

export type SdrCheck = (args: SdrCheckArgs) => Promise<boolean>;

const allow: SdrCheck = async () => true;

function text(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 ? value : null;
}

function record(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
}

async function ownsDeal(db: Db, userId: string, dealId: unknown) {
	const id = text(dealId);
	if (!id) return false;
	return (await db.deal.count({ where: { id, ownerId: userId } })) > 0;
}

async function ownsCompany(db: Db, userId: string, companyId: unknown) {
	const id = text(companyId);
	if (!id) return false;
	return (
		(await db.deal.count({ where: { companyId: id, ownerId: userId } })) > 0
	);
}

function dealAt(key: string): SdrCheck {
	return ({ db, userId, input }) => ownsDeal(db, userId, input[key]);
}

const dealOnly: SdrCheck = async ({ db, userId, input }) =>
	input.companyId === undefined &&
	input.contactId === undefined &&
	ownsDeal(db, userId, input.dealId);

function dealRecord(value: unknown, db: Db, userId: string) {
	const target = record(value);
	return target.kind === "deal"
		? ownsDeal(db, userId, target.id)
		: Promise.resolve(false);
}

export const SDR_POLICY: Record<string, SdrCheck> = {
	"users.me": allow,
	"users.list": allow,
	"workspace.get": allow,
	"settings.researchKey": allow,
	"currency.settings": allow,
	"fields.list": allow,
	"fields.filters": allow,
	"fields.coverage": allow,
	"deals.list": allow,
	"companies.options": allow,
	"agenda.range": allow,

	"deals.byId": dealAt("id"),
	"deals.setStage": dealAt("id"),
	"deals.archive": dealAt("id"),
	"deals.restore": dealAt("id"),
	"deals.update": async ({ db, userId, input }) => {
		const data = record(input.data);
		if (data.ownerId !== undefined && data.ownerId !== userId) return false;
		if (
			data.companyId !== undefined &&
			!(await ownsCompany(db, userId, data.companyId))
		) {
			return false;
		}
		return ownsDeal(db, userId, input.id);
	},
	"deals.contactOptions": dealAt("dealId"),
	"deals.attachContact": dealAt("dealId"),
	"deals.detachContact": dealAt("dealId"),
	"deals.setContactRole": dealAt("dealId"),

	"leads.create": async ({ userId, input }) => input.ownerId === userId,

	"google.event": async ({ db, userId, input }) => {
		const id = text(input.eventId);
		if (!id) return false;
		return (
			(await db.calendarEvent.count({
				where: { id, deal: { ownerId: userId } },
			})) > 0
		);
	},

	"meetings.forDeal": dealAt("dealId"),
	"meetings.schedule": dealAt("dealId"),

	"activities.timeline": dealOnly,
	"activities.timelineCounts": dealOnly,
	"activities.create": dealOnly,
	"activities.complete": async ({ db, userId, input }) => {
		const id = text(input.id);
		if (!id) return false;
		return (
			(await db.activity.count({ where: { id, deal: { ownerId: userId } } })) >
			0
		);
	},

	"attachments.list": ({ db, userId, input }) => dealRecord(input, db, userId),
	"attachments.prepareUpload": ({ db, userId, input }) =>
		dealRecord(input.record, db, userId),
	"attachments.completeUpload": ({ db, userId, input }) =>
		dealRecord(input.record, db, userId),
	"attachments.addLink": ({ db, userId, input }) =>
		dealRecord(input.record, db, userId),
	"attachments.remove": async ({ db, userId, input }) => {
		const id = text(input.id);
		if (!id) return false;
		return (
			(await db.attachment.count({
				where: { id, deal: { ownerId: userId } },
			})) > 0
		);
	},
};
