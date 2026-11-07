import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { CashFlowService } from "./cash-flow.service";

const cashFlowQuery = z.object({
	accountId: z.string().uuid().optional(),
	year: z.coerce.number().int().min(1970).max(2100).optional(),
	month: z.coerce.number().int().min(1).max(12).optional(),
});

@Controller("cash-flow")
export class CashFlowController {
	constructor(private readonly cashFlow: CashFlowService) {}

	@Get()
	async get(@CurrentUser() user: { id: string }, @Query() query: unknown) {
		const parsed = cashFlowQuery.safeParse(query);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		const now = new Date();
		const { accountId, year = now.getUTCFullYear(), month = now.getUTCMonth() + 1 } = parsed.data;
		return { data: await this.cashFlow.get(user.id, year, month, accountId) };
	}
}
