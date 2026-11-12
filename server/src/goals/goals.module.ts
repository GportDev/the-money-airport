import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { FxModule } from "../fx/fx.module";
import { FundEntriesService } from "./fund-entries.service";
import { FundInterestService } from "./fund-interest.service";
import { GoalsController } from "./goals.controller";
import { GoalsService } from "./goals.service";

@Module({
	imports: [AccountsModule, FxModule],
	controllers: [GoalsController],
	providers: [GoalsService, FundEntriesService, FundInterestService],
	exports: [FundEntriesService, FundInterestService],
})
export class GoalsModule {}
