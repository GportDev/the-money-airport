import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createAccount,
	deleteAccount,
	getAccounts,
	getNetWorth,
	updateAccount,
} from "../api/accounts";

export function useAccounts() {
	return useQuery({
		queryKey: ["accounts"],
		queryFn: getAccounts,
		staleTime: 30 * 60 * 1000,
	});
}

export function useNetWorth(range = "1m") {
	return useQuery({
		queryKey: ["accounts", "net-worth", range],
		queryFn: () => getNetWorth(range),
		staleTime: 5 * 60 * 1000,
	});
}

function useAccountsMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: fn,
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: ["accounts"] });
		},
	});
}

export function useCreateAccount() {
	return useAccountsMutation(createAccount);
}

export function useUpdateAccount() {
	return useAccountsMutation(
		({ id, ...body }: { id: string } & Parameters<typeof updateAccount>[1]) =>
			updateAccount(id, body),
	);
}

export function useDeleteAccount() {
	return useAccountsMutation((id: string) => deleteAccount(id));
}
