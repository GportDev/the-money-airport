import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { CategoriesModule } from "../categories/categories.module";
import { FxModule } from "../fx/fx.module";
import { SettingsModule } from "../settings/settings.module";
import { BudgetsController } from "./budgets.controller";
import { BudgetsService } from "./budgets.service";

@Module({
	imports: [AccountsModule, CategoriesModule, FxModule, SettingsModule],
	controllers: [BudgetsController],
	providers: [BudgetsService],
	exports: [BudgetsService],
})
export class BudgetsModule {}
