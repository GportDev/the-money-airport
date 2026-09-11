import { Controller, Get, Inject, Res } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Response } from "express";
import { Public } from "../auth/public.decorator";
import { DATABASE } from "../db/db.module";

@Public()
@Controller("health")
export class HealthController {
	constructor(@Inject(DATABASE) private readonly db: PostgresJsDatabase) {}

	@Get()
	async check(@Res() res: Response) {
		try {
			await this.db.execute(sql`select 1`);
			return res.status(200).json({ data: { ok: true } });
		} catch {
			return res.status(503).json({
				error: {
					code: "DATABASE_UNAVAILABLE",
					message: "PostgreSQL did not answer",
				},
			});
		}
	}
}
