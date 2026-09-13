import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountsModule } from "../accounts/accounts.module";
import { FakePlaid } from "./fake-plaid";
import { PlaidController } from "./plaid.controller";
import { PLAID_PORT } from "./plaid.port";
import { PlaidService } from "./plaid.service";
import { RealPlaid, UnconfiguredPlaid } from "./real-plaid";

@Module({
	imports: [AccountsModule],
	controllers: [PlaidController],
	providers: [
		{
			provide: PLAID_PORT,
			inject: [ConfigService],
			useFactory: (config: ConfigService) => {
				const clientId = config.get<string>("PLAID_CLIENT_ID");
				const secret = config.get<string>("PLAID_SECRET");
				if (clientId && secret) {
					if (!config.get<string>("ENCRYPTION_KEY")) {
						throw new Error("ENCRYPTION_KEY is required when Plaid is configured");
					}
					return new RealPlaid(clientId, secret, config.get<string>("PLAID_ENV") ?? "sandbox");
				}
				if (config.get<string>("PLAID_FAKE") === "1") {
					return new FakePlaid();
				}
				return new UnconfiguredPlaid();
			},
		},
		PlaidService,
	],
	exports: [PlaidService, PLAID_PORT],
})
export class PlaidModule {}
