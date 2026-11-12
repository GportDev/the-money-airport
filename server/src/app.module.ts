import { join } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountsModule } from "./accounts/accounts.module";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { BudgetsModule } from "./budgets/budgets.module";
import { CashFlowModule } from "./cash-flow/cash-flow.module";
import { CategoriesModule } from "./categories/categories.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DbModule } from "./db/db.module";
import { FxModule } from "./fx/fx.module";
import { GoalsModule } from "./goals/goals.module";
import { HealthModule } from "./health/health.module";
import { PlaidModule } from "./plaid/plaid.module";
import { SettingsModule } from "./settings/settings.module";
import { TransactionsModule } from "./transactions/transactions.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [".env", join(__dirname, "../../../.env"), join(__dirname, "../../.env")],
		}),
		DbModule,
		AuthModule,
		BillingModule,
		HealthModule,
		FxModule,
		AccountsModule,
		PlaidModule,
		CategoriesModule,
		TransactionsModule,
		CashFlowModule,
		BudgetsModule,
		GoalsModule,
		SettingsModule,
		DashboardModule,
	],
})
export class AppModule {}
