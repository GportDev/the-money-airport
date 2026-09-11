import { type FormEvent, useState } from "react";
import { Link, useLocation } from "react-router";
import { authClient } from "../auth/auth-client";
import { safeNextPath } from "../auth/safe-next-path";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function LoginPage() {
	const location = useLocation();
	const next = safeNextPath(new URLSearchParams(location.search).get("next"));
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);
		const result = await authClient.signIn.email({ email, password });
		if (result.error) {
			setError(result.error.message ?? "Could not log in");
			return;
		}
		window.location.assign(next);
	}

	return (
		<div className="flex min-h-svh items-center justify-center bg-background p-6">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Money Airport</CardTitle>
					<h1 className="text-xl font-semibold">Log in</h1>
				</CardHeader>
				<CardContent>
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
						<label className="flex flex-col gap-1 text-sm" htmlFor="password">
							Password
							<input
								id="password"
								className="rounded-md border border-border bg-card px-3 py-2"
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
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
							Log in
						</button>
					</form>
					<button
						className="mt-3 w-full rounded-md border border-border px-3 py-2 text-sm"
						type="button"
						onClick={() => {
							void authClient.signIn.social({ provider: "google" });
						}}
					>
						Continue with Google
					</button>
					<p className="mt-4 text-sm text-muted-foreground">
						<Link className="text-foreground underline" to="/signup">
							Sign up
						</Link>
						{" · "}
						<Link className="text-foreground underline" to="/forgot-password">
							Forgot password
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
