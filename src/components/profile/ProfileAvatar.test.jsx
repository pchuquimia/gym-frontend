import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProfileAvatar from "./ProfileAvatar";
import {
  PROFILE_AVATARS,
  resolveProfileAvatar,
} from "../../utils/profileAvatars";

const { getPhotoContent } = vi.hoisted(() => ({ getPhotoContent: vi.fn() }));
vi.mock("../../services/api", () => ({ api: { getPhotoContent } }));
const renderPhoto = (props) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ProfileAvatar {...props} />
    </QueryClientProvider>,
  );

describe("ProfileAvatar", () => {
  beforeEach(() => getPhotoContent.mockReset());
  afterEach(() => vi.restoreAllMocks());
  it("usa el avatar elegido y no muestra iniciales ni realiza peticiones externas", () => {
    render(<ProfileAvatar name="Pablo Ivan" avatarId="gym-03" />);
    expect(
      screen.getByRole("img", { name: "Avatar deportivo de Pablo Ivan" }),
    ).toHaveAttribute("data-avatar-id", "gym-03");
    expect(screen.queryByText("PI")).toBeNull();
    expect(getPhotoContent).not.toHaveBeenCalled();
  });
  it("mantiene una alternativa estable para cuentas antiguas sin avatar elegido", () => {
    expect(resolveProfileAvatar("", "Ana Martínez")).toEqual(
      resolveProfileAvatar("unknown", " Ana Martínez "),
    );
    expect(resolveProfileAvatar(null)).toBeNull();
    expect(PROFILE_AVATARS).toHaveLength(18);
    expect(
      new Set(
        PROFILE_AVATARS.map((avatar) => `${avatar.image}:${avatar.position}`),
      ).size,
    ).toBe(18);
  });
  it.each(["male", "female"])(
    "asigna únicamente avatares de %s sin inferirlo del nombre",
    (gender) => {
      expect(
        PROFILE_AVATARS.filter((avatar) => avatar.gender === gender),
      ).toHaveLength(9);
      for (const name of [
        "Ana",
        "Pablo",
        "Alex",
        "",
        "Nombre sin coincidencia",
      ])
        expect(resolveProfileAvatar("", name, gender).gender).toBe(gender);
      expect(
        resolveProfileAvatar(
          gender === "male" ? "gym-02" : "gym-01",
          "Alex",
          gender,
        ).gender,
      ).toBe(gender);
    },
  );
  it("muestra una silueta neutra cuando faltan género y elección manual", () => {
    render(<ProfileAvatar name="Ana" />);
    expect(
      screen.getByRole("img", { name: "Perfil de Ana" }),
    ).not.toHaveAttribute("data-avatar-id");
    expect(screen.queryByText("A")).toBeNull();
  });
  it("da prioridad a la foto personal y vuelve al avatar si la imagen no puede mostrarse", async () => {
    getPhotoContent.mockResolvedValue(
      new Blob(["image"], { type: "image/png" }),
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:profile-photo");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    renderPhoto({ name: "Ana", photoId: "photo-1", avatarId: "gym-02" });
    const photo = await screen.findByRole("img", { name: "Foto de Ana" });
    expect(photo).toHaveAttribute("src", "blob:profile-photo");
    fireEvent.error(photo);
    expect(
      await screen.findByRole("img", { name: "Avatar deportivo de Ana" }),
    ).toHaveAttribute("data-avatar-id", "gym-02");
  });
});
