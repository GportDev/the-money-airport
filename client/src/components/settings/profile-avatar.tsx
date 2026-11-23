import { cn } from "@/lib/cn";

function initials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const first = parts[0]?.[0] ?? "";
	const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
	return `${first}${last}`.toUpperCase() || "?";
}

export function ProfileAvatar({ name, className }: { name: string; className?: string }) {
	return (
		<span
			aria-hidden
			className={cn(
				"flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary",
				className,
			)}
		>
			{initials(name)}
		</span>
	);
}
