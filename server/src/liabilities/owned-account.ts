import { BadRequestException, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { bankAccount } from "../db/schema/bank-account";

/** The User's BankAccount in the given display group; 404 for others', 400 for the wrong kind. */
export async function ownedAccountOfGroup(
	db: PostgresJsDatabase,
	userId: string,
	id: string,
	group: "credit" | "loan",
) {
	const [row] = await db
		.select()
		.from(bankAccount)
		.where(and(eq(bankAccount.id, id), eq(bankAccount.userId, userId)))
		.limit(1);
	if (!row) throw new NotFoundException();
	if (row.displayGroup !== group) {
		throw new BadRequestException(group === "credit" ? "Credit cards only" : "Loans only");
	}
	return row;
}
