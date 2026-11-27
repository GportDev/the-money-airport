import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { apiUrl } from "@/api/client";
import { useSessionGate } from "@/auth/use-session";
import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";

export function RequireSession() {
	const { data, loading } = useSessionGate();
	const location = useLocation();

	useEffect(() => {
		if (!data) {
			return;
		}
		void fetch(`${apiUrl}/billing`, { credentials: "include" });
	}, [data]);

	if (loading) {
		return <AppShellSkeleton />;
	}

	if (!data) {
		const next = encodeURIComponent(`${location.pathname}${location.search}`);
		return <Navigate to={`/login?next=${next}`} replace />;
	}

	return <Outlet />;
}
