import { createAuthClient } from "better-auth/react";
import { apiUrl } from "@/api/client";

export const UNREACHABLE_MESSAGE = "Could not reach the server. Try again in a moment.";

/**
 * better-auth returns `{ error }` for HTTP failures but throws when the request
 * never gets a response (API down, offline). Turn that into a 503 so every
 * form shows a message instead of failing silently.
 */
async function fetchOrUnavailable(input: RequestInfo | URL, init?: RequestInit) {
	try {
		return await fetch(input, init);
	} catch (error) {
		if (init?.signal?.aborted) throw error;
		return new Response(JSON.stringify({ message: UNREACHABLE_MESSAGE }), {
			status: 503,
			statusText: "Service Unavailable",
			headers: { "content-type": "application/json" },
		});
	}
}

export const authClient = createAuthClient({
	baseURL: apiUrl.replace(/\/api\/?$/, ""),
	fetchOptions: { customFetchImpl: fetchOrUnavailable },
});
