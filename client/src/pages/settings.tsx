import { type FormEvent, useState } from "react";
import { authClient } from "../auth/auth-client";
import { PageHeader } from "../components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const SETTINGS_SECTIONS = [
	"Accounts",
	"Categories",
	"Dashboard",
	"Budget",
	"Currency",
	"Data",
] as const;

export function SettingsPage() {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function onChangePassword(event: FormEvent) {
		event.preventDefault();
		setError(null);
		setMessage(null);
		const result = await authClient.changePassword({
			currentPassword,
			newPassword,
		});
		if (result.error) {
			setError(result.error.message ?? "Could not change password");
			return;
		}
		setCurrentPassword("");
		setNewPassword("");
		setMessage("Password changed.");
	}

	return (
		<>
			<PageHeader title="Settings" />
			<div className="flex flex-col gap-4">
				<Card>
					<CardHeader>
						<CardTitle>Profile</CardTitle>
					</CardHeader>
					<CardContent>
						<form className="flex max-w-sm flex-col gap-3" onSubmit={onChangePassword}>
							<label className="flex flex-col gap-1 text-sm" htmlFor="current-password">
								Current password
								<input
									id="current-password"
									className="rounded-md border border-border bg-card px-3 py-2"
									type="password"
									autoComplete="current-password"
									value={currentPassword}
									onChange={(event) => setCurrentPassword(event.target.value)}
									required
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm" htmlFor="new-password">
								New password
								<input
									id="new-password"
									className="rounded-md border border-border bg-card px-3 py-2"
									type="password"
									autoComplete="new-password"
									value={newPassword}
									onChange={(event) => setNewPassword(event.target.value)}
									required
								/>
							</label>
							{error ? (
								<p className="text-sm text-negative" role="alert">
									{error}
								</p>
							) : null}
							{message ? <p>{message}</p> : null}
							<button
								className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
								type="submit"
							>
								Change password
							</button>
						</form>
					</CardContent>
				</Card>
				{SETTINGS_SECTIONS.map((section) => (
					<Card key={section}>
						<CardHeader>
							<CardTitle>{section}</CardTitle>
						</CardHeader>
					</Card>
				))}
			</div>
		</>
	);
}
