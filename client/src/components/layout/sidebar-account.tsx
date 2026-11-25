import { useSession } from "@/auth/use-session";
import { ProfileMenuContent } from "@/components/layout/profile-menu-content";
import { PlanBadge } from "@/components/settings/plan-badge";
import { ProfileAvatar } from "@/components/settings/profile-avatar";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** The User's avatar under their plan; pressing it opens the profile menu. */
export function SidebarAccount() {
	const { data } = useSession();
	const name = data?.user.name ?? "";

	return (
		<div className="mt-auto border-t border-border px-3.75 py-3">
			<div className="flex w-8 flex-col items-center gap-1.5">
				<PlanBadge />
				<DropdownMenu>
					<Tooltip>
						<TooltipTrigger asChild>
							<DropdownMenuTrigger
								aria-label="Profile"
								className="rounded-full transition-[opacity,scale] duration-150 ease-out hover:opacity-80 active:scale-[0.96] data-[state=open]:opacity-80 motion-reduce:active:scale-100"
							>
								<ProfileAvatar name={name} className="size-8 text-xs" />
							</DropdownMenuTrigger>
						</TooltipTrigger>
						{name ? <TooltipContent side="right">{name}</TooltipContent> : null}
					</Tooltip>
					<ProfileMenuContent />
				</DropdownMenu>
			</div>
		</div>
	);
}
