/** Vertical fade from the series color to transparent; reference it with `areaFill(token)`. */
export function ChartGradient({ token }: { token: string }) {
	return (
		<defs>
			<linearGradient id={`chart-fill-${token}`} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor={`var(--${token})`} stopOpacity={0.24} />
				<stop offset="100%" stopColor={`var(--${token})`} stopOpacity={0} />
			</linearGradient>
		</defs>
	);
}
