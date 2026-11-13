import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
} from "@nestjs/common";
import type { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { CardStatementsService } from "./card-statements.service";
import {
	amortizationQuery,
	loanTermsBody,
	statementBody,
	statementQuery,
} from "./liabilities.schemas";
import { LoanTermsService } from "./loan-terms.service";

type User = { id: string };

function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
	const parsed = schema.safeParse(input);
	if (!parsed.success) throw new BadRequestException(parsed.error.message);
	return parsed.data;
}

/** Statements, Loan terms, and the Amortization schedule hang off a BankAccount. */
@Controller("accounts")
export class LiabilitiesController {
	constructor(
		private readonly statements: CardStatementsService,
		private readonly loans: LoanTermsService,
	) {}

	@Get(":id/statements")
	async period(
		@CurrentUser() user: User,
		@Param("id", ParseUUIDPipe) id: string,
		@Query() query: unknown,
	) {
		const { periodEnd } = parse(statementQuery, query);
		return { data: await this.statements.period(user.id, id, periodEnd) };
	}

	@Post(":id/statements")
	async createStatement(
		@CurrentUser() user: User,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		return { data: await this.statements.create(user.id, id, parse(statementBody, body)) };
	}

	@Put(":id/loan-terms")
	async loanTerms(
		@CurrentUser() user: User,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		return { data: await this.loans.upsert(user.id, id, parse(loanTermsBody, body)) };
	}

	@Get(":id/amortization")
	async amortization(
		@CurrentUser() user: User,
		@Param("id", ParseUUIDPipe) id: string,
		@Query() query: unknown,
	) {
		const { extra } = parse(amortizationQuery, query);
		return { data: await this.loans.amortization(user.id, id, extra) };
	}
}
