import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const DATABASE = "DATABASE";

@Global()
@Module({
	providers: [
		{
			provide: DATABASE,
			inject: [ConfigService],
			useFactory: (config: ConfigService) => {
				const url = config.get<string>("DATABASE_URL");
				if (!url) {
					throw new Error("DATABASE_URL is required");
				}
				const client = postgres(url);
				return drizzle({ client });
			},
		},
	],
	exports: [DATABASE],
})
export class DbModule {}
