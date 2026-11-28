import { EmojiSelect } from "@/components/ui/emoji-select";

type Props = {
	icon: string;
	color: string;
	onIconChange: (icon: string) => void;
	onColorChange: (color: string) => void;
};

export function GoalIconFields({ icon, color, onIconChange, onColorChange }: Props) {
	return (
		<div className="flex gap-3">
			<div className="flex flex-col gap-1 text-sm">
				<span id="goal-icon-label">Icon</span>
				<EmojiSelect aria-labelledby="goal-icon-label" value={icon} onValueChange={onIconChange} />
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
