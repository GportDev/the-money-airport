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
import { TransactionsService } from "./transactions.service";
import { TRANSFER_TAGS } from "./transactions.types";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuidList = z
	.union([z.string(), z.array(z.string())])
	.optional()
	.transform((value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]))
	.pipe(z.array(z.string().uuid()));

const listQuery = z.object({
	cursor: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
	dateFrom: isoDate.optional(),
	dateTo: isoDate.optional(),
	accountId: uuidList,
	categoryId: uuidList,
	search: z.string().trim().max(100).optional(),
	pending: z.enum(["true", "false"]).optional(),
	amountMin: z.coerce.number().int().min(0).optional(),
	amountMax: z.coerce.number().int().min(0).optional(),
	sortDir: z.enum(["asc", "desc"]).default("desc"),
});

const createBody = z.object({
	name: z.string().trim().min(1).max(200),
	amount: z.number().int(),
	date: isoDate,
	categoryId: z.string().uuid().nullable().optional(),
	bankAccountId: z.string().uuid().nullable().optional(),
	notes: z.string().max(2000).nullable().optional(),
	isoCurrencyCode: z.string().min(3).max(4).optional(),
});

const updateBody = z.object({
	categoryId: z.string().uuid().optional(),
	notes: z.string().max(2000).nullable().optional(),
	tags: z.array(z.enum(TRANSFER_TAGS)).max(1).optional(),
	name: z.string().trim().min(1).max(200).optional(),
	amount: z.number().int().optional(),
	date: isoDate.optional(),
	bankAccountId: z.string().uuid().nullable().optional(),
});

const bulkBody = z.object({
	transactionIds: z.array(z.string().uuid()).min(1).max(500),
	categoryId: z.string().uuid(),
});

@Controller("transactions")
export class TransactionsController {
	constructor(private readonly transactions: TransactionsService) {}

	@Get()
	async list(@CurrentUser() user: { id: string }, @Query() query: unknown) {
		const parsed = listQuery.safeParse(query);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		const { accountId, categoryId, pending, search, ...rest } = parsed.data;
		return this.transactions.list(user.id, {
			...rest,
			search: search || undefined,
			accountIds: accountId,
			categoryIds: categoryId,
			pending: pending === undefined ? undefined : pending === "true",
		});
	}

	// Declared before ":id" so Nest does not read "bulk-categorize" as an id.
	@Patch("bulk-categorize")
	async bulkCategorize(@CurrentUser() user: { id: string }, @Body() body: unknown) {
		const parsed = bulkBody.safeParse(body);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		return {
			data: await this.transactions.bulkCategorize(
				user.id,
				parsed.data.transactionIds,
				parsed.data.categoryId,
			),
		};
	}

	@Get(":id")
	async get(@CurrentUser() user: { id: string }, @Param("id", ParseUUIDPipe) id: string) {
		return { data: await this.transactions.get(user.id, id) };
	}

	@Post()
	async create(@CurrentUser() user: { id: string }, @Body() body: unknown) {
		const parsed = createBody.safeParse(body);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		return { data: await this.transactions.create(user.id, parsed.data) };
	}

	@Patch(":id")
	async update(
		@CurrentUser() user: { id: string },
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		const parsed = updateBody.safeParse(body);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		return { data: await this.transactions.update(user.id, id, parsed.data) };
	}

	@Delete(":id")
	async remove(@CurrentUser() user: { id: string }, @Param("id", ParseUUIDPipe) id: string) {
		return { data: await this.transactions.remove(user.id, id) };
	}
}
