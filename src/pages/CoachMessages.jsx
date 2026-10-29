import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Inbox,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import "./coachMessages.css";

const mergeMessages = (previous, incoming) =>
  [
    ...new Map(
      [...previous, ...incoming].map((message) => [message._id, message]),
    ).values(),
  ].sort((a, b) => a._id.localeCompare(b._id));
const dateLabel = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
};
const dayLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Conversación";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hoy";
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";
  return date.toLocaleDateString("es-BO", { day: "numeric", month: "long" });
};

export default function CoachMessages({ onNavigate = () => {} }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(() => {
    const requested = sessionStorage.getItem("rirfit_message_peer");
    return requested || "";
  });
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
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
  const composerRef = useRef(null);
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
            window.dispatchEvent(new Event("coach-messages-read"));
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

  useEffect(() => {
    if (!draft && composerRef.current)
      composerRef.current.style.height = "auto";
  }, [draft]);
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
        window.dispatchEvent(new Event("coach-messages-read"));
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
  const filtered = conversations.filter(
    ({ peer, unread }) =>
      peer.name
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")) &&
      (!unreadOnly || unread > 0),
  );
  const unreadTotal = conversations.reduce(
    (total, item) => total + (item.unread || 0),
    0,
  );

  return (
    <main
      className={`messenger ${selectedId ? "messenger--thread-open" : ""}`}
      aria-label="Centro de mensajes"
    >
      <aside className="messenger__sidebar" aria-label="Conversaciones">
        <header className="messenger__list-header">
          <div className="messenger__eyebrow">
            <span /> RIRFIT CONNECT
          </div>
          <div className="messenger__heading-row">
            <h1>Mensajes</h1>
            <button
              type="button"
              aria-label="Actualizar mensajes"
              className="messenger__icon-button"
              onClick={() => setReload((value) => value + 1)}
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <p>
            {isAthlete
              ? "Tu progreso empieza con una conversación."
              : "Más cerca de cada uno de tus alumnos."}
          </p>
        </header>
        <label className="messenger__search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Buscar conversación"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar una conversación"
          />
        </label>
        <div
          className="messenger__filters"
          role="group"
          aria-label="Filtrar conversaciones"
        >
          <button
            type="button"
            aria-pressed={!unreadOnly}
            onClick={() => setUnreadOnly(false)}
          >
            Todos
          </button>
          <button
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly(true)}
          >
            Sin leer {unreadTotal > 0 && <span>{unreadTotal}</span>}
          </button>
        </div>
        {listError && (
          <div role="alert" className="messenger__error">
            <p>{listError}</p>
            <button
              type="button"
              onClick={() => setReload((value) => value + 1)}
            >
              Reintentar conversaciones
            </button>
          </div>
        )}
        <div className="messenger__contacts">
          {loading && (
            <p role="status" className="messenger__loading">
              <LoaderCircle size={18} className="animate-spin" /> Cargando
              conversaciones...
            </p>
          )}
          {filtered.map((item) => (
            <button
              type="button"
              key={item.peer.id}
              onClick={() => select(item.peer.id)}
              aria-pressed={selectedId === item.peer.id}
              className={`messenger__contact ${item.unread ? "has-unread" : ""}`}
            >
              <ProfileAvatar
                photoId={item.peer.avatarPhotoId}
                name={item.peer.name}
                className="messenger__avatar"
                fallbackClassName="messenger__avatar-fallback"
              />
              <span className="messenger__contact-copy">
                <span className="messenger__contact-top">
                  <strong>{item.peer.name}</strong>
                  <time>
                    {item.lastMessage
                      ? dateLabel(item.lastMessage.createdAt)
                      : ""}
                  </time>
                </span>
                <span className="messenger__contact-bottom">
                  <span>
                    {item.lastMessage?.senderId === currentId && (
                      <CheckCheck size={15} aria-hidden="true" />
                    )}
                    {item.lastMessage?.text || "Iniciar conversación"}
                  </span>
                  {item.unread > 0 && (
                    <b aria-label={`${item.unread} mensajes sin leer`}>
                      {item.unread > 99 ? "99+" : item.unread}
                    </b>
                  )}
                </span>
              </span>
            </button>
          ))}
          {!loading && !listError && !filtered.length && (
            <div className="messenger__list-empty">
              <Inbox size={30} strokeWidth={1.4} />
              <p>
                {conversations.length
                  ? unreadOnly
                    ? "Estás al día. No tienes mensajes sin leer."
                    : "No hay coincidencias con tu búsqueda."
                  : isAthlete
                    ? "Vincula un coach desde tu perfil para iniciar una conversación."
                    : "Invita a tu primer alumno para iniciar una conversación."}
              </p>
              {!conversations.length && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(isAthlete ? "perfil" : "coach_athletes")
                  }
                >
                  {isAthlete ? "Ir a mi perfil" : "Ir a alumnos"}
                </button>
              )}
            </div>
          )}
        </div>
        <footer className="messenger__list-footer">
          <MessageCircle size={15} />{" "}
          {isAthlete
            ? "Un espacio para ti y tu coach"
            : "Acompaña, escucha y motiva"}
        </footer>
      </aside>
      <section
        aria-label="Conversación seleccionada"
        className="messenger__thread"
      >
        {selectedId ? (
          <>
            <header className="messenger__thread-header">
              <button
                type="button"
                aria-label="Volver a conversaciones"
                onClick={() => select("")}
                className="messenger__back"
              >
                <ArrowLeft size={22} />
              </button>
              <ProfileAvatar
                photoId={selected?.peer.avatarPhotoId}
                name={selected?.peer.name}
                className="messenger__avatar messenger__avatar--small"
                fallbackClassName="messenger__avatar-fallback"
              />
              <div className="messenger__peer">
                <h2>{selected?.peer.name || "Conversación"}</h2>
                <span>{isAthlete ? "Tu coach" : "Atleta vinculado"}</span>
              </div>
              <button
                type="button"
                aria-label="Actualizar conversación"
                className="messenger__icon-button"
                onClick={() => setReload((value) => value + 1)}
              >
                <RefreshCw size={18} />
              </button>
            </header>
            {threadError && (
              <div role="alert" className="messenger__error">
                <p>{threadError}</p>
                <button
                  type="button"
                  onClick={() => setReload((value) => value + 1)}
                >
                  Reintentar mensajes
                </button>
              </div>
            )}
            <div
              role="log"
              aria-label="Historial de mensajes"
              className="messenger__history"
            >
              {cursor && (
                <button
                  type="button"
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  className="messenger__load-older"
                >
                  {loadingOlder ? "Cargando..." : "Cargar mensajes anteriores"}
                </button>
              )}
              {loadingMessages && (
                <p role="status" className="messenger__loading">
                  <LoaderCircle size={18} className="animate-spin" /> Cargando
                  mensajes...
                </p>
              )}
              {!loadingMessages && !threadError && !messages.length && (
                <div className="messenger__conversation-start">
                  <MessageCircle size={22} />
                  <p>Todo empieza con un mensaje.</p>
                  <span>
                    Comparte tus avances, preguntas o el próximo paso.
                  </span>
                </div>
              )}
              {messages.map((message, index) => {
                const mine = message.senderId === currentId;
                const showDay =
                  index === 0 ||
                  new Date(message.createdAt).toDateString() !==
                    new Date(messages[index - 1].createdAt).toDateString();
                return (
                  <Fragment key={message._id}>
                    {showDay && (
                      <div className="messenger__day">
                        <span>{dayLabel(message.createdAt)}</span>
                      </div>
                    )}
                    <article
                      className={`messenger__bubble ${mine ? "messenger__bubble--sent" : "messenger__bubble--received"}`}
                    >
                      <p>{message.text}</p>
                      <footer>
                        <time dateTime={message.createdAt}>
                          {dateLabel(message.createdAt)}
                        </time>
                        {mine && (
                          <span
                            className={message.readAt ? "is-read" : ""}
                            aria-label={message.readAt ? "Leído" : "Enviado"}
                            title={message.readAt ? "Leído" : "Enviado"}
                          >
                            {message.readAt ? (
                              <CheckCheck size={16} />
                            ) : (
                              <Check size={16} />
                            )}
                          </span>
                        )}
                      </footer>
                    </article>
                  </Fragment>
                );
              })}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="messenger__composer">
              {sendError && (
                <p role="alert" className="messenger__send-error">
                  {sendError}
                </p>
              )}
              <div className="messenger__composer-row">
                <label className="sr-only" htmlFor="coach-message-text">
                  Escribe un mensaje
                </label>
                <textarea
                  id="coach-message-text"
                  ref={composerRef}
                  value={draft}
                  maxLength={2000}
                  rows={1}
                  onChange={(event) => {
                    setDrafts((previous) => ({
                      ...previous,
                      [selectedId]: event.target.value,
                    }));
                    event.target.style.height = "auto";
                    event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`;
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Escribe un mensaje..."
                />
                <button
                  type="submit"
                  aria-label={sending ? "Enviando mensaje" : "Enviar mensaje"}
                  disabled={sending || !selected || !draft.trim()}
                  className="messenger__send"
                >
                  {sending ? (
                    <LoaderCircle size={21} className="animate-spin" />
                  ) : (
                    <Send size={21} />
                  )}
                  <span className="sr-only">
                    {sending ? "Enviando..." : "Enviar mensaje"}
                  </span>
                </button>
              </div>
              <div className="messenger__composer-hint">
                <span>Enter para enviar · Shift + Enter para nueva línea</span>
                <span>{draft.length}/2000</span>
              </div>
            </form>
          </>
        ) : (
          <div className="messenger__welcome">
            <div className="messenger__welcome-art">
              <MessageCircle size={56} strokeWidth={1.2} />
              <span>
                <CheckCheck size={24} />
              </span>
            </div>
            <span className="messenger__eyebrow">CONECTA CON TU PROGRESO</span>
            <h2>
              Una buena conversación
              <br />
              hace la diferencia.
            </h2>
            <p>
              {isAthlete
                ? "Selecciona a tu coach para compartir tus avances y resolver tus dudas."
                : "Selecciona un chat para acompañar a tus alumnos, una conversación a la vez."}
            </p>
            <div className="messenger__welcome-note">
              <span /> Tus conversaciones, en un solo lugar
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
