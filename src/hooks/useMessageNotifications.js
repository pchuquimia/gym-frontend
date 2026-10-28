import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../utils/toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export function useMessageNotifications(activePage, onNavigate) {
  const { user } = useAuth();
  const client = useQueryClient();
  const notified = useRef(new Set());
  const userId = String(user?.id || user?._id || "");
  const inbox = useQuery({
    queryKey: ["message-inbox", userId],
    queryFn: ({ signal }) => api.getMessageConversations({ signal }),
    enabled:
      Boolean(userId) &&
      ["Cliente", "Entrenador", "Admin"].includes(user?.role),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const refresh = () => {
      client.invalidateQueries({ queryKey: ["message-inbox", userId] });
      client.invalidateQueries({ queryKey: ["athlete-notifications", userId] });
    };
    window.addEventListener("coach-messages-read", refresh);
    return () => window.removeEventListener("coach-messages-read", refresh);
  }, [client, userId]);

  useEffect(() => {
    for (const conversation of inbox.data?.conversations || []) {
      const message = conversation.lastMessage;
      if (!conversation.unread || !message || message.recipientId !== userId)
        continue;
      const key = `${userId}:${message._id}`;
      if (notified.current.has(key)) continue;
      notified.current.add(key);
      if (user?.role !== "Cliente" || activePage === "coach_messages") continue;
      toast.info("Nuevo mensaje de tu coach", {
        description: conversation.peer.name,
        action: {
          label: "Ver mensaje",
          onClick: () => {
            sessionStorage.setItem("rirfit_message_peer", conversation.peer.id);
            onNavigate?.("coach_messages");
          },
        },
      });
    }
  }, [inbox.data, activePage, userId, user?.role, onNavigate]);

  return (inbox.data?.conversations || []).reduce(
    (total, conversation) => total + (conversation.unread || 0),
    0,
  );
}
