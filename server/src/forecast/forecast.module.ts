import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { FxModule } from "../fx/fx.module";
import { SettingsModule } from "../settings/settings.module";
import { ForecastController } from "./forecast.controller";
import { ForecastRowsService } from "./forecast-rows.service";
import { ForecastSectionsService } from "./forecast-sections.service";
import { ForecastViewsService } from "./forecast-views.service";
import { ForecastYearService } from "./forecast-year.service";
import { OneOffsService } from "./one-offs.service";
import { ProjectionService } from "./projection.service";

@Module({
	imports: [CategoriesModule, FxModule, SettingsModule],
	controllers: [ForecastController],
	providers: [
		ForecastSectionsService,
		ForecastRowsService,
		OneOffsService,
		ForecastYearService,
		ProjectionService,
		ForecastViewsService,
	],
	exports: [OneOffsService, ProjectionService],
})
export class ForecastModule {}
