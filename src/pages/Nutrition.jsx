import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import NutritionDiary from "../components/nutrition/NutritionDiary";
import NutritionPlanEditor from "../components/nutrition/NutritionPlanEditor";
import MobilePageHeader from "../components/layout/MobilePageHeader";
import {
  nutritionDate,
  nutritionTimezone,
} from "../components/nutrition/nutritionUtils";
import "../components/nutrition/coachNutrition.css";

function CoachNutrition({ coachAthlete, onNavigate, onSelectCoachAthlete }) {
  const client = useQueryClient();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState(
    String(coachAthlete?.id || coachAthlete?._id || ""),
  );
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [view, setView] = useState("today");
  const timezone = nutritionTimezone();
  const students = useQuery({
    queryKey: ["nutrition-athletes", user?.id || user?._id],
    queryFn: () => api.getCoachAthletes(),
    staleTime: 30_000,
  });
  const query = useQuery({
    queryKey: ["coach-nutrition", user?.id || user?._id, selectedId, timezone],
    queryFn: ({ signal }) =>
      api.getCoachNutrition(selectedId, { timezone }, { signal }),
    enabled: Boolean(selectedId),
    refetchInterval: 30_000,
    retry: 1,
  });
  const save = useMutation({
    mutationFn: (payload) => api.createNutritionPlan(selectedId, payload),
    onSuccess: async () => {
      setEditing(false);
      setNotice(
        "Dieta asignada. El alumno podrá verla desde la fecha indicada.",
      );
      await client.invalidateQueries({
        queryKey: ["coach-nutrition", user?.id || user?._id, selectedId],
      });
      await client.invalidateQueries({ queryKey: ["nutrition-day"] });
    },
  });
  const latest = query.data?.plans?.[0];
  const daily = query.data?.daily;
  const athlete = students.data?.find(
    (item) => String(item.id || item._id) === selectedId,
  );
  const showLatest = view === "latest" || !daily?.plan;
  const displayedPlan = showLatest ? latest : daily?.plan;
  const displayedStartsOn =
    displayedPlan?.startsOn ||
    query.data?.plans?.find(
      (plan) => String(plan._id) === String(displayedPlan?._id),
    )?.startsOn;
  const hasDifferentVersion =
    latest && daily?.plan && String(latest._id) !== String(daily.plan._id);
  const displayedDay = {
    plan: displayedPlan,
    day: showLatest ? null : daily?.day,
    dateKey: showLatest ? latest?.startsOn : daily?.dateKey,
    today: nutritionDate(),
  };
  const changeAthlete = (id) => {
    setSelectedId(id);
    setEditing(false);
    setNotice("");
    setView("today");
    save.reset();
    const athlete = students.data?.find(
      (item) => String(item.id || item._id) === id,
    );
    onSelectCoachAthlete?.(athlete ? { id, name: athlete.name } : null);
  };
  if (editing && selectedId && query.data) {
    const athlete = students.data?.find(
      (item) => String(item.id || item._id) === selectedId,
    );
    return (
      <main className="mx-auto w-full max-w-3xl pb-28">
        <NutritionPlanEditor
          key={`${selectedId}-${latest?._id || "new"}`}
          athleteName={athlete?.name || coachAthlete?.name}
          initialPlan={latest}
          onSave={(payload) => save.mutate(payload)}
          onCancel={() => setEditing(false)}
          saving={save.isPending}
          error={save.error?.message}
          hasDailyRecord={Boolean(daily?.day)}
        />
      </main>
    );
  }
  return (
    <main className="nutrition-athlete-page nutrition-coach-page">
      <MobilePageHeader
        title="Alimentación"
        variant="detail"
        onBack={() => onNavigate?.("coach_athletes")}
        mobileOnly={false}
        className="nutrition-athlete-page__heading"
      />
      <label className="nutrition-coach__student">
        Alumno
        <select
          aria-label="Alumno para alimentación"
          value={selectedId}
          onChange={(event) => changeAthlete(event.target.value)}
          disabled={editing || save.isPending}
        >
          <option value="">Selecciona un alumno</option>
          {(students.data || []).map((athlete) => (
            <option
              key={athlete.id || athlete._id}
              value={athlete.id || athlete._id}
            >
              {athlete.name}
            </option>
          ))}
        </select>
      </label>
      {students.isError ? (
        <p role="alert" className="text-sm text-red-500">
          No pudimos cargar tus alumnos.{" "}
          <button
            type="button"
            onClick={() => students.refetch()}
            className="underline"
          >
            Reintentar alumnos
          </button>
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-[#438362] p-4 text-sm"
        >
          {notice}
        </p>
      ) : null}
      {!selectedId ? (
        <NutritionEmptyState
          title="Elige un alumno"
          description="Consulta sus comidas y acompaña su alimentación."
        />
      ) : query.isPending ? (
        <p role="status">Cargando alimentación...</p>
      ) : query.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-400 p-4 text-sm"
        >
          <p>{query.error.message}</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="mt-2 min-h-11 font-semibold underline"
          >
            Reintentar alimentación
          </button>
        </div>
      ) : (
        <>
          <section
            className="nutrition-coach__plan-bar"
            aria-label="Plan asignado"
          >
            <div>
              <span>{athlete?.name || coachAthlete?.name || "Tu alumno"}</span>
              <h2>
                {displayedPlan?.content.name || "Sin plan de alimentación"}
              </h2>
              {displayedStartsOn ? <p>Desde {displayedStartsOn}</p> : null}
            </div>
            <button
              type="button"
              aria-label={
                latest ? "Editar y asignar nueva versión" : "Crear dieta"
              }
              onClick={() => {
                save.reset();
                setEditing(true);
                setNotice("");
              }}
              className="nutrition-coach__edit"
            >
              {latest ? <Pencil size={16} /> : <Plus size={17} />}
              {latest ? "Editar dieta" : "Crear dieta"}
            </button>
          </section>
          {hasDifferentVersion && (
            <div
              className="nutrition-coach__views"
              role="group"
              aria-label="Versión de la dieta"
            >
              <button
                type="button"
                aria-pressed={view === "today"}
                onClick={() => setView("today")}
              >
                Plan de hoy
              </button>
              <button
                type="button"
                aria-pressed={view === "latest"}
                onClick={() => setView("latest")}
              >
                Última versión
              </button>
            </div>
          )}
          {displayedPlan ? (
            <NutritionDiary
              key={`${selectedId}-${displayedPlan._id}-${view}`}
              readOnly
              dayData={displayedDay}
            />
          ) : (
            <NutritionEmptyState
              title="Su alimentación empieza aquí"
              description="Crea un plan con desayuno, almuerzo y cena adaptados a tu alumno."
            />
          )}
          {query.data.days?.length ? (
            <section
              className="nutrition-coach__history"
              aria-label="Últimos días registrados"
            >
              <h2>Últimos días registrados</h2>
              {query.data.days.map((day) => {
                const total = day.snapshot.meals.length;
                const done = day.completedMealIds.length;
                return (
                  <div className="nutrition-coach__history-day" key={day._id}>
                    <span>{day.dateKey}</span>
                    <div
                      role="progressbar"
                      aria-label={`Comidas del ${day.dateKey}`}
                      aria-valuemin={0}
                      aria-valuemax={total}
                      aria-valuenow={done}
                    >
                      <i
                        style={{
                          width: `${total ? Math.min(100, (done / total) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <small>
                      {done}/{total}
                    </small>
                  </div>
                );
              })}
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}

function NutritionEmptyState({ title, description }) {
  return (
    <section className="nutrition-coach__empty">
      <div aria-hidden="true">
        <img
          src="/images/nutrition/breakfast.webp"
          alt=""
          width={80}
          height={80}
        />
        <img src="/images/nutrition/lunch.webp" alt="" width={80} height={80} />
        <img
          src="/images/nutrition/dinner.webp"
          alt=""
          width={80}
          height={80}
        />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

export default function Nutrition(props) {
  const { user } = useAuth();
  if (["Entrenador", "Admin"].includes(user?.role))
    return <CoachNutrition {...props} />;
  return (
    <main className="nutrition-athlete-page text-[color:var(--text)]">
      <MobilePageHeader
        title="Mi alimentación"
        variant="detail"
        onBack={() => {
          if (props.onBack) props.onBack("dashboard");
          else props.onNavigate?.("dashboard");
        }}
        mobileOnly={false}
        className="nutrition-athlete-page__heading"
      />
      <NutritionDiary />
    </main>
  );
}
