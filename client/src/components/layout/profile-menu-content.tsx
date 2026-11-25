import { LogOut, Settings } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { authClient } from "@/auth/auth-client";
import { useSession } from "@/auth/use-session";
import { PlanBadge } from "@/components/settings/plan-badge";
import {
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

async function logOut() {
	const result = await authClient.signOut();
	if (result.error) {
		toast.error(result.error.message ?? "Could not log out");
		return;
	}
	window.location.assign("/login");
}

/** Who is signed in, their plan, and the way to Settings and out of the app. */
export function ProfileMenuContent() {
	const { data } = useSession();
	const name = data?.user.name ?? "";
	const email = data?.user.email ?? "";

	return (
		<DropdownMenuContent side="right" align="end" sideOffset={8} className="max-w-64">
			<DropdownMenuLabel className="flex flex-col items-start gap-1.5">
				<div className="flex min-w-0 max-w-full flex-col">
					<span className="truncate font-medium text-foreground">{name || "Profile"}</span>
					<span className="truncate text-xs text-muted-foreground">{email}</span>
				</div>
				<PlanBadge />
			</DropdownMenuLabel>
			<DropdownMenuSeparator />
			<DropdownMenuItem asChild>
				<Link to="/settings">
					<Settings aria-hidden className="size-4 text-muted-foreground" />
					Settings
				</Link>
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onSelect={() => void logOut()}>
				<LogOut aria-hidden className="size-4 text-muted-foreground" />
				Log out
			</DropdownMenuItem>
		</DropdownMenuContent>
	);
}
