import { BRAND_GRADIENT_STOPS, C } from "../lib/theme";

function dotColor(value) {
  if (value >= 70) return C.positive;
  if (value >= 40) return C.amber;
  return C.danger;
}

export function ScoreGauge({ score, subScores, size = 140 }) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);
  const gradientId = "omnifit-score-gradient";

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2={size} y2={size} gradientUnits="userSpaceOnUse">
            {BRAND_GRADIENT_STOPS.map((s) => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={C.surface2} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={`url(#${gradientId})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="46%" textAnchor="middle" fill={C.white} fontSize={size * 0.26} fontWeight={700} fontFamily="'Poppins', sans-serif">
          {Math.round(score)}
        </text>
        <text x="50%" y="62%" textAnchor="middle" fill={C.gray} fontSize={size * 0.08}>
          /100
        </text>
      </svg>
      <div className="flex flex-col gap-2 w-full">
        {subScores.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span style={{ width: 8, height: 8, borderRadius: 4, background: dotColor(s.value), display: "inline-block", flexShrink: 0 }} />
            <span style={{ color: C.white, fontWeight: 600 }}>{s.label}:</span>
            <span style={{ color: C.gray }}>{s.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
