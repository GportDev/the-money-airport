import { Module } from "@nestjs/common";
import { CardBenefitsController } from "./card-benefits.controller";
import { CardBenefitsService } from "./card-benefits.service";
import { CreditCardsController } from "./credit-cards.controller";
import { CreditCardsService } from "./credit-cards.service";

@Module({
	controllers: [CardBenefitsController, CreditCardsController],
	providers: [CardBenefitsService, CreditCardsService],
})
export class CardBenefitsModule {}
