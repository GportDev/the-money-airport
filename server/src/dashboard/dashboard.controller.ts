import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { DashboardService } from "./dashboard.service";

const dashboardQuery = z.object({
	month: z
		.string()
		.regex(/^\d{4}-(0[1-9]|1[0-2])$/)
		.optional(),
	netWorthRange: z.enum(["1m", "3m", "1y", "ytd"]).default("1m"),
});

@Controller("dashboard")
export class DashboardController {
	constructor(private readonly dashboard: DashboardService) {}

	@Get()
	async get(@CurrentUser() user: { id: string; name: string }, @Query() query: unknown) {
		const parsed = dashboardQuery.safeParse(query);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		const now = new Date();
		const [year, month] = parsed.data.month
			? parsed.data.month.split("-").map(Number)
			: [now.getUTCFullYear(), now.getUTCMonth() + 1];
		return {
			data: await this.dashboard.get(
				user,
				year ?? now.getUTCFullYear(),
				month ?? now.getUTCMonth() + 1,
				parsed.data.netWorthRange,
			),
		};
	}
}
