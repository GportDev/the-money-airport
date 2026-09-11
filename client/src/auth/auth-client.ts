import { createAuthClient } from "better-auth/react";
import { apiUrl } from "../api/client";

export const authClient = createAuthClient({
	baseURL: apiUrl.replace(/\/api\/?$/, ""),
});
