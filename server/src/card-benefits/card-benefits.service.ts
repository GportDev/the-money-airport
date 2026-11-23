import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { cardBenefits } from "../db/schema/card-benefits";
import { ownedAccountOfGroup } from "../liabilities/owned-account";
import { benefitsDto } from "./benefits-dto";
import type { CardBenefitsBody } from "./card-benefits.schemas";
import type { CardBenefitsDto } from "./card-benefits.types";
import { findPreset } from "./presets";

@Injectable()
export class CardBenefitsService {
	constructor(@Inject(DATABASE) private readonly db: PostgresJsDatabase) {}

	/** Replaces the card's Card benefits with a Card product preset or the given ones. */
	async upsert(
		userId: string,
		accountId: string,
		body: CardBenefitsBody,
	): Promise<CardBenefitsDto> {
		await ownedAccountOfGroup(this.db, userId, accountId, "credit");
		const values = { ...storedBenefits(body), updatedAt: new Date() };
		const [row] = await this.db
			.insert(cardBenefits)
			.values({ ...values, userId, bankAccountId: accountId })
			.onConflictDoUpdate({
				target: cardBenefits.bankAccountId,
				set: values,
				setWhere: eq(cardBenefits.userId, userId),
			})
			.returning();
		if (!row) throw new NotFoundException();
		return benefitsDto(row);
	}

	async remove(userId: string, accountId: string) {
		await ownedAccountOfGroup(this.db, userId, accountId, "credit");
		await this.db
			.delete(cardBenefits)
			.where(and(eq(cardBenefits.userId, userId), eq(cardBenefits.bankAccountId, accountId)));
		return null;
	}
}

function storedBenefits(body: CardBenefitsBody) {
	if ("benefits" in body) return { ...body.benefits, presetKey: null };
	const preset = findPreset(body.presetKey);
	if (!preset) throw new BadRequestException("Unknown Card product");
	return { ...preset.benefits, presetKey: preset.key };
}
