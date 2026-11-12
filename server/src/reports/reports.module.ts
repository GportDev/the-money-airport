import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { CategoriesModule } from "../categories/categories.module";
import { FxModule } from "../fx/fx.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
	imports: [AccountsModule, CategoriesModule, FxModule],
	controllers: [ReportsController],
	providers: [ReportsService],
})
export class ReportsModule {}
