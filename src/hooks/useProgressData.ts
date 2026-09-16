import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { TRAINING_LIST_FIELDS } from "../utils/trainingListFields";
import { getTrainingPlansQueryKey } from "../queries/trainingPlanQueries";
import type { Training, Plan, Routine } from "../utils/progressDashboard";

export async function fetchProgressTrainings(
  athleteId: string,
  signal?: AbortSignal,
): Promise<Training[]> {
  const result = new Map<string, Training>();
  let cursor = "";
  do {
    signal?.throwIfAborted();
    const response: {
      items: Training[];
      hasMore: boolean;
      nextCursor?: string;
    } = await api.getTrainings({
      athleteId,
      limit: 500,
      meta: true,
      cursor,
      fields: TRAINING_LIST_FIELDS,
    });
    signal?.throwIfAborted();
    if (!Array.isArray(response.items))
      throw new Error("Respuesta de historial no válida");
    response.items.forEach((t) => result.set(t._id, t));
    if (!response.hasMore) break;
    if (!response.nextCursor || response.nextCursor === cursor)
      throw new Error("No se pudo completar el historial");
    cursor = response.nextCursor;
  } while (cursor);
  return [...result.values()];
}

export function useProgressData(ownerId: string) {
  const trainings = useQuery({
    queryKey: ["trainings", "progress-full-v1", ownerId],
    queryFn: ({ signal }) => fetchProgressTrainings(ownerId, signal),
    enabled: Boolean(ownerId),
    staleTime: 60000,
    retry: 1,
  });
  const plans = useQuery<Plan[]>({
    queryKey: getTrainingPlansQueryKey(ownerId),
    queryFn: () => api.getTrainingPlans(ownerId),
    enabled: Boolean(ownerId),
    staleTime: 60000,
    retry: 1,
  });
  const routines = useQuery<Routine[]>({
    queryKey: ["progress-routines", ownerId],
    queryFn: () =>
      api.getRoutines({ athleteId: ownerId, includeArchived: true }),
    enabled: Boolean(ownerId),
    staleTime: 60000,
    retry: 1,
  });
  return { trainings, plans, routines };
}
