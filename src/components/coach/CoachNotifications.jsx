import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  LoaderCircle,
  TriangleAlert,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./coachNotifications.css";

const EVENTS = {
  athlete_joined: { title: "Nuevo alumno", Icon: UserPlus },
  intake_submitted: { title: "Evaluación inicial lista", Icon: ClipboardCheck },
  critical_check_in: { title: "Check-in por revisar", Icon: TriangleAlert },
  final_assessment_submitted: {
    title: "Evaluación final lista",
    Icon: ClipboardCheck,
  },
  athlete_account_deleted: { title: "Cuenta eliminada", Icon: UserMinus },
};

const validDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const groupFor = (value) => {
  const date = validDate(value);
  if (!date) return "Anteriores";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return date >= today ? "Hoy" : date >= yesterday ? "Ayer" : "Anteriores";
};
const timeFor = (value) => {
  const date = validDate(value);
  if (!date) return "";
  return date.toLocaleString(
    "es-BO",
    groupFor(value) === "Hoy"
      ? { hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short" },
  );
};
const actorFor = (item, athletes) => {
  const athlete = athletes.find(
    (person) => String(person.id || person._id) === String(item.athleteId),
  );
  if (athlete) return athlete.name;
  return (
    item.message?.match(
      /^(.+?)\s+(?:aceptó|completó|reportó|envió|eliminó|ha eliminado|dio de baja)(?=\s|[.,:]|$)/i,
    )?.[1] || ""
  );
};

export default function CoachNotifications({ athletes = [], onOpenAthlete }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["coach-notifications", String(user?.id || user?._id || "")];
  const feed = useQuery({
    queryKey,
    queryFn: () => api.getCoachNotifications(),
    staleTime: 30_000,
  });
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [marking, setMarking] = useState(false);
  const [readError, setReadError] = useState("");
  const items = Array.isArray(feed.data?.notifications)
    ? feed.data.notifications
    : [];
  const unread = items.filter((item) => !item.readAt).length;
  const filtered = items
    .filter((item) => filter !== "unread" || !item.readAt)
    .sort(
      (a, b) =>
        (validDate(b.createdAt)?.getTime() || 0) -
        (validDate(a.createdAt)?.getTime() || 0),
    );
  const markRead = async () => {
    setMarking(true);
    setReadError("");
    try {
      await api.markCoachNotificationsRead();
      queryClient.setQueryData(queryKey, (previous) => ({
        ...previous,
        unread: 0,
        notifications: (previous?.notifications || []).map((item) => ({
          ...item,
          readAt: item.readAt || new Date().toISOString(),
        })),
      }));
    } catch {
      setReadError("No se pudieron marcar como leídas. Inténtalo de nuevo.");
    } finally {
      setMarking(false);
    }
  };
  const close = () => setOpen(false);
  const selectedActor = selected ? actorFor(selected, athletes) : "";
  const selectedEvent = selected ? EVENTS[selected.type] : null;
  const canOpenAthlete =
    selected?.athleteId &&
    selected?.type !== "athlete_account_deleted" &&
    athletes.some(
      (athlete) =>
        String(athlete.id || athlete._id) === String(selected.athleteId),
    );
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) {
          setSelected(null);
          setReadError("");
          feed.refetch();
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="coach-notifications__trigger"
          aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}
        >
          <Bell size={22} aria-hidden="true" />
          {unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="coach-notifications__overlay" />
        <Dialog.Content className="coach-notifications">
          <div className="coach-notifications__handle" aria-hidden="true" />
          <header className="coach-notifications__header">
            {selected && (
              <button
                type="button"
                aria-label="Volver a notificaciones"
                onClick={() => setSelected(null)}
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <Dialog.Title>
                {selected ? "Detalle del aviso" : "Notificaciones"}
              </Dialog.Title>
              <Dialog.Description>
                {selected
                  ? "Actualización de tu equipo"
                  : unread
                    ? `${unread} sin leer`
                    : "Tu equipo, al día"}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Cerrar notificaciones">
              <X size={20} />
            </Dialog.Close>
          </header>
          {selected ? (
            <div className="coach-notifications__detail">
              <span
                className={`coach-notifications__icon ${selected.type === "critical_check_in" ? "is-attention" : ""}`}
              >
                {selectedEvent ? (
                  <selectedEvent.Icon size={22} />
                ) : (
                  <Bell size={22} />
                )}
              </span>
              <h2>
                {selectedEvent?.title ||
                  selected.title ||
                  "Actualización del equipo"}
              </h2>
              {selectedActor && <strong>{selectedActor}</strong>}
              <time dateTime={selected.createdAt}>
                {validDate(selected.createdAt)?.toLocaleString("es-BO", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              <p>
                {selected.message ||
                  "No hay detalles adicionales para este aviso."}
              </p>
              {canOpenAthlete && (
                <button
                  type="button"
                  className="coach-notifications__open"
                  onClick={() => {
                    close();
                    onOpenAthlete?.(selected.athleteId);
                  }}
                >
                  Ver alumno <ArrowUpRight size={16} />
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="coach-notifications__toolbar">
                <div role="group" aria-label="Filtrar notificaciones">
                  <button
                    type="button"
                    aria-pressed={filter === "all"}
                    onClick={() => setFilter("all")}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    aria-pressed={filter === "unread"}
                    onClick={() => setFilter("unread")}
                  >
                    Sin leer {unread > 0 && <span>{unread}</span>}
                  </button>
                </div>
                <button
                  type="button"
                  className="coach-notifications__mark"
                  aria-label="Marcar todas como leídas"
                  title="Marcar todas como leídas"
                  disabled={!unread || marking}
                  onClick={markRead}
                >
                  {marking ? (
                    <LoaderCircle size={19} className="animate-spin" />
                  ) : (
                    <CheckCheck size={19} />
                  )}
                </button>
              </div>
              {readError && (
                <p role="alert" className="coach-notifications__error">
                  {readError}
                </p>
              )}
              <div className="coach-notifications__list">
                {feed.isPending ? (
                  <div className="coach-notifications__empty" role="status">
                    <LoaderCircle size={26} className="animate-spin" />
                    <p>Cargando notificaciones…</p>
                  </div>
                ) : feed.isError ? (
                  <div className="coach-notifications__empty" role="alert">
                    <BellOff size={28} />
                    <h2>No pudimos cargar los avisos</h2>
                    <button type="button" onClick={() => feed.refetch()}>
                      Reintentar
                    </button>
                  </div>
                ) : !filtered.length ? (
                  <div className="coach-notifications__empty">
                    <CheckCheck size={30} strokeWidth={1.5} />
                    <h2>Estás al día</h2>
                    <p>
                      {filter === "unread"
                        ? "No tienes avisos sin leer."
                        : "Las novedades de tus alumnos aparecerán aquí."}
                    </p>
                  </div>
                ) : (
                  ["Hoy", "Ayer", "Anteriores"].map((group) => {
                    const grouped = filtered.filter(
                      (item) => groupFor(item.createdAt) === group,
                    );
                    if (!grouped.length) return null;
                    return (
                      <section
                        key={group}
                        aria-label={group}
                        className="coach-notifications__group"
                      >
                        <h2>{group}</h2>
                        {grouped.map((item) => {
                          const event = EVENTS[item.type] || {
                            title: item.title || "Actualización del equipo",
                            Icon: Bell,
                          };
                          const actor = actorFor(item, athletes);
                          const score =
                            item.type === "critical_check_in"
                              ? item.message?.match(/\d+\s*\/\s*100/)?.[0]
                              : "";
                          return (
                            <button
                              type="button"
                              key={item._id || item.id}
                              className="coach-notifications__item"
                              data-unread={!item.readAt}
                              onClick={() => setSelected(item)}
                            >
                              <span
                                className={`coach-notifications__icon ${item.type === "critical_check_in" ? "is-attention" : ""}`}
                              >
                                <event.Icon size={19} aria-hidden="true" />
                              </span>
                              <span className="coach-notifications__copy">
                                <strong>{event.title}</strong>
                                <span>
                                  {[actor || item.message || "Tu equipo", score]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </span>
                              <span className="coach-notifications__meta">
                                <time dateTime={item.createdAt}>
                                  {timeFor(item.createdAt)}
                                </time>
                                {!item.readAt ? (
                                  <i aria-label="Sin leer" />
                                ) : (
                                  <ChevronRight size={14} aria-hidden="true" />
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </section>
                    );
                  })
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
