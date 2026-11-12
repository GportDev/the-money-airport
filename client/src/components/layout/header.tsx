import { Bell, PanelLeft, Search, Settings } from "lucide-react";
import { Link } from "react-router";

const ICON_BUTTON =
	"rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground";

type HeaderProps = {
	collapsed: boolean;
	onToggleSidebar: () => void;
};

export function Header({ collapsed, onToggleSidebar }: HeaderProps) {
	return (
		<header className="flex h-14 items-center gap-1 border-b border-border px-2.5">
			<button
				type="button"
				className={ICON_BUTTON}
				onClick={onToggleSidebar}
				aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
			>
				<PanelLeft aria-hidden className="size-4" />
			</button>
			<button type="button" aria-label="Search" className={ICON_BUTTON}>
				<Search aria-hidden className="size-4" />
			</button>
			<button type="button" aria-label="Notifications" className={ICON_BUTTON}>
				<Bell aria-hidden className="size-4" />
			</button>
			<Link to="/settings" aria-label="Settings" className={ICON_BUTTON}>
				<Settings aria-hidden className="size-4" />
			</Link>
		</header>
	);
}
