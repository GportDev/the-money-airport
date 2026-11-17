import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
	SIGNUP_CLOSED: "Sign-ups are closed for this app.",
};
const GENERIC_OAUTH_ERROR = "Google sign-in failed. Try again.";
const OAUTH_ERROR_TOAST_ID = "oauth-error";

/**
 * better-auth sends failed OAuth callbacks back with `?error=<code>`. Only known codes get their
 * own copy; `error_description` is never shown because anyone can put text in a link.
 */
export function useOAuthErrorToast() {
	const [searchParams, setSearchParams] = useSearchParams();
	const errorCode = searchParams.get("error");

	useEffect(() => {
		if (!errorCode) return;
		toast.error(OAUTH_ERROR_MESSAGES[errorCode] ?? GENERIC_OAUTH_ERROR, {
			id: OAUTH_ERROR_TOAST_ID,
		});
		setSearchParams(
			(params) => {
				params.delete("error");
				params.delete("error_description");
				return params;
			},
			{ replace: true },
		);
	}, [errorCode, setSearchParams]);
}
