import { Module } from "@nestjs/common";
import { TransactionsModule } from "../transactions/transactions.module";
import { CardStatementsService } from "./card-statements.service";
import { LiabilitiesController } from "./liabilities.controller";
import { LiabilitiesSyncService } from "./liabilities-sync.service";
import { LoanTermsService } from "./loan-terms.service";

@Module({
	imports: [TransactionsModule],
	controllers: [LiabilitiesController],
	providers: [CardStatementsService, LoanTermsService, LiabilitiesSyncService],
	exports: [LiabilitiesSyncService, LoanTermsService],
})
export class LiabilitiesModule {}
