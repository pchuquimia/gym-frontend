import { useMemo, useState } from 'react'
import TopBar from '../components/layout/TopBar'
import Modal from '../components/shared/Modal'
import { useTrainingData } from '../context/TrainingContext'

const quickRanges = ['Ultimos 3 meses', '6M', '1A', 'Todo']

function groupByMonth(photos) {
  const grouped = {}
  photos.forEach((p) => {
    const date = new Date(p.date)
    const key = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(p)
  })
  return grouped
}

function PhotosLibrary() {
  const { photos, addPhoto, deletePhoto } = useTrainingData()
  const [range, setRange] = useState('Todo')
  const [fromMonth, setFromMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [toMonth, setToMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [activePhoto, setActivePhoto] = useState(null)
  const [fileError, setFileError] = useState('')
  const [uploadType, setUploadType] = useState('home')

  const applyQuickRange = (value) => {
    const now = new Date()
    if (value === 'Ultimos 3 meses') {
      const from = new Date()
      from.setMonth(now.getMonth() - 2)
      setFromMonth(from.toISOString().slice(0, 7))
      setToMonth(now.toISOString().slice(0, 7))
    } else if (value === '6M') {
      const from = new Date()
      from.setMonth(now.getMonth() - 5)
      setFromMonth(from.toISOString().slice(0, 7))
      setToMonth(now.toISOString().slice(0, 7))
    } else if (value === '1A') {
      const from = new Date()
      from.setFullYear(now.getFullYear() - 1)
      setFromMonth(from.toISOString().slice(0, 7))
      setToMonth(now.toISOString().slice(0, 7))
    } else {
      setFromMonth('2024-01')
      setToMonth(now.toISOString().slice(0, 7))
    }
    setRange(value)
  }

  const filteredPhotos = useMemo(() => {
    const from = new Date(`${fromMonth}-01`)
    const to = new Date(`${toMonth}-01`)
    to.setMonth(to.getMonth() + 1)
    return (photos || [])
      .filter((p) => {
        const d = new Date(p.date)
        return d >= from && d < to
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [fromMonth, toMonth, photos])

  const grouped = groupByMonth(filteredPhotos)

  const handleUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setFileError('Max 10MB')
      return
    }
    setFileError('')
    addPhoto({
      file,
      date: new Date().toISOString().slice(0, 10),
      label: uploadType === 'home' ? 'Foto privada (casa)' : 'Foto en entrenamiento',
      type: uploadType,
    })
  }

  const removePhoto = (id) => {
    deletePhoto(id)
    setActivePhoto(null)
  }

  return (
    <>
      <TopBar
        title="Biblioteca de Fotos de Progreso (Navegación Completa)"
        subtitle="Revisa tus fotos de progreso organizadas cronológicamente."
      />

      <section className="card flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-2">
            {quickRanges.map((r) => (
              <button
                key={r}
                className={`px-3 py-2 rounded-full border text-sm ${
                  range === r ? 'border-accent text-white bg-accent/20' : 'border-border-soft text-muted'
                }`}
                onClick={() => applyQuickRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <span className="label">Desde</span>
            <input
              type="month"
              value={fromMonth}
              onChange={(e) => setFromMonth(e.target.value)}
              className="rounded-full border border-border-soft bg-white/5 px-3 py-2 text-white"
            />
            <span className="label">Hasta</span>
            <input
              type="month"
              value={toMonth}
              onChange={(e) => setToMonth(e.target.value)}
              className="rounded-full border border-border-soft bg-white/5 px-3 py-2 text-white"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="radio" name="upload-type" value="home" checked={uploadType === 'home'} onChange={(e) => setUploadType(e.target.value)} />
            Foto privada (casa)
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="radio" name="upload-type" value="gym" checked={uploadType === 'gym'} onChange={(e) => setUploadType(e.target.value)} />
            Foto en entrenamiento
          </label>
          <label className="ghost-btn text-sm cursor-pointer">
            + Subir foto del día
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
          {fileError && <span className="text-xs text-accent-red">{fileError}</span>}
        </div>
      </section>

      <section className="flex flex-col gap-4" id="galeria">
        {Object.keys(grouped).length === 0 && (
          <div className="card text-center text-muted">No hay fotos en el rango seleccionado.</div>
        )}
        {Object.entries(grouped).map(([month, photosByMonth]) => (
          <div key={month} className="card">
            <h3 className="text-lg font-semibold mb-3 capitalize">{month}</h3>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {photosByMonth.map((photo) => (
                <button
                  key={photo.id}
                  className="relative overflow-hidden rounded-xl border border-border-soft bg-white/5"
                  onClick={() => setActivePhoto(photo)}
                >
                  <img src={photo.url} alt={photo.label} className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-2 flex flex-col justify-end text-left">
                    <p className="text-xs font-semibold text-white">{new Date(photo.date).toLocaleDateString('es-ES')}</p>
                    <p className="text-[11px] text-muted">{photo.label}</p>
                    <p className="text-[10px] text-muted">{photo.type === 'home' ? 'Privada' : 'Entrenamiento'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {activePhoto && (
        <Modal title="Detalle de Foto" subtitle={new Date(activePhoto.date).toLocaleDateString('es-ES')} onClose={() => setActivePhoto(null)}
          footer={
            <>
              <button className="ghost-btn" onClick={() => removePhoto(activePhoto.id)}>Eliminar</button>
              <button className="primary-btn" onClick={() => setActivePhoto(null)}>Cerrar</button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <img src={activePhoto.url} alt={activePhoto.label} className="w-full rounded-xl border border-border-soft" />
            <p className="text-sm text-muted">{activePhoto.label}</p>
            <p className="text-xs text-muted">{activePhoto.type === 'home' ? 'Privada (casa)' : 'Entrenamiento'}</p>
          </div>
        </Modal>
      )}
    </>
  )
}

export default PhotosLibrary
