import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { C } from "../lib/theme";
import { getNotifications, getUnreadCount, markAllNotificationsRead } from "../lib/notifications";

const POLL_INTERVAL_MS = 60_000;

function relativeTime(isoDate) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

/* Sino de notificações no header. Toda vez que um treino novo é criado
   (formulário manual, upload de .fit ou sincronização do Strava), um
   trigger no banco (migration 004) já gera a notificação sozinho — este
   componente só busca e mostra, sem precisar saber de onde cada treino
   veio. Atualiza sozinho a cada 60s (poll simples, sem exigir habilitar
   Realtime no Supabase). */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  async function refresh() {
    try {
      const count = await getUnreadCount();
      setUnread(count);
    } catch {
      // silencioso — não é crítico se a contagem falhar num poll de fundo
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open) {
      setLoading(true);
      try {
        const data = await getNotifications();
        setItems(data);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await markAllNotificationsRead();
    } catch {
      refresh(); // se falhar, recalcula do banco pra não ficar com contagem errada
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        aria-label="Notificações"
        title="Notificações"
        className="relative flex items-center justify-center rounded-full p-2"
        style={{ color: C.gray, border: `1px solid ${C.border}` }}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full"
            style={{ minWidth: 16, height: 16, padding: "0 3px", background: C.danger, color: "#fff", fontSize: 9, fontWeight: 700 }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-2 z-40"
          style={{ background: C.bgSoft, border: `1px solid ${C.border}`, boxShadow: "0 12px 32px rgba(0,0,0,0.4)" }}
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>Notificações</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: C.positive }}
              >
                <CheckCheck size={13} /> Marcar tudo como lido
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto flex flex-col gap-1 mt-1">
            {loading ? (
              <div className="py-8 text-center text-xs" style={{ color: C.gray }}>Carregando…</div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-xs" style={{ color: C.gray }}>Nenhuma notificação ainda.</div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: n.read ? "transparent" : `color-mix(in srgb, ${C.positive} 8%, transparent)` }}
                >
                  {!n.read && (
                    <span className="mt-1.5 rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: C.positive }} />
                  )}
                  <div className={n.read ? "pl-3.5" : ""}>
                    <div style={{ color: C.white, fontSize: 12.5, fontWeight: 600 }}>{n.title}</div>
                    {n.body && <div style={{ color: C.gray, fontSize: 12 }} className="mt-0.5">{n.body}</div>}
                    <div style={{ color: C.gray, fontSize: 10.5 }} className="mt-1">{relativeTime(n.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
