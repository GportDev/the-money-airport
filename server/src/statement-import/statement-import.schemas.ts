import { z } from "zod";

const isoDate = z.iso.date();
const cents = z.number().int().min(0).max(100_000_000_000);
const MAX_FILE_CHARS = 2 * 1024 * 1024;
const MAX_UNMATCHED = 5_000;

export const previewBody = z.object({ file: z.string().max(MAX_FILE_CHARS) }).strict();

export const commitBody = z
	.object({
		file: z.string().max(MAX_FILE_CHARS),
		statement: z
			.object({
				periodStart: isoDate,
				periodEnd: isoDate,
				statementBalance: cents,
				minimumPayment: cents.nullable(),
				dueDate: isoDate.nullable(),
			})
			.strict(),
		unmatchedFitIds: z.array(z.string().min(1).max(255)).max(MAX_UNMATCHED),
	})
	.strict();
