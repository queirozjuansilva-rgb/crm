import { z } from "zod";

export const NOTE_BOARDS = ["CLIENTS", "FINANCE"] as const;

const board = z
	.string()
	.refine(
		(value): value is (typeof NOTE_BOARDS)[number] =>
			(NOTE_BOARDS as readonly string[]).includes(value),
		{ message: "Quadro inválido." },
	);

const period = z
	.string()
	.regex(/^\d{4}-\d{2}$/, "Mês inválido.")
	.optional();

export const boardNoteListInput = z.object({ board, period });

export const boardNoteCreateInput = z.object({
	board,
	period,
	body: z.string().trim().min(1, "Escreva a observação.").max(4000),
	companyId: z.string().min(1).optional(),
});

export const boardNoteIdInput = z.object({ id: z.string().min(1) });

export const boardNoteOutput = z.object({
	id: z.string(),
	body: z.string(),
	period: z.string().nullable(),
	createdAt: z.string(),
	author: z.object({ id: z.string(), name: z.string() }).nullable(),
	company: z.object({ id: z.string(), name: z.string() }).nullable(),
});

export const boardNoteListOutput = z.array(boardNoteOutput);

export type BoardNoteCreateInput = z.infer<typeof boardNoteCreateInput>;
export type BoardNoteOutput = z.infer<typeof boardNoteOutput>;
