import { cn } from "@/lib/cn";

type Props = { className?: string };

export function BrandLockup({ className }: Props) {
	return (
		<img
			src="/logo-lockup.png"
			alt="Money Airport"
			width={461}
			height={234}
			className={cn("h-16 w-auto", className)}
		/>
	);
}
