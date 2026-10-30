import * as Dialog from "@radix-ui/react-dialog";
import Button from "../ui/button";

const DAYS = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

export default function TrainingScheduleConfirmation({
  change,
  routineName,
  onConfirm,
  onCancel,
}) {
  if (!change) return null;
  const date = new Date(`${change.actualDate}T12:00:00`);
  const dateLabel = Number.isNaN(date.getTime())
    ? "la fecha de esta sesión"
    : date.toLocaleDateString("es-BO", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
  const plannedDay = DAYS[Number(change.selectedDayIndex) - 1];
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[151] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 text-[color:var(--text)] shadow-xl">
          <Dialog.Title className="text-lg font-semibold">
            Guardar en otro día
          </Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
            {change.scheduleMode === "fixed" && plannedDay
              ? `${routineName || "Este entrenamiento"} está programado para el ${plannedDay}. Vas a guardarlo con fecha del ${dateLabel}.`
              : `${routineName || "Este entrenamiento"} corresponde a otro día del ciclo. Vas a guardarlo con fecha del ${dateLabel} y el ciclo continuará desde esta sesión.`}{" "}
            Tus series se conservarán y la planificación semanal no se
            modificará.
          </Dialog.Description>
          <Button
            className="mt-5 min-h-12 w-full rounded-xl"
            onClick={onConfirm}
          >
            Confirmar y guardar entrenamiento
          </Button>
          <button
            type="button"
            className="mt-2 min-h-11 w-full text-sm"
            onClick={onCancel}
          >
            Volver sin guardar
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
