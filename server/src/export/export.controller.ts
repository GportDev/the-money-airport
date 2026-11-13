import { BadRequestException, Controller, Get, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { ExportService } from "./export.service";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const format = z.literal("csv").default("csv");

const transactionsQuery = z.object({
	dateFrom: isoDate.optional(),
	dateTo: isoDate.optional(),
	format,
});

const accountsQuery = z.object({ format });

function today() {
	return new Date().toISOString().slice(0, 10);
}

// CONVENTION-DEVIATION: file downloads return CSV text with download headers, not `{ data }`.
function sendCsv(res: Response, name: string, csv: string) {
	res.setHeader("Content-Type", "text/csv; charset=utf-8");
	res.setHeader("Content-Disposition", `attachment; filename="${name}-${today()}.csv"`);
	res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
	return csv;
}

@Controller("export")
export class ExportController {
	constructor(private readonly exports: ExportService) {}

	@Get("transactions")
	async transactions(
		@CurrentUser() user: { id: string },
		@Query() query: unknown,
		@Res({ passthrough: true }) res: Response,
	) {
		const parsed = transactionsQuery.safeParse(query);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		const { dateFrom, dateTo } = parsed.data;
		return sendCsv(
			res,
			"transactions",
			await this.exports.transactionsCsv(user.id, { dateFrom, dateTo }),
		);
	}

	@Get("accounts")
	async accounts(
		@CurrentUser() user: { id: string },
		@Query() query: unknown,
		@Res({ passthrough: true }) res: Response,
	) {
		const parsed = accountsQuery.safeParse(query);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		return sendCsv(res, "accounts", await this.exports.accountsCsv(user.id));
	}
}
