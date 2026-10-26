import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { toast } from "../../utils/toast";
import AppToaster from "./AppToaster";

afterEach(() => {
  act(() => toast.getToasts().forEach((item) => toast.dismiss(item.id)));
});

describe("AppToaster", () => {
  it("sustituye la activación por la desactivación inmediata", async () => {
    render(<AppToaster />);
    act(() => {
      toast.success("Descanso activado", { id: "rest-timing" });
      toast.success("Descanso desactivado", { id: "rest-timing" });
    });

    expect(await screen.findByText("Descanso desactivado")).toBeVisible();
    expect(screen.queryByText("Descanso activado")).not.toBeInTheDocument();
    expect(toast.getToasts().map((item) => item.title)).toEqual([
      "Descanso desactivado",
    ]);
  });

  it("retira los avisos anteriores sin dejarlos en cola", async () => {
    render(<AppToaster />);
    let latestId;
    act(() => {
      toast.success("Primer aviso");
      toast.info("Segundo aviso");
      latestId = toast.error("Último aviso");
    });

    expect(await screen.findByText("Último aviso")).toBeVisible();
    await waitFor(() => {
      expect(toast.getToasts().map((item) => item.title)).toEqual([
        "Último aviso",
      ]);
      expect(screen.queryByText("Primer aviso")).not.toBeInTheDocument();
      expect(screen.queryByText("Segundo aviso")).not.toBeInTheDocument();
    });
    act(() => toast.dismiss(latestId));
    await waitFor(() =>
      expect(screen.queryByText("Último aviso")).not.toBeInTheDocument(),
    );
    expect(toast.getToasts()).toHaveLength(0);
  });

  it("respeta la actualización más reciente aunque reutilice un aviso anterior", async () => {
    render(<AppToaster />);
    act(() => {
      toast.success("Opción activada", { id: "option" });
      toast.info("Otro aviso");
      toast.success("Opción desactivada", { id: "option" });
    });

    await waitFor(() => {
      expect(screen.getByText("Opción desactivada")).toBeVisible();
      expect(toast.getToasts().map((item) => item.title)).toEqual([
        "Opción desactivada",
      ]);
      expect(screen.queryByText("Otro aviso")).not.toBeInTheDocument();
    });
  });
  it("quita la descripción, acción y tipo del aviso sustituido", async () => {
    render(<AppToaster />);
    act(() => {
      toast.error("No se pudo guardar", {
        description: "Descripción anterior",
        action: { label: "Reintentar", onClick: () => {} },
      });
      toast("Cambio aplicado");
    });

    expect(await screen.findByText("Cambio aplicado")).toBeVisible();
    expect(screen.queryByText("Descripción anterior")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reintentar" }),
    ).not.toBeInTheDocument();
    expect(toast.getToasts()).toHaveLength(1);
    expect(toast.getToasts()[0].type).not.toBe("error");
  });
});
