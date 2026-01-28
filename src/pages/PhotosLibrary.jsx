import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
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
    <main className="relative min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-100 bg-[radial-gradient(120%_80%_at_10%_10%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(80%_60%_at_85%_0%,rgba(16,185,129,0.14),transparent_60%)]"
      />
      <div className="relative mx-auto max-w-md md:max-w-5xl px-3 sm:px-4 pb-28 pt-4 space-y-4">
        <Card className="relative overflow-hidden p-5 md:p-6 bg-[color:var(--card)]/90 backdrop-blur">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="absolute -bottom-20 left-4 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="relative space-y-3">
            <Badge variant="secondary" className="text-[11px] uppercase tracking-[0.2em]">
              Biblioteca de fotos
            </Badge>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-display">
                Progreso visual de tus rutinas
              </h1>
              <p className="text-sm text-[color:var(--text-muted)]">
                Cada foto guarda la rutina que realizaste para ver tu avance.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3">
                <p className="text-xs text-[color:var(--text-muted)]">Total</p>
                <p className="text-xl font-semibold">{stats.total}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3">
                <p className="text-xs text-[color:var(--text-muted)]">Entrenos</p>
                <p className="text-xl font-semibold">{stats.gymCount}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3">
                <p className="text-xs text-[color:var(--text-muted)]">Casa</p>
                <p className="text-xl font-semibold">{stats.homeCount}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3">
                <p className="text-xs text-[color:var(--text-muted)]">Ultima</p>
                <p className="text-sm font-semibold">
                  {stats.lastDate ? formatDate(stats.lastDate) : "--"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
          <div className="space-y-4 order-2 lg:order-1">
            <Card className="p-4 md:p-5 bg-[color:var(--card)]/90 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                    Galeria de rutinas
                  </p>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    {orderedPhotos.length} fotos registradas
                  </p>
                </div>
                <Badge variant="secondary" className="text-[11px]">
                  {orderedPhotos.length} total
                </Badge>
              </div>
            </Card>

            {groupedPhotos.length === 0 && (
              <Card className="p-6 text-center text-sm text-[color:var(--text-muted)]">
                Aun no hay fotos guardadas. Sube la primera al terminar tu sesion.
              </Card>
            )}

            {groupedPhotos.map(([month, photosByMonth]) => (
              <Card key={month} className="p-4 md:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold capitalize">{month}</p>
                  <Badge variant="secondary" className="text-[11px]">
                    {photosByMonth.length}
                  </Badge>
                </div>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
                  {photosByMonth.map((photo) => {
                    const preview = getPhotoUrl(photo, {
                      width: 480,
                      height: 640,
                      crop: "fill",
                      gravity: "auto",
                    });
                    const routineLabel = resolveRoutineLabel(photo);
                    return (
                      <button
                        key={photo.id}
                        className="group relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)]"
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-90" />
                        <div className="absolute bottom-2 left-2 right-2 space-y-1 text-left">
                          <p className="text-[11px] font-semibold text-white">
                            {formatDate(photo.date, { day: "2-digit", month: "short" })}
                          </p>
                          <p className="text-xs text-white truncate">{routineLabel}</p>
                        </div>
                        <span className="absolute top-2 left-2 rounded-full bg-white/80 text-[10px] font-semibold text-slate-900 px-2 py-0.5">
                          {photo.type === "home" ? "Casa" : "Gym"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-4 order-1 lg:order-2">
            <Card className="p-4 md:p-5 space-y-3 bg-[color:var(--card)]/90 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                    Subir foto
                  </p>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    Guarda una foto al final de tu entrenamiento.
                  </p>
                </div>
                <Badge variant="secondary" className="text-[11px]">
                  {uploadType === "home" ? "Casa" : "Entreno"}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {uploadTypeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setUploadType(option.id)}
                    className={`px-3 py-2 rounded-full border text-xs font-semibold transition ${
                      uploadType === option.id
                        ? "border-blue-400/50 bg-blue-500/10 text-[color:var(--text)]"
                        : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-muted)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-[color:var(--text-muted)]">Nota rapida (opcional)</p>
                <input
                  value={uploadLabel}
                  onChange={(event) => setUploadLabel(event.target.value)}
                  placeholder="Ej: semana 4, cierre de sesion"
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <ImagePlus className="h-4 w-4" />
                  {isUploading ? "Subiendo..." : "Seleccionar foto"}
                </Button>
                <Button
                  size="sm"
                  className="rounded-full gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Camera className="h-4 w-4" />
                  {isUploading ? "Subiendo..." : "Tomar foto"}
                </Button>
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
                {fileError && <span className="text-xs text-red-500">{fileError}</span>}
              </div>
            </Card>

            <Card className="p-4 md:p-5 bg-[color:var(--card)]/90 backdrop-blur">
              <p className="text-sm font-semibold text-[color:var(--text)]">Guia rapida</p>
              <ul className="mt-3 space-y-2 text-xs text-[color:var(--text-muted)]">
                <li>Usa la misma luz y distancia para comparar progreso.</li>
                <li>Tu rutina queda guardada en cada foto para revisar avances.</li>
                <li>Las fotos se optimizan automaticamente para ocupar menos espacio.</li>
              </ul>
            </Card>
          </div>
        </div>
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
