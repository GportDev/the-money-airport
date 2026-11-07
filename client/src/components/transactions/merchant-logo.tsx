import { useState } from "react";

export function MerchantLogo({ name, url }: { name: string; url: string | null }) {
	const [failed, setFailed] = useState(false);
	if (url && !failed) {
		return (
			<img
				src={url}
				alt=""
				className="size-8 shrink-0 rounded-full border border-border bg-card object-cover"
				onError={() => setFailed(true)}
			/>
		);
	}
	return (
		<span
			aria-hidden
			className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium text-muted-foreground"
		>
			{name.trim().charAt(0).toUpperCase() || "?"}
		</span>
	);
}
