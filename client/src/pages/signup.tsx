import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { authClient } from "@/auth/auth-client";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function SignupPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);
		const result = await authClient.signUp.email({ name, email, password });
		if (result.error) {
			setError(result.error.message ?? "Could not sign up");
			return;
		}
		window.location.assign("/");
	}

	return (
		<div className="flex min-h-svh items-center justify-center bg-background p-6">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<BrandLockup />
					<h1 className="text-xl font-semibold">Sign up</h1>
				</CardHeader>
				<CardContent>
					<form className="flex flex-col gap-3" onSubmit={onSubmit}>
						<label className="flex flex-col gap-1 text-sm" htmlFor="name">
							Name
							<Input
								id="name"
								autoComplete="name"
								value={name}
								onChange={(event) => setName(event.target.value)}
								required
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm" htmlFor="email">
							Email
							<Input
								id="email"
								type="email"
								autoComplete="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								required
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm" htmlFor="password">
							Password
							<Input
								id="password"
								type="password"
								autoComplete="new-password"
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
						<Button type="submit">Sign up</Button>
					</form>
					<GoogleSignInButton next="/" />
					<p className="mt-4 text-sm text-muted-foreground">
						<Link className="text-foreground underline hover:text-primary" to="/login">
							Log in
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
