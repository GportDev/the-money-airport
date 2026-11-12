import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { Toaster } from "@/components/ui/toaster";
import { router } from "@/router";

const queryClient = new QueryClient();

export function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
			<Toaster />
		</QueryClientProvider>
	);
}
