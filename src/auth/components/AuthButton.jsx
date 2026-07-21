import { Loader2 } from "lucide-react";
import { BRAND_GRADIENT, C } from "../../lib/theme";

/* Primary (brand gradient) / secondary (outline) button shared by every
   auth screen. Carries enabled / disabled / pressed / loading states. */
export function AuthButton({ children, onClick, type = "button", disabled, loading, variant = "primary" }) {
  const isPrimary = variant === "primary";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition active:scale-[0.98] disabled:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
      style={isPrimary
        ? { background: BRAND_GRADIENT, color: C.bg }
        : { background: C.surface2, color: C.white, border: `1px solid ${C.border}` }}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function AuthDivider({ label }) {
  return (
    <div className="flex items-center gap-3 w-full my-1">
      <div className="flex-1 h-px" style={{ background: C.borderSoft }} />
      <span className="text-xs flex-shrink-0" style={{ color: C.gray }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: C.borderSoft }} />
    </div>
  );
}
