import { z } from "zod";

const isoDate = z.iso.date();
const cents = z.number().int().min(0).max(100_000_000_000);

export const statementBody = z
	.object({
		periodStart: isoDate,
		periodEnd: isoDate,
		statementBalance: cents,
		minimumPayment: cents.nullable().optional(),
		dueDate: isoDate.nullable().optional(),
	})
	.strict();

export const statementQuery = z.object({
	periodEnd: z.union([isoDate, z.literal("open")]).optional(),
});

export const loanTermsBody = z
	.object({
		principal: cents.nullable().optional(),
		termMonths: z.number().int().min(1).max(600).nullable().optional(),
		firstPaymentDate: isoDate.nullable().optional(),
		paymentDay: z.number().int().min(1).max(31).nullable().optional(),
		scheduledPayment: cents.nullable().optional(),
		extraPayment: cents.optional(),
	})
	.strict();

export const amortizationQuery = z.object({ extra: z.coerce.number().int().min(0).optional() });
