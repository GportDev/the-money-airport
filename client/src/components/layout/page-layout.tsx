import { useState } from "react";
import { Outlet, useLocation } from "react-router";
import { SUMMARY_PANEL_PATHS } from "../../lib/constants";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export function PageLayout() {
	const [collapsed, setCollapsed] = useState(false);
	const location = useLocation();
	const showSummary = SUMMARY_PANEL_PATHS.has(location.pathname);

	return (
		<div className="flex min-h-svh bg-background">
			<Sidebar collapsed={collapsed} />
			<div className="flex min-w-0 flex-1 flex-col">
				<Header collapsed={collapsed} onToggleSidebar={() => setCollapsed((value) => !value)} />
				<div className="flex min-h-0 flex-1 flex-col xl:flex-row">
					<main className="min-w-0 flex-1 p-6">
						<Outlet />
					</main>
					{showSummary ? (
						<aside
							aria-label="Summary"
							className="w-full shrink-0 border-t border-border p-4 xl:w-80 xl:border-t-0 xl:border-l"
						>
							<p className="text-sm text-muted-foreground">Summary</p>
						</aside>
					) : null}
				</div>
			</div>
		</div>
	);
}
