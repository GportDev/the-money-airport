import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { BudgetsModule } from "../budgets/budgets.module";
import { CashFlowModule } from "../cash-flow/cash-flow.module";
import { RecurringModule } from "../recurring/recurring.module";
import { SettingsModule } from "../settings/settings.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
	imports: [
		AccountsModule,
		BudgetsModule,
		CashFlowModule,
		RecurringModule,
		SettingsModule,
		TransactionsModule,
	],
	controllers: [DashboardController],
	providers: [DashboardService],
})
export class DashboardModule {}
