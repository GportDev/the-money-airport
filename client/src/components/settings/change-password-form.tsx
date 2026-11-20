import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
				<Input
					id="current-password"
					type="password"
					autoComplete="current-password"
					value={currentPassword}
					onChange={(event) => setCurrentPassword(event.target.value)}
					required
				/>
			</label>
			<label className="flex flex-col gap-1 text-sm" htmlFor="new-password">
				New password
				<Input
					id="new-password"
					type="password"
					autoComplete="new-password"
					value={newPassword}
					onChange={(event) => setNewPassword(event.target.value)}
					required
				/>
			</label>
			<Button className="self-start" type="submit" disabled={isSaving}>
				Change password
			</Button>
		</form>
	);
}
