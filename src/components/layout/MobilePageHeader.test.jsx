import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import MobilePageHeader from "./MobilePageHeader";

it("regresa sin enviar el evento del clic como destino de navegación", async () => {
  const onBack = vi.fn((fallbackPage = "dashboard") => fallbackPage);
  render(
    <MobilePageHeader title="Imágenes de ejercicios" variant="detail" onBack={onBack} />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Volver" }));

  expect(onBack).toHaveBeenCalledExactlyOnceWith();
  expect(onBack).toHaveReturnedWith("dashboard");
});
