import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { authClient } from "../auth/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);

	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);
		const result = await authClient.requestPasswordReset({ email });
		if (result.error) {
			setError(result.error.message ?? "Could not request a reset");
			return;
		}
		setSent(true);
	}

	return (
		<div className="flex min-h-svh items-center justify-center bg-background p-6">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Money Airport</CardTitle>
					<h1 className="text-xl font-semibold">Forgot password</h1>
				</CardHeader>
				<CardContent>
					{sent ? (
						<p>If that email is in Money Airport, we accepted the request.</p>
					) : (
						<form className="flex flex-col gap-3" onSubmit={onSubmit}>
							<label className="flex flex-col gap-1 text-sm" htmlFor="email">
								Email
								<input
									id="email"
									className="rounded-md border border-border bg-card px-3 py-2"
									type="email"
									autoComplete="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									required
								/>
							</label>
							{error ? (
								<p className="text-sm text-negative" role="alert">
									{error}
								</p>
							) : null}
							<button
								className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
								type="submit"
							>
								Send reset link
							</button>
						</form>
					)}
					<p className="mt-4 text-sm text-muted-foreground">
						<Link className="text-foreground underline" to="/login">
							Log in
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
