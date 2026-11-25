import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
} from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { TransactionRulesService } from "./transaction-rules.service";

const ruleBody = z.object({
	merchant: z.string().trim().min(1).max(200),
	amount: z.number().int().nullable().default(null),
	categoryId: z.string().uuid(),
});

@Controller("transaction-rules")
export class TransactionRulesController {
	constructor(private readonly rules: TransactionRulesService) {}

	@Get()
	async list(@CurrentUser() user: { id: string }) {
		return { data: await this.rules.list(user.id) };
	}

	@Post()
	async save(@CurrentUser() user: { id: string }, @Body() body: unknown) {
		const parsed = ruleBody.safeParse(body);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		return { data: await this.rules.save(user.id, parsed.data) };
	}

	@Delete(":id")
	async remove(@CurrentUser() user: { id: string }, @Param("id", ParseUUIDPipe) id: string) {
		return { data: await this.rules.remove(user.id, id) };
	}
}
