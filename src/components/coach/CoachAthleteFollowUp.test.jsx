import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoachAthleteFollowUp } from "./CoachAthleteProfile";

const { getPhotoContent } = vi.hoisted(() => ({ getPhotoContent: vi.fn() }));
vi.mock("../../services/api", () => ({ api: { getPhotoContent } }));
const openFollowUp = (records = {}) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <CoachAthleteFollowUp
        overview={{
          athlete: { id: "athlete", name: "Ana" },
          plans: [{ _id: "plan", name: "Fuerza base" }],
          followUpRecords: records,
        }}
      />
    </QueryClientProvider>,
  );
afterEach(() => vi.restoreAllMocks());

describe("detalle de la evolución del alumno", () => {
  it("abre el historial de peso ordenado, calcula variaciones, filtra y pagina", async () => {
    const weights = Array.from({ length: 8 }, (_, index) => ({
      _id: `weight-${index}`,
      dateKey: `2026-10-${String(index + 1).padStart(2, "0")}`,
      weightKg: 70 + index,
      note: index === 7 ? "Después del descanso" : "",
      source: "self",
    }));
    openFollowUp({ weights, counts: { weights: 108 } });
    const summary = screen.getByRole("button", {
      name: "Ver historial de peso",
    });
    expect(summary).toHaveTextContent("77 kg");
    expect(summary).toHaveTextContent("108 registros");
    expect(summary).toHaveTextContent("Último:");
    expect(summary.querySelector("p")).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Ver historial de peso" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Peso", exact: true });
    const table = within(dialog).getByRole("table");
    expect(
      within(dialog).getByText("Mostrando los últimos 8 de 108 registros."),
    ).toBeVisible();
    expect(within(table).getAllByRole("row")).toHaveLength(7);
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("77 kg");
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("+1 kg");
    await userEvent.click(within(table).getAllByRole("button")[0]);
    expect(within(dialog).getByText("Después del descanso")).toBeVisible();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Más registros" }),
    );
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(dialog).getByLabelText("Desde")).not.toBeVisible();
    await userEvent.click(
      within(dialog).getByText("Filtrar registros", { exact: true }),
    );
    await userEvent.type(within(dialog).getByLabelText("Desde"), "2026-10-08");
    await waitFor(() =>
      expect(within(table).getAllByRole("row")).toHaveLength(2),
    );
    await userEvent.click(
      within(dialog).getByText("Filtrar registros", { exact: false }),
    );
    expect(within(dialog).getByLabelText("Desde")).not.toBeVisible();
    expect(within(dialog).getByText("Fechas aplicadas")).toBeVisible();
    await userEvent.click(
      within(dialog).getByText("Filtrar registros", { exact: false }),
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Quitar filtros" }),
    );
    expect(within(table).getAllByRole("row")).toHaveLength(7);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("muestra las respuestas completas del check-in, incluidas notas y molestias", async () => {
    openFollowUp({
      checkIns: [
        {
          _id: "check",
          dateKey: "2026-10-29",
          sleep: 4,
          energy: 3,
          stress: 2,
          soreness: 2,
          motivation: 5,
          jointPain: 1,
          readinessScore: 82,
          readinessState: "ready",
          painAreas: ["hombro"],
          notes: "Molestia al elevar el brazo",
        },
      ],
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Ver historial de check-in" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Check-in",
      exact: true,
    });
    expect(
      within(dialog).getByRole("columnheader", { name: "Bienestar" }),
    ).toBeVisible();
    await userEvent.click(
      within(dialog).getByRole("button", { name: /Ver registro del/ }),
    );
    expect(within(dialog).getByText("Hombro", { exact: true })).toBeVisible();
    expect(
      within(dialog).getByText("Molestia al elevar el brazo"),
    ).toBeVisible();
    expect(within(dialog).getByText("Motivación")).toBeVisible();
  });

  it("presenta medidas en centímetros y deja vacíos los valores ausentes", async () => {
    openFollowUp({
      measurements: [
        {
          _id: "measure",
          dateKey: "2026-10-29",
          values: { waist: 80, arm: 32 },
          notes: "Por la mañana",
        },
      ],
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Ver historial de medidas" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Medidas", exact: true });
    expect(within(dialog).getByRole("cell", { name: "80 cm" })).toBeVisible();
    expect(within(dialog).getByRole("cell", { name: "32 cm" })).toBeVisible();
    expect(within(dialog).getAllByRole("cell", { name: "—" })).toHaveLength(4);
    await userEvent.click(
      within(dialog).getByRole("button", { name: /Ver registro del/ }),
    );
    expect(within(dialog).getByText("Por la mañana")).toBeVisible();
  });

  it("abre el balance final con planificación, objetivo y comentario íntegro", async () => {
    openFollowUp({
      assessments: [
        {
          _id: "assessment",
          dateKey: "2026-10-29",
          planId: "plan",
          answers: {
            progress: 4,
            goalReached: "partly",
            pain: "Menos dolor de rodilla",
            feedback: "Me siento más fuerte",
            availabilityChanged: true,
          },
        },
      ],
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Ver historial de evaluación final" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Evaluación final",
      exact: true,
    });
    expect(
      within(dialog).getByRole("cell", { name: "Fuerza base" }),
    ).toBeVisible();
    await userEvent.click(
      within(dialog).getByRole("button", { name: /Ver registro del/ }),
    );
    expect(within(dialog).getByText("Me siento más fuerte")).toBeVisible();
    expect(within(dialog).getByText("Menos dolor de rodilla")).toBeVisible();
  });

  it("carga fotos compartidas mediante el endpoint autorizado y permite ampliarlas", async () => {
    getPhotoContent.mockResolvedValue(
      new Blob(["photo"], { type: "image/png" }),
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:shared-photo");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    openFollowUp({
      photos: [
        {
          _id: "shared",
          date: "2026-10-29",
          view: "front",
          label: "Registro inicial",
          contentStatus: "available",
        },
      ],
    });
    await userEvent.click(
      screen.getByRole("button", {
        name: "Ver historial de fotos de progreso",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Fotos de progreso",
      exact: true,
    });
    expect(
      await within(dialog).findByRole("img", { name: /Vista frontal/ }),
    ).toHaveAttribute("src", "blob:shared-photo");
    expect(getPhotoContent).toHaveBeenCalledWith("/api/photos/shared/content", {
      width: 160,
      height: 160,
    });
    await userEvent.click(
      within(dialog).getByRole("button", { name: /Ampliar foto/ }),
    );
    expect(
      await within(dialog).findByRole("img", { name: /Vista frontal/ }),
    ).toHaveClass("followup-photo-large");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Volver a registros" }),
    );
    expect(within(dialog).getByRole("table")).toBeVisible();
  });

  it.each([
    "check-in",
    "peso",
    "medidas",
    "fotos de progreso",
    "evaluación final",
  ])(
    "mantiene un detalle claro cuando todavía no hay datos de %s",
    async (label) => {
      openFollowUp();
      await userEvent.click(
        screen.getByRole("button", { name: `Ver historial de ${label}` }),
      );
      expect(
        within(screen.getByRole("dialog")).getByText(
          "Todavía no hay registros",
        ),
      ).toBeVisible();
      expect(screen.queryByRole("table")).toBeNull();
    },
  );
});
