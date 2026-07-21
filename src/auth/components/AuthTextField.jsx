import { useId, useState } from "react";
import { C } from "../../lib/theme";

/* Labeled input shared by every auth screen. Carries all the visual states
   the brief asks for: default / focus (brand teal ring) / error (danger
   ring + message) / disabled (dimmed, while the form is submitting). */
export function AuthTextField({
  label, type = "text", value, onChange, onBlur, placeholder,
  icon: Icon, error, touched, rightSlot, autoComplete, disabled, name,
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const showError = touched && !!error;
  const accent = showError ? C.danger : focused ? C.positive : C.gray;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold" style={{ color: C.gray }}>
        {label}
      </label>
      <div
        className="flex items-center gap-2 rounded-xl px-3.5 transition-colors"
        style={{
          background: C.surface2,
          border: `1.5px solid ${showError ? C.danger : focused ? C.positive : C.border}`,
          opacity: disabled ? 0.55 : 1,
        }}
      >
        {Icon && <Icon size={16} style={{ color: accent, flexShrink: 0 }} />}
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={showError}
          aria-describedby={showError ? `${id}-error` : undefined}
          className="w-full min-w-0 bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed"
          style={{ color: C.white }}
        />
        {rightSlot}
      </div>
      {showError && (
        <span id={`${id}-error`} role="alert" className="text-xs" style={{ color: C.danger }}>
          {error}
        </span>
      )}
    </div>
  );
}
