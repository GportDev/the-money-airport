import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { createLinkToken, exchangeToken } from "../../api/plaid";

export function ConnectPlaidButton({
	onDone,
	itemId,
	label = "Connect with Plaid",
}: {
	onDone: () => void;
	itemId?: string;
	label?: string;
}) {
	const queryClient = useQueryClient();
	const [token, setToken] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const { open, ready } = usePlaidLink({
		token: token ?? "",
		onSuccess: (publicToken, metadata) => {
			const institutionName = metadata.institution?.name ?? "";
			void exchangeToken(publicToken ?? "", institutionName || undefined).then(() => {
				void queryClient.invalidateQueries({ queryKey: ["accounts"] });
				onDone();
			});
		},
	});

	useEffect(() => {
		if (token && ready) {
			open();
		}
	}, [token, ready, open]);

	return (
		<div className="flex flex-col gap-2">
			<button
				className="rounded-md border border-border px-3 py-2 text-sm"
				type="button"
				onClick={() => {
					setError(null);
					void createLinkToken(itemId)
						.then((data) => setToken(data.linkToken))
						.catch(() => setError("Plaid is not configured"));
				}}
			>
				{label}
			</button>
			{error ? (
				<p className="text-sm text-negative" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}
