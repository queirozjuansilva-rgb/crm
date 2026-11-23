import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { WORKSPACE_ID } from "@crm/auth/organization";
import { db } from "@crm/db";
import { SdrAccessService } from "../src/access/sdr-access.service";
import { AgendaService } from "../src/agenda/agenda.service";
import { AgentTriggerService } from "../src/agent/agent-trigger.service";
import { ActivityStampService } from "../src/crm/activity-stamp.service";
import { ConversionService } from "../src/currency/conversion.service";
import { DealsService } from "../src/deals/deals.service";
import { FieldsService } from "../src/fields/fields.service";
import { AuthMiddleware } from "../src/trpc/middlewares/auth.middleware";

const suffix = crypto.randomUUID();
const juan = `sdr-spec-juan-${suffix}`;
const sdr = `sdr-spec-sdr-${suffix}`;
const HOUR_MS = 60 * 60 * 1000;

const access = new SdrAccessService(db);
const agent = new AgentTriggerService(db);
const deals = new DealsService(
	db,
	agent,
	new ActivityStampService(db),
	new ConversionService(db),
	new FieldsService(db, agent),
);
const agenda = new AgendaService(db);
const middleware = new AuthMiddleware(access);

let lughCompany: string;
let sdrCompany: string;
let lughDeal: string;
let sdrDeal: string;
const start = new Date(Date.now() + 24 * HOUR_MS);

beforeAll(async () => {
	await db.organization.upsert({
		where: { id: WORKSPACE_ID },
		create: {
			id: WORKSPACE_ID,
			name: "CRM",
			slug: "crm",
			createdAt: new Date(),
		},
		update: {},
	});

	for (const [id, role] of [
		[juan, "admin"],
		[sdr, "sdr"],
	] as const) {
		await db.user.create({
			data: { id, name: id, email: `${id}@example.test` },
		});
		await db.member.create({
			data: {
				id: crypto.randomUUID(),
				organizationId: WORKSPACE_ID,
				userId: id,
				role,
				createdAt: new Date(),
			},
		});
	}

	lughCompany = (
		await db.company.create({
			data: { name: `Lugh Lead ${suffix}` },
			select: { id: true },
		})
	).id;
	sdrCompany = (
		await db.company.create({
			data: { name: `SDR Lead ${suffix}` },
			select: { id: true },
		})
	).id;

	lughDeal = (
		await db.deal.create({
			data: { name: "Lugh", companyId: lughCompany, ownerId: juan },
			select: { id: true },
		})
	).id;
	sdrDeal = (
		await db.deal.create({
			data: { name: "SDR", companyId: sdrCompany, ownerId: sdr },
			select: { id: true },
		})
	).id;

	for (const [title, dealId] of [
		["Consulta pessoal", null],
		["Triagem do lead do SDR", sdrDeal],
	] as const) {
		await db.calendarEvent.create({
			data: {
				iCalUid: `${crypto.randomUUID()}@google.com`,
				originalStartTime: start,
				title,
				location: "Aldeota",
				startsAt: start,
				endsAt: new Date(start.getTime() + HOUR_MS),
				status: "confirmed",
				dealId,
			},
		});
	}
});

afterAll(async () => {
	await db.calendarEvent.deleteMany({
		where: { title: { in: ["Consulta pessoal", "Triagem do lead do SDR"] } },
	});
	await db.deal.deleteMany({ where: { id: { in: [lughDeal, sdrDeal] } } });
	await db.company.deleteMany({
		where: { id: { in: [lughCompany, sdrCompany] } },
	});
	await db.member.deleteMany({ where: { userId: { in: [juan, sdr] } } });
	await db.user.deleteMany({ where: { id: { in: [juan, sdr] } } });
});

describe("who is an SDR", () => {
	it("reads the workspace role", async () => {
		expect(await access.isSdr(sdr)).toBe(true);
		expect(await access.isSdr(juan)).toBe(false);
		expect(await access.sdrUserIds()).toContain(sdr);
	});
});

describe("what an SDR may call", () => {
	const allows = (path: string, input: unknown = {}) =>
		access.allows(path, input, sdr);

	it("opens only their own deals", async () => {
		expect(await allows("deals.byId", { id: sdrDeal })).toBe(true);
		expect(await allows("deals.byId", { id: lughDeal })).toBe(false);
		expect(
			await allows("deals.setStage", { id: lughDeal, stage: "NEGOTIATION" }),
		).toBe(false);
	});

	it("cannot hand a deal to someone else", async () => {
		expect(
			await allows("deals.update", { id: sdrDeal, data: { name: "Novo" } }),
		).toBe(true);
		expect(
			await allows("deals.update", { id: sdrDeal, data: { ownerId: juan } }),
		).toBe(false);
		expect(
			await allows("deals.update", {
				id: sdrDeal,
				data: { companyId: lughCompany },
			}),
		).toBe(false);
	});

	it("creates leads only for themselves", async () => {
		const lead = (ownerId: string) => ({
			client: { mode: "new", name: "Clínica Nova" },
			ownerId,
		});
		expect(await allows("leads.create", lead(sdr))).toBe(true);
		expect(await allows("leads.create", lead(juan))).toBe(false);
	});

	it("cannot open a lead on someone else's client", async () => {
		const existing = (companyId: string) => ({
			client: { mode: "existing", companyId },
			ownerId: sdr,
		});
		expect(await allows("leads.create", existing(sdrCompany))).toBe(true);
		expect(await allows("leads.create", existing(lughCompany))).toBe(false);
	});

	it("runs bulk actions only when every deal is theirs", async () => {
		expect(await allows("deals.bulkArchive", { ids: [sdrDeal] })).toBe(true);
		expect(
			await allows("deals.bulkArchive", { ids: [sdrDeal, lughDeal] }),
		).toBe(false);
		expect(
			await allows("deals.bulkSetStage", {
				ids: [sdrDeal],
				stage: "NEGOTIATION",
			}),
		).toBe(true);
	});

	it("refuses input that does not match the procedure", async () => {
		expect(await allows("deals.byId", { id: 42 })).toBe(false);
		expect(await allows("meetings.schedule", { dealId: sdrDeal })).toBe(false);
	});

	it("schedules only on their own deals", async () => {
		const meeting = (dealId: string) => ({
			dealId,
			kind: "SCREENING",
			title: "Triagem",
			startsAt: start.toISOString(),
			durationMinutes: 30,
			timeZone: "America/Fortaleza",
			withMeet: true,
		});
		expect(await allows("meetings.schedule", meeting(sdrDeal))).toBe(true);
		expect(await allows("meetings.schedule", meeting(lughDeal))).toBe(false);
	});

	it("reads a timeline only through their deal", async () => {
		expect(await allows("activities.timeline", { dealId: sdrDeal })).toBe(true);
		expect(
			await allows("activities.timeline", {
				dealId: sdrDeal,
				companyId: lughCompany,
			}),
		).toBe(false);
	});

	it("attaches files only to their deals", async () => {
		expect(
			await allows("attachments.list", { kind: "deal", id: sdrDeal }),
		).toBe(true);
		expect(
			await allows("attachments.list", { kind: "company", id: sdrCompany }),
		).toBe(false);
	});

	it("reaches nothing outside the pipeline and the agenda", async () => {
		for (const path of [
			"finance.list",
			"contracts.list",
			"companies.byId",
			"contacts.list",
			"projects.list",
			"reports.funnel",
			"search.quick",
			"conversations.list",
			"workspace.members",
			"deals.purge",
			"deals.bulkAssignOwner",
		]) {
			expect(await allows(path, { id: sdrDeal })).toBe(false);
		}
	});
});

describe("the auth middleware", () => {
	const call = (userId: string, path: string, input: unknown = {}) =>
		middleware.use({
			ctx: { session: { user: { id: userId } } },
			type: "query",
			path,
			input,
			getRawInput: async () => input,
			meta: undefined,
			signal: undefined,
			next: (async (opts?: { ctx?: Record<string, unknown> }) => ({
				ok: true,
				data: opts?.ctx?.sdr,
				marker: "next",
			})) as never,
		} as never);

	it("forbids an SDR outside the policy", async () => {
		await expect(call(sdr, "finance.list")).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
	});

	it("lets an SDR through and marks the context", async () => {
		const result = (await call(sdr, "deals.byId", { id: sdrDeal })) as {
			data: unknown;
		};
		expect(result.data).toBe(true);
	});

	it("leaves everyone else as before", async () => {
		const result = (await call(juan, "finance.list")) as { data: unknown };
		expect(result.data).toBe(false);
	});
});

describe("separate pipelines", () => {
	const input = {
		q: "",
		sort: "createdAt",
		dir: "desc" as const,
		page: 1,
		pageSize: 100,
		status: "all",
		owner: [],
		stage: [],
		closing: [],
		fields: {},
		archived: false,
		pipeline: "",
	};

	it("shows an SDR only their own deals", async () => {
		const list = await deals.list(input, { ownerIds: [sdr] });
		const ids = list.rows.map((row) => row.id);
		expect(ids).toContain(sdrDeal);
		expect(ids).not.toContain(lughDeal);
		expect(list.facetCounts.owner[juan]).toBeUndefined();
	});

	it("keeps SDR deals out of the Lugh pipeline", async () => {
		const list = await deals.list(input, {
			excludeOwnerIds: await access.sdrUserIds(),
		});
		const ids = list.rows.map((row) => row.id);
		expect(ids).toContain(lughDeal);
		expect(ids).not.toContain(sdrDeal);
	});
});

describe("the SDR agenda", () => {
	const range = {
		from: new Date(start.getTime() - HOUR_MS).toISOString(),
		to: new Date(start.getTime() + 2 * HOUR_MS).toISOString(),
	};

	it("shows other meetings only as busy time", async () => {
		const view = await agenda.range(range as never, sdr, {
			sdr: true,
			calendarUserId: juan,
		});
		const titles = view.items.map((item) => item.title);

		expect(titles).toContain("Triagem do lead do SDR");
		expect(titles).toContain("Ocupado");
		expect(titles).not.toContain("Consulta pessoal");

		const busy = view.items.find((item) => item.title === "Ocupado");
		expect(busy?.location).toBeNull();
		expect(busy?.record).toBeNull();

		const own = view.items.find(
			(item) => item.title === "Triagem do lead do SDR",
		);
		expect(own?.record).toEqual({ kind: "deal", id: sdrDeal, name: "SDR" });
	});

	it("reads busy time from the host calendar, not only from the CRM", async () => {
		const dentist = new Date(start.getTime() + 30 * 60 * 1000);
		const view = await agenda.range(range as never, sdr, {
			sdr: true,
			calendarUserId: juan,
			busy: [
				{
					googleEventId: "personal-google-id",
					startsAt: dentist,
					endsAt: new Date(dentist.getTime() + HOUR_MS),
					isAllDay: false,
				},
			],
		});

		const busy = view.items.filter((item) => item.title === "Ocupado");
		expect(busy.map((item) => item.startsAt)).toEqual([dentist.toISOString()]);
		expect(view.items.map((item) => item.title)).toContain(
			"Triagem do lead do SDR",
		);
	});

	it("shows the owner every meeting in full", async () => {
		const view = await agenda.range(range as never, juan);
		const titles = view.items.map((item) => item.title);
		expect(titles).toContain("Consulta pessoal");
		expect(titles).toContain("Triagem do lead do SDR");
	});
});
