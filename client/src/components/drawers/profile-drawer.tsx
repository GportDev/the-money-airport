import { LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { authClient } from "@/auth/auth-client";
import { useSession } from "@/auth/use-session";
import { PlanBadge } from "@/components/settings/plan-badge";
import { ProfileAvatar } from "@/components/settings/profile-avatar";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";

type Props = { onClose: () => void };

/** Who is signed in, their plan, and the way to Settings and out of the app. */
export function ProfileDrawer({ onClose }: Props) {
	const { sheet, close } = useSheetClose(onClose);
	const { data } = useSession();
	const name = data?.user.name ?? "";
	const email = data?.user.email ?? "";
	const [isLoggingOut, setLoggingOut] = useState(false);

	async function logOut() {
		setLoggingOut(true);
		const result = await authClient.signOut();
		if (result.error) {
			setLoggingOut(false);
			toast.error(result.error.message ?? "Could not log out");
			return;
		}
		window.location.assign("/login");
	}

	return (
		<Sheet open={sheet.open} onOpenChange={sheet.onOpenChange}>
			<SheetContent>
				<SheetHeader className="items-start gap-3 pr-12">
					<ProfileAvatar name={name} />
					<div className="flex min-w-0 max-w-full flex-col gap-0.5">
						<SheetTitle className="truncate">{name || "Profile"}</SheetTitle>
						<SheetDescription className="truncate">{email}</SheetDescription>
					</div>
					<PlanBadge />
				</SheetHeader>
				<nav aria-label="Account" className="flex flex-col gap-1 border-t border-border p-2">
					<Button asChild variant="ghost" className="justify-start">
						<Link to="/settings" onClick={() => close()}>
							<Settings aria-hidden className="size-4 text-muted-foreground" />
							Settings
						</Link>
					</Button>
				</nav>
				<SheetFooter className="border-t border-border">
					<Button
						variant="outline"
						className="justify-start"
						disabled={isLoggingOut}
						onClick={() => void logOut()}
					>
						<LogOut aria-hidden className="size-4 text-muted-foreground" />
						Log out
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
