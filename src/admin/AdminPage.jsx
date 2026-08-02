import { useEffect, useState } from "react";
import { Users, Activity, TrendingUp, Zap, Bike, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { C } from "../lib/theme";
import { Card, CardHeader } from "../components/ui";
import { getAdminOverview, getAdminDailyActivity, getAdminStravaApiUsage } from "./adminService";

function StatBlock({ label, value, icon: Icon, hint }) {
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: C.gray, fontSize: 11 }}>
        <Icon size={12} /> {label}
      </div>
      <div style={{ color: C.white, fontWeight: 700, fontSize: 22 }}>{value}</div>
      {hint && <div style={{ color: C.gray, fontSize: 11 }} className="mt-0.5">{hint}</div>}
    </div>
  );
}

/* Painel Admin — visão de métricas de uso real do produto (usuários,
   treinos, conexões) e de uso da API do Strava contra os limites de taxa
   deles. Métricas de infraestrutura (banda, tamanho do banco, invocações
   de Edge Function) não são reconstruídas aqui — o Supabase e a Vercel já
   têm dashboards próprios e mais completos pra isso; a seção final desta
   página só linka pra eles. */
export function AdminPage() {
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState([]);
  const [stravaUsage, setStravaUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [ov, act, strava] = await Promise.all([
          getAdminOverview(),
          getAdminDailyActivity(30),
          getAdminStravaApiUsage(),
        ]);
        setOverview(ov);
        setDaily(act.map((d) => ({ ...d, label: d.day.slice(5) })));
        setStravaUsage(strava);
      } catch (err) {
        setError(err.message === "NOT_ADMIN" ? "Acesso restrito a administradores." : "Não foi possível carregar as métricas.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2" style={{ color: C.gray }}>
        <Loader2 size={18} className="animate-spin" /> Carregando métricas…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2 text-center" style={{ color: C.danger }}>
        <AlertTriangle size={24} />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Visão geral" description="Métricas de uso do produto — todos os usuários." />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatBlock icon={Users} label="Usuários totais" value={overview.totalUsers} />
          <StatBlock icon={Users} label="Novos (7d)" value={overview.newUsers7d} />
          <StatBlock icon={Users} label="Novos (30d)" value={overview.newUsers30d} />
          <StatBlock icon={Activity} label="Ativos (7d)" value={overview.activeUsers7d} hint="com pelo menos 1 treino" />
          <StatBlock icon={Activity} label="Ativos (30d)" value={overview.activeUsers30d} hint="com pelo menos 1 treino" />
          <StatBlock icon={TrendingUp} label="Treinos totais" value={overview.totalWorkouts} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Atividade diária" description="Treinos criados por dia, últimos 30 dias — todas as modalidades." />
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={daily} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.gray }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.gray }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="count" name="Treinos" stroke="#00AEEF" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Treinos por modalidade" description="Só as que já persistem de verdade no banco." />
          <div className="flex flex-col gap-2">
            {Object.entries(overview.workoutsByModality).map(([mod, count]) => (
              <div key={mod} className="flex items-center justify-between text-sm">
                <span style={{ color: C.white, textTransform: "capitalize" }}>{mod}</span>
                <span style={{ color: C.gray, fontWeight: 600 }}>{count}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs" style={{ color: C.gray }}>
            Natação e Hyrox ainda não entram aqui — não persistem no Supabase de verdade ainda.
          </div>
        </Card>

        <Card>
          <CardHeader title="Origem dos treinos" description="De onde vieram os dados." right={<Bike size={16} style={{ color: "#FC5200" }} />} />
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span style={{ color: C.white }}>Conexões com Strava ativas</span>
              <span style={{ color: C.gray, fontWeight: 600 }}>{overview.stravaConnections}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: C.white }}>Treinos importados do Strava</span>
              <span style={{ color: C.gray, fontWeight: 600 }}>{overview.workoutsFromStrava}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: C.white }}>Treinos via upload de .fit</span>
              <span style={{ color: C.gray, fontWeight: 600 }}>{overview.workoutsFromFitUpload}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Uso da API do Strava"
          description="Contra os limites de taxa deles: 200 chamadas/15min, 2000/dia."
          right={<Zap size={16} style={{ color: "#FC5200" }} />}
        />
        <div className="grid grid-cols-3 gap-3">
          <StatBlock icon={Zap} label="Últimos 15min" value={`${stravaUsage.callsLast15Min}/200`} />
          <StatBlock icon={Zap} label="Hoje" value={`${stravaUsage.callsToday}/2000`} />
          <StatBlock icon={AlertTriangle} label="Erros (24h)" value={stravaUsage.errorsLast24h} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Métricas de infraestrutura" description="Banda, tamanho do banco, invocações de função — acompanhe direto nos painéis de origem." />
        <div className="flex flex-col gap-2">
          <a
            href="https://supabase.com/dashboard/project/_/reports"
            target="_blank" rel="noreferrer"
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm"
            style={{ background: C.surface2, color: C.white }}
          >
            Dashboard do Supabase (banco, Edge Functions, Auth)
            <ExternalLink size={14} style={{ color: C.gray }} />
          </a>
          <a
            href="https://vercel.com/dashboard"
            target="_blank" rel="noreferrer"
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm"
            style={{ background: C.surface2, color: C.white }}
          >
            Dashboard da Vercel (banda, builds, deploys)
            <ExternalLink size={14} style={{ color: C.gray }} />
          </a>
        </div>
      </Card>
    </div>
  );
}
