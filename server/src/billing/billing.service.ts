import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import Stripe from "stripe";
import { DATABASE } from "../db/db.module";
import { billing } from "../db/schema/billing";

@Injectable()
export class BillingService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly config: ConfigService,
	) {}

	async ensure(userId: string, email?: string | null, name?: string | null) {
		let row = (await this.rowFor(userId)) ?? (await this.insertRow(userId));
		if (!row) {
			return null;
		}
		if (row.stripeCustomerId && row.stripeSubscriptionId) {
			return row;
		}

		const stripe = this.stripe();
		const priceId = this.config.get<string>("STRIPE_PRICE_FREE");
		if (!stripe || !priceId) {
			return row;
		}

		try {
			if (!row.stripeCustomerId) {
				const customer = await stripe.customers.create({
					email: email ?? undefined,
					name: name ?? undefined,
					metadata: { userId },
				});
				const [saved] = await this.db
					.update(billing)
					.set({
						stripeCustomerId: customer.id,
						updatedAt: new Date(),
					})
					.where(eq(billing.userId, userId))
					.returning();
				row = saved ?? row;
			}
			if (!row.stripeCustomerId || row.stripeSubscriptionId) {
				return row;
			}
			const subscription = await stripe.subscriptions.create({
				customer: row.stripeCustomerId,
				items: [{ price: priceId }],
			});
			const [updated] = await this.db
				.update(billing)
				.set({
					stripeSubscriptionId: subscription.id,
					stripePriceId: priceId,
					status: subscription.status,
					updatedAt: new Date(),
				})
				.where(eq(billing.userId, userId))
				.returning();
			return updated ?? row;
		} catch {
			return row;
		}
	}

	async handleWebhook(rawBody: Buffer, signature: string | undefined) {
		const secret = this.config.get<string>("STRIPE_WEBHOOK_SECRET");
		const stripe = this.stripe();
		if (!secret || !signature || !stripe) {
			throw new BadRequestException("Invalid Stripe signature");
		}

		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(rawBody, signature, secret);
		} catch {
			throw new BadRequestException("Invalid Stripe signature");
		}

		const object = event.data.object as {
			id?: string;
			customer?: string;
			status?: string;
		};
		if (typeof object.customer !== "string") {
			return;
		}

		await this.db
			.update(billing)
			.set({
				stripeCustomerId: object.customer,
				stripeSubscriptionId: object.id,
				status: object.status ?? null,
				updatedAt: new Date(),
			})
			.where(eq(billing.stripeCustomerId, object.customer));
	}

	private stripe() {
		const key = this.config.get<string>("STRIPE_SECRET_KEY");
		if (!key) {
			return null;
		}
		return new Stripe(key);
	}

	private async rowFor(userId: string) {
		const [row] = await this.db.select().from(billing).where(eq(billing.userId, userId)).limit(1);
		return row ?? null;
	}

	private async insertRow(userId: string) {
		const [row] = await this.db
			.insert(billing)
			.values({ userId })
			.onConflictDoNothing({ target: billing.userId })
			.returning();
		return row ?? (await this.rowFor(userId));
	}
}
