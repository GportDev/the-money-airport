import { useSession } from "@/auth/use-session";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { ProfileAvatar } from "@/components/settings/profile-avatar";
import { ProfileNameForm } from "@/components/settings/profile-name-form";
import { SettingsSection } from "@/components/settings/settings-section";

export function ProfileSection() {
	const { data } = useSession();
	const name = data?.user.name ?? "";
	const email = data?.user.email ?? "";
	return (
		<SettingsSection title="Profile">
			<div className="flex items-center gap-3">
				<ProfileAvatar name={name} />
				<div className="min-w-0">
					<p className="truncate font-medium">{name}</p>
					<p className="truncate text-sm text-muted-foreground">{email}</p>
				</div>
			</div>
			{data ? <ProfileNameForm name={name} email={email} /> : null}
			<div className="border-t border-border pt-4">
				<h3 className="mb-3 text-sm font-medium">Change password</h3>
				<ChangePasswordForm />
			</div>
		</SettingsSection>
	);
}
