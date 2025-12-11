import Modal from '../shared/Modal'

function ConfirmModal({ name, onConfirm, onClose }) {
  const footer = (
    <div className="modal-actions">
      <button type="button" className="ghost-btn" onClick={onClose}>
        Cancelar
      </button>
      <button type="button" className="primary-btn" onClick={onConfirm}>
        Confirmar Eliminación
      </button>
    </div>
  )

  return (
    <Modal
      title="Eliminar ejercicio"
      subtitle="Esta acción no se puede deshacer"
      onClose={onClose}
      footer={footer}
    >
      <p>
        ¿Estás seguro de que deseas eliminar "{name}"? Esta acción no se puede deshacer.
      </p>
    </Modal>
  )
}

export default ConfirmModal
