import { AlertCircle, Lightbulb, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Insight, InsightTone } from "@/lib/insights";

const TONE: Record<InsightTone, { icon: LucideIcon; cls: string; label: string }> = {
  positive: { icon: TrendingUp, cls: "bg-success/10 text-success", label: "Bien" },
  neutral: { icon: Lightbulb, cls: "bg-primary/10 text-primary", label: "Dato" },
  attention: { icon: AlertCircle, cls: "bg-warning/15 text-warning", label: "Atención" },
};

const InsightCards = ({ insights, enoughData }: { insights: Insight[]; enoughData: boolean }) => (
  <section aria-label="Hallazgos" className="space-y-2">
    <h3 className="px-1 text-sm font-semibold text-foreground">Lo que dicen tus datos</h3>
    {insights.length === 0 ? (
      <div className="surface flex items-start gap-3 p-4 text-sm text-muted-foreground">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        {enoughData
          ? "Sin patrones claros en este periodo. Prueba con un rango más largo."
          : "Necesito unos días más de tareas y sueño para encontrar patrones confiables."}
      </div>
    ) : (
      <div className="grid gap-2 md:grid-cols-3">
        {insights.map((ins, i) => {
          const t = TONE[ins.tone];
          return (
            <article key={ins.id} className="surface flex gap-3 p-4 animate-detail-in" style={{ animationDelay: `${i * 70}ms` }}>
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", t.cls)}>
                <t.icon className="h-4 w-4" aria-hidden />
                <span className="sr-only">{t.label}</span>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug text-foreground">{ins.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ins.detail}</p>
              </div>
            </article>
          );
        })}
      </div>
    )}
  </section>
);

export default InsightCards;
