import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
} from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { BudgetsService } from "./budgets.service";

const MAX_PLANNED_CENTS = 2_000_000_000;

const monthStart = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/, "Use the first day of the month");
const amount = z.number().int().min(0).max(MAX_PLANNED_CENTS);

const monthQuery = z.object({
	year: z.coerce.number().int().min(1970).max(2100).optional(),
	month: z.coerce.number().int().min(1).max(12).optional(),
});

const createBody = z.object({ categoryId: z.string().uuid(), month: monthStart, amount });
const updateBody = z.object({ amount });
const copyBody = z.object({ targetMonth: monthStart });

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		throw new BadRequestException(parsed.error.message);
	}
	return parsed.data;
}

@Controller("budgets")
export class BudgetsController {
	constructor(private readonly budgets: BudgetsService) {}

	@Get()
	async month(@CurrentUser() user: { id: string }, @Query() query: unknown) {
		const now = new Date();
		const { year = now.getUTCFullYear(), month = now.getUTCMonth() + 1 } = parse(monthQuery, query);
		return { data: await this.budgets.month(user.id, year, month) };
	}

	@Post()
	async create(@CurrentUser() user: { id: string }, @Body() body: unknown) {
		return { data: await this.budgets.upsert(user.id, parse(createBody, body)) };
	}

	@Post("copy-previous")
	async copyPrevious(@CurrentUser() user: { id: string }, @Body() body: unknown) {
		const { targetMonth } = parse(copyBody, body);
		return { data: await this.budgets.copyPrevious(user.id, targetMonth) };
	}

	@Patch(":id")
	async update(
		@CurrentUser() user: { id: string },
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		return { data: await this.budgets.update(user.id, id, parse(updateBody, body).amount) };
	}

	@Delete(":id")
	async remove(@CurrentUser() user: { id: string }, @Param("id", ParseUUIDPipe) id: string) {
		return { data: await this.budgets.remove(user.id, id) };
	}
}
