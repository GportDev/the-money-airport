import { type ReactNode, useId } from "react";

type Props = { title: string; description?: string; children: ReactNode };

export function SettingsSection({ title, description, children }: Props) {
	const headingId = useId();
	return (
		<section
			aria-labelledby={headingId}
			className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
		>
			<div>
				<h2 id={headingId} className="font-semibold">
					{title}
				</h2>
				{description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
			</div>
			{children}
		</section>
	);
}
