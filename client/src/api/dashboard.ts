import { api } from "@/api/client";
import type { Dashboard, NetWorthRange } from "@/types";

export function getDashboard(netWorthRange: NetWorthRange) {
	return api<Dashboard>(`/dashboard?netWorthRange=${netWorthRange}`);
}
