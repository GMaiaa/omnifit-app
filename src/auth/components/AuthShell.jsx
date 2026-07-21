import { BRAND_GRADIENT, C } from "../../lib/theme";
import { LogoMark } from "../../components/ui";

/* Shared page wrapper for every auth screen (login/cadastro/recuperação) —
   dark navy canvas with a soft brand-gradient glow behind the logo, exactly
   the "premium e esportivo" direction from the brief. Keeps the logo/wordmark
   consistent across all three screens so the flow reads as one experience. */
export function AuthShell({ children }) {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-10 sm:py-16 relative overflow-hidden"
      style={{ background: C.bg }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          top: "-18%", left: "50%", transform: "translateX(-50%)",
          width: 620, height: 620, borderRadius: "50%",
          background: BRAND_GRADIENT, opacity: 0.16, filter: "blur(130px)",
        }}
      />

      <div className="w-full max-w-sm relative flex flex-col items-center">
        <div className="flex flex-col items-center gap-3 mb-8">
          <LogoMark size={52} />
          <div className="text-center">
            <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.4, color: C.white }}>OMNIFIT</div>
            <div style={{ fontSize: 10, color: C.gray, letterSpacing: 1.6, textTransform: "uppercase", marginTop: 2 }}>
              Performance. Simplicidade. Você.
            </div>
          </div>
        </div>

        <div
          className="w-full rounded-3xl p-6 sm:p-7 flex flex-col items-center"
          style={{ background: C.surface, border: `1px solid ${C.border}` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
