export const NAV_ITEMS = [
	{ name: "Dashboard", path: "/" },
	{ name: "Cash Flow", path: "/cash-flow" },
	{ name: "Accounts", path: "/accounts" },
	{ name: "Credit Cards", path: "/credit-cards" },
	{ name: "Transactions", path: "/transactions" },
	{ name: "Reports", path: "/reports" },
	{ name: "Budget", path: "/budget" },
	{ name: "Recurring", path: "/recurring" },
	{ name: "Goals", path: "/goals" },
	{ name: "Investments", path: "/investments" },
	{ name: "Forecasting", path: "/forecast" },
] as const;

export const SUMMARY_PANEL_PATHS = new Set(["/accounts", "/budget", "/goals"]);

export const BASE_CURRENCIES = [
	"USD",
	"EUR",
	"GBP",
	"CAD",
	"AUD",
	"NZD",
	"BRL",
	"MXN",
	"JPY",
	"CHF",
	"SEK",
	"NOK",
	"DKK",
	"PLN",
	"INR",
	"SGD",
	"HKD",
	"ZAR",
] as const;

/** Mirrors the `desk` breakpoint in `index.css`: desktop layout from 1000px up. */
export const DESK_QUERY = "(min-width: 62.5rem)";
