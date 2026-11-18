import { cn } from "@/lib/cn";

type Props = { className?: string };

export function BrandMark({ className }: Props) {
	return (
		<img
			src="/logo-mark.png"
			alt="Money Airport"
			width={128}
			height={128}
			className={cn("size-8", className)}
		/>
	);
}
