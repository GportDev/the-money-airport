import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { CashFlowModule } from "../cash-flow/cash-flow.module";
import { FxModule } from "../fx/fx.module";
import { SettingsModule } from "../settings/settings.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
	imports: [AccountsModule, CashFlowModule, FxModule, SettingsModule, TransactionsModule],
	controllers: [DashboardController],
	providers: [DashboardService],
})
export class DashboardModule {}
