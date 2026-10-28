import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import CoachAccessRequest from "./CoachAccessRequest";
import CoachApplicationReview from "./CoachApplicationReview";
const mocks = vi.hoisted(() => ({ request: vi.fn(), review: vi.fn() }));
vi.mock("../../services/api", () => ({
  api: {
    requestCoachAccess: mocks.request,
    reviewCoachApplication: mocks.review,
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
const user = {
  id: "athlete",
  name: "Ana",
  email: "ana@example.invalid",
  role: "Cliente",
  isActive: true,
};
it("sends an application and shows pending status without changing role", async () => {
  mocks.request.mockResolvedValue({});
  const onSubmitted = vi.fn();
  render(<CoachAccessRequest user={user} onSubmitted={onSubmitted} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Solicitar acceso como coach" }),
  );
  fireEvent.change(screen.getByLabelText("Tu experiencia como coach"), {
    target: { value: "Cinco años entrenando alumnos" },
  });
  fireEvent.change(screen.getByLabelText(/cómo piensas usar/i), {
    target: { value: "Preparar planes para mis alumnos" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Solicitud en revisión",
  );
  expect(mocks.request).toHaveBeenCalledWith({
    experience: "Cinco años entrenando alumnos",
    intendedUse: "Preparar planes para mis alumnos",
  });
  expect(onSubmitted).toHaveBeenCalled();
});
it("shows rejection feedback and allows a new request", () => {
  render(
    <CoachAccessRequest
      user={{
        ...user,
        coachApplication: {
          status: "rejected",
          reason: "Describe tu experiencia",
        },
      }}
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Describe tu experiencia",
  );
  expect(
    screen.getByRole("button", { name: "Enviar nueva solicitud" }),
  ).toBeEnabled();
});
it("does not offer another request while pending", () => {
  render(
    <CoachAccessRequest
      user={{ ...user, coachApplication: { status: "pending" } }}
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("Solicitud en revisión");
  expect(screen.queryByRole("button")).toBeNull();
});
it("requires a reason for rejecting and sends the decision", async () => {
  const pending = {
    ...user,
    coachApplication: {
      status: "pending",
      experience: "Experiencia",
      intendedUse: "Planificación",
    },
  };
  const onReviewed = vi.fn();
  mocks.review.mockResolvedValue({
    ...pending,
    coachApplication: { status: "rejected" },
  });
  render(<CoachApplicationReview users={[pending]} onReviewed={onReviewed} />);
  expect(screen.getByRole("button", { name: "Rechazar" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/motivo del rechazo/i), {
    target: { value: "Cupo completo" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
  await waitFor(() => expect(onReviewed).toHaveBeenCalled());
  expect(mocks.review).toHaveBeenCalledWith(
    "athlete",
    "rejected",
    "Cupo completo",
  );
});
it("shows failed reviews and keeps the application available", async () => {
  mocks.review.mockRejectedValue(new Error("Sin conexión"));
  render(
    <CoachApplicationReview
      users={[{ ...user, coachApplication: { status: "pending" } }]}
      onReviewed={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión");
  expect(screen.getByRole("button", { name: "Aprobar" })).toBeEnabled();
});

it("shows the admin decision after a session refresh", async () => {
  mocks.request.mockResolvedValue({});
  const { rerender } = render(<CoachAccessRequest user={user} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Solicitar acceso como coach" }),
  );
  fireEvent.change(screen.getByLabelText("Tu experiencia como coach"), {
    target: { value: "Entreno alumnos hace cinco años" },
  });
  fireEvent.change(screen.getByLabelText(/cómo piensas usar/i), {
    target: { value: "Preparar planes y evaluar el progreso" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Solicitud en revisión",
  );
  rerender(
    <CoachAccessRequest
      user={{
        ...user,
        coachApplication: {
          status: "rejected",
          reason: "Cupos de beta completos",
        },
      }}
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Cupos de beta completos",
  );
});
