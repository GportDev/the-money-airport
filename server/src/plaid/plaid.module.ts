import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountsModule } from "../accounts/accounts.module";
import { ForecastModule } from "../forecast/forecast.module";
import { GoalsModule } from "../goals/goals.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { FakePlaid } from "./fake-plaid";
import { PlaidController } from "./plaid.controller";
import { PLAID_PORT } from "./plaid.port";
import { PlaidService } from "./plaid.service";
import { RealPlaid, UnconfiguredPlaid } from "./real-plaid";

@Module({
	imports: [AccountsModule, ForecastModule, GoalsModule, TransactionsModule],
	controllers: [PlaidController],
	providers: [
		{
			provide: PLAID_PORT,
			inject: [ConfigService],
			useFactory: (config: ConfigService) => {
				// PLAID_FAKE wins so tests stay offline even when server/.env holds real keys.
				if (config.get<string>("PLAID_FAKE") === "1") {
					return new FakePlaid();
				}
				const clientId = config.get<string>("PLAID_CLIENT_ID");
				const secret = config.get<string>("PLAID_SECRET");
				if (clientId && secret) {
					if (!config.get<string>("ENCRYPTION_KEY")) {
						throw new Error("ENCRYPTION_KEY is required when Plaid is configured");
					}
					return new RealPlaid(
						clientId,
						secret,
						config.get<string>("PLAID_ENV") ?? "sandbox",
						config.get<string>("PLAID_WEBHOOK_URL") || undefined,
					);
				}
				return new UnconfiguredPlaid();
			},
		},
		PlaidService,
	],
	exports: [PlaidService, PLAID_PORT],
})
export class PlaidModule {}
