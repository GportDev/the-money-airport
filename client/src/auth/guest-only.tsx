import { Navigate, Outlet } from "react-router";
import { useSession } from "./use-session";

export function GuestOnly() {
	const { data, isPending } = useSession();

	if (isPending) {
		return null;
	}

	if (data) {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
}
