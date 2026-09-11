import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { apiUrl } from "../api/client";
import { useSession } from "./use-session";

export function RequireSession() {
	const { data, isPending } = useSession();
	const location = useLocation();

	useEffect(() => {
		if (!data) {
			return;
		}
		void fetch(`${apiUrl}/billing`, { credentials: "include" });
	}, [data]);

	if (isPending) {
		return null;
	}

	if (!data) {
		const next = encodeURIComponent(`${location.pathname}${location.search}`);
		return <Navigate to={`/login?next=${next}`} replace />;
	}

	return <Outlet />;
}
