import { StrictMode } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import CoachMessages from "./CoachMessages";
const mocks = vi.hoisted(() => ({
  inbox: vi.fn(),
  thread: vi.fn(),
  send: vi.fn(),
  read: vi.fn(),
  user: { id: "coach", role: "Entrenador" },
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user }),
}));
vi.mock("../services/api", () => ({
  api: {
    getMessageConversations: mocks.inbox,
    getConversationMessages: mocks.thread,
    sendCoachMessage: mocks.send,
    markConversationRead: mocks.read,
  },
}));
vi.mock("../components/profile/ProfileAvatar", () => ({ default: () => null }));
const peer = { id: "athlete", name: "Ana", role: "Cliente" };
const message = (extra = {}) => ({
  _id: "message-2",
  senderId: "coach",
  recipientId: "athlete",
  text: "Mensaje enviado",
  createdAt: "2026-10-28T12:00:00.000Z",
  ...extra,
});
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.user = { id: "coach", role: "Entrenador" };
  mocks.inbox.mockResolvedValue({
    conversations: [{ peer, unread: 1, lastMessage: null }],
  });
  mocks.thread.mockResolvedValue({ messages: [], nextCursor: null });
  mocks.read.mockResolvedValue({ updated: 1 });
  mocks.send.mockResolvedValue({ message: message() });
});
const open = async () => {
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  await waitFor(() => expect(mocks.thread).toHaveBeenCalled());
};
it("sends a real message, appends it and clears the draft", async () => {
  render(<CoachMessages />);
  await open();
  fireEvent.change(screen.getByLabelText("Escribe un mensaje"), {
    target: { value: "Mensaje enviado" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));
  expect(
    await within(screen.getByRole("log")).findByText("Mensaje enviado"),
  ).toBeVisible();
  expect(screen.getByLabelText("Escribe un mensaje")).toHaveValue("");
  expect(mocks.send).toHaveBeenCalledWith("athlete", {
    text: "Mensaje enviado",
    clientMessageId: expect.any(String),
  });
});

it("sends with Enter while preserving Shift+Enter and IME composition", async () => {
  render(<CoachMessages />);
  await open();
  const input = screen.getByLabelText("Escribe un mensaje");
  fireEvent.change(input, { target: { value: "Revisemos el plan" } });
  fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
  fireEvent.keyDown(input, { key: "Enter", isComposing: true });
  expect(mocks.send).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() =>
    expect(mocks.send).toHaveBeenCalledWith(
      "athlete",
      expect.objectContaining({ text: "Revisemos el plan" }),
    ),
  );
  await waitFor(() => expect(input).toHaveValue(""));
});

it("filters unread conversations and restores the complete list", async () => {
  mocks.inbox.mockResolvedValue({
    conversations: [
      { peer, unread: 1 },
      { peer: { id: "other", name: "Luis" }, unread: 0 },
    ],
  });
  render(<CoachMessages />);
  await screen.findByRole("button", { name: /Luis/ });
  fireEvent.click(screen.getByRole("button", { name: /Sin leer/ }));
  expect(screen.queryByRole("button", { name: /Luis/ })).toBeNull();
  expect(screen.getByRole("button", { name: /Ana/ })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Todos" }));
  expect(screen.getByRole("button", { name: /Luis/ })).toBeVisible();
});
it("keeps failed drafts and retries the same message ID", async () => {
  mocks.send.mockRejectedValueOnce(new Error("Sin conexión"));
  render(<CoachMessages />);
  await open();
  fireEvent.change(screen.getByLabelText("Escribe un mensaje"), {
    target: { value: "Mensaje enviado" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión");
  expect(screen.getByLabelText("Escribe un mensaje")).toHaveValue(
    "Mensaje enviado",
  );
  fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));
  await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(2));
  expect(mocks.send.mock.calls[1]).toEqual(mocks.send.mock.calls[0]);
  await waitFor(() =>
    expect(screen.getByLabelText("Escribe un mensaje")).toHaveValue(""),
  );
});
it("marks only received messages in the loaded conversation as read", async () => {
  mocks.thread.mockResolvedValue({
    messages: [
      message({ _id: "incoming", senderId: "athlete", recipientId: "coach" }),
      message(),
    ],
    nextCursor: null,
  });
  render(<CoachMessages />);
  await open();
  await waitFor(() =>
    expect(mocks.read).toHaveBeenCalledWith("athlete", ["incoming"]),
  );
});
it("ignores a slow response from the previous conversation", async () => {
  let resolveOld;
  mocks.inbox.mockResolvedValue({
    conversations: [{ peer }, { peer: { id: "other", name: "Luis" } }],
  });
  mocks.thread.mockImplementation((id) =>
    id === "athlete"
      ? new Promise((resolve) => {
          resolveOld = resolve;
        })
      : Promise.resolve({ messages: [message({ text: "Para Luis" })] }),
  );
  render(<CoachMessages />);
  await open();
  fireEvent.click(screen.getByRole("button", { name: /Luis/ }));
  expect(
    await within(screen.getByRole("log")).findByText("Para Luis"),
  ).toBeVisible();
  await act(async () =>
    resolveOld({ messages: [message({ text: "Privado de Ana" })] }),
  );
  expect(screen.queryByText("Privado de Ana")).toBeNull();
});
it("loads earlier history without losing recent messages", async () => {
  mocks.thread
    .mockResolvedValueOnce({ messages: [message()], nextCursor: "cursor-1" })
    .mockResolvedValueOnce({
      messages: [message({ _id: "message-1", text: "Anterior" })],
      nextCursor: null,
    });
  render(<CoachMessages />);
  await open();
  fireEvent.click(
    await screen.findByRole("button", { name: "Cargar mensajes anteriores" }),
  );
  expect(
    await within(screen.getByRole("log")).findByText("Anterior"),
  ).toBeVisible();
  expect(
    within(screen.getByRole("log")).getByText("Mensaje enviado"),
  ).toBeVisible();
  expect(mocks.thread).toHaveBeenLastCalledWith("athlete", {
    before: "cursor-1",
  });
});
it("opens the conversation requested by the athlete profile", async () => {
  sessionStorage.setItem("rirfit_message_peer", "athlete");
  render(
    <StrictMode>
      <CoachMessages />
    </StrictMode>,
  );
  await waitFor(() =>
    expect(mocks.thread).toHaveBeenCalledWith("athlete", expect.any(Object)),
  );
  expect(sessionStorage.getItem("rirfit_message_peer")).toBeNull();
});
it("shows connection errors separately from an empty inbox and allows retry", async () => {
  mocks.inbox.mockRejectedValueOnce(new Error("Error de red"));
  render(<CoachMessages />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Error de red");
  expect(screen.queryByText(/Invita a tu primer alumno/)).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Reintentar conversaciones" }),
  );
  expect(await screen.findByRole("button", { name: /Ana/ })).toBeVisible();
});
it("offers the athlete a path to linking a coach when no relationship exists", async () => {
  mocks.user = { id: "athlete", role: "Cliente" };
  mocks.inbox.mockResolvedValue({ conversations: [] });
  const onNavigate = vi.fn();
  render(<CoachMessages onNavigate={onNavigate} />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Ir a mi perfil" }),
  );
  expect(onNavigate).toHaveBeenCalledWith("perfil");
});

it("keeps the history when the selected conversation is clicked again", async () => {
  mocks.thread.mockResolvedValue({ messages: [message()], nextCursor: null });
  render(<CoachMessages />);
  await open();
  expect(
    await within(screen.getByRole("log")).findByText("Mensaje enviado"),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /Ana/ }));
  expect(
    within(screen.getByRole("log")).getByText("Mensaje enviado"),
  ).toBeVisible();
});

it("scrolls only the history and preserves the position while reading older messages", async () => {
  render(<CoachMessages />);
  await open();
  const history = screen.getByRole("log");
  Object.defineProperties(history, {
    scrollHeight: { configurable: true, value: 2000 },
    clientHeight: { configurable: true, value: 400 },
  });
  history.scrollTop = 600;
  fireEvent.scroll(history);
  mocks.thread.mockResolvedValue({
    messages: [
      message({
        _id: "message-3",
        senderId: "athlete",
        recipientId: "coach",
        text: "Nueva respuesta",
      }),
    ],
  });
  fireEvent(document, new Event("visibilitychange"));
  await within(history).findByText("Nueva respuesta");
  expect(history.scrollTop).toBe(600);

  history.scrollTop = 1600;
  fireEvent.scroll(history);
  mocks.thread.mockResolvedValue({
    messages: [
      message({
        _id: "message-4",
        senderId: "athlete",
        recipientId: "coach",
        text: "Otra respuesta",
      }),
    ],
  });
  fireEvent(document, new Event("visibilitychange"));
  await within(history).findByText("Otra respuesta");
  expect(history.scrollTop).toBe(2000);
});
