import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { GoalsModule } from "../goals/goals.module";
import { TransactionIngestService } from "./transaction-ingest.service";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";

@Module({
	imports: [CategoriesModule, GoalsModule],
	controllers: [TransactionsController],
	providers: [TransactionsService, TransactionIngestService],
	exports: [TransactionIngestService, TransactionsService],
})
export class TransactionsModule {}
