import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { FxModule } from "../fx/fx.module";
import { InvestmentsController } from "./investments.controller";
import { InvestmentsService } from "./investments.service";

@Module({
	imports: [AccountsModule, FxModule],
	controllers: [InvestmentsController],
	providers: [InvestmentsService],
})
export class InvestmentsModule {}
