import { createBrowserRouter } from "react-router";
import { GuestOnly } from "@/auth/guest-only";
import { RequireSession } from "@/auth/require-session";
import { PageLayout } from "@/components/layout/page-layout";
import { RouteError } from "@/components/route-error";
import { AccountsPage } from "@/pages/accounts";
import { BudgetPage } from "@/pages/budget";
import { CashFlowPage } from "@/pages/cash-flow";
import { DashboardPage } from "@/pages/dashboard";
import { ForecastPage } from "@/pages/forecast";
import { ForgotPasswordPage } from "@/pages/forgot-password";
import { GoalsPage } from "@/pages/goals";
import { InvestmentsPage } from "@/pages/investments";
import { LoginPage } from "@/pages/login";
import { NotFoundPage } from "@/pages/not-found";
import { RecurringPage } from "@/pages/recurring";
import { ReportsPage } from "@/pages/reports";
import { SettingsPage } from "@/pages/settings";
import { SignupPage } from "@/pages/signup";
import { TransactionsPage } from "@/pages/transactions";

export const router = createBrowserRouter([
	{
		errorElement: (
			<div className="min-h-svh bg-background p-6 font-sans">
				<RouteError />
			</div>
		),
		children: [
			{
				element: <GuestOnly />,
				children: [
					{ path: "/login", element: <LoginPage /> },
					{ path: "/signup", element: <SignupPage /> },
					{ path: "/forgot-password", element: <ForgotPasswordPage /> },
				],
			},
			{
				element: <RequireSession />,
				children: [
					{
						element: <PageLayout />,
						children: [
							{
								errorElement: <RouteError />,
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
						],
					},
				],
			},
		],
	},
]);
