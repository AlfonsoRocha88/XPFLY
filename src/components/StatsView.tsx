import { useMemo } from "react";
import { format, subDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import type { Task, Project } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { CheckCircle, Clock, AlertTriangle, TrendingUp } from "lucide-react";

interface StatsViewProps {
  tasks: Task[];
  projects: Project[];
}

const PRIORITY_COLORS = {
  low: "hsl(142, 60%, 50%)",
  medium: "hsl(45, 90%, 55%)",
  high: "hsl(25, 90%, 55%)",
  urgent: "hsl(0, 72%, 55%)",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const StatsView = ({ tasks, projects }: StatsViewProps) => {
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const overdue = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length;

    // Last 7 days completions
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(date);
      const count = tasks.filter(
        (t) => t.completed_at && startOfDay(new Date(t.completed_at)).getTime() === dayStart.getTime()
      ).length;
      return { day: format(date, "EEE", { locale: es }), completadas: count };
    });

    // Priority distribution
    const byPriority = (["low", "medium", "high", "urgent"] as const).map((p) => ({
      name: PRIORITY_LABELS[p],
      value: tasks.filter((t) => t.priority === p).length,
      color: PRIORITY_COLORS[p],
    })).filter((d) => d.value > 0);

    // Project progress
    const projectProgress = projects.map((p) => {
      const projectTasks = tasks.filter((t) => t.project_id === p.id);
      const projectDone = projectTasks.filter((t) => t.status === "done").length;
      return {
        name: p.name,
        total: projectTasks.length,
        done: projectDone,
        pct: projectTasks.length > 0 ? Math.round((projectDone / projectTasks.length) * 100) : 0,
        color: p.color,
      };
    }).filter((p) => p.total > 0);

    return { total, done, inProgress, overdue, last7Days, byPriority, projectProgress };
  }, [tasks, projects]);

  const summaryCards = [
    { label: "Total", value: stats.total, icon: TrendingUp, color: "text-primary" },
    { label: "Completadas", value: stats.done, icon: CheckCircle, color: "text-[hsl(142,60%,50%)]" },
    { label: "En progreso", value: stats.inProgress, icon: Clock, color: "text-[hsl(250,80%,65%)]" },
    { label: "Vencidas", value: stats.overdue, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <c.icon className={`h-8 w-8 ${c.color}`} />
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Completadas por día</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.last7Days}>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(215, 15%, 55%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(215, 15%, 55%)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(224, 18%, 11%)", border: "1px solid hsl(224, 14%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }} />
                <Bar dataKey="completadas" fill="hsl(250, 80%, 65%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Por prioridad</CardTitle></CardHeader>
          <CardContent>
            {stats.byPriority.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.byPriority} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                    {stats.byPriority.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(224, 18%, 11%)", border: "1px solid hsl(224, 14%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">Sin datos</div>
            )}
          </CardContent>
        </Card>
      </div>

      {stats.projectProgress.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Progreso por proyecto</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {stats.projectProgress.map((p) => (
              <div key={p.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                  <span className="text-muted-foreground">{p.done}/{p.total} ({p.pct}%)</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatsView;
