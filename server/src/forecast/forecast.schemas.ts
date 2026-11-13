import { z } from "zod";

const MAX_CENTS = 100_000_000_000;

const isoDate = z.iso.date();
const uuid = z.string().uuid();
const name = z.string().trim().min(1).max(200);
const cents = z.number().int().min(-MAX_CENTS).max(MAX_CENTS);
const sectionType = z.enum(["revenue", "savings", "fixed_expense", "variable_expense"]);

export const yearQuery = z.object({ year: z.coerce.number().int().min(2000).max(2100) });

export const monthQuery = yearQuery.extend({ month: z.coerce.number().int().min(1).max(12) });

export const oneOffQuery = yearQuery.extend({
	status: z.enum(["expected", "done", "cancelled"]).optional(),
});

export const sectionBody = z.object({ name, type: sectionType });

export const sectionPatch = z
	.object({ name: name.optional(), sortOrder: z.number().int().min(0).optional() })
	.strict();

const rowLinks = {
	dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
	categoryId: uuid.nullable().optional(),
	bankAccountId: uuid.nullable().optional(),
	goalId: uuid.nullable().optional(),
};

export const rowBody = z.object({ sectionId: uuid, name, ...rowLinks }).strict();

export const rowPatch = z
	.object({ name: name.optional(), sortOrder: z.number().int().min(0).optional(), ...rowLinks })
	.strict();

export const amountsBody = z.object({
	year: yearQuery.shape.year,
	amounts: z.record(z.string().regex(/^(?:[1-9]|1[0-2])$/), z.number().int().min(0).max(MAX_CENTS)),
	copyToAll: z.boolean().optional(),
});

export const debtQuery = z.object({ months: z.coerce.number().int().min(1).max(120).optional() });

export const debtOrderBody = z.object({ bankAccountIds: z.array(uuid).min(1).max(100) }).strict();

export const fromCategoriesBody = z.object({ year: yearQuery.shape.year });

const oneOffLinks = {
	bankAccountId: uuid.nullable().optional(),
	categoryId: uuid.nullable().optional(),
	goalId: uuid.nullable().optional(),
};

export const oneOffBody = z
	.object({ sectionId: uuid, name, date: isoDate, amount: cents, ...oneOffLinks })
	.strict();

export const oneOffPatch = z
	.object({
		name: name.optional(),
		date: isoDate.optional(),
		amount: cents.optional(),
		status: z.enum(["expected", "done", "cancelled"]).optional(),
		matchedTransactionId: uuid.nullable().optional(),
		...oneOffLinks,
	})
	.strict();
