import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type CategoryInput,
	createCategory,
	deleteCategory,
	getCategories,
	updateCategory,
} from "../api/categories";

export function useCategories() {
	return useQuery({
		queryKey: ["categories"],
		queryFn: getCategories,
		staleTime: 30 * 60 * 1000,
	});
}

function useCategoryMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: fn,
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: ["categories"] });
			// Renames, recolors, and deletes show up on every feed row.
			void client.invalidateQueries({ queryKey: ["transactions"] });
			void client.invalidateQueries({ queryKey: ["dashboard"] });
		},
	});
}

export function useCreateCategory() {
	return useCategoryMutation((body: CategoryInput) => createCategory(body));
}

export function useUpdateCategory() {
	return useCategoryMutation(({ id, ...body }: { id: string } & Partial<CategoryInput>) =>
		updateCategory(id, body),
	);
}

export function useDeleteCategory() {
	return useCategoryMutation((id: string) => deleteCategory(id));
}
