import { join } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { DbModule } from "./db/db.module";
import { HealthModule } from "./health/health.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [".env", join(__dirname, "../../../.env"), join(__dirname, "../../.env")],
		}),
		DbModule,
		AuthModule,
		BillingModule,
		HealthModule,
	],
})
export class AppModule {}
