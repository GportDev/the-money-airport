export const NAV_ITEMS = [
	{ name: "Dashboard", path: "/" },
	{ name: "Cash Flow", path: "/cash-flow" },
	{ name: "Accounts", path: "/accounts" },
	{ name: "Transactions", path: "/transactions" },
	{ name: "Reports", path: "/reports" },
	{ name: "Budget", path: "/budget" },
	{ name: "Recurring", path: "/recurring" },
	{ name: "Goals", path: "/goals" },
	{ name: "Investments", path: "/investments" },
	{ name: "Forecasting", path: "/forecast" },
] as const;

export const SUMMARY_PANEL_PATHS = new Set(["/accounts", "/budget", "/goals"]);
