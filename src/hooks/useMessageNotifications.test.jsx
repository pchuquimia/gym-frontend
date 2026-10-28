import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { useMessageNotifications } from "./useMessageNotifications";

const mocks = vi.hoisted(() => ({ inbox: vi.fn(), notify: vi.fn() }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "athlete", role: "Cliente" } }),
}));
vi.mock("../services/api", () => ({
  api: { getMessageConversations: mocks.inbox },
}));
vi.mock("../utils/toast", () => ({ toast: { info: mocks.notify } }));
const incoming = (id = "message-1") => ({
  peer: { id: "coach", name: "Diego Coach" },
  unread: 1,
  lastMessage: { _id: id, senderId: "coach", recipientId: "athlete" },
});
const setup = (page = "dashboard") => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const navigate = vi.fn();
  const hook = renderHook(
    ({ activePage }) => useMessageNotifications(activePage, navigate),
    {
      initialProps: { activePage: page },
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  );
  return { ...hook, client, navigate };
};
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.inbox.mockResolvedValue({ conversations: [] });
});

it("notifies the athlete of a new incoming message and opens the matching conversation", async () => {
  const { result, navigate, client } = setup();
  await waitFor(() => expect(result.current).toBe(0));
  mocks.inbox.mockResolvedValue({ conversations: [incoming()] });
  act(() => window.dispatchEvent(new Event("coach-messages-read")));
  await waitFor(() => expect(result.current).toBe(1));
  expect(mocks.notify).toHaveBeenCalledWith(
    "Nuevo mensaje de tu coach",
    expect.objectContaining({ description: "Diego Coach" }),
  );
  act(() => mocks.notify.mock.calls[0][1].action.onClick());
  expect(navigate).toHaveBeenCalledWith("coach_messages");
  expect(sessionStorage.getItem("rirfit_message_peer")).toBe("coach");
  await act(() => client.invalidateQueries({ queryKey: ["message-inbox"] }));
  expect(mocks.notify).toHaveBeenCalledTimes(1);
  mocks.inbox.mockResolvedValue({
    conversations: [{ ...incoming(), unread: 0 }],
  });
  act(() => window.dispatchEvent(new Event("coach-messages-read")));
  await waitFor(() => expect(result.current).toBe(0));
});

it("does not repeat an alert for messages already visible in the conversation page", async () => {
  mocks.inbox.mockResolvedValue({ conversations: [incoming()] });
  const { result, rerender } = setup("coach_messages");
  await waitFor(() => expect(result.current).toBe(1));
  rerender({ activePage: "dashboard" });
  expect(mocks.notify).not.toHaveBeenCalled();
});
