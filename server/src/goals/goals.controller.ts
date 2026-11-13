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
	Put,
	Query,
} from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { FundEntriesService } from "./fund-entries.service";
import { GoalsService } from "./goals.service";
import { FUND_ENTRY_KINDS, GOAL_FUNDING, GOAL_TYPES } from "./goals.types";

const MAX_CENTS = 2_000_000_000;

const isoDate = z.iso.date();
const name = z.string().trim().min(1).max(100);
const targetAmount = z.number().int().min(1).max(MAX_CENTS);
const icon = z.string().min(1).max(40);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const note = z.string().trim().max(500).nullable().optional();

const listQuery = z.object({ type: z.enum(GOAL_TYPES).optional() });

const createBody = z
	.object({
		name,
		type: z.enum(GOAL_TYPES),
		targetAmount,
		targetDate: isoDate.nullable().optional(),
		icon: icon.optional(),
		color: color.optional(),
		funding: z.enum(GOAL_FUNDING).optional(),
		hostBankAccountId: z.string().uuid().optional(),
	})
	.refine((body) => body.funding !== "fund" || body.type === "save_up", {
		message: "Only save-up Goals can be Funds",
	})
	.refine((body) => body.funding !== "fund" || body.hostBankAccountId, {
		message: "A Fund needs a host BankAccount",
	});

const updateBody = z.object({
	name: name.optional(),
	targetAmount: targetAmount.optional(),
	targetDate: isoDate.nullable().optional(),
	icon: icon.optional(),
	color: color.optional(),
	sortOrder: z.number().int().min(0).max(10_000).optional(),
});

const accountsBody = z.object({ bankAccountIds: z.array(z.string().uuid()).max(50) });

const manualEntry = z
	.object({
		date: isoDate,
		amount: z.number().int().min(-MAX_CENTS).max(MAX_CENTS),
		kind: z.enum(FUND_ENTRY_KINDS),
		note,
	})
	.refine((body) => (body.kind === "withdrawal" ? body.amount < 0 : body.amount > 0), {
		message: "Deposits and interest are positive; withdrawals are negative",
	});
const entryBody = z.union([z.object({ transactionId: z.string().uuid(), note }), manualEntry]);

const entriesQuery = z.object({ cursor: z.string().uuid().optional() });

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		throw new BadRequestException(parsed.error.message);
	}
	return parsed.data;
}

@Controller("goals")
export class GoalsController {
	constructor(
		private readonly goals: GoalsService,
		private readonly entries: FundEntriesService,
	) {}

	@Get()
	async list(@CurrentUser() user: { id: string }, @Query() query: unknown) {
		return { data: await this.goals.list(user.id, parse(listQuery, query).type) };
	}

	@Post()
	async create(@CurrentUser() user: { id: string }, @Body() body: unknown) {
		return { data: await this.goals.create(user.id, parse(createBody, body)) };
	}

	@Patch(":id")
	async update(
		@CurrentUser() user: { id: string },
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		return { data: await this.goals.update(user.id, id, parse(updateBody, body)) };
	}

	@Delete(":id")
	async remove(@CurrentUser() user: { id: string }, @Param("id", ParseUUIDPipe) id: string) {
		return { data: await this.goals.remove(user.id, id) };
	}

	@Put(":id/accounts")
	async setAccounts(
		@CurrentUser() user: { id: string },
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		const { bankAccountIds } = parse(accountsBody, body);
		return { data: await this.goals.setAccounts(user.id, id, bankAccountIds) };
	}

	@Get(":id/entries")
	async listEntries(
		@CurrentUser() user: { id: string },
		@Param("id", ParseUUIDPipe) id: string,
		@Query() query: unknown,
	) {
		return this.entries.list(user.id, id, parse(entriesQuery, query).cursor);
	}

	@Post(":id/entries")
	async createEntry(
		@CurrentUser() user: { id: string },
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		return { data: await this.entries.create(user.id, id, parse(entryBody, body)) };
	}

	@Delete(":id/entries/:entryId")
	async removeEntry(
		@CurrentUser() user: { id: string },
		@Param("id", ParseUUIDPipe) id: string,
		@Param("entryId", ParseUUIDPipe) entryId: string,
	) {
		return { data: await this.entries.remove(user.id, id, entryId) };
	}
}
