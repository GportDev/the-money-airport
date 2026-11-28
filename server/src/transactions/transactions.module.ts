import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { GoalsModule } from "../goals/goals.module";
import { TransactionIngestService } from "./transaction-ingest.service";
import { TransactionMerchantsService } from "./transaction-merchants.service";
import { TransactionRefundsService } from "./transaction-refunds.service";
import { TransactionRulesController } from "./transaction-rules.controller";
import { TransactionRulesService } from "./transaction-rules.service";
import { TransactionSplitsService } from "./transaction-splits.service";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";

@Module({
	imports: [CategoriesModule, GoalsModule],
	controllers: [TransactionsController, TransactionRulesController],
	providers: [
		TransactionsService,
		TransactionIngestService,
		TransactionSplitsService,
		TransactionRefundsService,
		TransactionRulesService,
		TransactionMerchantsService,
	],
	exports: [TransactionIngestService, TransactionsService, TransactionRulesService],
})
export class TransactionsModule {}
