import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const billing = pgTable("billing", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	stripeCustomerId: text("stripe_customer_id").unique(),
	stripeSubscriptionId: text("stripe_subscription_id").unique(),
	stripePriceId: text("stripe_price_id"),
	status: text("status"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
