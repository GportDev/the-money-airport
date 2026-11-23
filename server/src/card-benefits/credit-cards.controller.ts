import { BadRequestException, Body, Controller, Get, Put } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { creditCardOrderBody } from "./card-benefits.schemas";
import { CreditCardsService } from "./credit-cards.service";
import { presetSummaries } from "./presets";

@Controller("credit-cards")
export class CreditCardsController {
	constructor(private readonly cards: CreditCardsService) {}

	@Get()
	async list(@CurrentUser() user: { id: string }) {
		return { data: await this.cards.list(user.id) };
	}

	@Get("presets")
	presets() {
		return { data: presetSummaries() };
	}

	@Put("order")
	async reorder(@CurrentUser() user: { id: string }, @Body() body: unknown) {
		const parsed = creditCardOrderBody.safeParse(body);
		if (!parsed.success) throw new BadRequestException(parsed.error.message);
		return { data: await this.cards.reorder(user.id, parsed.data.accountIds) };
	}
}
