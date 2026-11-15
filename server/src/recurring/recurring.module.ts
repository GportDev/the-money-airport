import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { FxModule } from "../fx/fx.module";
import { RecurringController } from "./recurring.controller";
import { RecurringService } from "./recurring.service";

@Module({
	imports: [AccountsModule, FxModule],
	controllers: [RecurringController],
	providers: [RecurringService],
	exports: [RecurringService],
})
export class RecurringModule {}
