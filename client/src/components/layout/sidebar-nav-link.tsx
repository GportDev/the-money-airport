import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

type Props = {
	name: string;
	path: string;
	icon: LucideIcon;
	isCompact: boolean;
};

/** One sidebar row; while the sidebar is compact its name shows as a tooltip instead. */
export function SidebarNavLink({ name, path, icon: Icon, isCompact }: Props) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<NavLink
					to={path}
					end={path === "/"}
					aria-label={name}
					className={({ isActive }) =>
						cn(
							"flex items-center gap-2 overflow-hidden rounded-md px-3.75 py-2 text-sm transition-colors",
							isActive
								? "bg-muted font-medium text-foreground"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
						)
					}
				>
					<Icon aria-hidden className="size-4 shrink-0" />
					<span
						className={cn(
							"whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none",
							isCompact && "opacity-0",
						)}
					>
						{name}
					</span>
				</NavLink>
			</TooltipTrigger>
			{isCompact ? <TooltipContent side="right">{name}</TooltipContent> : null}
		</Tooltip>
	);
}
