import { describe, it, expect, vi } from "vitest";
import { api } from "../services/api";
import { fetchProgressTrainings } from "./useProgressData";
vi.mock("../services/api", () => ({ api: { getTrainings: vi.fn() } }));
describe("complete progress history", () => {
  it("follows the server cursor and deduplicates records", async () => {
    api.getTrainings
      .mockResolvedValueOnce({
        items: [{ _id: "a" }],
        hasMore: true,
        nextCursor: "next",
      })
      .mockResolvedValueOnce({
        items: [{ _id: "a" }, { _id: "b" }],
        hasMore: false,
      });
    expect(await fetchProgressTrainings("owner")).toEqual([
      { _id: "a" },
      { _id: "b" },
    ]);
    expect(api.getTrainings).toHaveBeenLastCalledWith(
      expect.objectContaining({
        athleteId: "owner",
        cursor: "next",
        meta: true,
      }),
    );
  });
  it("fails closed instead of presenting a truncated history", async () => {
    api.getTrainings.mockResolvedValueOnce({ items: [], hasMore: true });
    await expect(fetchProgressTrainings("owner")).rejects.toThrow("completar");
  });
  it("stops fetching after cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchProgressTrainings("owner", controller.signal),
    ).rejects.toThrow();
    expect(api.getTrainings).not.toHaveBeenCalled();
  });
});
