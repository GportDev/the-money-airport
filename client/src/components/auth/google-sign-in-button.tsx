import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/auth/auth-client";
import { Button } from "@/components/ui/button";

type Props = { next: string };

function absoluteUrl(path: string) {
	return new URL(path, window.location.origin).href;
}

export function GoogleSignInButton({ next }: Props) {
	const [isRedirecting, setIsRedirecting] = useState(false);

	async function startGoogleSignIn() {
		setIsRedirecting(true);
		// Absolute URLs: better-auth resolves relative ones against the API origin, not the app.
		const result = await authClient.signIn.social({
			provider: "google",
			callbackURL: absoluteUrl(next),
			errorCallbackURL: absoluteUrl("/login"),
		});
		if (result.error) {
			setIsRedirecting(false);
			toast.error(result.error.message ?? "Could not start Google sign-in");
		}
	}

	return (
		<Button
			variant="outline"
			className="mt-3 w-full"
			type="button"
			disabled={isRedirecting}
			onClick={() => {
				void startGoogleSignIn();
			}}
		>
			{isRedirecting ? "Redirecting to Google…" : "Continue with Google"}
		</Button>
	);
}
