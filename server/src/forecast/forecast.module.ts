import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { CategoriesModule } from "../categories/categories.module";
import { FxModule } from "../fx/fx.module";
import { SettingsModule } from "../settings/settings.module";
import { DebtPlanService } from "./debt-plan.service";
import { ForecastController } from "./forecast.controller";
import { ForecastRowsService } from "./forecast-rows.service";
import { ForecastSectionsService } from "./forecast-sections.service";
import { ForecastViewsService } from "./forecast-views.service";
import { ForecastYearService } from "./forecast-year.service";
import { OneOffsService } from "./one-offs.service";
import { ProjectionService } from "./projection.service";

@Module({
	imports: [AccountsModule, CategoriesModule, FxModule, SettingsModule],
	controllers: [ForecastController],
	providers: [
		ForecastSectionsService,
		ForecastRowsService,
		OneOffsService,
		ForecastYearService,
		ProjectionService,
		ForecastViewsService,
		DebtPlanService,
	],
	exports: [OneOffsService, ProjectionService, DebtPlanService],
})
export class ForecastModule {}
