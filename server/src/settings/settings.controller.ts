import { BadRequestException, Body, Controller, Get, Patch } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { DASHBOARD_WIDGET_IDS } from "./dashboard-widgets";
import { SettingsService } from "./settings.service";

const UNOFFICIAL = new Set(["BTC", "ETH", "USDT", "USDC", "XBT", "DOGE", "SOL", "XXX", "XTS"]);

const patchBody = z
	.object({
		currency: z
			.string()
			.regex(/^[A-Z]{3}$/)
			.refine((code) => !UNOFFICIAL.has(code), "Base currency must be an official ISO code")
			.optional(),
		dashboardWidgets: z
			.array(
				z.object({
					id: z.enum(DASHBOARD_WIDGET_IDS),
					visible: z.boolean(),
					order: z.number().int().min(0),
				}),
			)
			.max(DASHBOARD_WIDGET_IDS.length)
			.optional(),
		budgetCopyForward: z.boolean().optional(),
	})
	.strict();

@Controller("settings")
export class SettingsController {
	constructor(private readonly settings: SettingsService) {}

	@Get()
	async get(@CurrentUser() user: { id: string }) {
		return { data: await this.settings.get(user.id) };
	}

	@Patch()
	async update(@CurrentUser() user: { id: string }, @Body() body: unknown) {
		const parsed = patchBody.safeParse(body);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		return { data: await this.settings.update(user.id, parsed.data) };
	}
}
