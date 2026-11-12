import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { daysBetween, isCalendarDate } from "./report-dates";
import { ReportsService } from "./reports.service";

const MAX_RANGE_DAYS = 5 * 366;

const reportDate = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.refine(isCalendarDate, "Not a calendar date")
	.refine((value) => value >= "1970-01-01" && value <= "2100-12-31", "Year out of range");

const rangeQuery = z
	.object({ dateFrom: reportDate, dateTo: reportDate })
	.refine((range) => range.dateFrom <= range.dateTo, "dateFrom is after dateTo")
	.refine(
		(range) => daysBetween(range.dateFrom, range.dateTo) <= MAX_RANGE_DAYS,
		"Range is longer than 5 years",
	);

const topQuery = z.object({ limit: z.coerce.number().int().min(1).max(20).default(5) });
const balanceQuery = z.object({ accountId: z.string().uuid().optional() });

function parse<T>(schema: z.ZodType<T>, query: unknown) {
	const parsed = schema.safeParse(query);
	if (!parsed.success) {
		throw new BadRequestException(parsed.error.message);
	}
	return parsed.data;
}

function rangeOf(query: unknown) {
	const { dateFrom, dateTo } = parse(rangeQuery, query);
	return { dateFrom, dateTo };
}

@Controller("reports")
export class ReportsController {
	constructor(private readonly reports: ReportsService) {}

	@Get("spending-by-category")
	async spendingByCategory(@CurrentUser() user: { id: string }, @Query() query: unknown) {
		return { data: await this.reports.spendingByCategory(user.id, rangeOf(query)) };
	}

	@Get("top-categories")
	async topCategories(@CurrentUser() user: { id: string }, @Query() query: unknown) {
		const range = rangeOf(query);
		const { limit } = parse(topQuery, query);
		return { data: await this.reports.spendingByCategory(user.id, range, limit) };
	}

	@Get("income-vs-expenses")
	async incomeVsExpenses(@CurrentUser() user: { id: string }, @Query() query: unknown) {
		return { data: await this.reports.incomeVsExpenses(user.id, rangeOf(query)) };
	}

	@Get("cash-flow-trend")
	async cashFlowTrend(@CurrentUser() user: { id: string }, @Query() query: unknown) {
		return { data: await this.reports.cashFlowTrend(user.id, rangeOf(query)) };
	}

	@Get("balance-history")
	async balanceHistory(@CurrentUser() user: { id: string }, @Query() query: unknown) {
		const range = rangeOf(query);
		const { accountId } = parse(balanceQuery, query);
		return { data: await this.reports.balanceHistory(user.id, range, accountId) };
	}
}
