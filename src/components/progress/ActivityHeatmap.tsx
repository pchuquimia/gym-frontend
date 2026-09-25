import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  dateLabel,
  dayKey,
  number,
  shiftDay,
  totals,
  type SessionRow,
} from "../../utils/progressDashboard";

export default function ActivityHeatmap({
  sessions,
  from,
  to,
  onSelect,
}: {
  sessions: SessionRow[];
  from: string;
  to: string;
  onSelect: (date: string) => void;
}) {
  const [chosen, setChosen] = useState("");
  const month =
    chosen >= from.slice(0, 7) && chosen <= to.slice(0, 7)
      ? chosen
      : to.slice(0, 7);
  const days = useMemo(() => {
    const result = [];
    for (let d = `${month}-01`; d.slice(0, 7) === month; d = shiftDay(d, 1)) {
      const rows = sessions.filter((s) => s.date === d);
      result.push({ date: d, rows, totals: totals(rows, d, d) });
    }
    return result;
  }, [month, sessions]);
  const offset = (new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7;
  const move = (direction: number) =>
    setChosen(
      dayKey(
        new Date(
          Date.UTC(
            Number(month.slice(0, 4)),
            Number(month.slice(5, 7)) - 1 + direction,
            1,
          ),
        ).toISOString(),
      ).slice(0, 7),
    );
  return (
    <section
      className="progress-section progress-calendar"
      aria-labelledby="progress-calendar-title"
    >
      <div className="progress-section-heading">
        <div>
          <p className="progress-kicker">CALENDARIO</p>
          <h2 id="progress-calendar-title">Tus días de entrenamiento</h2>
        </div>
        <div className="progress-calendar-nav">
          <button
            aria-label="Mes anterior"
            disabled={month <= from.slice(0, 7)}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            {new Date(`${month}-01T12:00:00Z`).toLocaleDateString("es-BO", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </span>
          <button
            aria-label="Mes siguiente"
            disabled={month >= to.slice(0, 7)}
            onClick={() => move(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <p className="progress-note">
        Cuanto más intenso el color, más series realizaste ese día.
      </p>
      <div className="progress-calendar-grid">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <span className="progress-calendar-weekday" key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`offset-${i}`} />
        ))}
        {days.map((d) => {
          const summary = `${dateLabel(d.date)}: ${d.totals.sessions} sesiones, ${d.totals.sets} series, ${number(d.totals.volume)} kg externos, ${number(d.totals.minutes)} min registrados${d.rows.length ? ` · ${d.rows.map((s) => s.routineName || "Entrenamiento").join(", ")}` : " · Sin registro"}`;
          return (
            <button
              key={d.date}
              disabled={d.date < from || d.date > to}
              data-level={
                !d.totals.sets
                  ? 0
                  : d.totals.sets < 10
                    ? 1
                    : d.totals.sets < 20
                      ? 2
                      : 3
              }
              title={summary}
              aria-label={summary}
              onClick={() => onSelect(d.date)}
            >
              <span>{Number(d.date.slice(8))}</span>
              <small>{d.totals.sets ? `${d.totals.sets} series` : "—"}</small>
            </button>
          );
        })}
      </div>
      <p className="progress-note">
        {
          new Set(
            sessions.filter((s) => s.date.startsWith(month)).map((s) => s.date),
          ).size
        }{" "}
        días con entrenamiento este mes.
      </p>
    </section>
  );
}
