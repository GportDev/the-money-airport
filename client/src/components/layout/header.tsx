import { Bell, PanelLeft, Search, Settings } from "lucide-react";
import { Link } from "react-router";

type HeaderProps = {
	collapsed: boolean;
	onToggleSidebar: () => void;
};

export function Header({ collapsed, onToggleSidebar }: HeaderProps) {
	return (
		<header className="flex h-14 items-center gap-2 border-b border-border px-4">
			<button
				type="button"
				onClick={onToggleSidebar}
				aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
			>
				<PanelLeft aria-hidden className="size-4" />
			</button>
			<button type="button" aria-label="Search">
				<Search aria-hidden className="size-4" />
			</button>
			<button type="button" aria-label="Notifications">
				<Bell aria-hidden className="size-4" />
			</button>
			<Link to="/settings" aria-label="Settings">
				<Settings aria-hidden className="size-4" />
			</Link>
		</header>
	);
}
