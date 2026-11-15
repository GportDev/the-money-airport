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
import { todayIso } from "../forecast/dates";
import { RecurringService } from "./recurring.service";
import { CADENCES } from "./recurring.types";

const MAX_CENTS = 2_000_000_000;

const isoDate = z.iso.date();
const amount = z.number().int().min(1).max(MAX_CENTS);
const cadence = z.enum(CADENCES);

const monthQuery = z.object({
	month: z
		.string()
		.regex(/^\d{4}-(0[1-9]|1[0-2])$/)
		.optional(),
});

const createBody = z
	.object({
		merchantName: z.string().trim().min(1).max(200),
		amount,
		cadence,
		nextDate: isoDate,
		bankAccountId: z.string().uuid().nullable().optional(),
		categoryId: z.string().uuid().nullable().optional(),
		isActive: z.boolean().optional(),
		isManual: z.boolean().optional(),
	})
	.strict();

const updateBody = z
	.object({
		amount: amount.optional(),
		cadence: cadence.optional(),
		nextDate: isoDate.optional(),
		isActive: z.boolean().optional(),
	})
	.strict();

const markPaidBody = z.object({ date: isoDate.optional() }).strict();

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
	const parsed = schema.safeParse(input ?? {});
	if (!parsed.success) {
		throw new BadRequestException(parsed.error.message);
	}
	return parsed.data;
}

@Controller("recurring")
export class RecurringController {
	constructor(private readonly recurring: RecurringService) {}

	@Get()
	async month(@CurrentUser() user: { id: string }, @Query() query: unknown) {
		const month = parse(monthQuery, query).month ?? todayIso().slice(0, 7);
		return { data: await this.recurring.month(user.id, month) };
	}

	@Post()
	async create(@CurrentUser() user: { id: string }, @Body() body: unknown) {
		return { data: await this.recurring.create(user.id, parse(createBody, body)) };
	}

	@Post("detect")
	async detect(@CurrentUser() user: { id: string }) {
		return { data: await this.recurring.detect(user.id) };
	}

	@Patch(":id")
	async update(
		@CurrentUser() user: { id: string },
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		return { data: await this.recurring.update(user.id, id, parse(updateBody, body)) };
	}

	@Post(":id/mark-paid")
	async markPaid(
		@CurrentUser() user: { id: string },
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		const { date } = parse(markPaidBody, body);
		return { data: await this.recurring.markPaid(user.id, id, date) };
	}

	@Post(":id/skip")
	async skip(@CurrentUser() user: { id: string }, @Param("id", ParseUUIDPipe) id: string) {
		return { data: await this.recurring.skip(user.id, id) };
	}

	@Delete(":id")
	async remove(@CurrentUser() user: { id: string }, @Param("id", ParseUUIDPipe) id: string) {
		return this.recurring.remove(user.id, id);
	}
}
