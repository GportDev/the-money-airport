import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/auth/auth-client";

type Props = { name: string; email: string };

export function ProfileNameForm({ name: savedName, email }: Props) {
	const [name, setName] = useState(savedName);
	const [isSaving, setSaving] = useState(false);
	const trimmed = name.trim();

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		setSaving(true);
		const result = await authClient.updateUser({ name: trimmed });
		setSaving(false);
		if (result.error) {
			toast.error(result.error.message ?? "Could not save your name");
			return;
		}
		toast.success("Name saved");
	}

	return (
		<form className="flex max-w-sm flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
			<label className="flex flex-col gap-1 text-sm" htmlFor="profile-name">
				Name
				<input
					id="profile-name"
					className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
					autoComplete="name"
					value={name}
					onChange={(event) => setName(event.target.value)}
					required
				/>
			</label>
			<label className="flex flex-col gap-1 text-sm" htmlFor="profile-email">
				Email
				<input
					id="profile-email"
					className="rounded-md border border-border bg-muted px-3 py-2 text-muted-foreground"
					value={email}
					readOnly
				/>
			</label>
			<button
				className="self-start rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5 disabled:opacity-60"
				type="submit"
				disabled={isSaving || trimmed === "" || trimmed === savedName}
			>
				Save name
			</button>
		</form>
	);
}
