import { APIError } from "better-auth/api";

export const SIGNUP_CLOSED_MESSAGE = "Sign-ups are closed for this app.";

export function parseEmailList(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((email) => email.trim().toLowerCase())
		.filter(Boolean);
}

/** An empty allowlist leaves sign-up open, which local dev and e2e rely on. */
export function assertSignupAllowed(email: string, allowedEmails: string[]) {
	if (allowedEmails.length === 0) return;
	if (allowedEmails.includes(email.trim().toLowerCase())) return;
	throw new APIError("FORBIDDEN", { code: "SIGNUP_CLOSED", message: SIGNUP_CLOSED_MESSAGE });
}
