import {
	ArrowLeftRight,
	Landmark,
	LayoutDashboard,
	LineChart,
	List,
	PieChart,
	Plane,
	Repeat,
	Target,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { NavLink } from "react-router";
import { authClient } from "../../auth/auth-client";
import { useSession } from "../../auth/use-session";
import { NAV_ITEMS } from "../../lib/constants";

const NAV_ICONS = {
	Dashboard: LayoutDashboard,
	"Cash Flow": ArrowLeftRight,
	Accounts: Landmark,
	Transactions: List,
	Reports: PieChart,
	Budget: Wallet,
	Recurring: Repeat,
	Goals: Target,
	Investments: TrendingUp,
	Forecasting: LineChart,
} as const;

export function Sidebar({ collapsed }: { collapsed: boolean }) {
	const { data } = useSession();
	const name = data?.user.name;

	async function logOut() {
		await authClient.signOut();
		window.location.assign("/login");
	}
	return (
		<aside
			aria-label="Workspace"
			className={`flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-card ${collapsed ? "w-16" : "w-16 xl:w-60"}`}
		>
			<div className="border-b border-border px-3 py-4">
				<p className="truncate font-semibold text-foreground">
					<span className={collapsed ? "sr-only" : "hidden xl:inline"}>Money Airport</span>
					<Plane aria-hidden className={`size-5 ${collapsed ? "inline" : "xl:hidden"}`} />
				</p>
			</div>
			<nav aria-label="Primary" className="flex flex-1 flex-col gap-1 p-2">
				{NAV_ITEMS.map((item) => {
					const Icon = NAV_ICONS[item.name];
					return (
						<NavLink
							key={item.path}
							to={item.path}
							end={item.path === "/"}
							aria-label={item.name}
							className={({ isActive }) =>
								`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
									isActive
										? "bg-muted font-medium text-foreground"
										: "text-muted-foreground hover:bg-muted hover:text-foreground"
								}`
							}
						>
							<Icon aria-hidden className="size-4 shrink-0" />
							<span className={collapsed ? "sr-only" : "hidden xl:inline"}>{item.name}</span>
						</NavLink>
					);
				})}
			</nav>
			<div className="mt-auto border-t border-border p-3">
				<p className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
					Free
				</p>
				{name ? <p className="truncate text-sm text-foreground">{name}</p> : null}
				<button
					className="truncate text-sm text-muted-foreground"
					type="button"
					onClick={() => {
						void logOut();
					}}
				>
					Profile
				</button>
			</div>
		</aside>
	);
}
