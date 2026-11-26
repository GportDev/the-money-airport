import type * as React from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
	value: T;
	options: readonly Option<T>[];
	onValueChange: (value: T) => void;
	id?: string;
	"aria-label"?: string;
	variant?: "outline" | "ghost";
	lead?: React.ReactNode;
	icon?: React.ReactNode;
	disabled?: boolean;
	className?: string;
};

// Radix Select reserves "" for "no selection", so an empty option value travels under this key.
const EMPTY_VALUE = "__empty__";

/** A Select over a plain option list; an option may use "" (e.g. "All accounts"). */
export function SelectField<T extends string>({
	value,
	options,
	onValueChange,
	id,
	variant,
	lead,
	icon,
	disabled,
	className,
	...props
}: Props<T>) {
	return (
		<Select
			value={value === "" ? EMPTY_VALUE : value}
			onValueChange={(next) => onValueChange((next === EMPTY_VALUE ? "" : next) as T)}
			disabled={disabled}
		>
			<SelectTrigger
				id={id}
				aria-label={props["aria-label"]}
				variant={variant}
				lead={lead}
				icon={icon}
				className={className}
			>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value === "" ? EMPTY_VALUE : option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
