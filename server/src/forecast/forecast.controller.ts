import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Put,
	Query,
} from "@nestjs/common";
import type { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { DebtPlanService } from "./debt-plan.service";
import {
	amountsBody,
	debtOrderBody,
	debtQuery,
	fromCategoriesBody,
	monthQuery,
	oneOffBody,
	oneOffPatch,
	oneOffQuery,
	rowBody,
	rowPatch,
	sectionBody,
	sectionPatch,
	yearQuery,
} from "./forecast.schemas";
import { ForecastRowsService } from "./forecast-rows.service";
import { ForecastSectionsService } from "./forecast-sections.service";
import { ForecastViewsService } from "./forecast-views.service";
import { ForecastYearService } from "./forecast-year.service";
import { OneOffsService } from "./one-offs.service";

type User = { id: string };

function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		throw new BadRequestException(parsed.error.message);
	}
	return parsed.data;
}

@Controller("forecast")
export class ForecastController {
	constructor(
		private readonly sections: ForecastSectionsService,
		private readonly rows: ForecastRowsService,
		private readonly oneOffs: OneOffsService,
		private readonly year: ForecastYearService,
		private readonly views: ForecastViewsService,
		private readonly debt: DebtPlanService,
	) {}

	@Get("sections")
	async listSections(@CurrentUser() user: User, @Query() query: unknown) {
		const { year } = parse(yearQuery, query);
		return { data: await this.year.sectionsFor(user.id, year) };
	}

	@Post("sections")
	async createSection(@CurrentUser() user: User, @Body() body: unknown) {
		return { data: await this.sections.create(user.id, parse(sectionBody, body)) };
	}

	@Patch("sections/:id")
	async updateSection(
		@CurrentUser() user: User,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		return { data: await this.sections.update(user.id, id, parse(sectionPatch, body)) };
	}

	@Delete("sections/:id")
	removeSection(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
		return this.sections.remove(user.id, id);
	}

	@Post("rows")
	async createRow(@CurrentUser() user: User, @Body() body: unknown) {
		return { data: await this.rows.create(user.id, parse(rowBody, body)) };
	}

	@Post("rows/from-categories")
	async fromCategories(@CurrentUser() user: User, @Body() body: unknown) {
		parse(fromCategoriesBody, body);
		return { data: await this.rows.fromCategories(user.id) };
	}

	@Patch("rows/:id")
	async updateRow(
		@CurrentUser() user: User,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		return { data: await this.rows.update(user.id, id, parse(rowPatch, body)) };
	}

	@Put("rows/:id/amounts")
	async setAmounts(
		@CurrentUser() user: User,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		const input = parse(amountsBody, body);
		const amounts = Object.fromEntries(
			Object.entries(input.amounts).map(([month, amount]) => [Number(month), amount]),
		);
		return { data: await this.rows.setAmounts(user.id, id, { ...input, amounts }) };
	}

	@Delete("rows/:id")
	removeRow(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
		return this.rows.remove(user.id, id);
	}

	@Get("one-offs")
	async listOneOffs(@CurrentUser() user: User, @Query() query: unknown) {
		const { year, status } = parse(oneOffQuery, query);
		return { data: await this.oneOffs.list(user.id, year, status) };
	}

	@Post("one-offs")
	async createOneOff(@CurrentUser() user: User, @Body() body: unknown) {
		return { data: await this.oneOffs.create(user.id, parse(oneOffBody, body)) };
	}

	@Patch("one-offs/:id")
	async updateOneOff(
		@CurrentUser() user: User,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		return { data: await this.oneOffs.update(user.id, id, parse(oneOffPatch, body)) };
	}

	@Delete("one-offs/:id")
	removeOneOff(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
		return this.oneOffs.remove(user.id, id);
	}

	@Get("summary")
	async summary(@CurrentUser() user: User, @Query() query: unknown) {
		const { year } = parse(yearQuery, query);
		return { data: await this.views.summary(user.id, year) };
	}

	@Get("debt")
	async debtPlan(@CurrentUser() user: User, @Query() query: unknown) {
		const { months } = parse(debtQuery, query);
		return { data: await this.debt.plan(user.id, months) };
	}

	@Get("debt/section")
	async debtSection(@CurrentUser() user: User, @Query() query: unknown) {
		const { year } = parse(yearQuery, query);
		return { data: await this.debt.section(user.id, year) };
	}

	@Put("debt/order")
	async debtOrder(@CurrentUser() user: User, @Body() body: unknown) {
		const { bankAccountIds } = parse(debtOrderBody, body);
		return { data: await this.debt.order(user.id, bankAccountIds) };
	}

	@Get("month")
	async month(@CurrentUser() user: User, @Query() query: unknown) {
		const { year, month } = parse(monthQuery, query);
		return { data: await this.views.month(user.id, year, month) };
	}
}
