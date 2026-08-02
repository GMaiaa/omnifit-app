import { useEffect, useState } from "react";
import {
  Users, Activity, TrendingUp, Zap, Bike, ExternalLink, Loader2, AlertTriangle,
  LogIn, FlaskConical, Trash2, Mail,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { C } from "../lib/theme";
import { Card, CardHeader, DeltaBadge } from "../components/ui";
import { fmtDateShort } from "../lib/format";
import {
  getAdminOverview, getAdminDailyActivity, getAdminDailyLogins,
  getAdminComparisons, getAdminStravaApiUsage,
  getAdminUsers, setUserTestStatus, deleteUserAccount,
} from "./adminService";

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

function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function ComparisonRow({ label, current, previous, currentLabel, previousLabel }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
      <span style={{ color: C.white, fontSize: 13 }}>{label}</span>
      <div className="flex items-center gap-3">
        <span style={{ color: C.gray, fontSize: 12 }}>{currentLabel}: <b style={{ color: C.white }}>{current}</b></span>
        <span style={{ color: C.gray, fontSize: 11 }}>({previousLabel}: {previous})</span>
        <DeltaBadge value={pctChange(current, previous)} />
      </div>
    </div>
  );
}

function UserRow({ u, onToggleTest, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleToggle() {
    setBusy(true);
    try {
      await onToggleTest(u.id, !u.isTest);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteClick() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setBusy(true);
    try {
      await onDelete(u.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 flex-wrap" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5" style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>
          <Mail size={12} style={{ color: C.gray }} />
          <span className="truncate">{u.email ?? "(sem e-mail)"}</span>
          {u.isTest && (
            <span className="flex-shrink-0 rounded-full px-2 py-0.5" style={{ background: `${C.gray}33`, color: C.gray, fontSize: 10 }}>teste</span>
          )}
        </div>
        <div style={{ color: C.gray, fontSize: 11 }} className="mt-0.5">
          Desde {fmtDateShort(u.createdAt)} · {u.workoutCount} treino(s) · {u.loginCount} login(s)
          {u.lastLoginAt && ` · último login ${fmtDateShort(u.lastLoginAt)}`}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleToggle}
          disabled={busy}
          className="rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{
            background: u.isTest ? `${C.positive}22` : C.surface2,
            color: u.isTest ? C.positive : C.gray,
            border: `1px solid ${u.isTest ? C.positive : C.border}`,
          }}
        >
          {u.isTest ? "Desmarcar teste" : "Marcar como teste"}
        </button>
        <button
          onClick={handleDeleteClick}
          disabled={busy}
          className="rounded-full p-1.5 disabled:opacity-50 flex items-center gap-1"
          style={{ color: confirmingDelete ? "#fff" : C.danger, background: confirmingDelete ? C.danger : "transparent", border: `1px solid ${C.danger}` }}
          title={confirmingDelete ? "Clique de novo pra confirmar" : "Excluir conta"}
        >
          <Trash2 size={13} />
          {confirmingDelete && <span className="text-xs font-semibold pr-1">Confirmar?</span>}
        </button>
      </div>
    </div>
  );
}

export function AdminPage() {
  const [excludeTest, setExcludeTest] = useState(true);
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState([]);
  const [logins, setLogins] = useState([]);
  const [comparisons, setComparisons] = useState(null);
  const [stravaUsage, setStravaUsage] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [ov, act, log, comp, strava, userList] = await Promise.all([
          getAdminOverview(excludeTest),
          getAdminDailyActivity(30, excludeTest),
          getAdminDailyLogins(30, excludeTest),
          getAdminComparisons(excludeTest),
          getAdminStravaApiUsage(),
          getAdminUsers(),
        ]);
        setOverview(ov);
        setDaily(act.map((d) => ({ ...d, label: d.day.slice(5) })));
        setLogins(log.map((d) => ({ ...d, label: d.day.slice(5) })));
        setComparisons(comp);
        setStravaUsage(strava);
        setUsers(userList);
      } catch (err) {
        setError(err.message === "NOT_ADMIN" ? "Acesso restrito a administradores." : "Não foi possível carregar as métricas.");
      } finally {
        setLoading(false);
      }
    })();
  }, [excludeTest]);

  async function handleToggleUserTest(userId, markAsTest) {
    setUsersError("");
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isTest: markAsTest } : u)));
    try {
      await setUserTestStatus(userId, markAsTest);
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isTest: !markAsTest } : u)));
      setUsersError("Não foi possível atualizar. Tente de novo.");
    }
  }

  async function handleDeleteUser(userId) {
    setUsersError("");
    const prev = users;
    setUsers((current) => current.filter((u) => u.id !== userId));
    try {
      await deleteUserAccount(userId);
    } catch (err) {
      setUsers(prev);
      setUsersError(err.message === "CANNOT_DELETE_SELF" ? "Você não pode excluir a própria conta por aqui." : "Não foi possível excluir essa conta.");
    }
  }

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
      <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}>
        <div className="flex items-center gap-2" style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>
          <FlaskConical size={15} style={{ color: C.gray }} />
          Excluir usuários teste das métricas
          {overview.testUsersCount > 0 && (
            <span style={{ color: C.gray, fontWeight: 400 }}>({overview.testUsersCount} marcado(s))</span>
          )}
        </div>
        <button
          onClick={() => setExcludeTest((v) => !v)}
          className="relative rounded-full transition-colors"
          style={{ width: 40, height: 22, background: excludeTest ? C.positive : C.border }}
        >
          <span
            className="absolute rounded-full transition-transform"
            style={{ width: 18, height: 18, top: 2, left: 2, background: "#fff", transform: excludeTest ? "translateX(18px)" : "none" }}
          />
        </button>
      </div>

      <Card>
        <CardHeader title="Visão geral" description="Métricas de uso do produto." />
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
        <CardHeader title="Comparativos" description="Hoje vs. ontem, essa semana vs. semana passada." />
        <div className="flex flex-col">
          <ComparisonRow label="Treinos criados hoje" current={comparisons.workoutsToday} previous={comparisons.workoutsYesterday} currentLabel="hoje" previousLabel="ontem" />
          <ComparisonRow label="Treinos criados essa semana" current={comparisons.workoutsThisWeek} previous={comparisons.workoutsLastWeek} currentLabel="essa sem." previousLabel="sem. passada" />
          <ComparisonRow label="Logins hoje" current={comparisons.loginsToday} previous={comparisons.loginsYesterday} currentLabel="hoje" previousLabel="ontem" />
          <ComparisonRow label="Logins essa semana" current={comparisons.loginsThisWeek} previous={comparisons.loginsLastWeek} currentLabel="essa sem." previousLabel="sem. passada" />
          <ComparisonRow label="Novos usuários hoje" current={comparisons.newUsersToday} previous={comparisons.newUsersYesterday} currentLabel="hoje" previousLabel="ontem" />
          <ComparisonRow label="Chamadas à API do Strava hoje" current={comparisons.stravaCallsToday} previous={comparisons.stravaCallsYesterday} currentLabel="hoje" previousLabel="ontem" />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Atividade diária" description="Treinos criados por dia, últimos 30 dias." right={<TrendingUp size={16} style={{ color: C.gray }} />} />
          <div style={{ width: "100%", height: 200 }}>
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

        <Card>
          <CardHeader title="Logins diários" description="Últimos 30 dias." right={<LogIn size={16} style={{ color: C.gray }} />} />
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={logins} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.gray }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.gray }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="count" name="Logins" stroke="#8B5CF6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

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
        <CardHeader title="Usuários" description="Marque contas de teste ou exclua contas permanentemente." />
        <div className="flex flex-col max-h-96 overflow-y-auto">
          {users.map((u) => (
            <UserRow key={u.id} u={u} onToggleTest={handleToggleUserTest} onDelete={handleDeleteUser} />
          ))}
        </div>
        {usersError && <div className="mt-3 text-xs" style={{ color: C.danger }}>{usersError}</div>}
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
