import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addPhoto: vi.fn(),
  getPhotoSummary: vi.fn(),
  getPhotos: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    updateAccount: vi.fn(),
    user: { id: "athlete-1", role: "Cliente" },
  }),
}));

vi.mock("../context/TrainingContext", () => ({
  useTrainingData: () => ({
    addPhoto: mocks.addPhoto,
    updatePhoto: vi.fn(),
    deletePhoto: vi.fn(),
    dataOwnerId: "",
    trainings: [
      {
        id: "training-1",
        date: "2026-09-12",
        routineName: "Tren superior",
      },
    ],
  }),
}));

vi.mock("../context/UserContext", () => ({
  useUserProfile: () => ({ refreshProfile: vi.fn() }),
}));

vi.mock("../services/api", () => ({
  api: {
    getPhotoSummary: mocks.getPhotoSummary,
    getPhotos: mocks.getPhotos,
  },
}));

import PhotosLibrary from "./PhotosLibrary";

const renderLibrary = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PhotosLibrary onNavigate={vi.fn()} />
    </QueryClientProvider>,
  );
};

describe("PhotosLibrary", () => {
  beforeEach(() => {
    mocks.addPhoto.mockReset().mockResolvedValue({ id: "photo-1" });
    mocks.getPhotoSummary.mockReset().mockResolvedValue({ total: 0 });
    mocks.getPhotos.mockReset().mockResolvedValue({
      items: [],
      page: 1,
      limit: 12,
      total: 0,
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:photo-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("revisa la imagen antes de guardarla e infiere el contexto por la sesión", async () => {
    const user = userEvent.setup();
    renderLibrary();

    await user.click(
      screen.getByRole("button", { name: "Añadir foto de progreso" }),
    );

    const file = new File(["photo"], "progreso.png", { type: "image/png" });
    const galleryInput = document.querySelectorAll('input[type="file"]')[1];
    fireEvent.change(galleryInput, { target: { files: [file] } });

    expect(mocks.addPhoto).not.toHaveBeenCalled();
    expect(
      await screen.findByAltText("Vista previa de la foto seleccionada"),
    ).toHaveAttribute("src", "blob:photo-preview");

    await user.click(screen.getByRole("button", { name: /Añadir detalles/ }));
    await user.selectOptions(
      screen.getByLabelText("Vincular a una sesión"),
      "training-1",
    );
    await user.click(screen.getByRole("button", { name: "Guardar foto" }));

    await waitFor(() => expect(mocks.addPhoto).toHaveBeenCalledTimes(1));
    expect(mocks.addPhoto).toHaveBeenCalledWith(
      expect.objectContaining({
        file,
        sessionId: "training-1",
        type: "gym",
        view: "front",
        visibility: "private",
      }),
    );
  });

  it("separa las fotos por recuperar sin ocupar tarjetas de imagen", async () => {
    mocks.getPhotoSummary.mockResolvedValue({
      total: 2,
      available: 0,
      missing: 2,
    });
    mocks.getPhotos.mockResolvedValue({
      items: [
        {
          _id: "missing-1",
          date: "2026-09-10",
          label: "Frontal inicial",
          type: "home",
          view: "front",
          contentStatus: "missing",
        },
        {
          _id: "missing-2",
          date: "2026-09-11",
          label: "Lateral inicial",
          type: "home",
          view: "side",
          contentStatus: "missing",
        },
      ],
      page: 1,
      limit: 12,
      total: 2,
    });

    renderLibrary();

    expect(await screen.findByText("Fotos por recuperar")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Recuperar foto Frontal inicial" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Abrir foto: Frontal inicial/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Contexto")).not.toContainHTML(">Perfil<");
  });
});
