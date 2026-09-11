import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { BillingModule } from "../billing/billing.module";
import { BillingService } from "../billing/billing.service";
import { DATABASE } from "../db/db.module";
import { createAuth } from "./auth";
import { AUTH } from "./auth.constants";
import { AuthGuard } from "./auth.guard";

@Global()
@Module({
	imports: [BillingModule],
	providers: [
		{
			provide: AUTH,
			inject: [DATABASE, ConfigService, BillingService],
			useFactory: (db: PostgresJsDatabase, config: ConfigService, billing: BillingService) => {
				const secret = config.get<string>("BETTER_AUTH_SECRET");
				const baseURL = config.get<string>("BETTER_AUTH_URL");
				if (!secret || !baseURL) {
					throw new Error("BETTER_AUTH_SECRET and BETTER_AUTH_URL are required");
				}
				return createAuth(db, {
					secret,
					baseURL,
					googleClientId: config.get<string>("GOOGLE_CLIENT_ID"),
					googleClientSecret: config.get<string>("GOOGLE_CLIENT_SECRET"),
					onUserCreated: async (user) => {
						void billing.ensure(user.id, user.email, user.name);
					},
				});
			},
		},
		{
			provide: APP_GUARD,
			useClass: AuthGuard,
		},
	],
	exports: [AUTH],
})
export class AuthModule {}
