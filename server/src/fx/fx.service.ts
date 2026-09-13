import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { fxRate } from "../db/schema/fx-rate";

const CRYPTO = new Set(["BTC", "ETH", "USDT", "USDC", "XBT", "DOGE", "SOL", "XXX", "XTS"]);

@Injectable()
export class FxService {
	constructor(@Inject(DATABASE) private readonly db: PostgresJsDatabase) {}

	isFiat(code: string) {
		return /^[A-Z]{3}$/.test(code) && !CRYPTO.has(code);
	}

	async convert(cents: number, from: string, to: string, onDate?: string) {
		if (!this.isFiat(from) || !this.isFiat(to)) {
			return null;
		}
		if (from === to) {
			return cents;
		}
		const rate = await this.rate(from, to, onDate);
		if (rate === null) {
			return null;
		}
		return Math.round(cents * rate);
	}

	private async rate(from: string, to: string, onDate?: string) {
		const cached = await this.cachedRate(from, to, onDate);
		if (cached !== null) {
			return cached;
		}
		return this.fetchFrankfurter(from, to, onDate);
	}

	private async cachedRate(from: string, to: string, onDate?: string) {
		const filters = [eq(fxRate.fromCurrency, from), eq(fxRate.toCurrency, to)];
		if (onDate) {
			filters.push(lte(fxRate.date, onDate));
		}
		const [row] = await this.db
			.select()
			.from(fxRate)
			.where(and(...filters))
			.orderBy(desc(fxRate.date))
			.limit(1);
		if (!row) {
			return null;
		}
		const parsed = Number(row.rate);
		return Number.isFinite(parsed) ? parsed : null;
	}

	private async fetchFrankfurter(from: string, to: string, onDate?: string) {
		const day = onDate ?? new Date().toISOString().slice(0, 10);
		const path = onDate ? onDate : "latest";
		try {
			const response = await fetch(
				`https://api.frankfurter.app/${path}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
			);
			if (!response.ok) {
				return null;
			}
			const body = (await response.json()) as { date?: string; rates?: Record<string, number> };
			const quote = body.rates?.[to];
			if (typeof quote !== "number" || !Number.isFinite(quote)) {
				return null;
			}
			const quotedOn = body.date ?? day;
			await this.db
				.insert(fxRate)
				.values({
					date: quotedOn,
					fromCurrency: from,
					toCurrency: to,
					rate: String(quote),
				})
				.onConflictDoNothing();
			return quote;
		} catch {
			return null;
		}
	}
}
