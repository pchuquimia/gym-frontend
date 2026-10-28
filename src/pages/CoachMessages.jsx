import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

const mergeMessages = (previous, incoming) =>
  [
    ...new Map(
      [...previous, ...incoming].map((message) => [message._id, message]),
    ).values(),
  ].sort((a, b) => a._id.localeCompare(b._id));
const dateLabel = (value) =>
  new Date(value).toLocaleString("es-BO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function CoachMessages({ onNavigate = () => {} }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(() => {
    const requested = sessionStorage.getItem("rirfit_message_peer");
    return requested || "";
  });
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(Boolean(selectedId));
  const [listError, setListError] = useState("");
  const [threadError, setThreadError] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [reload, setReload] = useState(0);
  const selectedRef = useRef(selectedId);
  const sendInFlight = useRef(false);
  const pendingSend = useRef({});
  const endRef = useRef(null);
  const isAthlete = user?.role === "Cliente";
  const currentId = String(user?.id || user?._id || "");
  const selected = conversations.find((item) => item.peer.id === selectedId);
  const draft = drafts[selectedId] || "";

  useEffect(() => {
    sessionStorage.removeItem("rirfit_message_peer");
  }, []);

  const refreshConversations = useCallback(async (signal) => {
    try {
      const data = await api.getMessageConversations({ signal });
      if (signal.aborted) return;
      setConversations(data.conversations || []);
      setListError("");
    } catch (error) {
      if (!signal.aborted)
        setListError(
          error.message || "No se pudieron cargar las conversaciones",
        );
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    const refresh = async () => {
      if (
        inFlight ||
        controller.signal.aborted ||
        document.visibilityState === "hidden"
      )
        return;
      inFlight = true;
      try {
        await refreshConversations(controller.signal);
      } finally {
        inFlight = false;
      }
    };
    Promise.resolve().then(refresh);
    const timer = window.setInterval(refresh, 15_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refreshConversations, reload]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    let initial = true;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      try {
        const data = await api.getConversationMessages(selectedId, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setMessages((previous) => mergeMessages(previous, data.messages || []));
        if (initial) {
          setCursor(data.nextCursor || null);
          initial = false;
        }
        setThreadError("");
        if (document.visibilityState !== "hidden") {
          const unread = (data.messages || [])
            .filter(
              (message) => message.recipientId === currentId && !message.readAt,
            )
            .map((message) => message._id);
          if (unread.length) {
            await api.markConversationRead(selectedId, unread);
            if (!controller.signal.aborted)
              setConversations((previous) =>
                previous.map((item) =>
                  item.peer.id === selectedId
                    ? {
                        ...item,
                        unread: Math.max(0, item.unread - unread.length),
                      }
                    : item,
                ),
              );
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setThreadError(error.message || "No se pudo cargar la conversación");
          if ([403, 404].includes(error.status)) {
            setMessages([]);
            setConversations((previous) =>
              previous.filter((item) => item.peer.id !== selectedId),
            );
          }
        }
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) setLoadingMessages(false);
      }
    };
    refresh();
    const whenVisible = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    const timer = window.setInterval(whenVisible, 15_000);
    document.addEventListener("visibilitychange", whenVisible);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", whenVisible);
    };
  }, [selectedId, currentId, reload]);

  const lastMessageId = messages.at(-1)?._id;
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [lastMessageId]);

  const select = (id) => {
    if (id === selectedId) return;
    selectedRef.current = id;
    setSelectedId(id);
    setMessages([]);
    setCursor(null);
    setLoadingMessages(Boolean(id));
    setThreadError("");
    setSendError("");
  };
  const loadOlder = async () => {
    if (!cursor || loadingOlder) return;
    const peerId = selectedId;
    setLoadingOlder(true);
    try {
      const data = await api.getConversationMessages(peerId, {
        before: cursor,
      });
      if (selectedRef.current !== peerId) return;
      setMessages((previous) => mergeMessages(previous, data.messages || []));
      setCursor(data.nextCursor || null);
      setThreadError("");
      const unread = (data.messages || [])
        .filter(
          (message) => message.recipientId === currentId && !message.readAt,
        )
        .map((message) => message._id);
      if (unread.length && document.visibilityState !== "hidden") {
        await api.markConversationRead(peerId, unread);
        setConversations((previous) =>
          previous.map((item) =>
            item.peer.id === peerId
              ? { ...item, unread: Math.max(0, item.unread - unread.length) }
              : item,
          ),
        );
      }
    } catch (error) {
      if (selectedRef.current === peerId)
        setThreadError(
          error.message || "No se pudieron cargar los mensajes anteriores",
        );
    } finally {
      setLoadingOlder(false);
    }
  };
  const send = async (event) => {
    event.preventDefault();
    const peerId = selectedId;
    const text = draft.trim();
    if (
      !peerId ||
      !selected ||
      !text ||
      text.length > 2000 ||
      sendInFlight.current
    )
      return;
    const payload =
      pendingSend.current[peerId]?.text === text
        ? pendingSend.current[peerId]
        : { text, clientMessageId: crypto.randomUUID() };
    pendingSend.current[peerId] = payload;
    sendInFlight.current = true;
    setSending(true);
    setSendError("");
    try {
      const { message } = await api.sendCoachMessage(peerId, payload);
      delete pendingSend.current[peerId];
      if (selectedRef.current === peerId)
        setMessages((previous) => mergeMessages(previous, [message]));
      setDrafts((previous) =>
        previous[peerId]?.trim() === text
          ? { ...previous, [peerId]: "" }
          : previous,
      );
      setConversations((previous) =>
        previous.map((item) =>
          item.peer.id === peerId ? { ...item, lastMessage: message } : item,
        ),
      );
    } catch (error) {
      if (selectedRef.current === peerId)
        setSendError(
          error.message ||
            "No se pudo enviar. Tu mensaje sigue aquí para reintentarlo.",
        );
    } finally {
      sendInFlight.current = false;
      setSending(false);
    }
  };
  const filtered = conversations.filter(({ peer }) =>
    peer.name.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")),
  );

  return (
    <main className="mx-auto w-full max-w-[1120px] pb-24 text-[color:var(--text)] sm:pb-12">
      <header className="mb-5 flex min-h-16 items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">
            Mensajes
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            {isAthlete
              ? "Habla con tu coach sobre tu entrenamiento."
              : "Conversaciones con tus alumnos vinculados."}
          </p>
        </div>
        <button
          type="button"
          aria-label="Actualizar mensajes"
          onClick={() => setReload((value) => value + 1)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[color:var(--border)]"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>
      {listError ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-400 p-4 text-sm"
        >
          <p>{listError}</p>
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="mt-2 font-semibold"
          >
            Reintentar conversaciones
          </button>
        </div>
      ) : null}
      <div className="grid min-h-[440px] overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] md:grid-cols-[290px_minmax(0,1fr)]">
        <aside
          aria-label="Conversaciones"
          className={`${selectedId ? "hidden md:block" : "block"} border-[color:var(--border)] md:border-r`}
        >
          <label className="relative m-3 block">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[color:var(--text-muted)]" />
            <input
              aria-label="Buscar conversación"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] pl-10 pr-3 text-sm"
              placeholder="Buscar conversación"
            />
          </label>
          {loading ? (
            <p role="status" className="p-5 text-sm">
              Cargando conversaciones...
            </p>
          ) : null}
          {filtered.map((item) => (
            <button
              type="button"
              key={item.peer.id}
              onClick={() => select(item.peer.id)}
              aria-pressed={selectedId === item.peer.id}
              className={`flex min-h-20 w-full items-center gap-3 border-t border-[color:var(--border)] p-4 text-left ${selectedId === item.peer.id ? "bg-[color:var(--surface-subtle)]" : ""}`}
            >
              <ProfileAvatar
                photoId={item.peer.avatarPhotoId}
                name={item.peer.name}
                className="h-10 w-10 shrink-0 rounded-full"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {item.peer.name}
                </span>
                <span className="mt-1 block truncate text-xs text-[color:var(--text-muted)]">
                  {item.lastMessage?.text || "Iniciar conversación"}
                </span>
              </span>
              {item.unread > 0 ? (
                <span
                  aria-label={`${item.unread} mensajes sin leer`}
                  className="theme-accent-solid rounded-full px-2 py-1 text-xs font-semibold"
                >
                  {item.unread}
                </span>
              ) : null}
            </button>
          ))}
          {!loading && !listError && !filtered.length ? (
            <div className="space-y-3 p-5 text-sm">
              <p>
                {conversations.length
                  ? "No hay coincidencias con tu búsqueda."
                  : isAthlete
                    ? "Vincula un coach desde tu perfil para iniciar una conversación."
                    : "Invita a tu primer alumno para iniciar una conversación."}
              </p>
              {!conversations.length ? (
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(isAthlete ? "perfil" : "coach_athletes")
                  }
                  className="font-semibold underline"
                >
                  {isAthlete ? "Ir a mi perfil" : "Ir a alumnos"}
                </button>
              ) : null}
            </div>
          ) : null}
        </aside>
        <section
          aria-label="Conversación seleccionada"
          className={`${selectedId ? "flex" : "hidden md:flex"} min-w-0 flex-col`}
        >
          {selectedId ? (
            <>
              <header className="flex min-h-16 items-center gap-3 border-b border-[color:var(--border)] px-4">
                <button
                  type="button"
                  aria-label="Volver a conversaciones"
                  onClick={() => select("")}
                  className="grid h-11 w-11 place-items-center md:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="min-w-0 truncate font-semibold">
                  {selected?.peer.name || "Conversación"}
                </h2>
              </header>
              {threadError ? (
                <div role="alert" className="m-4 text-sm text-red-500">
                  <p>{threadError}</p>
                  <button
                    type="button"
                    onClick={() => setReload((value) => value + 1)}
                    className="mt-1 font-semibold underline"
                  >
                    Reintentar mensajes
                  </button>
                </div>
              ) : null}
              <div
                role="log"
                aria-label="Historial de mensajes"
                className="max-h-[55dvh] min-h-64 flex-1 space-y-3 overflow-y-auto p-4"
              >
                {cursor ? (
                  <button
                    type="button"
                    onClick={loadOlder}
                    disabled={loadingOlder}
                    className="mx-auto block min-h-11 px-4 text-sm font-semibold"
                  >
                    {loadingOlder
                      ? "Cargando..."
                      : "Cargar mensajes anteriores"}
                  </button>
                ) : null}
                {loadingMessages ? (
                  <p role="status" className="text-sm">
                    Cargando mensajes...
                  </p>
                ) : null}
                {!loadingMessages && !threadError && !messages.length ? (
                  <p className="py-10 text-center text-sm text-[color:var(--text-muted)]">
                    Escribe el primer mensaje.
                  </p>
                ) : null}
                {messages.map((message) => (
                  <article
                    key={message._id}
                    className={`max-w-[88%] rounded-2xl px-4 py-3 ${message.senderId === currentId ? "ml-auto bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : "mr-auto bg-[color:var(--surface-subtle)]"}`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">
                      {message.text}
                    </p>
                    <p className="mt-1 text-right text-[10px] opacity-70">
                      {dateLabel(message.createdAt)}
                      {message.senderId === currentId
                        ? ` · ${message.readAt ? "Leído" : "Enviado"}`
                        : ""}
                    </p>
                  </article>
                ))}
                <div ref={endRef} />
              </div>
              <form
                onSubmit={send}
                className="space-y-2 border-t border-[color:var(--border)] p-3"
              >
                {sendError ? (
                  <p role="alert" className="text-sm text-red-500">
                    {sendError}
                  </p>
                ) : null}
                <label className="sr-only" htmlFor="coach-message-text">
                  Escribe un mensaje
                </label>
                <textarea
                  id="coach-message-text"
                  value={draft}
                  maxLength={2000}
                  rows={3}
                  onChange={(event) =>
                    setDrafts((previous) => ({
                      ...previous,
                      [selectedId]: event.target.value,
                    }))
                  }
                  placeholder="Escribe un mensaje..."
                  className="w-full resize-y rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-base"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[color:var(--text-muted)]">
                    {draft.length}/2000
                  </span>
                  <button
                    disabled={sending || !selected || !draft.trim()}
                    className="theme-accent-solid inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? "Enviando..." : "Enviar mensaje"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="m-auto p-8 text-center text-[color:var(--text-muted)]">
              <MessageCircle className="mx-auto mb-3 h-8 w-8" />
              <p>Selecciona una conversación.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
