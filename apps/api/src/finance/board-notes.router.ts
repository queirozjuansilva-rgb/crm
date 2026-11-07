import { Inject } from "@nestjs/common";
import {
	Ctx,
	Input,
	Mutation,
	Query,
	Router,
	UseMiddlewares,
} from "nestjs-trpc";
import { z } from "zod";
import type { AuthedTrpcContext } from "../trpc/context.types";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import {
	boardNoteCreateInput,
	boardNoteIdInput,
	boardNoteListInput,
	boardNoteListOutput,
	boardNoteOutput,
	type NOTE_BOARDS,
} from "./board-notes.contracts";
import { BoardNotesService } from "./board-notes.service";

type Board = (typeof NOTE_BOARDS)[number];

@Router({ alias: "boardNotes" })
@UseMiddlewares(AuthMiddleware)
export class BoardNotesRouter {
	constructor(
		@Inject(BoardNotesService) private readonly notes: BoardNotesService,
	) {}

	@Query({
		input: boardNoteListInput,
		output: boardNoteListOutput,
		meta: restMeta("GET", "/board-notes", ["Finance"]),
	})
	async list(@Input() input: z.infer<typeof boardNoteListInput>) {
		return this.notes.list(input.board as Board, input.period);
	}

	@Mutation({
		input: boardNoteCreateInput,
		output: boardNoteOutput,
		meta: restMeta("POST", "/board-notes", ["Finance"]),
	})
	async create(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof boardNoteCreateInput>,
	) {
		return this.notes.create(input, ctx.user.id);
	}

	@Mutation({
		input: boardNoteIdInput,
		output: z.object({ id: z.string() }),
		meta: restMeta("DELETE", "/board-notes/{id}", ["Finance"]),
	})
	async remove(@Input("id") id: string) {
		return this.notes.remove(id);
	}
}
