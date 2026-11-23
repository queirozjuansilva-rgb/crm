import type { Db } from "@crm/db";
import { Injectable } from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";

export interface UserOption {
	id: string;
	name: string;
	email: string;
	image: string | null;
	sdr: boolean;
}

@Injectable()
export class UsersService {
	constructor(@InjectDatabase() private readonly db: Db) {}

	async list(): Promise<UserOption[]> {
		const users = await this.db.user.findMany({
			select: {
				id: true,
				name: true,
				email: true,
				image: true,
				members: { select: { role: true } },
			},
			orderBy: [{ name: "asc" }, { email: "asc" }],
		});

		return users.map(({ members, ...user }) => ({
			...user,
			sdr: members.some((member) => member.role === "sdr"),
		}));
	}
}
