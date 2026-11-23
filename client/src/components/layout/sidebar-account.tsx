import { useState } from "react";
import { useSession } from "@/auth/use-session";
import { ProfileDrawer } from "@/components/drawers/profile-drawer";
import { PlanBadge } from "@/components/settings/plan-badge";
import { ProfileAvatar } from "@/components/settings/profile-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** The User's avatar under their plan; pressing it opens the profile drawer. */
export function SidebarAccount() {
	const { data } = useSession();
	const name = data?.user.name ?? "";
	const [isOpen, setOpen] = useState(false);

	return (
		<div className="mt-auto border-t border-border px-3.75 py-3">
			<div className="flex w-8 flex-col items-center gap-1.5">
				<PlanBadge />
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							aria-label="Profile"
							aria-haspopup="dialog"
							onClick={() => setOpen(true)}
							className="rounded-full transition-[opacity,scale] duration-150 ease-out hover:opacity-80 active:scale-[0.96] motion-reduce:active:scale-100"
						>
							<ProfileAvatar name={name} className="size-8 text-xs" />
						</button>
					</TooltipTrigger>
					{name ? <TooltipContent side="right">{name}</TooltipContent> : null}
				</Tooltip>
			</div>
			{isOpen ? <ProfileDrawer onClose={() => setOpen(false)} /> : null}
		</div>
	);
}
