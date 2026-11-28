import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	HttpCode,
	Param,
	ParseUUIDPipe,
	Post,
} from "@nestjs/common";
import type { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { commitBody, previewBody } from "./statement-import.schemas";
import { StatementImportService } from "./statement-import.service";

type User = { id: string };

function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
	const parsed = schema.safeParse(input);
	if (!parsed.success) throw new BadRequestException(parsed.error.message);
	return parsed.data;
}

/** Statement import for manual credit cards, and Keep on a Not on statement row. */
@Controller()
export class StatementImportController {
	constructor(private readonly imports: StatementImportService) {}

	@Post("accounts/:id/statement-import/preview")
	@HttpCode(200)
	async preview(
		@CurrentUser() user: User,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		const { file } = parse(previewBody, body);
		return { data: await this.imports.preview(user.id, id, file) };
	}

	@Post("accounts/:id/statement-import")
	async commit(
		@CurrentUser() user: User,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		return { data: await this.imports.commit(user.id, id, parse(commitBody, body)) };
	}

	@Delete("transactions/:id/not-on-statement")
	async keep(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
		return { data: await this.imports.keep(user.id, id) };
	}
}
