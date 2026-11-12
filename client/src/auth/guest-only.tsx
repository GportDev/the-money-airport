import { Navigate, Outlet } from "react-router";
import { useSessionGate } from "./use-session";

export function GuestOnly() {
	const { data, loading } = useSessionGate();

	if (loading) {
		return null;
	}

	if (data) {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
}
