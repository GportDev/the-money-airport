import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { BillingModule } from "../billing/billing.module";
import { BillingService } from "../billing/billing.service";
import { CategoriesModule } from "../categories/categories.module";
import { CategoriesService } from "../categories/categories.service";
import { DATABASE } from "../db/db.module";
import { createAuth } from "./auth";
import { AUTH, DEFAULT_CLIENT_URL } from "./auth.constants";
import { AuthGuard } from "./auth.guard";
import { parseEmailList } from "./signup-allowlist";

@Global()
@Module({
	imports: [BillingModule, CategoriesModule],
	providers: [
		{
			provide: AUTH,
			inject: [DATABASE, ConfigService, BillingService, CategoriesService],
			useFactory: (
				db: PostgresJsDatabase,
				config: ConfigService,
				billing: BillingService,
				categories: CategoriesService,
			) => {
				const secret = config.get<string>("BETTER_AUTH_SECRET");
				const baseURL = config.get<string>("BETTER_AUTH_URL");
				if (!secret || !baseURL) {
					throw new Error("BETTER_AUTH_SECRET and BETTER_AUTH_URL are required");
				}
				return createAuth(db, {
					secret,
					baseURL,
					clientUrl: config.get<string>("CLIENT_URL") ?? DEFAULT_CLIENT_URL,
					allowedEmails: parseEmailList(config.get<string>("ALLOWED_EMAILS")),
					isEmailSignUpDisabled: config.get<string>("DISABLE_EMAIL_SIGNUP") === "true",
					googleClientId: config.get<string>("GOOGLE_CLIENT_ID"),
					googleClientSecret: config.get<string>("GOOGLE_CLIENT_SECRET"),
					onUserCreated: async (user) => {
						void billing.ensure(user.id, user.email, user.name);
						await categories.ensureDefaults(user.id);
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
