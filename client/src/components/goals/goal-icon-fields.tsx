import { CATEGORY_ICONS, CategoryIcon } from "@/components/transactions/category-icon";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Props = {
	icon: string;
	color: string;
	onIconChange: (icon: string) => void;
	onColorChange: (color: string) => void;
};

export function GoalIconFields({ icon, color, onIconChange, onColorChange }: Props) {
	return (
		<div className="flex gap-3">
			<div className="flex flex-1 flex-col gap-1 text-sm">
				<label htmlFor="goal-icon">Icon</label>
				<Select value={icon} onValueChange={onIconChange}>
					<SelectTrigger id="goal-icon">
						<span className="flex items-center gap-2">
							<CategoryIcon icon={icon} color={color} />
							<SelectValue />
						</span>
					</SelectTrigger>
					<SelectContent>
						{Object.keys(CATEGORY_ICONS).map((key) => (
							<SelectItem key={key} value={key}>
								{key}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<label className="flex flex-col gap-1 text-sm" htmlFor="goal-color">
				Color
				<input
					id="goal-color"
					type="color"
					className="h-10 w-14 rounded-md border border-border bg-card"
					value={color}
					onChange={(event) => onColorChange(event.target.value)}
				/>
			</label>
		</div>
	);
}
