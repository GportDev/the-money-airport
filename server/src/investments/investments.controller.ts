import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { InvestmentsService } from "./investments.service";
import { INVESTMENT_RANGES } from "./investments.types";

const investmentsQuery = z.object({ range: z.enum(INVESTMENT_RANGES).default("1m") });

@Controller("investments")
export class InvestmentsController {
	constructor(private readonly investments: InvestmentsService) {}

	@Get()
	async get(@CurrentUser() user: { id: string }, @Query() query: unknown) {
		const parsed = investmentsQuery.safeParse(query);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		return { data: await this.investments.get(user.id, parsed.data.range) };
	}
}
