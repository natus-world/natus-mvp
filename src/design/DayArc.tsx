const WIDTH = 240;
const HEIGHT = 128;
const CX = WIDTH / 2;
const CY = 116;
const R = 100;
const NODE = 7;

function point(index: number, total: number): [number, number] {
  const t = total === 1 ? 0.5 : index / (total - 1);
  const angle = Math.PI - t * Math.PI;
  return [CX + R * Math.cos(angle), CY - R * Math.sin(angle)];
}

export function DayArc({ done, total }: { done: number; total: number }) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      className="mx-auto block max-w-60"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
        fill="none"
        stroke="var(--natus-tinta)"
        strokeOpacity={0.22}
        strokeWidth={1.3}
      />
      {Array.from({ length: total }, (_, index) => {
        const [x, y] = point(index, total);
        const on = index < done;
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={NODE}
            fill={on ? 'var(--natus-tinta)' : 'var(--natus-noche)'}
            stroke="var(--natus-tinta)"
            strokeOpacity={on ? 1 : 0.45}
            strokeWidth={1.3}
          />
        );
      })}
    </svg>
  );
}
