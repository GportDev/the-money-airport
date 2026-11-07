import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { TransactionIngestService } from "./transaction-ingest.service";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";

@Module({
	imports: [CategoriesModule],
	controllers: [TransactionsController],
	providers: [TransactionsService, TransactionIngestService],
	exports: [TransactionIngestService],
})
export class TransactionsModule {}
