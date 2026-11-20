import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
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
}
