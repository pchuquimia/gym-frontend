import { useMemo } from "react";
import ExerciseTrends from "../components/dashboard/ExerciseTrends";
import GoalsProgress from "../components/dashboard/GoalsProgress";
import LastWorkout from "../components/dashboard/LastWorkout";
import MetricCards from "../components/dashboard/MetricCards";
import ProgressPhotos from "../components/dashboard/ProgressPhotos";
import RecentAchievements from "../components/dashboard/RecentAchievements";
import TrendCard from "../components/dashboard/TrendCard";
import TopBar from "../components/layout/TopBar";
import { useTrainingData } from "../context/TrainingContext";

function Dashboard({ onNavigate }) {
  const { sessions, photos, trainings } = useTrainingData();

  const stats = useMemo(() => {
    if (!sessions.length) {
      return {
        trend: {
          semanal: [0, 0, 0, 0, 0, 0, 0],
          mensual: [0, 0, 0, 0, 0, 0, 0],
          trimestral: [0, 0, 0, 0, 0, 0, 0],
        },
        metrics: [],
        lastSession: null,
        achievements: [],
        trends: [],
        goals: [],
      };
    }

    const toVolume = (sets) =>
      sets.reduce(
        (acc, s) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0),
        0
      );

    const sessionsWithIdx = sessions.map((s, idx) => ({ ...s, _idx: idx }));
    const bestByExercise = {};
    const prSet = new Set();

    const sortedSessions = [...sessionsWithIdx].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    sortedSessions.forEach((s) => {
      let hasPR = false;
      s.sets.forEach((set) => {
        const weight = Number(set.weight) || 0;
        const reps = Number(set.reps) || 0;
        const prev = bestByExercise[s.exerciseId];
        const better =
          !prev ||
          weight > prev.weight ||
          (weight === prev.weight && reps > prev.reps);
        if (better) {
          hasPR = true;
          bestByExercise[s.exerciseId] = { weight, reps, date: s.date };
        }
      });
      if (hasPR) prSet.add(s._idx);
    });

    const trainingMap = new Map();
    trainings.forEach((t) => {
      const key = t.id || t._id || t.trainingId;
      if (key) trainingMap.set(key, t);
    });

    const volumes = sessionsWithIdx.map((s) => {
      const training = trainingMap.get(s.trainingId) || {};
      return {
        date: new Date(s.date),
        volume: toVolume(s.sets),
        duration: s.trainingDurationSeconds || 0,
        routine: training.routineName || "Sin rutina",
        hasPR: prSet.has(s._idx),
      };
    });
    const now = new Date();

    const makeBuckets = (days, buckets) => {
      const bucketSize = days / buckets;
      const arrVol = [];
      const arrDur = [];
      const arrSes = [];
      const arrMeta = [];
      for (let i = buckets - 1; i >= 0; i -= 1) {
        const start = new Date(now);
        start.setDate(start.getDate() - bucketSize * (i + 1));
        const end = new Date(now);
        end.setDate(end.getDate() - bucketSize * i);
        const filtered = volumes.filter((v) => v.date >= start && v.date < end);
        const sumVol = filtered.reduce((acc, v) => acc + v.volume, 0);
        const sumDur = filtered.reduce((acc, v) => acc + v.duration, 0);
        const routineMap = filtered.reduce((acc, v) => {
          acc[v.routine] = (acc[v.routine] || 0) + v.volume;
          return acc;
        }, {});
        const dominantRoutine =
          Object.entries(routineMap).sort((a, b) => b[1] - a[1])[0]?.[0] ||
          "Sin rutina";
        const prCount = filtered.filter((f) => f.hasPR).length;
        arrVol.push(Math.round(sumVol));
        arrDur.push(Math.round(sumDur / 60)); // minutos
        arrSes.push(filtered.length);
        arrMeta.push({ routine: dominantRoutine, prs: prCount });
      }
      return { volume: arrVol, duration: arrDur, sessions: arrSes, meta: arrMeta };
    };

    const trend = {
      semanal: makeBuckets(7, 7),
      mensual: makeBuckets(30, 7),
      trimestral: makeBuckets(90, 7),
    };

    const totalVolume30 = volumes
      .filter((v) => {
        const diff = (now - v.date) / (1000 * 60 * 60 * 24);
        return diff <= 30;
      })
      .reduce((acc, v) => acc + v.volume, 0);

    const totalDurationExercise = sessions.reduce(
      (acc, s) => acc + (s.exerciseDurationSeconds || 0),
      0
    );
    const totalDurationTraining = trainings.reduce(
      (acc, t) => acc + (t.durationSeconds || 0),
      0
    );
    const avgExerciseDuration = sessions.length
      ? totalDurationExercise / sessions.length
      : 0;
    const longestSession = trainings.length
      ? Math.max(...trainings.map((t) => t.durationSeconds || 0), 0)
      : 0;
    const trainingCount =
      trainings.length || new Set(sessions.map((s) => s.trainingId || s.date)).size;

    const metrics = [
      {
        label: "Volumen Total (30d)",
        value: `${totalVolume30.toLocaleString()} kg`,
        delta: "",
        trend: "neutral",
      },
      {
        label: "Entrenamientos Completados",
        value: trainingCount,
        delta: "",
        trend: "neutral",
      },
      {
        label: "Duración Total (ejercicios)",
        value: `${Math.round(totalDurationExercise / 60)} min`,
        delta: "",
        trend: "neutral",
      },
      {
        label: "Duración Total (sesiones)",
        value: `${Math.round(totalDurationTraining / 60)} min`,
        delta: "",
        trend: "neutral",
      },
      {
        label: "Duración Promedio (ejercicio)",
        value: `${Math.round(avgExerciseDuration / 60)} min`,
        delta: "",
        trend: "neutral",
      },
      {
        label: "Sesión más larga",
        value: longestSession ? `${Math.round(longestSession / 60)} min` : "—",
        delta: "",
        trend: "neutral",
      },
      {
        label: "PRs Detectados",
        value: sessions.length ? "Auto" : "0",
        delta: "",
        trend: "neutral",
      },
      {
        label: "Ejercicios únicos",
        value: new Set(sessions.map((s) => s.exerciseId)).size,
        delta: "",
        trend: "neutral",
      },
    ];

    const lastSession = [...sessions].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    )[0];

    const achievements = [];
    const bestByExerciseAchievements = {};
    [...sessions]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach((s) => {
        s.sets.forEach((set) => {
          const weight = Number(set.weight) || 0;
          const reps = Number(set.reps) || 0;
          const key = s.exerciseId;
          const prev = bestByExerciseAchievements[key];
          const isBetter =
            !prev ||
            weight > prev.weight ||
            (weight === prev.weight && reps > prev.reps);
          if (isBetter) {
            // solo si supera el récord anterior
            if (prev) {
              achievements.push({
                title: "¡Nuevo PR!",
                detail: `${s.exerciseName}: ${weight} kg x ${reps} · ${new Date(
                  s.date
                ).toLocaleDateString("es-ES")}`,
                type: "pr",
              });
            }
            bestByExerciseAchievements[key] = {
              weight,
              reps,
              date: s.date,
              name: s.exerciseName,
            };
          }
        });
      });

    const trends = Object.values(
      sessions.reduce((acc, s) => {
        const key = s.exerciseId;
        if (!acc[key]) acc[key] = { name: s.exerciseName, entries: [] };
        acc[key].entries.push({ date: s.date, volume: toVolume(s.sets) });
        return acc;
      }, {})
    ).map((item) => {
      const sorted = [...item.entries].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      const last = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];
      const status =
        prev && last.volume > prev.volume
          ? "improving"
          : prev && last.volume < prev.volume
          ? "decline"
          : "stable";
      const change = prev ? last.volume - prev.volume : 0;
      const changePct = prev && prev.volume ? (change / prev.volume) * 100 : 0;
      return { name: item.name, status, changePct };
    });

    const latestPhotos = (photos || []).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return {
      trend,
      metrics,
      lastSession,
      achievements,
      trends,
      goals: [],
      photos: latestPhotos,
    };
  }, [sessions, photos]);

  return (
    <>
      <div className="md:hidden mb-4 flex items-center justify-between rounded-2xl bg-[#0d1f33] px-3 py-3 shadow-inner">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-accent text-bg-darker font-bold grid place-items-center">UA</div>
          <div className="flex flex-col leading-tight">
            <span className="text-white font-semibold text-sm">Usuario Activo</span>
            <span className="text-xs text-muted">Miembro desde 2023</span>
          </div>
        </div>
        <button
          className="w-9 h-9 rounded-full bg-accent text-bg-darker text-2xl leading-none grid place-items-center shadow-lg"
          onClick={() => onNavigate?.('registrar')}
          aria-label="Registrar entrenamiento"
        >
          +
        </button>
      </div>
      <TopBar
        title="Dashboard Principal Profesional Avanzado"
        subtitle="Aplicación web para seguimiento de progreso en el gimnasio"
      />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <TrendCard dataByRange={stats.trend} compact />
          <MetricCards metrics={stats.metrics} />
          <div className="grid gap-4 md:grid-cols-2">
            <RecentAchievements items={stats.achievements} />
            <GoalsProgress goals={stats.goals} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ProgressPhotos photos={stats.photos} />
            <ExerciseTrends trends={stats.trends} />
          </div>
        </div>
        <aside className="flex flex-col gap-4">
          <LastWorkout session={stats.lastSession} onNavigate={onNavigate} />
        </aside>
      </div>
    </>
  );
}

export default Dashboard;
