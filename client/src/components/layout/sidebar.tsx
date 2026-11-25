import {
	ArrowLeftRight,
	CreditCard,
	Landmark,
	LayoutDashboard,
	LineChart,
	List,
	PieChart,
	Repeat,
	Target,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { SidebarAccount } from "@/components/layout/sidebar-account";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "@/lib/constants";

/** Tailwind's `xl`: below it the sidebar stays compact even when expanded. */
const WIDE_QUERY = "(min-width: 80rem)";

const NAV_ICONS = {
	Dashboard: LayoutDashboard,
	"Cash Flow": ArrowLeftRight,
	Accounts: Landmark,
	"Credit Cards": CreditCard,
	Transactions: List,
	Reports: PieChart,
	Budget: Wallet,
	Recurring: Repeat,
	Goals: Target,
	Investments: TrendingUp,
	Forecasting: LineChart,
} as const;

export function Sidebar({ collapsed }: { collapsed: boolean }) {
	const isWide = useMediaQuery(WIDE_QUERY);
	const isCompact = collapsed || !isWide;

	return (
		<aside
			aria-label="Workspace"
			className={cn(
				"relative flex h-full shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-border bg-card transition-[width] duration-200 ease-out motion-reduce:transition-none",
				isCompact ? "w-16" : "w-42",
			)}
		>
			<div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3.75">
				<BrandMark className="shrink-0" />
				<span
					aria-hidden
					className={cn(
						"whitespace-nowrap text-sm font-semibold text-foreground transition-opacity duration-200 motion-reduce:transition-none",
						isCompact && "opacity-0",
					)}
				>
					Money Airport
				</span>
			</div>
			<nav aria-label="Primary" className="flex flex-1 flex-col gap-1 p-2">
				{NAV_ITEMS.map((item) => (
					<SidebarNavLink
						key={item.path}
						name={item.name}
						path={item.path}
						icon={NAV_ICONS[item.name]}
						isCompact={isCompact}
					/>
				))}
			</nav>
			<SidebarAccount />
		</aside>
	);
}
