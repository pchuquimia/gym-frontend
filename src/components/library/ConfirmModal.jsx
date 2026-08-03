import Modal from "../shared/Modal";

function ConfirmModal({ name, onConfirm, onClose, entityLabel = "ejercicio" }) {
  const footer = (
    <>
      <button
        type="button"
        className="h-10 rounded-lg border border-[color:var(--border)] px-4 text-sm font-bold text-[color:var(--text)]"
        onClick={onClose}
      >
        Cancelar
      </button>
      <button
        type="button"
        className="h-10 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700"
        onClick={onConfirm}
      >
        Eliminar
      </button>
    </>
  );

  return (
    <Modal
      title={`Eliminar ${entityLabel}`}
      subtitle="Esta acción no se puede deshacer"
      onClose={onClose}
      footer={footer}
    >
      <p>
        ¿Estás seguro de que deseas eliminar "{name}"?
        {entityLabel === "foto"
          ? " También se eliminará el archivo almacenado."
          : ""}
      </p>
    </Modal>
  );
}

export default ConfirmModal;
