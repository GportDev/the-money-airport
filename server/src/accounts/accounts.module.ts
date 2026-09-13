import { Module } from "@nestjs/common";
import { FxModule } from "../fx/fx.module";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";

@Module({
	imports: [FxModule],
	controllers: [AccountsController],
	providers: [AccountsService],
	exports: [AccountsService],
})
export class AccountsModule {}
