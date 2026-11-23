import type { Db } from "@crm/db";
import { z } from "zod";
import {
	activityCreateInput,
	completeInput,
	timelineCountsInput,
	timelineInput,
} from "../activities/activities.contracts";
import {
	attachmentCompleteInput,
	attachmentIdInput,
	attachmentLinkInput,
	attachmentListInput,
	attachmentPrepareInput,
} from "../attachments/attachments.contracts";
import {
	dealAttachContactInput,
	dealBulkInput,
	dealBulkStageInput,
	dealContactRoleInput,
	dealContactsInput,
	dealDetachContactInput,
	dealIdInput,
	dealUpdateArgs,
	setStageInput,
} from "../deals/deals.contracts";
import { calendarEventInput } from "../google/google.contracts";
import { leadCreateInput } from "../leads/leads.contracts";
import {
	dealMeetingsInput,
	scheduleMeetingInput,
} from "../meetings/meetings.contracts";

type Viewer = { db: Db; userId: string };

export type SdrRule = (viewer: Viewer, input: unknown) => Promise<boolean>;

function rule<S extends z.ZodType>(
	schema: S,
	check: (viewer: Viewer, input: z.infer<S>) => Promise<boolean>,
): SdrRule {
	return async (viewer, input) => {
		const parsed = schema.safeParse(input);
		return parsed.success ? check(viewer, parsed.data) : false;
	};
}

const allow: SdrRule = async () => true;

async function ownsDeals({ db, userId }: Viewer, ids: string[]) {
	const unique = [...new Set(ids)];
	const owned = await db.deal.count({
		where: { id: { in: unique }, ownerId: userId },
	});
	return unique.length > 0 && owned === unique.length;
}

const ownsDeal = (viewer: Viewer, id: string) => ownsDeals(viewer, [id]);

async function ownsCompany({ db, userId }: Viewer, companyId: string) {
	return (await db.deal.count({ where: { companyId, ownerId: userId } })) > 0;
}

const dealRecord = (
	viewer: Viewer,
	record: z.infer<typeof attachmentListInput>,
) =>
	record.kind === "deal" ? ownsDeal(viewer, record.id) : Promise.resolve(false);

const throughDeal = (
	viewer: Viewer,
	input: { dealId?: string; companyId?: string; contactId?: string },
) =>
	input.companyId === undefined &&
	input.contactId === undefined &&
	input.dealId !== undefined
		? ownsDeal(viewer, input.dealId)
		: Promise.resolve(false);

export const SDR_POLICY: Record<string, SdrRule> = {
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

	"deals.byId": rule(dealIdInput, (viewer, input) =>
		ownsDeal(viewer, input.id),
	),
	"deals.setStage": rule(setStageInput, (viewer, input) =>
		ownsDeal(viewer, input.id),
	),
	"deals.archive": rule(dealIdInput, (viewer, input) =>
		ownsDeal(viewer, input.id),
	),
	"deals.restore": rule(dealIdInput, (viewer, input) =>
		ownsDeal(viewer, input.id),
	),
	"deals.bulkSetStage": rule(dealBulkStageInput, (viewer, input) =>
		ownsDeals(viewer, input.ids),
	),
	"deals.bulkArchive": rule(dealBulkInput, (viewer, input) =>
		ownsDeals(viewer, input.ids),
	),
	"deals.bulkRestore": rule(dealBulkInput, (viewer, input) =>
		ownsDeals(viewer, input.ids),
	),
	"deals.update": rule(dealUpdateArgs, async (viewer, { id, data }) => {
		if (data.ownerId !== undefined && data.ownerId !== viewer.userId) {
			return false;
		}
		if (
			data.companyId !== undefined &&
			!(await ownsCompany(viewer, data.companyId))
		) {
			return false;
		}
		return ownsDeal(viewer, id);
	}),
	"deals.contactOptions": rule(dealContactsInput, (viewer, input) =>
		ownsDeal(viewer, input.dealId),
	),
	"deals.attachContact": rule(dealAttachContactInput, (viewer, input) =>
		ownsDeal(viewer, input.dealId),
	),
	"deals.detachContact": rule(dealDetachContactInput, (viewer, input) =>
		ownsDeal(viewer, input.dealId),
	),
	"deals.setContactRole": rule(dealContactRoleInput, (viewer, input) =>
		ownsDeal(viewer, input.dealId),
	),

	"leads.create": rule(leadCreateInput, async (viewer, input) => {
		if (input.ownerId !== viewer.userId) return false;
		return input.client.mode === "existing"
			? ownsCompany(viewer, input.client.companyId)
			: true;
	}),

	"meetings.forDeal": rule(dealMeetingsInput, (viewer, input) =>
		ownsDeal(viewer, input.dealId),
	),
	"meetings.schedule": rule(scheduleMeetingInput, (viewer, input) =>
		ownsDeal(viewer, input.dealId),
	),

	"activities.timeline": rule(timelineInput, throughDeal),
	"activities.timelineCounts": rule(timelineCountsInput, throughDeal),
	"activities.create": rule(activityCreateInput, throughDeal),
	"activities.complete": rule(
		completeInput,
		async ({ db, userId }, input) =>
			(await db.activity.count({
				where: { id: input.id, deal: { ownerId: userId } },
			})) > 0,
	),

	"attachments.list": rule(attachmentListInput, dealRecord),
	"attachments.prepareUpload": rule(attachmentPrepareInput, (viewer, input) =>
		dealRecord(viewer, input.record),
	),
	"attachments.completeUpload": rule(attachmentCompleteInput, (viewer, input) =>
		dealRecord(viewer, input.record),
	),
	"attachments.addLink": rule(attachmentLinkInput, (viewer, input) =>
		dealRecord(viewer, input.record),
	),
	"attachments.remove": rule(
		attachmentIdInput,
		async ({ db, userId }, input) =>
			(await db.attachment.count({
				where: { id: input.id, deal: { ownerId: userId } },
			})) > 0,
	),

	"google.event": rule(
		calendarEventInput,
		async ({ db, userId }, input) =>
			(await db.calendarEvent.count({
				where: { id: input.eventId, deal: { ownerId: userId } },
			})) > 0,
	),
};
