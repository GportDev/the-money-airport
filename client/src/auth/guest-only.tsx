import { Navigate, Outlet } from "react-router";
import { useSessionGate } from "@/auth/use-session";
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton";

export function GuestOnly() {
	const { data, loading } = useSessionGate();

	if (loading) {
		return <AuthCardSkeleton />;
	}

	if (data) {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
}
