import { toast } from "sonner";
import { CategoryForm } from "@/components/categories/category-form";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";
import type { Category } from "@/types";

type Props = {
	name: string;
	onCreated: (category: Category) => void;
	onClose: () => void;
};

/** Creates a Category named from what the user typed in a Category picker. */
export function CreateCategoryDrawer({ name, onCreated, onClose }: Props) {
	const { sheet, close } = useSheetClose(onClose);

	return (
		<Sheet {...sheet}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>New category</SheetTitle>
					<SheetDescription>The transaction moves to it once it is created.</SheetDescription>
				</SheetHeader>
				<div className="px-4 pb-6">
					<CategoryForm
						category={null}
						initialName={name}
						onSaved={(category) => {
							toast.success(`${category.name} created`);
							onCreated(category);
							close();
						}}
						onCancel={() => close()}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}
