import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { StatementImportController } from "./statement-import.controller";
import { StatementImportService } from "./statement-import.service";

@Module({
	imports: [CategoriesModule, TransactionsModule],
	controllers: [StatementImportController],
	providers: [StatementImportService],
})
export class StatementImportModule {}
