"use client";

type Point = { month: string; count: number };

export function SimpleLine({ data }: { data: Point[] }) {
  // Very light placeholder: render an SVG polyline from monthly data
  const width = 500;
  const height = 240;
  const pad = 24;
  const xs = data.map((_, i) => pad + (i * (width - 2 * pad)) / Math.max(1, data.length - 1));
  const max = Math.max(1, ...data.map(d => d.count));
  const ys = data.map(d => height - pad - (d.count / max) * (height - 2 * pad));
  const points = xs.map((x, i) => `${x},${ys[i]}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <rect x="0" y="0" width={width} height={height} fill="transparent" stroke="rgba(255,255,255,0.1)" />
      <polyline points={points} fill="none" stroke="#4ade80" strokeWidth="2" />
    </svg>
  );
}

export function SimpleBars({ a, b }: { a: Point[]; b: Point[] }) {
  const width = 500;
  const height = 240;
  const pad = 24;
  const n = Math.max(a.length, b.length);
  const max = Math.max(1, ...a.map(d => d.count), ...b.map(d => d.count));
  const band = (width - 2 * pad) / Math.max(1, n);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <rect x="0" y="0" width={width} height={height} fill="transparent" stroke="rgba(255,255,255,0.1)" />
      {Array.from({ length: n }).map((_, i) => {
        const ax = pad + i * band + band * 0.1;
        const aw = band * 0.35;
        const av = a[i]?.count || 0;
        const ah = ((av / max) * (height - 2 * pad));
        const ay = height - pad - ah;

        const bx = pad + i * band + band * 0.55;
        const bw = band * 0.35;
        const bv = b[i]?.count || 0;
        const bh = ((bv / max) * (height - 2 * pad));
        const by = height - pad - bh;

        return (
          <g key={i}>
            <rect x={ax} y={ay} width={aw} height={ah} fill="#60a5fa" />
            <rect x={bx} y={by} width={bw} height={bh} fill="#f59e0b" />
          </g>
        );
      })}
    </svg>
  );
}

export function SimpleDonut({ users, news, visitors }: { users: number; news: number; visitors: number }) {
  const width = 300;
  const height = 300;
  const r = 120;
  const cx = width / 2;
  const cy = height / 2;
  const total = Math.max(1, users + news + visitors);
  const segs = [
    { val: users, color: '#60a5fa' },
    { val: news, color: '#f59e0b' },
    { val: visitors, color: '#34d399' },
  ];

  let start = 0;
  const arcs = segs.map(s => {
    const angle = (s.val / total) * Math.PI * 2;
    const end = start + angle;
    const large = angle > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    start = end;
    return { d, color: s.color };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <circle cx={cx} cy={cy} r={r} fill="#111827" />
      {arcs.map((a, i) => (
        <path key={i} d={a.d} fill={a.color} opacity={0.85} />
      ))}
      <circle cx={cx} cy={cy} r={60} fill="white" />
      <text x={cx} y={cy+6} textAnchor="middle" fill="#111" fontSize="20" fontWeight="600">{total}</text>
    </svg>
  );
}


