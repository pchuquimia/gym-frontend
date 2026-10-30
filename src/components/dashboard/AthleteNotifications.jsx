import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowUpRight,
  Bell,
  ClipboardList,
  MessageCircle,
  X,
} from "lucide-react";
import "./athlete-notifications.css";

export default function AthleteNotifications({
  notifications = [],
  unread = 0,
  onRead,
  onOpen,
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) onRead?.();
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="mobile-daily-plan__notification"
          aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}
        >
          <Bell aria-hidden="true" />
          {unread > 0 && <i>{unread > 99 ? "99+" : unread}</i>}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="athlete-notifications__overlay" />
        <Dialog.Content className="athlete-notifications">
          <header className="athlete-notifications__header">
            <div>
              <Dialog.Title>Notificaciones</Dialog.Title>
              <Dialog.Description>
                Mensajes y actualizaciones de tu coach.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Cerrar notificaciones">
              <X size={21} />
            </Dialog.Close>
          </header>
          <div className="athlete-notifications__list">
            {!notifications.length && (
              <div className="athlete-notifications__empty">
                <Bell size={30} strokeWidth={1.4} />
                <h3>Estás al día</h3>
                <p>Las novedades de tu coach aparecerán aquí.</p>
              </div>
            )}
            {notifications.map((item) => {
              const message = item.type === "coach_message";
              const actionable =
                onOpen &&
                ((message && item.peerId) ||
                  item.type === "plan_activated" ||
                  item.type === "plan_scheduled");
              const Item = actionable ? "button" : "article";
              return (
                <Item
                  key={item._id || item.id}
                  type={actionable ? "button" : undefined}
                  className="athlete-notifications__item"
                  data-unread={!item.readAt || undefined}
                  onClick={
                    actionable
                      ? () => {
                          onOpen(item);
                          setOpen(false);
                        }
                      : undefined
                  }
                >
                  <span className="athlete-notifications__icon">
                    {message ? (
                      <MessageCircle size={19} />
                    ) : (
                      <ClipboardList size={19} />
                    )}
                  </span>
                  <span className="athlete-notifications__copy">
                    <strong>{item.title}</strong>
                    <span>{item.message}</span>
                    {item.createdAt && (
                      <time dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleString("es-BO", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    )}
                  </span>
                  {actionable && (
                    <ArrowUpRight
                      size={16}
                      className="athlete-notifications__arrow"
                      aria-hidden="true"
                    />
                  )}
                </Item>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
