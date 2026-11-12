import { type ComponentType, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { AssetsLiabilitiesPanel } from "@/components/accounts/assets-liabilities-panel";
import { BudgetSummaryPanel } from "@/components/budget/budget-summary-panel";
import { Header } from "@/components/layout/header";
import { ScrollContainerContext } from "@/components/layout/scroll-container";
import { Sidebar } from "@/components/layout/sidebar";
import { SUMMARY_PANEL_PATHS } from "@/lib/constants";

const SUMMARY_PANELS: Record<string, ComponentType> = {
	"/accounts": AssetsLiabilitiesPanel,
	"/budget": BudgetSummaryPanel,
};

export function PageLayout() {
	const [collapsed, setCollapsed] = useState(false);
	const location = useLocation();
	const showSummary = SUMMARY_PANEL_PATHS.has(location.pathname);
	const scrollRef = useRef<HTMLDivElement>(null);

	// The content area keeps its scroll position across routes; start each page at the top.
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs on every page change.
	useLayoutEffect(() => {
		scrollRef.current?.scrollTo({ top: 0 });
	}, [location.pathname]);

	return (
		<div className="flex h-svh overflow-hidden bg-background font-sans">
			<Sidebar collapsed={collapsed} />
			<div className="flex min-w-0 flex-1 flex-col">
				<Header collapsed={collapsed} onToggleSidebar={() => setCollapsed((value) => !value)} />
				<ScrollContainerContext.Provider value={scrollRef}>
					<div
						ref={scrollRef}
						data-testid="page-scroll"
						className="relative flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:items-start"
					>
						<main className="min-w-0 flex-1 p-6">
							<Outlet />
						</main>
						{showSummary ? (
							<aside
								aria-label="Summary"
								className="w-full shrink-0 border-t border-border p-4 xl:sticky xl:top-0 xl:h-full xl:w-80 xl:self-start xl:overflow-y-auto xl:border-t-0 xl:border-l"
							>
								<SummaryPanel pathname={location.pathname} />
							</aside>
						) : null}
					</div>
				</ScrollContainerContext.Provider>
			</div>
		</div>
	);
}

function SummaryPanel({ pathname }: { pathname: string }) {
	const Panel = SUMMARY_PANELS[pathname];
	return Panel ? <Panel /> : <p className="text-sm text-muted-foreground">Summary</p>;
}
