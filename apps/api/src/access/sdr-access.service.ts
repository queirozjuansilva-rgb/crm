import { isSdr, toWorkspaceRole, WORKSPACE_ID } from "@crm/auth/organization";
import type { Db } from "@crm/db";
import { Injectable } from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import { ACCESS } from "./access-config";
import { SDR_POLICY } from "./sdr-policy";

type CachedRole = { sdr: boolean; at: number };

@Injectable()
export class SdrAccessService {
	private readonly roles = new Map<string, CachedRole>();

	constructor(@InjectDatabase() private readonly db: Db) {}

	async isSdr(userId: string): Promise<boolean> {
		const cached = this.roles.get(userId);
		if (cached && Date.now() - cached.at < ACCESS.roleCacheMs)
			return cached.sdr;

		const member = await this.db.member.findUnique({
			where: {
				organizationId_userId: { organizationId: WORKSPACE_ID, userId },
			},
			select: { role: true },
		});

		const sdr = member ? isSdr(toWorkspaceRole(member.role)) : false;
		this.roles.set(userId, { sdr, at: Date.now() });
		return sdr;
	}

	forget(userId: string): void {
		this.roles.delete(userId);
	}

	async sdrUserIds(): Promise<string[]> {
		const rows = await this.db.member.findMany({
			where: { organizationId: WORKSPACE_ID, role: "sdr" },
			select: { userId: true },
		});
		return rows.map((row) => row.userId);
	}

	async calendarHostId(): Promise<string | null> {
		const rows = await this.db.member.findMany({
			where: { organizationId: WORKSPACE_ID, role: { in: ["owner", "admin"] } },
			orderBy: { createdAt: "asc" },
			select: { userId: true, role: true },
		});
		const host = rows.find((row) => row.role === "owner") ?? rows[0];
		return host?.userId ?? null;
	}

	async allows(path: string, input: unknown, userId: string): Promise<boolean> {
		const check = SDR_POLICY[path];
		return check ? check({ db: this.db, userId }, input) : false;
	}
}
