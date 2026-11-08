import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { FxModule } from "../fx/fx.module";
import { CashFlowController } from "./cash-flow.controller";
import { CashFlowService } from "./cash-flow.service";

@Module({
	imports: [AccountsModule, FxModule],
	controllers: [CashFlowController],
	providers: [CashFlowService],
	exports: [CashFlowService],
})
export class CashFlowModule {}
