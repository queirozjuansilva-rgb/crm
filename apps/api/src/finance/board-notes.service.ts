import type { Db, Prisma } from "@crm/db";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import type {
	BoardNoteCreateInput,
	BoardNoteOutput,
	NOTE_BOARDS,
} from "./board-notes.contracts";
import { FINANCE } from "./finance-config";

type Board = (typeof NOTE_BOARDS)[number];

const NOTE_SELECT = {
	id: true,
	body: true,
	period: true,
	createdAt: true,
	author: { select: { id: true, name: true } },
	company: { select: { id: true, name: true } },
} as const;

type NoteRow = Prisma.BoardNoteGetPayload<{ select: typeof NOTE_SELECT }>;

function serialize(row: NoteRow): BoardNoteOutput {
	return {
		id: row.id,
		body: row.body,
		period: row.period,
		createdAt: row.createdAt.toISOString(),
		author: row.author,
		company: row.company,
	};
}

@Injectable()
export class BoardNotesService {
	constructor(@InjectDatabase() private readonly db: Db) {}

	async list(board: Board, period?: string) {
		const rows = await this.db.boardNote.findMany({
			where: { board, ...(period ? { period } : {}) },
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			take: FINANCE.notes.listLimit,
			select: NOTE_SELECT,
		});
		return rows.map(serialize);
	}

	async create(input: BoardNoteCreateInput, authorId: string) {
		const row = await this.db.boardNote.create({
			data: {
				board: input.board as Board,
				period: input.period ?? null,
				body: input.body,
				companyId: input.companyId ?? null,
				authorId,
			},
			select: NOTE_SELECT,
		});
		return serialize(row);
	}

	async remove(id: string) {
		await this.db.boardNote.delete({ where: { id } }).catch(() => {
			throw new NotFoundException("Essa observação não existe mais.");
		});
		return { id };
	}
}
