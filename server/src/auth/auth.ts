import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema/auth";

type AuthEnv = {
	secret: string;
	baseURL: string;
	googleClientId?: string;
	googleClientSecret?: string;
	onUserCreated?: (user: { id: string; email: string; name: string }) => Promise<void>;
};

export function createAuth(db: PostgresJsDatabase, env: AuthEnv) {
	const google =
		env.googleClientId && env.googleClientSecret
			? {
					google: {
						clientId: env.googleClientId,
						clientSecret: env.googleClientSecret,
					},
				}
			: undefined;

	return betterAuth({
		database: drizzleAdapter(db, { provider: "pg", schema }),
		secret: env.secret,
		baseURL: env.baseURL,
		trustedOrigins: ["http://localhost:5173"],
		emailAndPassword: {
			enabled: true,
			minPasswordLength: 8,
			sendResetPassword: async () => {
				// Mail delivery is out of scope for this phase.
			},
		},
		socialProviders: google,
		databaseHooks: {
			user: {
				create: {
					after: async (user) => {
						try {
							await env.onUserCreated?.(user);
						} catch {
							// Signup must not wait on billing.
						}
					},
				},
			},
		},
		advanced: {
			defaultCookieAttributes: {
				httpOnly: true,
				sameSite: "lax",
				secure: false,
			},
		},
	});
}

export type Auth = ReturnType<typeof createAuth>;
