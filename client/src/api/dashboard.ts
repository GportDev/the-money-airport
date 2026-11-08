import type { Dashboard, NetWorthRange } from "../types";
import { api } from "./client";

export function getDashboard(netWorthRange: NetWorthRange) {
	return api<Dashboard>(`/dashboard?netWorthRange=${netWorthRange}`);
}
