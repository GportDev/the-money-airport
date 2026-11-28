import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import { json, raw } from "express";
import { AppModule } from "./app.module";
import type { Auth } from "./auth/auth";
import { AUTH, DEFAULT_CLIENT_URL } from "./auth/auth.constants";

const DEFAULT_PORT = 3000;
const STATEMENT_IMPORT_ROUTE = "/api/accounts/:id/statement-import";
const STATEMENT_IMPORT_BODY_LIMIT = "3mb";

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { bodyParser: false });
	const config = app.get(ConfigService);
	const corsOptions = {
		origin: config.get<string>("CLIENT_URL") ?? DEFAULT_CLIENT_URL,
		credentials: true,
	};
	const auth = app.get<Auth>(AUTH);
	const http = app.getHttpAdapter().getInstance();
	http.use(cors(corsOptions));
	http.all("/api/auth/*splat", toNodeHandler(auth));
	http.use("/api/billing/webhook", raw({ type: "application/json" }));
	// Plaid signs a SHA-256 of the exact body bytes, so keep them raw.
	http.use("/api/plaid/webhook", raw({ type: () => true, limit: "1mb" }));
	// A Statement file can be up to 1 MB, over the default JSON limit.
	http.use(STATEMENT_IMPORT_ROUTE, json({ limit: STATEMENT_IMPORT_BODY_LIMIT }));
	app.use(json());
	app.setGlobalPrefix("api");
	app.enableCors(corsOptions);
	await app.listen(config.get<string>("PORT") ?? DEFAULT_PORT);
}

void bootstrap();
