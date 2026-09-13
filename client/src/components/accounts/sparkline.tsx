export function Sparkline({
	points,
	width = 48,
	height = 16,
}: {
	points: { value: number }[];
	width?: number;
	height?: number;
}) {
	if (points.length < 2) {
		return null;
	}
	const values = points.map((point) => point.value);
	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min || 1;
	const d = values
		.map((value, index) => {
			const x = (index / (values.length - 1)) * width;
			const y = height - ((value - min) / span) * height;
			return `${x},${y}`;
		})
		.join(" ");
	return (
		<svg width={width} height={height} className="text-muted-foreground" role="img">
			<title>Balance history</title>
			<polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={d} />
		</svg>
	);
}
