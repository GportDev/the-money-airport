import { join } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DbModule } from "./db/db.module";
import { HealthModule } from "./health/health.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [".env", join(__dirname, "../../../.env"), join(__dirname, "../../.env")],
		}),
		DbModule,
		HealthModule,
	],
})
export class AppModule {}
