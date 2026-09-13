import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
} from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { AccountsService } from "./accounts.service";
import { DISPLAY_GROUPS, type NetWorthRange } from "./accounts.types";

const types = ["checking", "savings", "credit", "investment", "loan", "vehicle", "other"] as const;

const createBody = z.object({
	name: z.string().min(1),
	type: z.enum(types),
	displayGroup: z.enum(DISPLAY_GROUPS),
	currentBalance: z.number().int(),
	isoCurrencyCode: z.string().min(3).max(4).optional(),
	creditLimit: z.number().int().nullable().optional(),
});

const updateBody = z.object({
	name: z.string().min(1).optional(),
	currentBalance: z.number().int().optional(),
	creditLimit: z.number().int().nullable().optional(),
	isHidden: z.boolean().optional(),
});

@Controller("accounts")
export class AccountsController {
	constructor(private readonly accounts: AccountsService) {}

	@Get("net-worth")
	async netWorth(@CurrentUser() user: { id: string }, @Query("range") range?: string) {
		const allowed: NetWorthRange[] = ["1m", "3m", "1y", "ytd"];
		const selected = allowed.includes(range as NetWorthRange) ? (range as NetWorthRange) : "1m";
		return { data: await this.accounts.netWorth(user.id, selected) };
	}

	@Get()
	async list(@CurrentUser() user: { id: string }) {
		return { data: await this.accounts.list(user.id) };
	}

	@Post()
	async create(@CurrentUser() user: { id: string }, @Body() body: unknown) {
		const parsed = createBody.safeParse(body);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		return { data: await this.accounts.create(user.id, parsed.data) };
	}

	@Patch(":id")
	async update(
		@CurrentUser() user: { id: string },
		@Param("id") id: string,
		@Body() body: unknown,
	) {
		const parsed = updateBody.safeParse(body);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		return { data: await this.accounts.update(user.id, id, parsed.data) };
	}

	@Delete(":id")
	async remove(@CurrentUser() user: { id: string }, @Param("id") id: string) {
		return { data: await this.accounts.remove(user.id, id) };
	}
}
