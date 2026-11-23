import { Bell, PanelLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type HeaderProps = {
	collapsed: boolean;
	onToggleSidebar: () => void;
};

export function Header({ collapsed, onToggleSidebar }: HeaderProps) {
	return (
		<header className="flex h-14 items-center gap-1 border-b border-border px-2.5">
			<Button
				variant="ghost"
				size="icon-sm"
				className="text-muted-foreground hover:text-foreground"
				onClick={onToggleSidebar}
				aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
			>
				<PanelLeft aria-hidden className="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Search"
				className="text-muted-foreground hover:text-foreground"
			>
				<Search aria-hidden className="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Notifications"
				className="text-muted-foreground hover:text-foreground"
			>
				<Bell aria-hidden className="size-4" />
			</Button>
		</header>
	);
}
