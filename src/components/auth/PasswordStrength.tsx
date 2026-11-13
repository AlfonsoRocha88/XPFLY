export function PasswordStrength({ value, showError }: { value: string; showError?: boolean }) {
  const checks = [
    value.length >= 6,
    value.length >= 10,
    /[A-Z]/.test(value),
    /[0-9]/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte", "Excelente"];
  const colors = [
    "bg-rose-300",
    "bg-rose-300",
    "bg-amber-200",
    "bg-amber-200",
    "bg-emerald-300",
    "bg-emerald-300",
  ];
  const tooShort = value.length > 0 && value.length < 6;
  return (
    <div className="space-y-1.5 px-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              i < score ? colors[score] : "bg-white/15"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${tooShort && showError ? "text-rose-300" : "text-white/60"}`}>
        {tooShort && showError ? "Mínimo 6 caracteres" : `Fuerza: ${labels[score]}`}
      </p>
    </div>
  );
}
