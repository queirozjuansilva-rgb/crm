import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import {
	boardNoteCreateInput,
	boardNoteListInput,
} from "../src/finance/board-notes.contracts";
import { BoardNotesService } from "../src/finance/board-notes.service";

const authorId = `note-author-${crypto.randomUUID().slice(0, 8)}`;
const notes = new BoardNotesService(db);

beforeAll(async () => {
	await db.user.create({
		data: { id: authorId, name: "Juan", email: `${authorId}@example.test` },
	});
});

afterAll(async () => {
	await db.boardNote.deleteMany({ where: { authorId } });
	await db.user.deleteMany({ where: { id: authorId } });
});

describe("BoardNotesService", () => {
	it("keeps finance notes in their own month", async () => {
		await notes.create(
			{
				board: "FINANCE",
				period: "2026-11",
				body: "Cartão veio R$ 120 a mais.",
			},
			authorId,
		);
		await notes.create(
			{ board: "FINANCE", period: "2026-12", body: "Dezembro." },
			authorId,
		);

		const november = await notes.list("FINANCE", "2026-11");
		const mine = november.filter((note) => note.author?.id === authorId);
		expect(mine.map((note) => note.body)).toEqual([
			"Cartão veio R$ 120 a mais.",
		]);
	});

	it("lists client notes newest first and deletes one", async () => {
		const first = await notes.create(
			{ board: "CLIENTS", body: "Maranata atrasou." },
			authorId,
		);
		await notes.create({ board: "CLIENTS", body: "Pdral pagou." }, authorId);

		const before = (await notes.list("CLIENTS")).filter(
			(note) => note.author?.id === authorId,
		);
		expect(before.map((note) => note.body)).toEqual([
			"Pdral pagou.",
			"Maranata atrasou.",
		]);

		await notes.remove(first.id);
		const after = (await notes.list("CLIENTS")).filter(
			(note) => note.author?.id === authorId,
		);
		expect(after).toHaveLength(1);
	});

	it("requires a real month for a finance note", () => {
		const note = { board: "FINANCE", body: "Cartão" };
		expect(boardNoteCreateInput.safeParse(note).success).toBe(false);
		expect(
			boardNoteCreateInput.safeParse({ ...note, period: "2026-99" }).success,
		).toBe(false);
		expect(
			boardNoteCreateInput.safeParse({ ...note, period: "2026-11" }).success,
		).toBe(true);
		expect(
			boardNoteCreateInput.safeParse({ board: "CLIENTS", body: "Atraso" })
				.success,
		).toBe(true);
	});

	it("rejects an unknown board", () => {
		expect(boardNoteListInput.safeParse({ board: "OTHER" }).success).toBe(
			false,
		);
	});
});
