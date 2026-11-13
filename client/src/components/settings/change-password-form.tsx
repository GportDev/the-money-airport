import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/auth/auth-client";

export function ChangePasswordForm() {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [isSaving, setSaving] = useState(false);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		setSaving(true);
		const result = await authClient.changePassword({ currentPassword, newPassword });
		setSaving(false);
		if (result.error) {
			toast.error(result.error.message ?? "Could not change password");
			return;
		}
		setCurrentPassword("");
		setNewPassword("");
		toast.success("Password changed.");
	}

	return (
		<form className="flex max-w-sm flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
			<label className="flex flex-col gap-1 text-sm" htmlFor="current-password">
				Current password
				<input
					id="current-password"
					className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
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
					className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
					type="password"
					autoComplete="new-password"
					value={newPassword}
					onChange={(event) => setNewPassword(event.target.value)}
					required
				/>
			</label>
			<button
				className="self-start rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
				type="submit"
				disabled={isSaving}
			>
				Change password
			</button>
		</form>
	);
}
