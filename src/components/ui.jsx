import { TrendingUp, TrendingDown } from "lucide-react";
import { BRAND_GRADIENT_STOPS, C } from "../lib/theme";

/* ---------------------------------------------------------
   LOGO — the Omnifit infinity mark, stroked with the brand gradient
--------------------------------------------------------- */
export function LogoMark({ size = 40 }) {
  const gradientId = "omnifit-logo-gradient";
  return (
    <svg
      width={size} height={size} viewBox="0 0 48 48" fill="none"
      style={{ flexShrink: 0 }}
      role="img" aria-label="Omnifit"
    >
      <defs>
        <linearGradient id={gradientId} x1="2" y1="24" x2="46" y2="24" gradientUnits="userSpaceOnUse">
          {BRAND_GRADIENT_STOPS.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
      </defs>
      <path
        d="M14 16c-4.4 0-8 3.6-8 8s3.6 8 8 8c3.2 0 5.9-1.9 7.2-4.6.4-.8 1.6-.8 2 0C24.5 30.1 27.2 32 30.4 32c4.4 0 8-3.6 8-8s-3.6-8-8-8c-3.2 0-5.9 1.9-7.2 4.6-.4.8-1.6.8-2 0C19.9 17.9 17.2 16 14 16Z"
        stroke={`url(#${gradientId})`}
        strokeWidth="4.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------------------------------------------------------
   PRIMITIVES
--------------------------------------------------------- */
export function Card({ children, style, className = "" }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: C.surface, border: `1px solid ${C.border}`, ...style }}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, unit, icon: Icon, accent, delta }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider" style={{ color: C.gray, fontWeight: 600 }}>
          {label}
        </span>
        {Icon && (
          <div
            className="rounded-lg p-1.5"
            style={{ background: `${accent}1A`, color: accent }}
          >
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 28, color: C.white }}>
          {value}
        </span>
        {unit && <span style={{ color: C.gray, fontSize: 13 }}>{unit}</span>}
      </div>
      {delta !== undefined && delta !== null && (
        <div className="flex items-center gap-1" style={{ color: delta >= 0 ? C.positive : C.danger, fontSize: 12, fontWeight: 600 }}>
          {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          <span>{Math.abs(delta).toFixed(0)}% vs. semana anterior</span>
        </div>
      )}
    </Card>
  );
}

export function Pill({ children, color }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: `${color}22`, color }}
    >
      {children}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <Card className="flex flex-col items-center justify-center text-center py-16 gap-3">
      <div className="rounded-full p-4" style={{ background: `${C.positive}14` }}>
        <Icon size={26} style={{ color: C.positive }} />
      </div>
      <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 17 }}>
        {title}
      </h3>
      {description && (
        <p style={{ color: C.gray, fontSize: 14, maxWidth: 320 }}>{description}</p>
      )}
    </Card>
  );
}

export function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg p-0.5" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="rounded-md px-2.5 py-1 text-xs font-semibold transition"
          style={{
            background: value === opt.value ? C.positive : "transparent",
            color: value === opt.value ? C.bg : C.gray,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none"
      style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export function DeltaBadge({ value, suffix = "%", positiveIsGood = true, precision = 1 }) {
  if (value === null || value === undefined || !isFinite(value)) {
    return <span style={{ color: C.gray, fontSize: 12 }}>—</span>;
  }
  const isGood = positiveIsGood ? value >= 0 : value <= 0;
  const color = value === 0 ? C.gray : isGood ? C.positive : C.danger;
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color }}>
      <Icon size={12} />
      {value >= 0 ? "+" : ""}{value.toFixed(precision)}{suffix}
    </span>
  );
}

export function CardHeader({ title, description, right }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
      <div>
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 15 }}>
          {title}
        </h3>
        {description && <p className="mt-0.5 text-xs" style={{ color: C.gray }}>{description}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}
