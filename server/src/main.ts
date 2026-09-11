import { NestFactory } from "@nestjs/core";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import { json, raw } from "express";
import { AppModule } from "./app.module";
import type { Auth } from "./auth/auth";
import { AUTH } from "./auth/auth.constants";

const corsOptions = {
	origin: "http://localhost:5173",
	credentials: true,
};

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { bodyParser: false });
	const auth = app.get<Auth>(AUTH);
	const http = app.getHttpAdapter().getInstance();
	http.use(cors(corsOptions));
	http.all("/api/auth/*splat", toNodeHandler(auth));
	http.use("/api/billing/webhook", raw({ type: "application/json" }));
	app.use(json());
	app.setGlobalPrefix("api");
	app.enableCors(corsOptions);
	await app.listen(3000);
}

void bootstrap();
