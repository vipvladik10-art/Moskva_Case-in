interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  ariaLabel?: string;
}

export function Sparkline({
  values,
  width = 80,
  height = 24,
  color = '#4ea1ff',
  fillColor = 'rgba(78, 161, 255, 0.18)',
  ariaLabel,
}: Props) {
  if (!values.length) {
    return <span style={{ width, height, display: 'inline-block' }} aria-hidden />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / Math.max(values.length - 1, 1);

  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const fillPath = `M0,${height} L${points
    .split(' ')
    .map((p) => p)
    .join(' L')} L${width},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      style={{ display: 'block' }}
    >
      <path d={fillPath} fill={fillColor} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
