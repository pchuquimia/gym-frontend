import { Fragment, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Modal from "../shared/Modal";
import { api } from "../../services/api";
import "./coachFollowUpDetail.css";

const PAGE_SIZE = 6;
const MEASURES = [
  ["waist", "Cintura"],
  ["chest", "Pecho"],
  ["hips", "Cadera"],
  ["arm", "Brazo"],
  ["thigh", "Muslo"],
  ["calf", "Pantorrilla"],
];
const VIEWS = {
  front: "Frontal",
  side: "Lateral",
  back: "Posterior",
  other: "Otra",
};
const PAIN_AREAS = {
  cuello: "Cuello",
  hombro: "Hombro",
  codo: "Codo",
  muneca: "Muñeca",
  espalda: "Espalda",
  cadera: "Cadera",
  rodilla: "Rodilla",
  tobillo: "Tobillo",
  otro: "Otro",
};
const READY = {
  ready: "Listo para entrenar",
  adjust: "Conviene ajustar",
  recover: "Requiere recuperación",
};
const TITLES = {
  checkIns: "Check-in",
  weights: "Peso",
  measurements: "Medidas",
  photos: "Fotos de progreso",
  assessments: "Evaluación final",
};
const GOALS = { yes: "Sí", partly: "Parcialmente", no: "No" };
const keyDate = (record) =>
  String(record.dateKey || record.date || "").slice(0, 10);
const recordKey = (record, index) =>
  String(record._id || record.id || `${keyDate(record)}-${index}`);
const formatDate = (value) => {
  const date = new Date(`${String(value || "").slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? "Sin fecha"
    : new Intl.DateTimeFormat("es-BO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
};
const number = (value, unit = "") =>
  value == null || value === "" || !Number.isFinite(Number(value))
    ? "—"
    : `${Number(value).toLocaleString("es-BO", { maximumFractionDigits: 2 })}${unit}`;
const score = (value, max = 5) =>
  value == null ? "—" : `${number(value)} / ${max}`;

function SharedPhoto({ photo, large = false }) {
  const id = photo._id || photo.id;
  const [source, setSource] = useState("");
  const [failed, setFailed] = useState(false);
  const query = useQuery({
    queryKey: ["coach-follow-up-photo", String(id), large],
    queryFn: () =>
      api.getPhotoContent(
        `/api/photos/${id}/content`,
        large ? { width: 1200 } : { width: 160, height: 160 },
      ),
    enabled: Boolean(id) && photo.contentStatus !== "missing",
    staleTime: 5 * 60_000,
    retry: false,
  });
  useEffect(() => {
    if (!query.data) return;
    const url = URL.createObjectURL(query.data);
    let active = true;
    Promise.resolve().then(() => {
      if (active) setSource(url);
    });
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [query.data]);
  if (!source || query.isError || failed || photo.contentStatus === "missing") {
    return (
      <span className={`followup-photo-placeholder ${large ? "is-large" : ""}`}>
        {query.isLoading && photo.contentStatus !== "missing"
          ? "Cargando…"
          : "Imagen no disponible"}
      </span>
    );
  }
  return (
    <img
      className={large ? "followup-photo-large" : "followup-photo-thumb"}
      src={source}
      alt={`Vista ${VIEWS[photo.view]?.toLowerCase() || "corporal"} del ${formatDate(keyDate(photo))}`}
      onError={() => setFailed(true)}
    />
  );
}

function RecordDetails({ type, record, plans }) {
  let fields = [];
  if (type === "checkIns")
    fields = [
      ["Estado", READY[record.readinessState] || "Sin estado"],
      ["Bienestar", score(record.readinessScore, 100)],
      ["Sueño", score(record.sleep)],
      ["Energía", score(record.energy)],
      ["Estrés", score(record.stress)],
      ["Carga muscular", score(record.soreness)],
      ["Motivación", score(record.motivation)],
      ["Dolor articular", score(record.jointPain)],
      [
        "Zonas de molestia",
        record.painAreas?.length
          ? record.painAreas.map((area) => PAIN_AREAS[area] || area).join(", ")
          : "Sin zonas indicadas",
      ],
      ["Notas", record.notes || "Sin notas"],
    ];
  if (type === "weights")
    fields = [
      ["Peso", number(record.weightKg, " kg")],
      ["Registrado por", record.source === "coach" ? "Coach" : "Atleta"],
      ["Nota", record.note || "Sin nota"],
    ];
  if (type === "measurements")
    fields = [
      ...MEASURES.map(([key, label]) => [
        label,
        number(record.values?.[key], " cm"),
      ]),
      ["Notas", record.notes || "Sin notas"],
    ];
  if (type === "assessments")
    fields = [
      [
        "Planificación",
        plans.find(
          (plan) => String(plan._id || plan.id) === String(record.planId),
        )?.name || "Planificación anterior",
      ],
      ["Progreso percibido", score(record.answers?.progress)],
      [
        "Objetivo alcanzado",
        GOALS[record.answers?.goalReached] || "Sin respuesta",
      ],
      [
        "Cambio de disponibilidad",
        record.answers?.availabilityChanged === true
          ? "Sí"
          : record.answers?.availabilityChanged === false
            ? "No"
            : "Sin respuesta",
      ],
      ["Molestias o dolor", record.answers?.pain || "Sin molestias indicadas"],
      ["Comentario del atleta", record.answers?.feedback || "Sin comentario"],
    ];
  return (
    <dl className="followup-record-fields">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function CoachFollowUpDetail({
  type,
  overview,
  latestCheckIn,
  onClose,
}) {
  const source = overview.followUpRecords || {};
  const fallback =
    type === "checkIns"
      ? latestCheckIn
      : type === "assessments"
        ? source.latestAssessment
        : type === "measurements"
          ? source.latestMeasurement
          : null;
  const records = [
    ...(source[type]?.length ? source[type] : fallback ? [fallback] : []),
  ].sort((a, b) => keyDate(b).localeCompare(keyDate(a)));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const filtered = records.filter(
    (record) =>
      (!from || keyDate(record) >= from) && (!to || keyDate(record) <= to),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const title = TITLES[type];
  const totalCount = source.counts?.[type] ?? records.length;
  const columns = {
    checkIns: ["Fecha", "Bienestar", "Sueño", "Energía", "Estrés"],
    weights: ["Fecha", "Peso", "Variación", "Registro"],
    measurements: ["Fecha", ...MEASURES.map(([, label]) => label)],
    photos: ["Foto", "Fecha", "Vista", "Nota"],
    assessments: ["Fecha", "Planificación", "Progreso", "Objetivo"],
  }[type];
  const rowCells = (record) => {
    const date = formatDate(keyDate(record));
    if (type === "checkIns")
      return [
        date,
        score(record.readinessScore, 100),
        score(record.sleep),
        score(record.energy),
        score(record.stress),
      ];
    if (type === "weights") {
      const index = records.indexOf(record);
      const previous = records[index + 1];
      const change =
        previous &&
        Number.isFinite(Number(record.weightKg)) &&
        Number.isFinite(Number(previous.weightKg))
          ? Number(record.weightKg) - Number(previous.weightKg)
          : null;
      return [
        date,
        number(record.weightKg, " kg"),
        change == null
          ? "—"
          : `${change > 0 ? "+" : ""}${number(change, " kg")}`,
        record.source === "coach" ? "Coach" : "Atleta",
      ];
    }
    if (type === "measurements")
      return [
        date,
        ...MEASURES.map(([key]) => number(record.values?.[key], " cm")),
      ];
    if (type === "photos")
      return [
        <SharedPhoto key={record._id || record.id} photo={record} />,
        date,
        VIEWS[record.view] || "Otra",
        record.label || "Sin nota",
      ];
    return [
      date,
      overview.plans?.find(
        (plan) => String(plan._id || plan.id) === String(record.planId),
      )?.name || "Planificación anterior",
      score(record.answers?.progress),
      GOALS[record.answers?.goalReached] || "Sin respuesta",
    ];
  };
  return (
    <Modal
      title={title}
      subtitle={`${overview.athlete?.name || "Atleta"} · Registros disponibles`}
      onClose={onClose}
      mobilePage
      portal
      contentClassName="followup-detail-content"
    >
      <section
        className="followup-detail"
        aria-label={`Detalle de ${title.toLowerCase()}`}
      >
        {selectedPhoto ? (
          <div className="followup-photo-viewer">
            <button
              type="button"
              className="followup-detail-link"
              onClick={() => setSelectedPhoto(null)}
            >
              <ArrowLeft size={16} /> Volver a registros
            </button>
            <SharedPhoto
              key={recordKey(selectedPhoto, 0)}
              photo={selectedPhoto}
              large
            />
            <dl className="followup-record-fields">
              <div>
                <dt>Fecha</dt>
                <dd>{formatDate(keyDate(selectedPhoto))}</dd>
              </div>
              <div>
                <dt>Vista</dt>
                <dd>{VIEWS[selectedPhoto.view] || "Otra"}</dd>
              </div>
              <div>
                <dt>Nota del atleta</dt>
                <dd>{selectedPhoto.label || "Sin nota"}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <>
            <header className="followup-detail-summary">
              <div>
                <small>{overview.athlete?.name || "Atleta"}</small>
                <h4>Historial de registros</h4>
              </div>
              <span>
                {filtered.length}{" "}
                {filtered.length === 1 ? "registro" : "registros"}
              </span>
            </header>
            <details className="followup-filter-disclosure">
              <summary>
                Filtrar registros
                {from || to ? <span>Fechas aplicadas</span> : null}
                <ChevronDown size={15} aria-hidden="true" />
              </summary>
              <div className="followup-detail-filters">
                <label>
                  Desde
                  <input
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(event) => {
                      setFrom(event.target.value);
                      setPage(1);
                      setExpanded("");
                    }}
                  />
                </label>
                <label>
                  Hasta
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(event) => {
                      setTo(event.target.value);
                      setPage(1);
                      setExpanded("");
                    }}
                  />
                </label>
                {(from || to) && (
                  <button
                    type="button"
                    className="followup-detail-link"
                    onClick={() => {
                      setFrom("");
                      setTo("");
                      setPage(1);
                      setExpanded("");
                    }}
                  >
                    Quitar filtros
                  </button>
                )}
              </div>
            </details>
            {!filtered.length ? (
              <div className="followup-detail-empty">
                <h4>
                  {records.length
                    ? "No hay registros en estas fechas"
                    : "Todavía no hay registros"}
                </h4>
                <p>
                  {records.length
                    ? "Prueba con otro intervalo de fechas."
                    : type === "photos"
                      ? "Las fotos que el atleta comparta con su coach aparecerán aquí."
                      : "Los registros enviados por el atleta aparecerán aquí con sus fechas y valores."}
                </p>
              </div>
            ) : (
              <>
                <p className="followup-detail-hint">
                  {type === "measurements"
                    ? "Medidas en centímetros. "
                    : type === "weights"
                      ? "Variación respecto al registro anterior disponible. "
                      : ""}
                  Desliza la tabla para ver todas las columnas.
                </p>
                <div
                  className="followup-detail-table"
                  role="region"
                  aria-label={`Tabla de ${title.toLowerCase()}`}
                  tabIndex={0}
                >
                  <table>
                    <caption className="sr-only">
                      Historial de {title.toLowerCase()}
                    </caption>
                    <thead>
                      <tr>
                        {columns.map((column) => (
                          <th scope="col" key={column}>
                            {column}
                          </th>
                        ))}
                        <th scope="col">
                          <span className="sr-only">Abrir registro</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((record, index) => {
                        const id = recordKey(record, index);
                        const open = expanded === id;
                        return (
                          <Fragment key={id}>
                            <tr className={open ? "is-expanded" : ""}>
                              {rowCells(record).map((value, cellIndex) => (
                                <td key={cellIndex}>{value}</td>
                              ))}
                              <td>
                                <button
                                  type="button"
                                  className="followup-detail-row-action"
                                  aria-label={`${type === "photos" ? "Ampliar foto" : "Ver registro"} del ${formatDate(keyDate(record))}`}
                                  aria-expanded={
                                    type === "photos" ? undefined : open
                                  }
                                  onClick={() =>
                                    type === "photos"
                                      ? setSelectedPhoto(record)
                                      : setExpanded(open ? "" : id)
                                  }
                                >
                                  {type === "photos" ? (
                                    <ArrowUpRight size={17} />
                                  ) : (
                                    <ChevronDown
                                      size={17}
                                      className={open ? "is-open" : ""}
                                    />
                                  )}
                                </button>
                              </td>
                            </tr>
                            {open && (
                              <tr className="followup-detail-expanded">
                                <td colSpan={columns.length + 1}>
                                  <RecordDetails
                                    type={type}
                                    record={record}
                                    plans={overview.plans || []}
                                  />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <footer className="followup-detail-pagination">
                  <span>
                    {(currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(currentPage * PAGE_SIZE, filtered.length)} de{" "}
                    {filtered.length}
                  </span>
                  <div>
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      aria-label="Registros anteriores de la lista"
                      onClick={() => {
                        setPage(currentPage - 1);
                        setExpanded("");
                      }}
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      type="button"
                      disabled={currentPage === pages}
                      aria-label="Más registros"
                      onClick={() => {
                        setPage(currentPage + 1);
                        setExpanded("");
                      }}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </footer>
                <p className="followup-detail-note">
                  {totalCount > records.length
                    ? `Mostrando los últimos ${records.length} de ${totalCount} registros.`
                    : "Registros recientes disponibles en la ficha del alumno."}
                </p>
              </>
            )}
          </>
        )}
      </section>
    </Modal>
  );
}
