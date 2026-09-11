export function PageHeader({ title }: { title: string }) {
	return (
		<div className="mb-6">
			<h1 className="text-xl font-semibold">{title}</h1>
		</div>
	);
}
