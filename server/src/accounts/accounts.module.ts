import { Module } from "@nestjs/common";
import { FxModule } from "../fx/fx.module";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";
import { BalanceBackfillService } from "./balance-backfill.service";

@Module({
	imports: [FxModule],
	controllers: [AccountsController],
	providers: [AccountsService, BalanceBackfillService],
	exports: [AccountsService, BalanceBackfillService],
})
export class AccountsModule {}
