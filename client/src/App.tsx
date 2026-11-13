import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { Toaster } from "@/components/ui/toaster";
import { router } from "@/router";

// One quiet retry, then the page shows its error with a Try again button.
const queryClient = new QueryClient({
	defaultOptions: { queries: { retry: 1 } },
});

export function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
			<Toaster />
		</QueryClientProvider>
	);
}
