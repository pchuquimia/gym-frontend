import Modal from '../shared/Modal'
import { getExerciseImageUrl } from '../../utils/cloudinary'

function DetailModal({ exercise, onClose }) {
  if (!exercise) return null
  const imageUrl = getExerciseImageUrl(exercise, { width: 900, height: 506 })
  const placeholder = 'https://via.placeholder.com/900x506?text=Sin+imagen'

  return (
    <Modal
      title={exercise.name}
      subtitle={exercise.muscle}
      onClose={onClose}
      footer={
        <button type="button" className="primary-btn" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4">
        <div className="relative">
          <img
            src={imageUrl || placeholder}
            alt={exercise.name}
            className="w-full rounded-xl border border-border-soft"
          />
          {exercise.type === 'custom' && (
            <span className="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-accent to-accent-green text-bg-darker">
              Personalizado
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <p className="label">Equipo</p>
            <p className="muted">{exercise.equipment || 'No especificado'}</p>
          </div>
          <div>
            <p className="label">Descripción</p>
            <p className="muted">{exercise.description || 'Sin descripción cargada.'}</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default DetailModal
