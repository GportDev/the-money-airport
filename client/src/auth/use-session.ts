import { authClient } from "@/auth/auth-client";

export const useSession = authClient.useSession;

let settled = false;

/**
 * Session state for route guards. `loading` is true only until the first
 * session check finishes. better-auth flips `isPending` back to true on every
 * refetch while signed out (tab focus, visibility change), and a guard that
 * blanked on that would unmount the log in and sign up forms mid-typing.
 */
export function useSessionGate() {
	const { data, isPending } = useSession();
	if (!isPending) settled = true;
	return { data, loading: isPending && !settled };
}
