import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Param,
	ParseUUIDPipe,
	Put,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { cardBenefitsBody } from "./card-benefits.schemas";
import { CardBenefitsService } from "./card-benefits.service";

/** Card benefits hang off a credit BankAccount. */
@Controller("accounts")
export class CardBenefitsController {
	constructor(private readonly benefits: CardBenefitsService) {}

	@Put(":id/card-benefits")
	async upsert(
		@CurrentUser() user: { id: string },
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		const parsed = cardBenefitsBody.safeParse(body);
		if (!parsed.success) throw new BadRequestException(parsed.error.message);
		return { data: await this.benefits.upsert(user.id, id, parsed.data) };
	}

	@Delete(":id/card-benefits")
	async remove(@CurrentUser() user: { id: string }, @Param("id", ParseUUIDPipe) id: string) {
		return { data: await this.benefits.remove(user.id, id) };
	}
}
