import { createBrowserRouter } from "react-router";
import { PageLayout } from "./components/layout/page-layout";
import { AccountsPage } from "./pages/accounts";
import { BudgetPage } from "./pages/budget";
import { CashFlowPage } from "./pages/cash-flow";
import { DashboardPage } from "./pages/dashboard";
import { ForecastPage } from "./pages/forecast";
import { GoalsPage } from "./pages/goals";
import { InvestmentsPage } from "./pages/investments";
import { NotFoundPage } from "./pages/not-found";
import { RecurringPage } from "./pages/recurring";
import { ReportsPage } from "./pages/reports";
import { SettingsPage } from "./pages/settings";
import { TransactionsPage } from "./pages/transactions";

export const router = createBrowserRouter([
	{
		element: <PageLayout />,
		children: [
			{ path: "/", element: <DashboardPage /> },
			{ path: "/cash-flow", element: <CashFlowPage /> },
			{ path: "/accounts", element: <AccountsPage /> },
			{ path: "/transactions", element: <TransactionsPage /> },
			{ path: "/reports", element: <ReportsPage /> },
			{ path: "/budget", element: <BudgetPage /> },
			{ path: "/recurring", element: <RecurringPage /> },
			{ path: "/goals", element: <GoalsPage /> },
			{ path: "/investments", element: <InvestmentsPage /> },
			{ path: "/forecast", element: <ForecastPage /> },
			{ path: "/settings", element: <SettingsPage /> },
			{ path: "*", element: <NotFoundPage /> },
		],
	},
]);
