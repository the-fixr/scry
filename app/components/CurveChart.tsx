'use client';

interface CurveStep {
  rangeTo: bigint;
  price: bigint;
}

interface CurveChartProps {
  steps: CurveStep[];
  currentPrice: bigint;
  maxSupply: bigint;
  height?: number;
}

export function CurveChart({ steps, currentPrice, maxSupply, height = 120 }: CurveChartProps) {
  if (steps.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4 text-center text-gray-600 text-xs">
        No curve data
      </div>
    );
  }

  const width = 280;
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Find max price for Y scale
  const maxPrice = steps.reduce((max, s) => s.price > max ? s.price : max, 0n);
  const maxRange = maxSupply > 0n ? maxSupply : steps[steps.length - 1].rangeTo;

  if (maxPrice === 0n || maxRange === 0n) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4 text-center text-gray-600 text-xs">
        No curve data
      </div>
    );
  }

  // Build path points for step function
  const points: { x: number; y: number }[] = [];
  let prevRange = 0n;

  for (const step of steps) {
    const x1 = Number(prevRange * BigInt(chartW) / maxRange);
    const x2 = Number(step.rangeTo * BigInt(chartW) / maxRange);
    const y = chartH - Number(step.price * BigInt(chartH) / maxPrice);
    points.push({ x: x1, y });
    points.push({ x: x2, y });
    prevRange = step.rangeTo;
  }

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Fill area under curve
  const fillD = pathD + ` L ${points[points.length - 1].x} ${chartH} L 0 ${chartH} Z`;

  // Current price marker
  const currentY = chartH - Number(currentPrice * BigInt(chartH) / maxPrice);

  // Find current position on X axis (approximate)
  let currentX = 0;
  for (let i = 0; i < points.length - 1; i += 2) {
    if (BigInt(steps[i / 2]?.price ?? 0) >= currentPrice) {
      currentX = points[i].x;
      break;
    }
    currentX = points[i + 1]?.x ?? currentX;
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] text-gray-500 mb-1">Bonding Curve</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(frac => (
            <line
              key={frac}
              x1={0} y1={chartH * (1 - frac)} x2={chartW} y2={chartH * (1 - frac)}
              stroke="#1e293b" strokeWidth={0.5}
            />
          ))}

          {/* Fill under curve */}
          <path d={fillD} fill="#06B6D4" fillOpacity={0.08} />

          {/* Curve line */}
          <path d={pathD} fill="none" stroke="#06B6D4" strokeWidth={1.5} />

          {/* Current position marker */}
          <circle cx={currentX} cy={currentY} r={3} fill="#06B6D4" />
          <line x1={currentX} y1={currentY} x2={currentX} y2={chartH} stroke="#06B6D4" strokeWidth={0.5} strokeDasharray="2,2" />

          {/* X axis */}
          <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#334155" strokeWidth={0.5} />
          <text x={0} y={chartH + 12} fill="#64748b" fontSize={8}>0</text>
          <text x={chartW} y={chartH + 12} fill="#64748b" fontSize={8} textAnchor="end">Max</text>

          {/* Y axis label */}
          <text x={-5} y={5} fill="#64748b" fontSize={8} textAnchor="end">Price</text>
        </g>
      </svg>
    </div>
  );
}
