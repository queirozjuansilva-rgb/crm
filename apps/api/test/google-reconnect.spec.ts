import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { GOOGLE_PROVIDER_ID, SYNC_SCOPES } from "@crm/auth/scopes";
import { db, GoogleSyncStatus } from "@crm/db";
import { ActivityStampService } from "../src/crm/activity-stamp.service";
import { GoogleConnectionService } from "../src/google/google-connection.service";
import type { MailboxMatchService } from "../src/mailbox/mailbox-match.service";
import { MailboxTokenService } from "../src/mailbox/mailbox-token.service";
import { SyncStateService } from "../src/mailbox/sync-state.service";

const userId = `reconnect-${crypto.randomUUID()}`;
const HOUR_MS = 60 * 60 * 1000;

const google = new GoogleConnectionService(
	db,
	new MailboxTokenService(db),
	new SyncStateService(db),
	{} as unknown as MailboxMatchService,
	new ActivityStampService(db),
);

async function grant(at: Date) {
	await db.account.upsert({
		where: { id: `${userId}-google` },
		create: {
			id: `${userId}-google`,
			accountId: userId,
			providerId: GOOGLE_PROVIDER_ID,
			userId,
			scope: ["openid", ...SYNC_SCOPES].join(","),
			createdAt: at,
			updatedAt: at,
		},
		update: { updatedAt: at },
	});
}

async function broken(at: Date) {
	await db.mailboxSync.deleteMany({ where: { userId } });
	await db.mailboxSync.create({
		data: {
			userId,
			source: "calendar",
			status: GoogleSyncStatus.NEEDS_RECONNECT,
			lastError: "invalid credentials",
			autoCreate: true,
			updatedAt: at,
		},
	});
}

async function calendarStatus() {
	const row = await db.mailboxSync.findUnique({
		where: { userId_source: { userId, source: "calendar" } },
		select: { status: true, lastError: true, autoCreate: true },
	});
	return row;
}

beforeAll(async () => {
	await db.user.create({
		data: { id: userId, name: "Reconnect", email: `${userId}@example.test` },
	});
});

afterAll(async () => {
	await db.mailboxSync.deleteMany({ where: { userId } });
	await db.account.deleteMany({ where: { userId } });
	await db.user.deleteMany({ where: { id: userId } });
});

describe("GoogleConnectionService.onConnected", () => {
	it("revives a mailbox that needed a reconnect once Google is granted again", async () => {
		const now = Date.now();
		await broken(new Date(now - 2 * HOUR_MS));
		await grant(new Date(now - HOUR_MS));

		await google.onConnected(userId);

		expect(await calendarStatus()).toEqual({
			status: GoogleSyncStatus.IDLE,
			lastError: null,
			autoCreate: true,
		});
	});

	it("leaves it broken when the grant is older than the failure", async () => {
		const now = Date.now();
		await grant(new Date(now - 2 * HOUR_MS));
		await broken(new Date(now - HOUR_MS));

		await google.onConnected(userId);

		expect((await calendarStatus())?.status).toBe(
			GoogleSyncStatus.NEEDS_RECONNECT,
		);
	});
});
