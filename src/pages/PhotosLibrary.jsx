import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Dumbbell, ImageIcon, ImagePlus, Trash2, TrendingUp } from "lucide-react";
import Button from "../components/ui/button";
import Modal from "../components/shared/Modal";
import { useTrainingData } from "../context/TrainingContext";
import { buildCloudinaryUrl } from "../utils/cloudinary";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const uploadTypeOptions = [
  { id: "gym", label: "Entrenamiento" },
  { id: "home", label: "Casa" },
];

const toValidDate = (value) => {
  if (!value) return null;
  const normalized = value.length <= 10 ? `${value}T00:00:00` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value, opts = {}) => {
  const d = toValidDate(value);
  if (!d) return "--";
  return d.toLocaleDateString("es-ES", opts);
};

const getPhotoUrl = (photo, opts = {}) => {
  if (!photo) return "";
  if (photo.publicId) return buildCloudinaryUrl(photo.publicId, opts);
  return photo.url || "";
};

const monthLabel = (month) => month?.replace(/\s+\d{4}$/g, "") || month;

function StatCard({ icon: Icon, label, value, tone = "emerald" }) {
  const toneClass =
    tone === "amber"
      ? "text-amber-400"
      : tone === "blue"
        ? "text-blue-300"
        : "text-emerald-400";

  return (
    <div className="min-w-[112px] rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4">
      <Icon className={`h-5 w-5 ${toneClass}`} />
      <p className={`mt-4 text-3xl font-black leading-none ${toneClass}`}>
        {value}
      </p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
        {label}
      </p>
    </div>
  );
}

function PhotosLibrary() {
  const { photos, addPhoto, deletePhoto, trainings } = useTrainingData();
  const [uploadType, setUploadType] = useState("gym");
  const [uploadLabel, setUploadLabel] = useState("");
  const [fileError, setFileError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);
  const [modalSrc, setModalSrc] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const routineMap = useMemo(() => {
    const map = new Map();
    (trainings || []).forEach((training) => {
      const id = training.id || training._id;
      if (!id) return;
      if (training.routineName) map.set(id, training.routineName);
    });
    return map;
  }, [trainings]);

  const resolveRoutineLabel = (photo) => {
    if (!photo) return "";
    if (photo.type === "home") return photo.label || "Progreso en casa";
    const sessionId = photo.sessionId || photo.trainingId || "";
    if (sessionId && routineMap.has(sessionId)) {
      return routineMap.get(sessionId) || "Rutina";
    }
    if (photo.label) {
      const match = /^Entrenamiento\\s*-\\s*(.+)$/i.exec(photo.label.trim());
      if (match?.[1]) return match[1];
      return photo.label;
    }
    return "Rutina sin nombre";
  };

  const orderedPhotos = useMemo(() => {
    return (photos || [])
      .slice()
      .sort((a, b) => {
        const da = toValidDate(a.date)?.getTime() || 0;
        const db = toValidDate(b.date)?.getTime() || 0;
        return db - da;
      });
  }, [photos]);

  const groupedPhotos = useMemo(() => {
    const map = new Map();
    orderedPhotos.forEach((photo) => {
      const key = formatDate(photo.date, { month: "long", year: "numeric" }) || "Sin fecha";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(photo);
    });
    return Array.from(map.entries());
  }, [orderedPhotos]);

  const stats = useMemo(() => {
    const total = orderedPhotos.length;
    const gymCount = orderedPhotos.filter((p) => p.type === "gym").length;
    const homeCount = orderedPhotos.filter((p) => p.type === "home").length;
    const lastDate = orderedPhotos[0]?.date || null;
    return { total, gymCount, homeCount, lastDate };
  }, [orderedPhotos]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setFileError("Max 10MB");
      event.target.value = "";
      return;
    }
    setFileError("");
    setIsUploading(true);
    try {
      const label =
        uploadLabel.trim() ||
        (uploadType === "home" ? "Progreso en casa" : "Foto en entrenamiento");
      await addPhoto({
        file,
        date: new Date().toISOString().slice(0, 10),
        label,
        type: uploadType,
      });
      setUploadLabel("");
    } catch (err) {
      console.error("No se pudo subir la foto", err);
      setFileError("No se pudo subir la foto");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleDelete = async (photo) => {
    if (!photo) return;
    const confirmDelete = window.confirm("Eliminar esta foto?");
    if (!confirmDelete) return;
    await deletePhoto(photo.id);
    setActivePhoto(null);
  };

  useEffect(() => {
    if (!activePhoto) {
      setModalSrc("");
      return;
    }
    const primary = getPhotoUrl(activePhoto, {
      width: 1200,
      height: 1200,
      crop: "limit",
    });
    setModalSrc(primary || activePhoto.url || "");
  }, [activePhoto]);

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-5 pb-28 sm:px-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-black leading-tight">Overview</h1>
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
            Visual data
          </span>
        </header>

        <section className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <StatCard icon={ImageIcon} label="Total photos" value={stats.total} />
          <StatCard
            icon={Dumbbell}
            label="Sessions"
            value={trainings?.length || 0}
            tone="amber"
          />
          <StatCard icon={TrendingUp} label="Gym photos" value={stats.gymCount} tone="blue" />
          <StatCard icon={Camera} label="Home photos" value={stats.homeCount} />
        </section>

        <section className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-5">
          <h2 className="text-xl font-black">New Milestone</h2>
          <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
            Capture your physique today to track change.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-200 text-sm font-black text-blue-950 transition hover:bg-blue-100 disabled:opacity-70"
            >
              <Camera className="h-4 w-4" />
              Camera
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[color:var(--bg)] text-sm font-black text-[color:var(--text-muted)] transition hover:text-[color:var(--text)] disabled:opacity-70"
            >
              <ImagePlus className="h-4 w-4" />
              Gallery
            </button>
          </div>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              value={uploadLabel}
              onChange={(event) => setUploadLabel(event.target.value)}
              placeholder="Add a quick note (e.g. Morning pump)..."
              className="h-11 min-w-0 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm outline-none placeholder:text-[color:var(--text-muted)] focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
            <select
              value={uploadType}
              onChange={(event) => setUploadType(event.target.value)}
              className="h-11 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 text-xs font-bold outline-none"
              aria-label="Tipo de foto"
            >
              {uploadTypeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleUpload}
          />
          {fileError ? <p className="mt-2 text-xs text-red-500">{fileError}</p> : null}
          {isUploading ? (
            <p className="mt-2 text-xs font-semibold text-blue-500">Subiendo foto...</p>
          ) : null}
        </section>

        {groupedPhotos.length === 0 ? (
          <section className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center text-sm text-[color:var(--text-muted)]">
            Aun no hay fotos guardadas. Sube la primera al terminar tu sesion.
          </section>
        ) : null}

        {groupedPhotos.map(([month, photosByMonth]) => (
          <section key={month} className="space-y-4">
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-black capitalize">{monthLabel(month)}</h2>
              <span className="text-[11px] font-black uppercase tracking-wide text-blue-700 dark:text-blue-200">
                {photosByMonth.length} photos
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {photosByMonth.map((photo) => {
                const preview = getPhotoUrl(photo, {
                  width: 520,
                  height: 680,
                  crop: "fill",
                  gravity: "auto",
                });
                const routineLabel = resolveRoutineLabel(photo);
                return (
                  <button
                    key={photo.id}
                    type="button"
                    className="group relative overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-left"
                    onClick={() => setActivePhoto(photo)}
                  >
                    <div className="aspect-[4/5] w-full overflow-hidden">
                      <img
                        src={preview || photo.url}
                        alt={routineLabel || "Foto de progreso"}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
                    <span className="absolute right-2 top-2 rounded bg-emerald-500/90 px-2 py-0.5 text-[10px] font-black text-emerald-950">
                      {photo.type === "home" ? "Casa" : "Gym"}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-[11px] font-black uppercase text-blue-100">
                        {formatDate(photo.date, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="mt-1 truncate text-sm font-black text-white">
                        {routineLabel}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {activePhoto && (
        <Modal
          title={resolveRoutineLabel(activePhoto)}
          subtitle={formatDate(activePhoto.date, {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
          onClose={() => setActivePhoto(null)}
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2"
                onClick={() => handleDelete(activePhoto)}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
              <Button size="sm" className="rounded-full" onClick={() => setActivePhoto(null)}>
                Cerrar
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-[color:var(--border)] overflow-hidden">
              {modalSrc ? (
                <img
                  src={modalSrc}
                  alt={resolveRoutineLabel(activePhoto)}
                  className="w-full max-h-[70vh] object-cover"
                  onError={() => {
                    const fallback = activePhoto?.url || "";
                    if (fallback && modalSrc !== fallback) {
                      setModalSrc(fallback);
                    } else {
                      setModalSrc("");
                    }
                  }}
                />
              ) : (
                <div className="w-full h-[40vh] grid place-items-center text-sm text-[color:var(--text-muted)] bg-[color:var(--bg)]">
                  No se pudo cargar la foto.
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-xs text-[color:var(--text-muted)]">Rutina</p>
                <p className="text-sm font-semibold">{resolveRoutineLabel(activePhoto)}</p>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-xs text-[color:var(--text-muted)]">Tipo</p>
                <p className="text-sm font-semibold">
                  {activePhoto.type === "home" ? "Casa" : "Entrenamiento"}
                </p>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3 sm:col-span-2">
                <p className="text-xs text-[color:var(--text-muted)]">Fecha</p>
                <p className="text-sm font-semibold">
                  {formatDate(activePhoto.date, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            {activePhoto.label && (
              <p className="text-sm text-[color:var(--text-muted)]">{activePhoto.label}</p>
            )}
          </div>
        </Modal>
      )}
    </main>
  );
}

export default PhotosLibrary;
